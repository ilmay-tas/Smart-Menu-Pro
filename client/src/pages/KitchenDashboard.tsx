import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import OrderTicket, { type Order, type OrderStatus } from "@/components/orders/OrderTicket";
import OrderFilters from "@/components/orders/OrderFilters";
import { useToast } from "@/hooks/use-toast";

// todo: remove mock functionality - replace with API data and WebSocket
const initialOrders: Order[] = [
  {
    id: "order-1",
    orderNumber: "042",
    tableNumber: "7",
    status: "new",
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    items: [
      { id: "item-1", name: "Classic Beef Burger", quantity: 2, modifications: ["Extra Cheese", "No Onions"] },
      { id: "item-2", name: "Caesar Salad", quantity: 1 },
    ],
  },
  {
    id: "order-2",
    orderNumber: "043",
    tableNumber: "3",
    status: "in_progress",
    createdAt: new Date(Date.now() - 8 * 60 * 1000),
    items: [
      { id: "item-3", name: "Grilled Salmon", quantity: 1 },
      { id: "item-4", name: "Margherita Pizza", quantity: 1, modifications: ["Extra Mozzarella"] },
    ],
  },
  {
    id: "order-3",
    orderNumber: "044",
    tableNumber: "12",
    status: "ready",
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    items: [
      { id: "item-5", name: "Pasta Carbonara", quantity: 2 },
      { id: "item-6", name: "Chocolate Lava Cake", quantity: 2, notes: "Nut allergy - separate plates" },
    ],
  },
  {
    id: "order-4",
    orderNumber: "045",
    tableNumber: "5",
    status: "new",
    createdAt: new Date(Date.now() - 1 * 60 * 1000),
    items: [
      { id: "item-7", name: "Classic Beef Burger", quantity: 1, modifications: ["Add Bacon"] },
    ],
  },
];

interface KitchenDashboardProps {
  userName?: string;
  onLogout: () => void;
}

export default function KitchenDashboard({
  userName = "Kitchen Staff",
  onLogout,
}: KitchenDashboardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const { toast } = useToast();

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    const statusMessages: Record<OrderStatus, string> = {
      new: "Order received",
      in_progress: "Order is being prepared",
      ready: "Order is ready for pickup",
      delivered: "Order delivered",
    };

    toast({
      title: "Order Updated",
      description: statusMessages[newStatus],
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") return order.status !== "delivered";
    return order.status === activeFilter;
  });

  const counts: Record<OrderStatus, number> = {
    new: orders.filter((o) => o.status === "new").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <StaffSidebar role="kitchen" userName={userName} onLogout={onLogout} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Kitchen Orders</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4">
            <div className="mb-4">
              <OrderFilters
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                counts={counts}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderTicket
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  variant="kitchen"
                />
              ))}
            </div>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No orders in this category</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
