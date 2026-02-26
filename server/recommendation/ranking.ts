import type { CustomerPreference, MenuItem, SpecialOffer } from "@shared/schema";

export type RecommendationReasonCode =
  | "history_category_match"
  | "history_item_repeat"
  | "history_recent_order"
  | "pref_cuisine_match"
  | "pref_protein_match"
  | "pref_cooking_match"
  | "pref_meal_type_match"
  | "pref_spice_match"
  | "pref_health_match"
  | "price_band_match"
  | "active_offer_boost"
  | "popular_in_restaurant";

export interface CustomerHistorySignal {
  menuItemId: number;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  createdAt: Date | null;
}

export interface PersonalizedRankingInput {
  candidates: MenuItem[];
  customerHistory: CustomerHistorySignal[];
  preferences?: CustomerPreference;
  popularityByItemId: Map<number, number>;
  activeOffers: SpecialOffer[];
  limit?: number;
}

export interface RankedMenuItem {
  item: MenuItem;
  rankingScore: number;
  reasonCodes: RecommendationReasonCode[];
  reasonLabel: string;
  scoreBreakdown: Record<string, number>;
}

const WEIGHTS = {
  historyCategory: 2.4,
  historyRepeat: 1.7,
  historyRecency: 1.4,
  preferenceMatch: 2.2,
  popularity: 1.2,
  offerBoost: 0.8,
  priceAlignment: 0.9,
  diversityPenaltyStep: 0.22,
};

const REASON_LABELS: Record<RecommendationReasonCode, string> = {
  history_category_match: "Because you often order this category",
  history_item_repeat: "Because you liked this item before",
  history_recent_order: "Because this matches your recent choices",
  pref_cuisine_match: "Matches your cuisine preferences",
  pref_protein_match: "Matches your protein preferences",
  pref_cooking_match: "Matches your cooking-style preferences",
  pref_meal_type_match: "Matches your meal preferences",
  pref_spice_match: "Matches your spice preference",
  pref_health_match: "Matches your dietary preferences",
  price_band_match: "Fits your usual price range",
  active_offer_boost: "Trending now with an active offer",
  popular_in_restaurant: "Popular at this restaurant",
};

const toLowerSet = (values?: string[] | null): Set<string> =>
  new Set((values ?? []).map((value) => value.toLowerCase()));

const toNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const daysSince = (date: Date | null | undefined): number => {
  if (!date) return 999;
  const delta = Date.now() - new Date(date).getTime();
  return Math.max(0, delta / (1000 * 60 * 60 * 24));
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

function isItemEligible(item: MenuItem, preferences?: CustomerPreference): boolean {
  if (item.isSoldOut) {
    return false;
  }
  if (!preferences) {
    return true;
  }

  const dietary = toLowerSet(preferences.dietaryRestrictions);
  if (dietary.has("vegan") && !item.isVegan) return false;
  if (dietary.has("vegetarian") && !item.isVegetarian && !item.isVegan) return false;
  if (dietary.has("gluten_free") && !item.isGlutenFree) return false;
  if (dietary.has("halal") && !item.isHalal) return false;
  if (dietary.has("kosher") && !item.isKosher) return false;

  const allergensToAvoid = toLowerSet(preferences.allergensToAvoid);
  if (allergensToAvoid.size > 0) {
    const allergens = toLowerSet(item.allergens);
    const hasBlockedAllergen = Array.from(allergensToAvoid).some((blocked) => allergens.has(blocked));
    if (hasBlockedAllergen) {
      return false;
    }
  }

  if (preferences.avoidSpicy && item.isSpicy) return false;
  if (preferences.avoidAlcohol && item.isAlcoholic) return false;
  if (preferences.avoidCaffeine && item.isCaffeinated) return false;
  if (preferences.calorieTargetMax && item.calories && item.calories > preferences.calorieTargetMax) return false;
  if (preferences.calorieTargetMin && item.calories && item.calories < preferences.calorieTargetMin) return false;

  return true;
}

function computeReasonLabel(reasonCodes: RecommendationReasonCode[]): string {
  if (reasonCodes.length === 0) return "Recommended for you";
  return REASON_LABELS[reasonCodes[0]] ?? "Recommended for you";
}

export function rankPersonalizedMenuItems(input: PersonalizedRankingInput): RankedMenuItem[] {
  const limit = input.limit ?? input.candidates.length;
  const eligibleCandidates = input.candidates.filter((item) => isItemEligible(item, input.preferences));
  const maxPopularity = Math.max(1, ...Array.from(input.popularityByItemId.values(), (count) => Math.max(0, count)));

  const categoryFrequency = new Map<number, number>();
  const itemFrequency = new Map<number, number>();
  const itemLastOrderedAt = new Map<number, Date | null>();
  const historicalPrices: number[] = [];

  for (const signal of input.customerHistory) {
    if (signal.categoryId) {
      categoryFrequency.set(signal.categoryId, (categoryFrequency.get(signal.categoryId) ?? 0) + signal.quantity);
    }
    itemFrequency.set(signal.menuItemId, (itemFrequency.get(signal.menuItemId) ?? 0) + signal.quantity);
    itemLastOrderedAt.set(signal.menuItemId, signal.createdAt);
    if (signal.unitPrice > 0) {
      historicalPrices.push(signal.unitPrice);
    }
  }

  const maxCategoryFreq = Math.max(1, ...Array.from(categoryFrequency.values(), (v) => Math.max(0, v)));
  const customerMedianPrice = median(historicalPrices);
  const offersForItem = new Map<number, number>();
  let hasGlobalOffer = false;
  for (const offer of input.activeOffers) {
    if (offer.menuItemId) {
      offersForItem.set(offer.menuItemId, (offersForItem.get(offer.menuItemId) ?? 0) + 1);
    } else {
      hasGlobalOffer = true;
    }
  }

  const preferredCuisines = toLowerSet(input.preferences?.preferredCuisines);
  const preferredProteins = toLowerSet(input.preferences?.preferredProteins);
  const preferredCookingMethods = toLowerSet(input.preferences?.preferredCookingMethods);
  const preferredMealTypes = toLowerSet(input.preferences?.mealTypes);

  const ranked = eligibleCandidates.map((item) => {
    let score = 0;
    const breakdown: Record<string, number> = {};
    const reasonScores = new Map<RecommendationReasonCode, number>();

    const categoryFreq = item.categoryId ? (categoryFrequency.get(item.categoryId) ?? 0) : 0;
    if (categoryFreq > 0) {
      const contribution = (categoryFreq / maxCategoryFreq) * WEIGHTS.historyCategory;
      score += contribution;
      breakdown.historyCategory = contribution;
      reasonScores.set("history_category_match", contribution);
    }

    const itemFreq = itemFrequency.get(item.id) ?? 0;
    if (itemFreq > 0) {
      const repeatContribution = Math.min(1, Math.log1p(itemFreq) / Math.log(6)) * WEIGHTS.historyRepeat;
      score += repeatContribution;
      breakdown.historyRepeat = repeatContribution;
      reasonScores.set("history_item_repeat", repeatContribution);

      const recencyContribution =
        (1 / (1 + daysSince(itemLastOrderedAt.get(item.id)))) * WEIGHTS.historyRecency;
      score += recencyContribution;
      breakdown.historyRecency = recencyContribution;
      reasonScores.set("history_recent_order", recencyContribution);
    }

    let preferenceContribution = 0;
    if (item.cuisineType && preferredCuisines.has(item.cuisineType.toLowerCase())) {
      preferenceContribution += 0.45;
      reasonScores.set("pref_cuisine_match", 0.45 * WEIGHTS.preferenceMatch);
    }
    if (item.proteinType && preferredProteins.has(item.proteinType.toLowerCase())) {
      preferenceContribution += 0.35;
      reasonScores.set("pref_protein_match", 0.35 * WEIGHTS.preferenceMatch);
    }
    if (item.cookingMethod && preferredCookingMethods.has(item.cookingMethod.toLowerCase())) {
      preferenceContribution += 0.25;
      reasonScores.set("pref_cooking_match", 0.25 * WEIGHTS.preferenceMatch);
    }
    if (item.mealType && preferredMealTypes.has(item.mealType.toLowerCase())) {
      preferenceContribution += 0.2;
      reasonScores.set("pref_meal_type_match", 0.2 * WEIGHTS.preferenceMatch);
    }
    if (input.preferences?.preferSpicy && item.isSpicy) {
      preferenceContribution += 0.25;
      reasonScores.set("pref_spice_match", 0.25 * WEIGHTS.preferenceMatch);
    }
    if (input.preferences?.highProtein && toNumber(item.proteinGrams) >= 20) {
      preferenceContribution += 0.2;
      reasonScores.set("pref_health_match", 0.2 * WEIGHTS.preferenceMatch);
    }
    if (input.preferences?.lowCarb && toNumber(item.carbsGrams) <= 20) {
      preferenceContribution += 0.2;
      reasonScores.set("pref_health_match", (reasonScores.get("pref_health_match") ?? 0) + 0.2 * WEIGHTS.preferenceMatch);
    }
    if (preferenceContribution > 0) {
      const weightedPreference = preferenceContribution * WEIGHTS.preferenceMatch;
      score += weightedPreference;
      breakdown.preferenceMatch = weightedPreference;
    }

    const popularity = (input.popularityByItemId.get(item.id) ?? 0) / maxPopularity;
    const popularityContribution = popularity * WEIGHTS.popularity;
    score += popularityContribution;
    breakdown.popularity = popularityContribution;
    reasonScores.set("popular_in_restaurant", popularityContribution);

    if (customerMedianPrice > 0) {
      const itemPrice = toNumber(item.price);
      const ratio = Math.abs(itemPrice - customerMedianPrice) / Math.max(customerMedianPrice, 1);
      const priceContribution = Math.max(0, 1 - ratio) * WEIGHTS.priceAlignment;
      score += priceContribution;
      breakdown.priceAlignment = priceContribution;
      reasonScores.set("price_band_match", priceContribution);
    }

    const offerCount = offersForItem.get(item.id) ?? (hasGlobalOffer ? 1 : 0);
    if (offerCount > 0) {
      const offerContribution = Math.min(1, offerCount) * WEIGHTS.offerBoost;
      score += offerContribution;
      breakdown.offerBoost = offerContribution;
      reasonScores.set("active_offer_boost", offerContribution);
    }

    const reasonCodes = Array.from(reasonScores.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code)
      .slice(0, 3);

    return {
      item,
      rankingScore: Number(score.toFixed(4)),
      reasonCodes,
      reasonLabel: computeReasonLabel(reasonCodes),
      scoreBreakdown: breakdown,
    };
  });

  ranked.sort((a, b) => b.rankingScore - a.rankingScore);

  // Diversity rerank: gently penalize repeated categories in top positions.
  const categorySeenCount = new Map<number, number>();
  const diversityAdjusted = ranked
    .map((rankedItem) => {
      const categoryId = rankedItem.item.categoryId ?? -1;
      const seen = categorySeenCount.get(categoryId) ?? 0;
      const adjustedScore = rankedItem.rankingScore - seen * WEIGHTS.diversityPenaltyStep;
      categorySeenCount.set(categoryId, seen + 1);
      return {
        ...rankedItem,
        rankingScore: Number(adjustedScore.toFixed(4)),
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);

  return diversityAdjusted.slice(0, limit);
}
