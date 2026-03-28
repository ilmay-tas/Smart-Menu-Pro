import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import OrderFilters from "@/components/orders/OrderFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, ChefHat, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useStaffEvents } from "@/lib/useStaffEvents";

type OrderStatus = "new" | "in_progress" | "ready" | "delivered";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[] | null;
  notes?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  paymentStatus?: string;
}

interface KitchenDashboardProps {
  userName?: string;
  onLogout: () => void;
}

const statusColors: Record<OrderStatus, string> = {
  new: "border-l-4 border-l-blue-500",
  in_progress: "border-l-4 border-l-amber-500",
  ready: "border-l-4 border-l-green-500",
  delivered: "border-l-4 border-l-gray-400",
};

const statusBadgeVariants: Record<OrderStatus, "default" | "secondary" | "outline"> = {
  new: "default",
  in_progress: "secondary",
  ready: "outline",
  delivered: "secondary",
};

const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
};

export default function KitchenDashboard({ userName = "Kitchen Staff", onLogout }: KitchenDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 25000,
  });

  useStaffEvents({
    onEvent: (event) => {
      if (event.type === "orders.updated") {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: (_, { status }) => {
      const messages: Record<OrderStatus, string> = {
        new: "Order received",
        in_progress: "Order is being prepared",
        ready: "Order is ready for pickup",
        delivered: "Order delivered",
      };
      toast({ title: "Order Updated", description: messages[status] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.orderId) {
        setPendingStatusIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.orderId);
          return next;
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setPendingStatusIds((prev) => new Set(prev).add(orderId));
    updateStatusMutation.mutate({ orderId, status: newStatus });
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

  const getElapsedTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} mins ago`;
  };

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    switch (status) {
      case "new": return "in_progress";
      case "in_progress": return "ready";
      default: return null;
    }
  };

  const getActionLabel = (status: OrderStatus) => {
    switch (status) {
      case "new": return "Start Preparing";
      case "in_progress": return "Mark Ready";
      default: return null;
    }
  };

  const sidebarStyle = { "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" };

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
              <OrderFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  const actionLabel = getActionLabel(order.status);
                  return (
                    <Card key={order.id} className={cn("p-4 space-y-3", statusColors[order.status])}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-xl">#{order.orderNumber}</h3>
                            <Badge variant={statusBadgeVariants[order.status]}>{statusLabels[order.status]}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                            <span>Table {order.tableNumber}</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{getElapsedTime(order.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <span className="font-semibold text-sm min-w-[24px]">{item.quantity}x</span>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{item.name}</span>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <p className="text-xs text-muted-foreground italic">{item.modifiers.join(", ")}</p>
                              )}
                              {item.notes && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{item.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {nextStatus && actionLabel && (
                        <Button
                          className="w-full"
                          onClick={() => handleStatusChange(order.id, nextStatus)}
                          disabled={pendingStatusIds.has(order.id)}
                        >
                          {order.status === "new" && <ChefHat className="w-4 h-4 mr-2" />}
                          {order.status === "in_progress" && <Check className="w-4 h-4 mr-2" />}
                          {actionLabel}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            {!isLoading && filteredOrders.length === 0 && (
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
