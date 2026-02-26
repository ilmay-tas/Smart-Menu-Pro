import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { formatCurrencyTRY } from "@/lib/currency";

export interface CartItemData {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  modifiers: string[];
  modifierNames: string[];
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const itemTotal = item.price * item.quantity;

  return (
    <div
      className="flex gap-3 py-3 border-b last:border-b-0"
      data-testid={`cart-item-${item.id}`}
    >
      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate" data-testid={`text-cart-item-name-${item.id}`}>
              {item.name}
            </h4>
            {item.modifierNames.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {item.modifierNames.join(", ")}
              </p>
            )}
          </div>
          <span className="font-semibold text-sm flex-shrink-0" data-testid={`text-cart-item-total-${item.id}`}>
            {formatCurrencyTRY(itemTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() =>
                item.quantity === 1
                  ? onRemove(item.id)
                  : onUpdateQuantity(item.id, item.quantity - 1)
              }
              data-testid={`button-cart-decrease-${item.id}`}
            >
              {item.quantity === 1 ? (
                <Trash2 className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
            </Button>
            <span className="text-sm font-medium w-6 text-center" data-testid={`text-cart-quantity-${item.id}`}>
              {item.quantity}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              data-testid={`button-cart-increase-${item.id}`}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onRemove(item.id)}
            data-testid={`button-cart-remove-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
