import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, ChefHat, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus = "new" | "in_progress" | "ready" | "delivered";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  modifications?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  paymentStatus?: "pending" | "paid";
}

interface OrderTicketProps {
  order: Order;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  onMarkSoldOut?: (orderId: string, itemId: string) => void;
  showPaymentStatus?: boolean;
  variant?: "kitchen" | "waiter";
}

const statusColors: Record<OrderStatus, string> = {
  new: "border-l-4 border-l-blue-500",
  in_progress: "border-l-4 border-l-amber-500",
  ready: "border-l-4 border-l-green-500",
  delivered: "border-l-4 border-l-gray-400",
};

const statusBadgeVariants: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
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

export default function OrderTicket({
  order,
  onStatusChange,
  showPaymentStatus = false,
  variant = "kitchen",
}: OrderTicketProps) {
  const getElapsedTime = () => {
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - order.createdAt.getTime()) / 60000
    );
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} mins ago`;
  };

  const getNextStatus = (): OrderStatus | null => {
    switch (order.status) {
      case "new":
        return "in_progress";
      case "in_progress":
        return "ready";
      case "ready":
        return variant === "waiter" ? "delivered" : null;
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (order.status) {
      case "new":
        return "Start Preparing";
      case "in_progress":
        return "Mark Ready";
      case "ready":
        return variant === "waiter" ? "Mark Delivered" : null;
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  const actionLabel = getActionLabel();

  return (
    <Card
      className={cn("p-4 space-y-3", statusColors[order.status])}
      data-testid={`order-ticket-${order.id}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-xl" data-testid={`text-order-number-${order.id}`}>
              #{order.orderNumber}
            </h3>
            <Badge variant={statusBadgeVariants[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span data-testid={`text-table-number-${order.id}`}>Table {order.tableNumber}</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{getElapsedTime()}</span>
            </div>
          </div>
        </div>
        {showPaymentStatus && order.paymentStatus && (
          <Badge
            variant={order.paymentStatus === "paid" ? "outline" : "secondary"}
          >
            {order.paymentStatus === "paid" ? "Paid" : "Pending"}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="font-semibold text-sm min-w-[24px]" data-testid={`text-item-quantity-${item.id}`}>
              {item.quantity}x
            </span>
            <div className="flex-1">
              <span className="text-sm font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</span>
              {item.modifications && item.modifications.length > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {item.modifications.join(", ")}
                </p>
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

      {onStatusChange && nextStatus && actionLabel && (
        <Button
          className="w-full"
          onClick={() => onStatusChange(order.id, nextStatus)}
          data-testid={`button-status-change-${order.id}`}
        >
          {order.status === "new" && <ChefHat className="w-4 h-4 mr-2" />}
          {order.status === "in_progress" && <Check className="w-4 h-4 mr-2" />}
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
