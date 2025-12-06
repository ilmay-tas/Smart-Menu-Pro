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
import { Plus, Minus, Leaf, WheatOff, Flame, Loader2, Bell, Clock, Package, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  items: { id: string; name: string; quantity: number; unitPrice: string }[];
  status: "new" | "in_progress" | "ready" | "delivered";
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
}

interface CustomerMenuProps {
  tableNumber?: string;
  userName?: string;
  onLogout: () => void;
}

const statusLabels: Record<CustomerOrder["status"], string> = {
  new: "Order Received",
  in_progress: "Being Prepared",
  ready: "Ready for Pickup",
  delivered: "Delivered",
};

const statusIcons: Record<CustomerOrder["status"], typeof Clock> = {
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
  const { toast } = useToast();

  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: customerOrders = [], isLoading: isLoadingOrders } = useQuery<CustomerOrder[]>({
    queryKey: ["/api/customer/orders"],
    refetchInterval: 5000,
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
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
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

  const getStatusColor = (status: CustomerOrder["status"]) => {
    switch (status) {
      case "new": return "border-l-blue-500";
      case "in_progress": return "border-l-amber-500";
      case "ready": return "border-l-green-500";
      case "delivered": return "border-l-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <CustomerHeader tableNumber={tableNumber} userName={userName} onLogout={onLogout} />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "menu" | "orders")} className="flex-1">
            <TabsList>
              <TabsTrigger value="menu" data-testid="tab-menu">Menu</TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders" className="relative">
                My Orders
                {customerOrders.filter(o => o.status !== "delivered").length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {customerOrders.filter(o => o.status !== "delivered").length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            onClick={handleCallWaiter}
            disabled={callWaiterMutation.isPending}
            data-testid="button-call-waiter"
          >
            <Bell className="w-4 h-4 mr-2" />
            Call Waiter
          </Button>
        </div>

        {activeTab === "menu" && (
          <>
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
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>You haven't placed any orders yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("menu")}>
                  Browse Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((order) => {
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
                })}
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
    </div>
  );
}
