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
    status: "in_progress",
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    items: [
      { id: "item-1", name: "Classic Beef Burger", quantity: 2 },
      { id: "item-2", name: "Caesar Salad", quantity: 1 },
    ],
    paymentStatus: "paid",
  },
  {
    id: "order-2",
    orderNumber: "043",
    tableNumber: "3",
    status: "ready",
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    items: [
      { id: "item-3", name: "Grilled Salmon", quantity: 1 },
      { id: "item-4", name: "Margherita Pizza", quantity: 1 },
    ],
    paymentStatus: "pending",
  },
  {
    id: "order-3",
    orderNumber: "044",
    tableNumber: "12",
    status: "ready",
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
    items: [
      { id: "item-5", name: "Pasta Carbonara", quantity: 2 },
    ],
    paymentStatus: "paid",
  },
];

interface WaiterDashboardProps {
  userName?: string;
  onLogout: () => void;
}

export default function WaiterDashboard({
  userName = "Waiter",
  onLogout,
}: WaiterDashboardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const { toast } = useToast();

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    if (newStatus === "delivered") {
      toast({
        title: "Order Delivered",
        description: "Order has been marked as delivered",
      });
    }
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
        <StaffSidebar role="waiter" userName={userName} onLogout={onLogout} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Orders</h1>
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
                  showPaymentStatus={true}
                  variant="waiter"
                />
              ))}
            </div>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No orders to display</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
