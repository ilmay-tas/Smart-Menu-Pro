import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { formatCurrencyTRY } from "@/lib/currency";

interface CartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export default function CartButton({ itemCount, total, onClick }: CartButtonProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <Button
        className="w-full h-14 shadow-lg"
        size="lg"
        onClick={onClick}
        data-testid="button-view-cart"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-primary-foreground text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span>View Cart</span>
          </div>
          <span className="font-bold" data-testid="text-cart-button-total">{formatCurrencyTRY(total)}</span>
        </div>
      </Button>
    </div>
  );
}
