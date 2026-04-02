import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import OrderFilters from "@/components/orders/OrderFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, Loader2, Bell, CreditCard, DollarSign, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useStaffEvents } from "@/lib/useStaffEvents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type OrderStatus = "new" | "in_progress" | "ready" | "delivered";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[] | null;
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

interface TableCall {
  id: number;
  tableNumber: number | null;
  status: "pending" | "acknowledged" | "resolved";
  createdAt: string;
  acknowledgedAt?: string;
}

interface WaiterDashboardProps {
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

export default function WaiterDashboard({ userName = "Waiter", onLogout }: WaiterDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | OrderStatus>("all");
  const [activeTab, setActiveTab] = useState<"orders" | "calls">("orders");
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(new Set());
  const [pendingPaymentIds, setPendingPaymentIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 25000,
  });

  const { data: tableCalls = [], isLoading: isLoadingCalls } = useQuery<TableCall[]>({
    queryKey: ["/api/table-calls"],
    refetchInterval: 25000,
  });

  useStaffEvents({
    onEvent: (event) => {
      if (event.type === "orders.updated") {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      }
      if (event.type === "table_calls.updated") {
        queryClient.invalidateQueries({ queryKey: ["/api/table-calls"] });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Delivered", description: "Order has been marked as delivered" });
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

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: string; paymentStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/payment`, { paymentStatus });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Processed", description: "Order has been marked as paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.orderId) {
        setPendingPaymentIds((prev) => {
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

  const acknowledgeCallMutation = useMutation({
    mutationFn: async (callId: number) => {
      const res = await apiRequest("PATCH", `/api/table-calls/${callId}/acknowledge`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call Acknowledged", description: "Customer has been notified" });
      queryClient.invalidateQueries({ queryKey: ["/api/table-calls"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resolveCallMutation = useMutation({
    mutationFn: async (callId: number) => {
      const res = await apiRequest("PATCH", `/api/table-calls/${callId}/resolve`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call Resolved", description: "Table call has been resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/table-calls"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setPendingStatusIds((prev) => new Set(prev).add(orderId));
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handlePayment = (orderId: string) => {
    setPendingPaymentIds((prev) => new Set(prev).add(orderId));
    updatePaymentMutation.mutate({ orderId, paymentStatus: "paid" });
  };

  const handleAcknowledgeCall = (callId: number) => {
    acknowledgeCallMutation.mutate(callId);
  };

  const handleResolveCall = (callId: number) => {
    resolveCallMutation.mutate(callId);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") {
      // Show all non-delivered orders, plus delivered orders with pending payment
      return order.status !== "delivered" || order.paymentStatus !== "paid";
    }
    return order.status === activeFilter;
  });

  const counts: Record<OrderStatus, number> = {
    new: orders.filter((o) => o.status === "new").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered" && o.paymentStatus !== "paid").length,
  };

  const getElapsedTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} mins ago`;
  };

  const sidebarStyle = { "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" };
  const pendingCalls = tableCalls.filter(c => c.status === "pending").length;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <StaffSidebar role="waiter" userName={userName} onLogout={onLogout} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Waiter Dashboard</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "orders" | "calls")}>
              <TabsList className="mb-4">
                <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
                <TabsTrigger value="calls" data-testid="tab-calls" className="relative">
                  Table Calls
                  {pendingCalls > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCalls}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <div className="mb-4">
                  <OrderFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => (
                      <Card key={order.id} className={cn("p-4 space-y-3", statusColors[order.status])} data-testid={`card-order-${order.id}`}>
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
                          <Badge variant={order.paymentStatus === "paid" ? "outline" : "secondary"}>
                            {order.paymentStatus === "paid" ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Paid</>
                            ) : (
                              <><DollarSign className="w-3 h-3 mr-1" />Pending</>
                            )}
                          </Badge>
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
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {order.status === "ready" && (
                            <Button
                              className="flex-1"
                              onClick={() => handleStatusChange(order.id, "delivered")}
                              disabled={pendingStatusIds.has(order.id)}
                              data-testid={`button-deliver-${order.id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Deliver
                            </Button>
                          )}
                          {order.paymentStatus !== "paid" && order.status === "delivered" && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handlePayment(order.id)}
                              disabled={pendingPaymentIds.has(order.id)}
                              data-testid={`button-payment-${order.id}`}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Process Payment
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {!isLoading && filteredOrders.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No orders to display</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calls">
                {isLoadingCalls ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tableCalls.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active table calls</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tableCalls.map((call) => (
                      <Card key={call.id} className={cn("p-4 space-y-3", call.status === "pending" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500")} data-testid={`card-call-${call.id}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h3 className="font-bold text-xl">Table {call.tableNumber || "N/A"}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{getElapsedTime(call.createdAt)}</span>
                            </div>
                          </div>
                          <Badge variant={call.status === "pending" ? "destructive" : "secondary"}>
                            {call.status === "pending" ? "Waiting" : "Acknowledged"}
                          </Badge>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {call.status === "pending" && (
                            <Button
                              className="flex-1"
                              onClick={() => handleAcknowledgeCall(call.id)}
                              disabled={acknowledgeCallMutation.isPending}
                              data-testid={`button-acknowledge-${call.id}`}
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              Acknowledge
                            </Button>
                          )}
                          {call.status === "acknowledged" && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleResolveCall(call.id)}
                              disabled={resolveCallMutation.isPending}
                              data-testid={`button-resolve-${call.id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
