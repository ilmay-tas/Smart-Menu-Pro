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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Leaf, WheatOff, Flame, Loader2, Bell, Clock, Package, CheckCircle, ChevronDown, ChevronUp, Filter, X, User, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIETARY_RESTRICTIONS,
  ALLERGENS,
  CUISINES,
  PROTEINS,
  COOKING_METHODS,
  MEAL_TYPES,
  BEVERAGES,
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
  isGlutenFree: boolean | null;
  isSpicy: boolean | null;
  allergens: string[] | null;
  modifiers: MenuModifier[];
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
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

interface OrdersWithNutritionResponse {
  todayOrders: CustomerOrderWithNutrition[];
  pastOrders: CustomerOrderWithNutrition[];
  dailyNutrition: { calories: number; protein: number; carbs: number; fat: number };
  weeklyNutrition: { calories: number; protein: number; carbs: number; fat: number };
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
  const [nutritionView, setNutritionView] = useState<"daily" | "weekly">("daily");
  const { toast } = useToast();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/filtered", isFilterApplied],
    queryFn: async () => {
      const url = isFilterApplied ? "/api/menu/filtered?applyFilter=true" : "/api/menu";
      const res = await fetch(url);
      return res.json();
    },
  });

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery<OrdersWithNutritionResponse>({
    queryKey: ["/api/customer/orders/nutrition"],
    refetchInterval: 5000,
  });

  const { data: preferences = {} as CustomerPreferences } = useQuery<CustomerPreferences>({
    queryKey: ["/api/customer/preferences"],
  });

  // Fetch suggested items based on order history
  const { data: suggestedData } = useQuery<{ items: MenuItem[] }>({
    queryKey: ["/api/customer/suggested"],
  });
  const suggestedItems = suggestedData?.items || [];

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
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders/nutrition"] });
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

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCategory !== "All" && item.category !== activeCategory) return false;
      if (activeFilter === "vegan" && !item.isVegan) return false;
      if (activeFilter === "glutenFree" && !item.isGlutenFree) return false;
      if (activeFilter === "spicy" && !item.isSpicy) return false;
      return true;
    });
  }, [menuItems, activeFilter, activeCategory]);

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const modifierDetails = selectedItem.modifiers?.filter((m) =>
      selectedModifiers.includes(m.id)
    ) || [];
    const modifierTotal = modifierDetails.reduce((sum, m) => sum + parseFloat(m.price), 0);
    const itemPrice = parseFloat(selectedItem.price) + modifierTotal;

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
    let total = parseFloat(selectedItem.price) * quantity;
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
              <DropdownMenuItem onClick={() => setIsPreferencesOpen(true)} data-testid="button-my-filter">
                <Settings className="w-4 h-4 mr-2" />
                myFilter Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
                {todayOrders.filter(o => o.status !== "delivered").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {todayOrders.filter(o => o.status !== "delivered").length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
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
          </div>
        </div>

        {activeTab === "menu" && (
          <>
            {/* Suggested for You Section */}
            {suggestedItems.length > 0 && (
              <div className="space-y-3" data-testid="section-suggested">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Suggested for You
                </h2>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {suggestedItems.map((item) => (
                      <Card
                        key={item.id}
                        className="min-w-[200px] max-w-[200px] overflow-hidden hover-elevate active-elevate-2 cursor-pointer flex-shrink-0"
                        onClick={() => setSelectedItem(item)}
                        data-testid={`card-suggested-item-${item.id}`}
                      >
                        <div className="h-28 overflow-hidden">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-sm truncate">{item.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold">${parseFloat(item.price).toFixed(2)}</span>
                            {item.calories && (
                              <span className="text-xs text-muted-foreground">{item.calories} cal</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                <Separator />
              </div>
            )}

            <DietaryFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                  data-testid={`card-menu-item-${item.id}`}
                >
                  <div className="aspect-square overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{item.name}</h3>
                      <span className="font-bold text-base">${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    {item.calories && (
                      <p className="text-xs text-muted-foreground mt-1">{item.calories} cal</p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.isVegan && (
                        <Badge variant="secondary" className="text-xs">
                          <Leaf className="w-3 h-3 mr-1" /> Vegan
                        </Badge>
                      )}
                      {item.isGlutenFree && (
                        <Badge variant="secondary" className="text-xs">
                          <WheatOff className="w-3 h-3 mr-1" /> GF
                        </Badge>
                      )}
                      {item.isSpicy && (
                        <Badge variant="secondary" className="text-xs">
                          <Flame className="w-3 h-3 mr-1" /> Spicy
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

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

        {activeTab === "orders" && (
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
                            <Badge variant={order.status === "delivered" ? "outline" : "default"}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabels[order.status]}
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="text-muted-foreground">${(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold">${parseFloat(order.totalAmount).toFixed(2)}</span>
                          </div>
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
                              <span className="font-semibold">${parseFloat(order.totalAmount).toFixed(2)}</span>
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
                    </div>
                  </div>
                  <Card className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{nutritionView === "daily" ? dailyNutrition.calories : weeklyNutrition.calories}</p>
                        <p className="text-sm text-muted-foreground">Calories</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{(nutritionView === "daily" ? dailyNutrition.protein : weeklyNutrition.protein).toFixed(1)}g</p>
                        <p className="text-sm text-muted-foreground">Protein</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{(nutritionView === "daily" ? dailyNutrition.carbs : weeklyNutrition.carbs).toFixed(1)}g</p>
                        <p className="text-sm text-muted-foreground">Carbs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{(nutritionView === "daily" ? dailyNutrition.fat : weeklyNutrition.fat).toFixed(1)}g</p>
                        <p className="text-sm text-muted-foreground">Fat</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
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
                {selectedItem.calories && (
                  <div className="flex gap-4 text-sm">
                    <span>{selectedItem.calories} cal</span>
                    {selectedItem.protein && <span>{selectedItem.protein}g protein</span>}
                    {selectedItem.carbs && <span>{selectedItem.carbs}g carbs</span>}
                    {selectedItem.fat && <span>{selectedItem.fat}g fat</span>}
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
                        <span className="text-sm text-muted-foreground">+${parseFloat(modifier.price).toFixed(2)}</span>
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
                  Add to Cart - ${calculateTotal().toFixed(2)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PreferencesDialog
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
        preferences={preferences}
        onSave={(prefs) => updatePreferencesMutation.mutate(prefs)}
        isSaving={updatePreferencesMutation.isPending}
      />
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

  const toggleBoolean = (key: keyof CustomerPreferences) => {
    setLocalPrefs({ ...localPrefs, [key]: !localPrefs[key] });
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
                {DIETARY_RESTRICTIONS.filter(d => d !== "none").map((diet) => (
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
              <h3 className="font-semibold mb-3">Allergens to Avoid</h3>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.filter(a => a !== "none").map((allergen) => (
                  <Badge
                    key={allergen}
                    variant={localPrefs.allergensToAvoid?.includes(allergen) ? "destructive" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("allergensToAvoid", allergen)}
                  >
                    {allergen.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Preferred Cuisines</h3>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={localPrefs.preferredCuisines?.includes(cuisine) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("preferredCuisines", cuisine)}
                  >
                    {cuisine.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Preferred Proteins</h3>
              <div className="flex flex-wrap gap-2">
                {PROTEINS.map((protein) => (
                  <Badge
                    key={protein}
                    variant={localPrefs.preferredProteins?.includes(protein) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("preferredProteins", protein)}
                  >
                    {protein.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Cooking Methods</h3>
              <div className="flex flex-wrap gap-2">
                {COOKING_METHODS.map((method) => (
                  <Badge
                    key={method}
                    variant={localPrefs.preferredCookingMethods?.includes(method) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("preferredCookingMethods", method)}
                  >
                    {method.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Meal Types</h3>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((meal) => (
                  <Badge
                    key={meal}
                    variant={localPrefs.mealTypes?.includes(meal) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("mealTypes", meal)}
                  >
                    {meal.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Beverage Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {BEVERAGES.map((beverage) => (
                  <Badge
                    key={beverage}
                    variant={localPrefs.beveragePreferences?.includes(beverage) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleArrayItem("beveragePreferences", beverage)}
                  >
                    {beverage.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Spice Tolerance</h3>
              <Select
                value={localPrefs.spiceLevel || ""}
                onValueChange={(v) => setLocalPrefs({ ...localPrefs, spiceLevel: v })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select spice level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No spice</SelectItem>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="extra_hot">Extra Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Additional Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="avoidSpicy"
                    checked={localPrefs.avoidSpicy || false}
                    onCheckedChange={() => toggleBoolean("avoidSpicy")}
                  />
                  <Label htmlFor="avoidSpicy">Avoid Spicy Food</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="avoidAlcohol"
                    checked={localPrefs.avoidAlcohol || false}
                    onCheckedChange={() => toggleBoolean("avoidAlcohol")}
                  />
                  <Label htmlFor="avoidAlcohol">Avoid Alcohol</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="avoidCaffeine"
                    checked={localPrefs.avoidCaffeine || false}
                    onCheckedChange={() => toggleBoolean("avoidCaffeine")}
                  />
                  <Label htmlFor="avoidCaffeine">Avoid Caffeine</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lowSodium"
                    checked={localPrefs.lowSodium || false}
                    onCheckedChange={() => toggleBoolean("lowSodium")}
                  />
                  <Label htmlFor="lowSodium">Low Sodium</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lowSugar"
                    checked={localPrefs.lowSugar || false}
                    onCheckedChange={() => toggleBoolean("lowSugar")}
                  />
                  <Label htmlFor="lowSugar">Low Sugar</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="highProtein"
                    checked={localPrefs.highProtein || false}
                    onCheckedChange={() => toggleBoolean("highProtein")}
                  />
                  <Label htmlFor="highProtein">High Protein</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lowCarb"
                    checked={localPrefs.lowCarb || false}
                    onCheckedChange={() => toggleBoolean("lowCarb")}
                  />
                  <Label htmlFor="lowCarb">Low Carb</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="preferOrganic"
                    checked={localPrefs.preferOrganic || false}
                    onCheckedChange={() => toggleBoolean("preferOrganic")}
                  />
                  <Label htmlFor="preferOrganic">Prefer Organic</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="preferLocallySourced"
                    checked={localPrefs.preferLocallySourced || false}
                    onCheckedChange={() => toggleBoolean("preferLocallySourced")}
                  />
                  <Label htmlFor="preferLocallySourced">Prefer Locally Sourced</Label>
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
