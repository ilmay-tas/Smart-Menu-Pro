import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import CustomerHeader from "@/components/layout/CustomerHeader";
import DietaryFilters, { type DietaryFilter } from "@/components/menu/DietaryFilters";
import CategoryTabs from "@/components/menu/CategoryTabs";
import CartButton from "@/components/cart/CartButton";
import CartSheet from "@/components/cart/CartSheet";
import { type CartItemData } from "@/components/cart/CartItem";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrencyTRY } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Plus, Minus, Leaf, WheatOff, Flame, Loader2, Bell, Clock, Package, CheckCircle, ChevronDown, ChevronUp, Filter, X, User, Settings, Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DIETARY_RESTRICTIONS,
} from "@shared/schema";

interface MenuModifier {
  id: string;
  name: string;
  price: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  isGlutenFree: boolean | null;
  isSpicy: boolean | null;
  allergens: string[] | null;
  modifiers: MenuModifier[];
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  rankingScore?: number;
  reasonLabel?: string;
  reasonCodes?: string[];
}

interface OrderItemWithNutrition {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CustomerOrderWithNutrition {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  items: OrderItemWithNutrition[];
  status: "new" | "in_progress" | "ready" | "delivered";
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  isToday: boolean;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface GuestOrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[] | null;
  notes?: string | null;
  unitPrice?: string;
}

interface GuestOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: GuestOrderItem[];
  status: "new" | "in_progress" | "ready" | "delivered";
  createdAt: string;
  paymentStatus?: string;
  totalAmount?: string;
}

interface OrdersWithNutritionResponse {
  todayOrders: CustomerOrderWithNutrition[];
  pastOrders: CustomerOrderWithNutrition[];
  dailyNutrition: { calories: number; protein: number; carbs: number; fat: number };
  weeklyNutrition: { calories: number; protein: number; carbs: number; fat: number };
  avg7DayNutrition: { calories: number; protein: number; carbs: number; fat: number };
  avg30DayNutrition: { calories: number; protein: number; carbs: number; fat: number };
  last30DailyNutrition: { date: string; calories: number; protein: number; carbs: number; fat: number }[];
}

interface CustomerPreferences {
  dietaryRestrictions?: string[];
  allergensToAvoid?: string[];
  dislikedIngredients?: string[];
  preferredCuisines?: string[];
  preferredProteins?: string[];
  spiceLevel?: string;
  preferredCookingMethods?: string[];
  mealTypes?: string[];
  beveragePreferences?: string[];
  alcoholPreference?: string;
  caffeinePreference?: string;
  sweetnessPreference?: string;
  portionSize?: string;
  calorieTargetMin?: number;
  calorieTargetMax?: number;
  priceSensitivity?: string;
  preferOrganic?: boolean;
  preferLocallySourced?: boolean;
  preferSpicy?: boolean;
  avoidSpicy?: boolean;
  avoidAlcohol?: boolean;
  avoidCaffeine?: boolean;
  lowSodium?: boolean;
  lowSugar?: boolean;
  highProtein?: boolean;
  lowCarb?: boolean;
}

interface CustomerMenuProps {
  tableNumber?: string;
  userName?: string;
  onLogout: () => void;
  isGuest?: boolean;
}

interface ActiveOffer {
  id: number;
  menuItemId: number | null;
  title: string;
  description: string | null;
  discountType: "percentage" | "fixed_amount" | "bogo";
  discountValue: string;
  isActive: boolean | null;
}

const statusLabels: Record<CustomerOrderWithNutrition["status"], string> = {
  new: "Order Received",
  in_progress: "Being Prepared",
  ready: "Ready for Pickup",
  delivered: "Delivered",
};

const statusIcons: Record<CustomerOrderWithNutrition["status"], typeof Clock> = {
  new: Clock,
  in_progress: Package,
  ready: Bell,
  delivered: CheckCircle,
};

export default function CustomerMenu({
  tableNumber = "12",
  userName = "Guest",
  onLogout,
  isGuest = false,
}: CustomerMenuProps) {
  const [activeFilter, setActiveFilter] = useState<DietaryFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [isPastOrdersOpen, setIsPastOrdersOpen] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCalorieGoalOpen, setIsCalorieGoalOpen] = useState(false);
  const [nutritionView, setNutritionView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState({ speed: 0, service: 0, taste: 0 });
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittedFeedbackOrders, setSubmittedFeedbackOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/filtered", isFilterApplied],
    queryFn: async () => {
      const url = isFilterApplied
        ? "/api/menu/filtered?applyFilter=true&personalized=true"
        : "/api/menu?personalized=true";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery<OrdersWithNutritionResponse>({
    queryKey: ["/api/customer/orders/nutrition"],
    refetchInterval: 5000,
    enabled: !isGuest,
  });
  const { data: guestOrders = [], isLoading: isLoadingGuestOrders } = useQuery<GuestOrder[]>({
    queryKey: ["/api/guest/orders"],
    refetchInterval: 5000,
    enabled: isGuest,
  });

  const { data: preferences = {} as CustomerPreferences } = useQuery<CustomerPreferences>({
    queryKey: ["/api/customer/preferences"],
    enabled: !isGuest,
  });

  // Fetch suggested items based on order history
  const { data: suggestedData } = useQuery<{ items: MenuItem[] }>({
    queryKey: ["/api/customer/suggested"],
    enabled: !isGuest,
  });
  const suggestedItems = suggestedData?.items || [];
  const suggestedItemIds = useMemo(() => new Set(suggestedItems.map((item) => item.id)), [suggestedItems]);

  // Fetch active special offers
  const { data: activeOffers = [] } = useQuery<ActiveOffer[]>({
    queryKey: ["/api/offers/active"],
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: CustomerPreferences) => {
      const res = await apiRequest("PUT", "/api/customer/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Preferences Saved", description: "Your dietary preferences have been updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/preferences"] });
      setIsPreferencesOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { tableNumber: number; items: any[] }) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Placed!", description: "Your order has been sent to the kitchen" });
      setCartItems([]);
      setActiveTab("orders");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["/api/guest/orders"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/customer/orders/nutrition"] });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const callWaiterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/table-calls", { tableNumber: parseInt(String(tableNumber)) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Waiter Called", description: "A waiter will be with you shortly" });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to Call Waiter", description: error.message, variant: "destructive" });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: { speedRating: number; serviceRating: number; tasteRating: number; comment?: string } }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/feedback`, data);
      return res.json();
    },
    onSuccess: (_, { orderId }) => {
      toast({ title: "Thank You!", description: "Your feedback has been submitted" });
      setSubmittedFeedbackOrders((prev) => new Set(prev).add(orderId));
      setFeedbackOrderId(null);
      setFeedbackRatings({ speed: 0, service: 0, taste: 0 });
      setFeedbackComment("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmitFeedback = () => {
    if (!feedbackOrderId) return;
    if (feedbackRatings.speed === 0 || feedbackRatings.service === 0 || feedbackRatings.taste === 0) {
      toast({ title: "Please rate all categories", description: "All three ratings are required", variant: "destructive" });
      return;
    }
    submitFeedbackMutation.mutate({
      orderId: feedbackOrderId,
      data: {
        speedRating: feedbackRatings.speed,
        serviceRating: feedbackRatings.service,
        tasteRating: feedbackRatings.taste,
        comment: feedbackComment || undefined,
      },
    });
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 transition-colors"
          >
            <Star
              className={`w-6 h-6 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCategory !== "All" && item.category !== activeCategory) return false;
      if (activeFilter === "vegan" && !item.isVegan) return false;
      if (activeFilter === "vegetarian" && !item.isVegetarian) return false;
      if (activeFilter === "glutenFree" && !item.isGlutenFree) return false;
      if (activeFilter === "spicy" && !item.isSpicy) return false;
      return true;
    });
  }, [menuItems, activeFilter, activeCategory]);

  const getNutritionParts = (item: Pick<MenuItem, "calories" | "protein" | "carbs" | "fat">): string[] => {
    const parts: string[] = [];
    if (item.calories !== null && item.calories !== undefined) {
      parts.push(`${item.calories} cal`);
    }
    if (item.protein !== null && item.protein !== undefined && item.protein !== "") {
      parts.push(`${item.protein}g protein`);
    }
    if (item.carbs !== null && item.carbs !== undefined && item.carbs !== "") {
      parts.push(`${item.carbs}g carbs`);
    }
    if (item.fat !== null && item.fat !== undefined && item.fat !== "") {
      parts.push(`${item.fat}g fat`);
    }
    return parts;
  };

  const getPricingForItem = (item: Pick<MenuItem, "id" | "price">) => {
    const originalUnitPrice = parseFloat(item.price);
    const appliedOffer = activeOffers.find((offer) => offer.menuItemId === parseInt(item.id));
    let discountedUnitPrice = originalUnitPrice;

    if (appliedOffer?.discountType === "percentage") {
      discountedUnitPrice = originalUnitPrice * (1 - parseFloat(appliedOffer.discountValue) / 100);
    } else if (appliedOffer?.discountType === "fixed_amount") {
      discountedUnitPrice = Math.max(0, originalUnitPrice - parseFloat(appliedOffer.discountValue));
    }

    return {
      originalUnitPrice,
      discountedUnitPrice,
      appliedOffer,
    };
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const modifierDetails = selectedItem.modifiers?.filter((m) =>
      selectedModifiers.includes(m.id)
    ) || [];
    const modifierTotal = modifierDetails.reduce((sum, m) => sum + parseFloat(m.price), 0);
    const { discountedUnitPrice } = getPricingForItem(selectedItem);
    const itemPrice = discountedUnitPrice + modifierTotal;

    const sortedSelected = [...selectedModifiers].sort();
    const existingIndex = cartItems.findIndex(
      (item) =>
        item.menuItemId === selectedItem.id &&
        JSON.stringify([...item.modifiers].sort()) === JSON.stringify(sortedSelected)
    );

    if (existingIndex !== -1) {
      setCartItems((prev) =>
        prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        )
      );
    } else {
      const newCartItem: CartItemData = {
        id: `${selectedItem.id}-${Date.now()}`,
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        price: itemPrice,
        quantity,
        image: selectedItem.image,
        modifiers: selectedModifiers,
        modifierNames: modifierDetails.map((m) => m.name),
      };
      setCartItems((prev) => [...prev, newCartItem]);
    }
    toast({ title: "Added to cart", description: `${quantity}x ${selectedItem.name} added` });
    setSelectedItem(null);
    setQuantity(1);
    setSelectedModifiers([]);
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    const orderItems = cartItems.map((item) => ({
      menuItemId: parseInt(String(item.menuItemId)),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      modifiers: item.modifierNames,
    }));

    createOrderMutation.mutate({ tableNumber: parseInt(String(tableNumber)), items: orderItems });
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const { discountedUnitPrice } = getPricingForItem(selectedItem);
    let total = discountedUnitPrice * quantity;
    if (selectedItem.modifiers) {
      selectedItem.modifiers
        .filter((m) => selectedModifiers.includes(m.id))
        .forEach((m) => {
          total += parseFloat(m.price) * quantity;
        });
    }
    return total;
  };

  const handleToggleFilter = () => {
    setIsFilterApplied(!isFilterApplied);
    queryClient.invalidateQueries({ queryKey: ["/api/menu/filtered", !isFilterApplied] });
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleCallWaiter = () => {
    callWaiterMutation.mutate();
  };

  const getStatusColor = (status: CustomerOrderWithNutrition["status"]) => {
    switch (status) {
      case "new": return "border-l-blue-500";
      case "in_progress": return "border-l-amber-500";
      case "ready": return "border-l-green-500";
      case "delivered": return "border-l-gray-400";
    }
  };

  const todayOrders = ordersData?.todayOrders || [];
  const pastOrders = ordersData?.pastOrders || [];
  const dailyNutrition = ordersData?.dailyNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const weeklyNutrition = ordersData?.weeklyNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const avg7DayNutrition = ordersData?.avg7DayNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const avg30DayNutrition = ordersData?.avg30DayNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const last30DailyNutrition = ordersData?.last30DailyNutrition || [];
  const activeNutrition =
    nutritionView === "daily" ? dailyNutrition : nutritionView === "weekly" ? weeklyNutrition : avg30DayNutrition;
  const macroTotal = activeNutrition.protein + activeNutrition.carbs + activeNutrition.fat;
  const macroEntries = [
    { label: "Protein", value: activeNutrition.protein, color: "bg-emerald-500" },
    { label: "Carbs", value: activeNutrition.carbs, color: "bg-amber-500" },
    { label: "Fat", value: activeNutrition.fat, color: "bg-rose-500" },
  ];
  const dailyCalorieTargetMax = preferences.calorieTargetMax;
  const dailyCalorieTargetMin = preferences.calorieTargetMin;
  const dailyCalories = dailyNutrition.calories;
  const targetProgress = dailyCalorieTargetMax
    ? Math.min(100, Math.max(0, (dailyCalories / dailyCalorieTargetMax) * 100))
    : 0;
  const remainingToMax = dailyCalorieTargetMax ? dailyCalorieTargetMax - dailyCalories : null;
  const remainingToMin = dailyCalorieTargetMin ? dailyCalorieTargetMin - dailyCalories : null;
  const todayVsAvg7 = dailyCalories - avg7DayNutrition.calories;
  const todayVsAvg30 = dailyCalories - avg30DayNutrition.calories;

  const hasPreferences = preferences && Object.keys(preferences).some(
    (key) => {
      const value = preferences[key as keyof CustomerPreferences];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return !!value;
    }
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">MyDine</span>
            <Badge variant="outline">Table {tableNumber}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-profile">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Table {tableNumber}</p>
              </div>
              <DropdownMenuSeparator />
              {!isGuest && (
                <>
                  <DropdownMenuItem onClick={() => setIsPreferencesOpen(true)} data-testid="button-my-filter">
                    <Settings className="w-4 h-4 mr-2" />
                    myFilter Preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "menu" | "orders")} className="flex-1">
            <TabsList>
              <TabsTrigger value="menu" data-testid="tab-menu">Menu</TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders" className="relative">
                My Orders
                {!isGuest && todayOrders.filter(o => o.status !== "delivered").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {todayOrders.filter(o => o.status !== "delivered").length}
                  </span>
                )}
                {isGuest && guestOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {guestOrders.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            {!isGuest && (
              <Button
                variant={isFilterApplied ? "default" : "outline"}
                onClick={handleToggleFilter}
                disabled={!hasPreferences}
                data-testid="button-apply-filter"
                size="sm"
              >
                {isFilterApplied ? (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Clear myFilter
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4 mr-1" />
                    Apply myFilter
                  </>
                )}
              </Button>
            )}
            {!isGuest && (
              <Button
                variant="outline"
                onClick={handleCallWaiter}
                disabled={callWaiterMutation.isPending}
                data-testid="button-call-waiter"
                size="sm"
              >
                <Bell className="w-4 h-4 mr-1" />
                Call Waiter
              </Button>
            )}
          </div>
        </div>

        {activeTab === "menu" && (
          <>
            {/* Suggested for You Section */}
            {!isGuest && suggestedItems.length > 0 && (
              <div className="space-y-3" data-testid="section-suggested">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Suggested for You
                </h2>
                <div className="w-full overflow-x-auto scroll-smooth snap-x snap-proximity">
                  <div className="flex gap-3 pb-2 min-w-max">
                    {suggestedItems.map((item) => (
                      <Card
                        key={item.id}
                        className="min-w-[200px] max-w-[200px] overflow-hidden hover-elevate active-elevate-2 cursor-pointer flex-shrink-0 snap-start"
                        onClick={() => setSelectedItem(item)}
                        data-testid={`card-suggested-item-${item.id}`}
                      >
                        <div className="h-28 overflow-hidden">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm truncate">{item.name}</h3>
                          {item.reasonLabel && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.reasonLabel}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold">{formatCurrencyTRY(item.price)}</span>
                            {getNutritionParts(item).length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {getNutritionParts(item).join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <Separator />
              </div>
            )}

            <DietaryFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

            {(() => {
              // Group items by category for the menu display
              const groupedByCategory: Record<string, typeof filteredItems> = {};
              filteredItems.forEach((item) => {
                const cat = item.category || "Other";
                if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
                groupedByCategory[cat].push(item);
              });
              const categoryOrder = categories.filter((c) => c !== "All");

              const renderMenuItem = (item: typeof filteredItems[0]) => {
                const { originalUnitPrice, discountedUnitPrice, appliedOffer } = getPricingForItem(item);
                const hasDiscount =
                  !!appliedOffer && (appliedOffer.discountType === "percentage" || appliedOffer.discountType === "fixed_amount");
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 transition-colors"
                    onClick={() => setSelectedItem(item)}
                    data-testid={`card-menu-item-${item.id}`}
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Name + Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <h3 className="font-bold text-sm uppercase tracking-wide text-foreground truncate">
                          {item.name}
                        </h3>
                        {appliedOffer && (
                          <Badge className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0 shrink-0">
                            {appliedOffer.discountType === "percentage" && `${appliedOffer.discountValue}%`}
                            {appliedOffer.discountType === "fixed_amount" &&
                              formatCurrencyTRY(appliedOffer.discountValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            {appliedOffer.discountType === "bogo" && "BOGO"}
                          </Badge>
                        )}
                        {suggestedItemIds.has(item.id) && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      {/* Dotted line + Price */}
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <div className="flex-1 border-b border-dotted border-red-300 dark:border-red-700 translate-y-[-2px]" />
                        <div className="shrink-0 font-bold text-base">
                          {hasDiscount ? (
                            <span className="flex items-baseline gap-1">
                              <span className="text-red-500">
                                {formatCurrencyTRY(discountedUnitPrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrencyTRY(originalUnitPrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </span>
                          ) : (
                            <span>{formatCurrencyTRY(originalUnitPrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      {item.reasonLabel && suggestedItemIds.has(item.id) && (
                        <p className="text-[11px] text-primary mt-0.5">{item.reasonLabel}</p>
                      )}
                      {getNutritionParts(item).length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {getNutritionParts(item).join(" · ")}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.isVegan && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Leaf className="w-2.5 h-2.5 mr-0.5" /> Vegan
                          </Badge>
                        )}
                        {item.isVegetarian && !item.isVegan && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Leaf className="w-2.5 h-2.5 mr-0.5" /> Vegetarian
                          </Badge>
                        )}
                        {item.isGlutenFree && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <WheatOff className="w-2.5 h-2.5 mr-0.5" /> GF
                          </Badge>
                        )}
                        {item.isSpicy && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Flame className="w-2.5 h-2.5 mr-0.5" /> Spicy
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-6">
                  {activeCategory === "All" ? (
                    // Grouped view: items organized under category headers
                    categoryOrder.map((catName) => {
                      const items = groupedByCategory[catName];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={catName}>
                          <h2 className="text-xl font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 pb-1 mb-2">
                            {catName}
                          </h2>
                          <div className="divide-y divide-muted">
                            {items.map(renderMenuItem)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Single category: just list items
                    <div className="divide-y divide-muted">
                      {filteredItems.map(renderMenuItem)}
                    </div>
                  )}
                </div>
              );
            })()}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No items match your filters</p>
                {isFilterApplied && (
                  <Button variant="ghost" onClick={() => setIsFilterApplied(false)} className="underline">
                    Clear myFilter
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && !isGuest && (
          <div className="space-y-6">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="font-semibold text-lg">Today's Orders</h2>
                  {todayOrders.length === 0 ? (
                    <Card className="p-4 text-center text-muted-foreground">
                      <p>No orders today yet</p>
                    </Card>
                  ) : (
                    todayOrders.map((order) => {
                      const StatusIcon = statusIcons[order.status];
                      return (
                        <Card key={order.id} className={`p-4 border-l-4 ${getStatusColor(order.status)}`} data-testid={`card-order-${order.id}`}>
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                            <div>
                              <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={order.status === "delivered" ? "outline" : "default"}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusLabels[order.status]}
                              </Badge>
                              {order.paymentStatus === "paid" && (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Paid
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="text-muted-foreground">{formatCurrencyTRY(parseFloat(item.unitPrice) * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold">{formatCurrencyTRY(order.totalAmount)}</span>
                          </div>
                          {order.paymentStatus === "paid" && !submittedFeedbackOrders.has(order.id) && (
                            <div className="mt-3 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  setFeedbackOrderId(order.id);
                                  setFeedbackRatings({ speed: 0, service: 0, taste: 0 });
                                  setFeedbackComment("");
                                }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Rate Your Order
                              </Button>
                            </div>
                          )}
                          {submittedFeedbackOrders.has(order.id) && (
                            <div className="mt-3 pt-2 border-t text-center text-sm text-green-600 flex items-center justify-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Thanks for your feedback!
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>

                {pastOrders.length > 0 && (
                  <Collapsible open={isPastOrdersOpen} onOpenChange={setIsPastOrdersOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-past-orders">
                        {isPastOrdersOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                        View Past Orders ({pastOrders.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      {pastOrders.map((order) => {
                        const StatusIcon = statusIcons[order.status];
                        return (
                          <Card key={order.id} className={`p-4 border-l-4 ${getStatusColor(order.status)} opacity-75`} data-testid={`card-past-order-${order.id}`}>
                            <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                              <div>
                                <h3 className="font-bold">Order #{order.orderNumber}</h3>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <Badge variant="outline">
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusLabels[order.status]}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{order.items.length} items</span>
                              <span className="font-semibold">{formatCurrencyTRY(order.totalAmount)}</span>
                            </div>
                          </Card>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Nutritional Summary</h2>
                    <div className="flex gap-1">
                      <Button
                        variant={nutritionView === "daily" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNutritionView("daily")}
                        data-testid="button-daily-nutrition"
                      >
                        Daily
                      </Button>
                      <Button
                        variant={nutritionView === "weekly" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNutritionView("weekly")}
                        data-testid="button-weekly-nutrition"
                      >
                        Weekly
                      </Button>
                      <Button
                        variant={nutritionView === "monthly" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNutritionView("monthly")}
                        data-testid="button-monthly-nutrition"
                      >
                        Monthly
                      </Button>
                    </div>
                  </div>
                  <Card className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">
                          {nutritionView === "daily"
                            ? dailyNutrition.calories
                            : nutritionView === "weekly"
                              ? weeklyNutrition.calories
                              : avg30DayNutrition.calories.toFixed(0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Calories</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {(
                            nutritionView === "daily"
                              ? dailyNutrition.protein
                              : nutritionView === "weekly"
                                ? weeklyNutrition.protein
                                : avg30DayNutrition.protein
                          ).toFixed(1)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Protein</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {(
                            nutritionView === "daily"
                              ? dailyNutrition.carbs
                              : nutritionView === "weekly"
                                ? weeklyNutrition.carbs
                                : avg30DayNutrition.carbs
                          ).toFixed(1)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Carbs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {(
                            nutritionView === "daily"
                              ? dailyNutrition.fat
                              : nutritionView === "weekly"
                                ? weeklyNutrition.fat
                                : avg30DayNutrition.fat
                          ).toFixed(1)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Fat</p>
                      </div>
                    </div>
                  </Card>
                  {nutritionView === "daily" ? (
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Daily calorie goal</p>
                          <p className="text-lg font-semibold">{dailyCalories.toFixed(0)} cal today</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsCalorieGoalOpen(true)}>
                          Set goal
                        </Button>
                      </div>
                    {dailyCalorieTargetMax ? (
                      <>
                        <Progress value={targetProgress} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                          <span>Goal: {dailyCalorieTargetMax} cal</span>
                          <span>{Math.round(targetProgress)}%</span>
                        </div>
                        <div className="mt-3 text-sm">
                          {remainingToMax !== null && remainingToMax >= 0 ? (
                            <span>{Math.round(remainingToMax)} cal remaining</span>
                          ) : (
                            <span className="text-destructive">Over by {Math.abs(Math.round(remainingToMax || 0))} cal</span>
                          )}
                          {remainingToMin !== null && remainingToMin > 0 ? (
                            <span className="ml-2 text-muted-foreground">
                              ({Math.round(remainingToMin)} cal below minimum)
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Set a daily calorie target to get limit alerts.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground">
                      <div>
                        Today vs 7-day avg:{" "}
                        <span className={todayVsAvg7 >= 0 ? "text-foreground" : "text-foreground"}>
                          {todayVsAvg7 >= 0 ? "+" : ""}{todayVsAvg7.toFixed(0)} cal
                        </span>
                      </div>
                      <div>
                        Today vs 30-day avg:{" "}
                        <span className={todayVsAvg30 >= 0 ? "text-foreground" : "text-foreground"}>
                          {todayVsAvg30 >= 0 ? "+" : ""}{todayVsAvg30.toFixed(0)} cal
                        </span>
                      </div>
                    </div>
                    </Card>
                  ) : null}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Macro breakdown</p>
                        <p className="text-base font-semibold">
                          {nutritionView === "daily" ? "Today" : nutritionView === "weekly" ? "Last 7 days" : "Last 30 days"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {macroTotal > 0 ? `${macroTotal.toFixed(0)}g total` : "No macros yet"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {macroEntries.map((macro) => {
                        const percent = macroTotal > 0 ? (macro.value / macroTotal) * 100 : 0;
                        return (
                          <div key={macro.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>{macro.label}</span>
                              <span className="text-muted-foreground">{macro.value.toFixed(1)}g</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-secondary">
                              <div className={`h-2 rounded-full ${macro.color}`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                  {nutritionView !== "daily" ? (
                    <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Calories trend</p>
                        <p className="text-base font-semibold">
                          {nutritionView === "weekly" ? "Last 7 days" : "Last 30 days"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">per day</span>
                    </div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={nutritionView === "weekly" ? last30DailyNutrition.slice(-7) : last30DailyNutrition}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Tooltip
                            formatter={(value) => `${Number(value).toFixed(0)} cal`}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="calories"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    </Card>
                  ) : null}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nutritionView === "weekly" ? (
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground mb-3">Last 7 days average (per day)</p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div>
                            <p className="text-lg font-semibold">{avg7DayNutrition.calories.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Calories</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg7DayNutrition.protein.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Protein</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg7DayNutrition.carbs.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Carbs</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg7DayNutrition.fat.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Fat</p>
                          </div>
                        </div>
                      </Card>
                    ) : null}
                    {nutritionView === "monthly" ? (
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground mb-3">Last 30 days average (per day)</p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div>
                            <p className="text-lg font-semibold">{avg30DayNutrition.calories.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">Calories</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg30DayNutrition.protein.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Protein</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg30DayNutrition.carbs.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Carbs</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{avg30DayNutrition.fat.toFixed(1)}g</p>
                            <p className="text-xs text-muted-foreground">Fat</p>
                          </div>
                        </div>
                      </Card>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "orders" && isGuest && (
          <div className="space-y-6">
            {isLoadingGuestOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Active Orders</h2>
                {guestOrders.length === 0 ? (
                  <Card className="p-4 text-center text-muted-foreground">
                    <p>No active orders yet</p>
                  </Card>
                ) : (
                  guestOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status];
                    return (
                      <Card key={order.id} className={`p-4 border-l-4 ${getStatusColor(order.status)}`} data-testid={`card-order-${order.id}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                          <div>
                            <h3 className="font-bold text-lg">Order #{order.orderNumber}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={order.status === "delivered" ? "outline" : "default"}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabels[order.status]}
                            </Badge>
                            {order.paymentStatus === "paid" && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 mb-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              {item.unitPrice ? (
                                <span className="text-muted-foreground">
                                  {formatCurrencyTRY(parseFloat(item.unitPrice) * item.quantity)}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {order.totalAmount ? (
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold">{formatCurrencyTRY(order.totalAmount)}</span>
                          </div>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CartButton itemCount={cartItemCount} total={cartTotal * 1.1} onClick={() => setIsCartOpen(true)} />

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
        onCheckout={handleCheckout}
        tableNumber={tableNumber}
      />

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="aspect-video overflow-hidden rounded-lg">
                  <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-muted-foreground">{selectedItem.description}</p>
                {getNutritionParts(selectedItem).length > 0 && (
                  <div className="flex gap-4 text-sm">
                    {getNutritionParts(selectedItem).map((part) => (
                      <span key={part}>{part}</span>
                    ))}
                  </div>
                )}
                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Allergens: </span>
                    <span className="text-muted-foreground">{selectedItem.allergens.join(", ")}</span>
                  </div>
                )}
                {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-medium text-sm">Customize:</span>
                    {selectedItem.modifiers.map((modifier) => (
                      <div key={modifier.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={modifier.id}
                            checked={selectedModifiers.includes(modifier.id)}
                            onCheckedChange={() => toggleModifier(modifier.id)}
                          />
                          <Label htmlFor={modifier.id} className="cursor-pointer">{modifier.name}</Label>
                        </div>
                        <span className="text-sm text-muted-foreground">+{formatCurrencyTRY(modifier.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center gap-4">
                  <Button size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={handleAddToCart}>
                  Add to Cart - {formatCurrencyTRY(calculateTotal())}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {!isGuest && (
        <PreferencesDialog
          open={isPreferencesOpen}
          onOpenChange={setIsPreferencesOpen}
          preferences={preferences}
          onSave={(prefs) => {
            const cleanedPrefs: CustomerPreferences = {
              dietaryRestrictions: prefs.dietaryRestrictions ?? [],
              calorieTargetMin: prefs.calorieTargetMin,
              calorieTargetMax: prefs.calorieTargetMax,
              preferSpicy: prefs.preferSpicy ?? false,
              avoidSpicy: prefs.avoidSpicy ?? false,
              allergensToAvoid: [],
              dislikedIngredients: [],
              preferredCuisines: [],
              preferredProteins: [],
              preferredCookingMethods: [],
              mealTypes: [],
              beveragePreferences: [],
              avoidAlcohol: false,
              avoidCaffeine: false,
              lowSodium: false,
              lowSugar: false,
              highProtein: false,
              lowCarb: false,
              preferOrganic: false,
              preferLocallySourced: false,
            };
            updatePreferencesMutation.mutate(cleanedPrefs);
          }}
          isSaving={updatePreferencesMutation.isPending}
        />
      )}
      {!isGuest && (
        <CalorieGoalDialog
          open={isCalorieGoalOpen}
          onOpenChange={setIsCalorieGoalOpen}
          preferences={preferences}
          onSave={(prefs) => {
            const cleanedPrefs: CustomerPreferences = {
              calorieTargetMin: prefs.calorieTargetMin,
              calorieTargetMax: prefs.calorieTargetMax,
            };
            updatePreferencesMutation.mutate(cleanedPrefs);
          }}
          isSaving={updatePreferencesMutation.isPending}
        />
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackOrderId !== null} onOpenChange={(open) => { if (!open) setFeedbackOrderId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
            <DialogDescription>
              How was your experience? Rate each category from 1 to 5 stars.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <StarRating
              label="Speed"
              value={feedbackRatings.speed}
              onChange={(v) => setFeedbackRatings((prev) => ({ ...prev, speed: v }))}
            />
            <StarRating
              label="Service"
              value={feedbackRatings.service}
              onChange={(v) => setFeedbackRatings((prev) => ({ ...prev, service: v }))}
            />
            <StarRating
              label="Taste"
              value={feedbackRatings.taste}
              onChange={(v) => setFeedbackRatings((prev) => ({ ...prev, taste: v }))}
            />
            <div className="space-y-1">
              <Label className="text-sm font-medium">Comment (optional)</Label>
              <Textarea
                placeholder="Any additional feedback..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOrderId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: CustomerPreferences;
  onSave: (prefs: CustomerPreferences) => void;
  isSaving: boolean;
}

function PreferencesDialog({ open, onOpenChange, preferences, onSave, isSaving }: PreferencesDialogProps) {
  const [localPrefs, setLocalPrefs] = useState<CustomerPreferences>(preferences);

  const toggleArrayItem = (key: keyof CustomerPreferences, item: string) => {
    const currentArray = (localPrefs[key] as string[]) || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    setLocalPrefs({ ...localPrefs, [key]: newArray });
  };

  const handleNumberChange = (key: keyof CustomerPreferences, value: string) => {
    const parsed = value === "" ? undefined : Number(value);
    setLocalPrefs({
      ...localPrefs,
      [key]: Number.isNaN(parsed) ? undefined : parsed,
    });
  };

  const setSpicyPreference = (preference: "spicy" | "no_spicy") => {
    if (preference === "spicy") {
      const nextPrefer = !localPrefs.preferSpicy;
      setLocalPrefs({
        ...localPrefs,
        preferSpicy: nextPrefer || undefined,
        avoidSpicy: undefined,
      });
      return;
    }
    const nextAvoid = !localPrefs.avoidSpicy;
    setLocalPrefs({
      ...localPrefs,
      avoidSpicy: nextAvoid || undefined,
      preferSpicy: undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>myFilter Preferences</DialogTitle>
          <DialogDescription>
            Set your dietary preferences and restrictions. These will be applied when you use the "Apply myFilter" button.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Dietary Restrictions</h3>
              <div className="flex flex-wrap gap-2">
                {DIETARY_RESTRICTIONS.filter((diet) => diet === "vegan" || diet === "gluten_free").map((diet) => (
                  <Badge
                    key={diet}
                    variant={localPrefs.dietaryRestrictions?.includes(diet) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("dietaryRestrictions", diet)}
                  >
                    {diet.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Spicy Preference</h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={localPrefs.preferSpicy ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSpicyPreference("spicy")}
                >
                  Spicy
                </Badge>
                <Badge
                  variant={localPrefs.avoidSpicy ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSpicyPreference("no_spicy")}
                >
                  No Spicy
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Calorie Preference</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calorie-min">Minimum Calories</Label>
                  <Input
                    id="calorie-min"
                    type="number"
                    min="0"
                    placeholder="e.g. 300"
                    value={localPrefs.calorieTargetMin ?? ""}
                    onChange={(e) => handleNumberChange("calorieTargetMin", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorie-max">Maximum Calories</Label>
                  <Input
                    id="calorie-max"
                    type="number"
                    min="0"
                    placeholder="e.g. 700"
                    value={localPrefs.calorieTargetMax ?? ""}
                    onChange={(e) => handleNumberChange("calorieTargetMax", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(localPrefs)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CalorieGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: CustomerPreferences;
  onSave: (prefs: CustomerPreferences) => void;
  isSaving: boolean;
}

function CalorieGoalDialog({ open, onOpenChange, preferences, onSave, isSaving }: CalorieGoalDialogProps) {
  const [localPrefs, setLocalPrefs] = useState<CustomerPreferences>(preferences);

  const handleNumberChange = (key: keyof CustomerPreferences, value: string) => {
    const parsed = value === "" ? undefined : Number(value);
    setLocalPrefs({
      ...localPrefs,
      [key]: Number.isNaN(parsed) ? undefined : parsed,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Calorie Goal</DialogTitle>
          <DialogDescription>
            Set your daily calorie range to get limit alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="goal-calorie-min">Minimum Calories</Label>
            <Input
              id="goal-calorie-min"
              type="number"
              min="0"
              placeholder="e.g. 300"
              value={localPrefs.calorieTargetMin ?? ""}
              onChange={(e) => handleNumberChange("calorieTargetMin", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-calorie-max">Maximum Calories</Label>
            <Input
              id="goal-calorie-max"
              type="number"
              min="0"
              placeholder="e.g. 700"
              value={localPrefs.calorieTargetMax ?? ""}
              onChange={(e) => handleNumberChange("calorieTargetMax", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(localPrefs)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
