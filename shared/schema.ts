import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const staffRoleEnum = pgEnum("staff_role", ["waiter", "kitchen", "owner"]);
export const orderStatusEnum = pgEnum("order_status", ["new", "in_progress", "ready", "delivered"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid"]);
export const callStatusEnum = pgEnum("call_status", ["pending", "acknowledged", "resolved"]);
export const staffAssignmentStatusEnum = pgEnum("staff_assignment_status", ["pending", "approved", "revoked"]);
export const spiceLevelEnum = pgEnum("spice_level", ["none", "mild", "medium", "hot", "extra_hot"]);
export const portionSizeEnum = pgEnum("portion_size", ["light", "standard", "hearty"]);
export const alcoholPreferenceEnum = pgEnum("alcohol_preference", ["none", "occasional", "preferred"]);
export const caffeinePreferenceEnum = pgEnum("caffeine_preference", ["avoid", "limited", "regular"]);
export const sweetnessPreferenceEnum = pgEnum("sweetness_preference", ["unsweetened", "lightly_sweet", "balanced", "very_sweet"]);
export const priceSensitivityEnum = pgEnum("price_sensitivity", ["value", "moderate", "premium"]);

// Restaurants table (multi-restaurant support)
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  menuThemePrimary: varchar("menu_theme_primary", { length: 20 }),
  menuThemeAccent: varchar("menu_theme_accent", { length: 20 }),
  menuThemeBackground: varchar("menu_theme_background", { length: 20 }),
  menuThemeForeground: varchar("menu_theme_foreground", { length: 20 }),
  menuThemeCard: varchar("menu_theme_card", { length: 20 }),
  ownerId: integer("owner_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Configuration Tables
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
});

export const kitchenStations = pgTable("kitchen_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const dietaryTags = pgTable("dietary_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  iconUrl: varchar("icon_url", { length: 500 }),
});

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  lowStockThreshold: integer("low_stock_threshold"),
});

export const ingredientStocks = pgTable("ingredient_stocks", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  lowStockThreshold: decimal("low_stock_threshold", { precision: 10, scale: 2 }),
}, (table) => ({
  restaurantIngredientUnique: sql`unique (${table.restaurantId}, ${table.ingredientId})`,
}));

export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tableNumber: integer("table_number").notNull(),
  qrCodeString: varchar("qr_code_string", { length: 255 }).unique(),
  isOccupied: boolean("is_occupied").default(false),
});

// Staff table (for Waiters, Kitchen, Owner)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff restaurant assignments (links staff to restaurants with approval workflow)
export const staffRestaurantAssignments = pgTable("staff_restaurant_assignments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  status: staffAssignmentStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => staff.id),
  revokedAt: timestamp("revoked_at"),
  notes: text("notes"),
});

// Customer table (for diners using phone)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  preferences: text("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer preferences for myFilter system
export const customerPreferences = pgTable("customer_preferences", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }).unique(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergensToAvoid: text("allergens_to_avoid").array(),
  dislikedIngredients: text("disliked_ingredients").array(),
  preferredCuisines: text("preferred_cuisines").array(),
  preferredProteins: text("preferred_proteins").array(),
  spiceLevel: spiceLevelEnum("spice_level"),
  preferredCookingMethods: text("preferred_cooking_methods").array(),
  mealTypes: text("meal_types").array(),
  beveragePreferences: text("beverage_preferences").array(),
  alcoholPreference: alcoholPreferenceEnum("alcohol_preference"),
  caffeinePreference: caffeinePreferenceEnum("caffeine_preference"),
  sweetnessPreference: sweetnessPreferenceEnum("sweetness_preference"),
  portionSize: portionSizeEnum("portion_size"),
  calorieTargetMin: integer("calorie_target_min"),
  calorieTargetMax: integer("calorie_target_max"),
  priceSensitivity: priceSensitivityEnum("price_sensitivity"),
  preferOrganic: boolean("prefer_organic").default(false),
  preferLocallySourced: boolean("prefer_locally_sourced").default(false),
  preferSpicy: boolean("prefer_spicy").default(false),
  avoidSpicy: boolean("avoid_spicy").default(false),
  avoidAlcohol: boolean("avoid_alcohol").default(false),
  avoidCaffeine: boolean("avoid_caffeine").default(false),
  lowSodium: boolean("low_sodium").default(false),
  lowSugar: boolean("low_sugar").default(false),
  highProtein: boolean("high_protein").default(false),
  lowCarb: boolean("low_carb").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu Items & Composition
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  nutritionalInfo: text("nutritional_info"),
  calories: integer("calories"),
  proteinGrams: decimal("protein_grams", { precision: 6, scale: 2 }),
  carbsGrams: decimal("carbs_grams", { precision: 6, scale: 2 }),
  fatGrams: decimal("fat_grams", { precision: 6, scale: 2 }),
  fiberGrams: decimal("fiber_grams", { precision: 6, scale: 2 }),
  sugarGrams: decimal("sugar_grams", { precision: 6, scale: 2 }),
  sodiumMg: integer("sodium_mg"),
  isSoldOut: boolean("is_sold_out").default(false),
  categoryId: integer("category_id").references(() => categories.id),
  stationId: integer("station_id").references(() => kitchenStations.id),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  isVegan: boolean("is_vegan").default(false),
  isVegetarian: boolean("is_vegetarian").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isDairyFree: boolean("is_dairy_free").default(false),
  isNutFree: boolean("is_nut_free").default(false),
  isHalal: boolean("is_halal").default(false),
  isKosher: boolean("is_kosher").default(false),
  isSpicy: boolean("is_spicy").default(false),
  spiceLevel: spiceLevelEnum("spice_level").default("none"),
  allergens: text("allergens").array(),
  cuisineType: varchar("cuisine_type", { length: 100 }),
  proteinType: varchar("protein_type", { length: 100 }),
  cookingMethod: varchar("cooking_method", { length: 100 }),
  mealType: varchar("meal_type", { length: 50 }),
  isAlcoholic: boolean("is_alcoholic").default(false),
  isCaffeinated: boolean("is_caffeinated").default(false),
  isOrganic: boolean("is_organic").default(false),
  isLocallySourced: boolean("is_locally_sourced").default(false),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id),
  quantityRequired: decimal("quantity_required", { precision: 10, scale: 2 }),
});

export const modifiers = pgTable("modifiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).notNull(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
});

export const menuDietaryTags = pgTable("menu_dietary_tags", {
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => dietaryTags.id, { onDelete: "cascade" }),
});

// Orders & Transactions
export const orderTickets = pgTable("order_tickets", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tableId: integer("table_id").references(() => restaurantTables.id),
  customerId: integer("customer_id").references(() => customers.id),
  status: orderStatusEnum("status").notNull().default("new"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  stockDeductedAt: timestamp("stock_deducted_at"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orderTickets.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const orderItemModifiers = pgTable("order_item_modifiers", {
  orderItemId: integer("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  modifierId: integer("modifier_id").notNull().references(() => modifiers.id),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orderTickets.id, { onDelete: "cascade" }).unique(),
  speedRating: integer("speed_rating").notNull(),
  serviceRating: integer("service_rating").notNull(),
  tasteRating: integer("taste_rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Special Offers
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed_amount", "bogo"]);

export const specialOffers = pgTable("special_offers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table Calls (when customer calls waiter)
export const tableCalls = pgTable("table_calls", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull().references(() => restaurantTables.id),
  customerId: integer("customer_id").references(() => customers.id),
  status: callStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  acknowledgedBy: integer("acknowledged_by").references(() => staff.id),
});

// Insert Schemas
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertModifierSchema = createInsertSchema(modifiers).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertRestaurantTableSchema = createInsertSchema(restaurantTables).omit({ id: true });
export const insertOrderTicketSchema = createInsertSchema(orderTickets).omit({ id: true, createdAt: true, completedAt: true, stockDeductedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertTableCallSchema = createInsertSchema(tableCalls).omit({ id: true, createdAt: true, acknowledgedAt: true, resolvedAt: true });
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true, createdAt: true });
export const insertCustomerPreferencesSchema = createInsertSchema(customerPreferences).omit({ id: true, updatedAt: true });
export const insertStaffRestaurantAssignmentSchema = createInsertSchema(staffRestaurantAssignments).omit({ id: true, requestedAt: true, approvedAt: true, revokedAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertSpecialOfferSchema = createInsertSchema(specialOffers).omit({ id: true, createdAt: true });

// Types
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertModifier = z.infer<typeof insertModifierSchema>;
export type Modifier = typeof modifiers.$inferSelect;

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;
export type IngredientStock = typeof ingredientStocks.$inferSelect;
export type InsertIngredientStock = typeof ingredientStocks.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type OrderTicket = typeof orderTickets.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type TableCall = typeof tableCalls.$inferSelect;
export type InsertTableCall = z.infer<typeof insertTableCallSchema>;

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type CustomerPreference = typeof customerPreferences.$inferSelect;
export type InsertCustomerPreference = z.infer<typeof insertCustomerPreferencesSchema>;
export type StaffRestaurantAssignment = typeof staffRestaurantAssignments.$inferSelect;
export type InsertStaffRestaurantAssignment = z.infer<typeof insertStaffRestaurantAssignmentSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type SpecialOffer = typeof specialOffers.$inferSelect;
export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;

// API Request/Response Schemas
export const staffSignUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["waiter", "kitchen", "owner"]),
});

export const staffSignInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const customerSignUpSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  name: z.string().min(1, "Name is required"),
});

export const customerSignInSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export const createOrderSchema = z.object({
  tableNumber: z.number(),
  items: z.array(z.object({
    menuItemId: z.number(),
    name: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number(),
    modifierIds: z.array(z.number()).optional(),
    note: z.string().optional(),
  })),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "ready", "delivered"]),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "paid"]),
  paymentMethod: z.enum(["cash", "card"]).optional(),
});

export const createTableCallSchema = z.object({
  tableNumber: z.number(),
});

export const acknowledgeTableCallSchema = z.object({
  callId: z.number(),
});

export const createRestaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  menuThemePrimary: z.string().optional(),
  menuThemeAccent: z.string().optional(),
  menuThemeBackground: z.string().optional(),
  menuThemeForeground: z.string().optional(),
  menuThemeCard: z.string().optional(),
});

export const ownerStaffSignUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  restaurant: createRestaurantSchema,
});

export const staffJoinRestaurantSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["waiter", "kitchen"]),
  restaurantId: z.number().min(1, "Please select a restaurant"),
});

export const updateCustomerPreferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  allergensToAvoid: z.array(z.string()).optional(),
  dislikedIngredients: z.array(z.string()).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  preferredProteins: z.array(z.string()).optional(),
  spiceLevel: z.enum(["none", "mild", "medium", "hot", "extra_hot"]).optional(),
  preferredCookingMethods: z.array(z.string()).optional(),
  mealTypes: z.array(z.string()).optional(),
  beveragePreferences: z.array(z.string()).optional(),
  alcoholPreference: z.enum(["none", "occasional", "preferred"]).optional(),
  caffeinePreference: z.enum(["avoid", "limited", "regular"]).optional(),
  sweetnessPreference: z.enum(["unsweetened", "lightly_sweet", "balanced", "very_sweet"]).optional(),
  portionSize: z.enum(["light", "standard", "hearty"]).optional(),
  calorieTargetMin: z.number().optional(),
  calorieTargetMax: z.number().optional(),
  priceSensitivity: z.enum(["value", "moderate", "premium"]).optional(),
  preferOrganic: z.boolean().optional(),
  preferLocallySourced: z.boolean().optional(),
  preferSpicy: z.boolean().optional(),
  avoidSpicy: z.boolean().optional(),
  avoidAlcohol: z.boolean().optional(),
  avoidCaffeine: z.boolean().optional(),
  lowSodium: z.boolean().optional(),
  lowSugar: z.boolean().optional(),
  highProtein: z.boolean().optional(),
  lowCarb: z.boolean().optional(),
});

export const staffApprovalSchema = z.object({
  staffId: z.number(),
  action: z.enum(["approve", "revoke"]),
});

export const submitFeedbackSchema = z.object({
  speedRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  tasteRating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type StaffSignUpRequest = z.infer<typeof staffSignUpSchema>;
export type StaffSignInRequest = z.infer<typeof staffSignInSchema>;
export type CustomerSignUpRequest = z.infer<typeof customerSignUpSchema>;
export type CustomerSignInRequest = z.infer<typeof customerSignInSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusRequest = z.infer<typeof updatePaymentStatusSchema>;
export type CreateTableCallRequest = z.infer<typeof createTableCallSchema>;
export type CreateRestaurantRequest = z.infer<typeof createRestaurantSchema>;
export type OwnerStaffSignUpRequest = z.infer<typeof ownerStaffSignUpSchema>;
export type StaffJoinRestaurantRequest = z.infer<typeof staffJoinRestaurantSchema>;
export type UpdateCustomerPreferencesRequest = z.infer<typeof updateCustomerPreferencesSchema>;
export type StaffApprovalRequest = z.infer<typeof staffApprovalSchema>;
export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackSchema>;

// Preference options for myFilter UI
export const DIETARY_RESTRICTIONS = [
  "vegan",
  "vegetarian",
  "pescatarian",
  "gluten_free",
  "halal",
  "kosher",
  "none",
] as const;
export const ALLERGENS = ["peanuts", "tree_nuts", "dairy", "eggs", "soy", "gluten", "shellfish", "fish", "sesame", "none"] as const;
export const CUISINES = ["american", "italian", "mexican", "mediterranean", "asian", "indian", "middle_eastern", "latin", "african", "fusion"] as const;
export const PROTEINS = ["beef", "poultry", "pork", "seafood", "plant_based", "eggs", "legumes"] as const;
export const COOKING_METHODS = ["grilled", "roasted", "baked", "steamed", "fried", "raw", "sauteed", "smoked"] as const;
export const MEAL_TYPES = ["breakfast", "brunch", "lunch", "dinner", "dessert", "snacks", "appetizers"] as const;
export const BEVERAGES = ["water", "sparkling_water", "coffee", "tea", "juice", "smoothie", "soda", "mocktail", "cocktail", "beer", "wine", "spirits"] as const;
