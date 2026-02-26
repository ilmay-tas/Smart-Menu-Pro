import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Leaf, WheatOff, Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrencyTRY } from "@/lib/currency";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  allergens?: string[];
  modifiers?: { id: string; name: string; price: number }[];
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity: number, modifiers: string[]) => void;
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const handleAddToCart = () => {
    onAddToCart(item, quantity, selectedModifiers);
    setIsOpen(false);
    setQuantity(1);
    setSelectedModifiers([]);
  };

  const calculateTotal = () => {
    let total = item.price * quantity;
    if (item.modifiers) {
      item.modifiers
        .filter((m) => selectedModifiers.includes(m.id))
        .forEach((m) => {
          total += m.price * quantity;
        });
    }
    return total;
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  return (
    <>
      <Card
        className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
        onClick={() => setIsOpen(true)}
        data-testid={`card-menu-item-${item.id}`}
      >
        <div className="aspect-square overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-base" data-testid={`text-item-name-${item.id}`}>
              {item.name}
            </h3>
            <span className="font-bold text-base" data-testid={`text-item-price-${item.id}`}>
              {formatCurrencyTRY(item.price)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {item.isVegan && (
              <Badge variant="secondary" className="text-xs">
                <Leaf className="w-3 h-3 mr-1" />
                Vegan
              </Badge>
            )}
            {item.isGlutenFree && (
              <Badge variant="secondary" className="text-xs">
                <WheatOff className="w-3 h-3 mr-1" />
                GF
              </Badge>
            )}
            {item.isSpicy && (
              <Badge variant="secondary" className="text-xs">
                <Flame className="w-3 h-3 mr-1" />
                Spicy
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-lg">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-muted-foreground">{item.description}</p>
            {item.allergens && item.allergens.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Allergens: </span>
                <span className="text-muted-foreground">
                  {item.allergens.join(", ")}
                </span>
              </div>
            )}
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium text-sm">Customize:</span>
                {item.modifiers.map((modifier) => (
                  <div
                    key={modifier.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={modifier.id}
                        checked={selectedModifiers.includes(modifier.id)}
                        onCheckedChange={() => toggleModifier(modifier.id)}
                        data-testid={`checkbox-modifier-${modifier.id}`}
                      />
                      <Label htmlFor={modifier.id} className="cursor-pointer">
                        {modifier.name}
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      +{formatCurrencyTRY(modifier.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                data-testid="button-decrease-quantity"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-semibold w-8 text-center" data-testid="text-quantity">
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
                data-testid="button-increase-quantity"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={handleAddToCart}
              data-testid="button-add-to-cart-confirm"
            >
              Add to Cart - {formatCurrencyTRY(calculateTotal())}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
