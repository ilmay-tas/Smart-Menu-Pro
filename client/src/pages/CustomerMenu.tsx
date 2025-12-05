import { useState, useMemo } from "react";
import CustomerHeader from "@/components/layout/CustomerHeader";
import MenuItemCard, { type MenuItem } from "@/components/menu/MenuItemCard";
import DietaryFilters, { type DietaryFilter } from "@/components/menu/DietaryFilters";
import CategoryTabs from "@/components/menu/CategoryTabs";
import CartButton from "@/components/cart/CartButton";
import CartSheet from "@/components/cart/CartSheet";
import { type CartItemData } from "@/components/cart/CartItem";
import { useToast } from "@/hooks/use-toast";

import burgerImage from "@assets/generated_images/gourmet_beef_burger_photo.png";
import pastaImage from "@assets/generated_images/creamy_pasta_carbonara_photo.png";
import saladImage from "@assets/generated_images/fresh_caesar_salad_photo.png";
import salmonImage from "@assets/generated_images/grilled_salmon_fillet_photo.png";
import cakeImage from "@assets/generated_images/chocolate_lava_cake_dessert.png";
import pizzaImage from "@assets/generated_images/margherita_pizza_photo.png";

// todo: remove mock functionality - replace with API data
const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Classic Beef Burger",
    description: "Juicy beef patty with melted cheese, fresh lettuce, tomato, and our special sauce",
    price: 14.99,
    image: burgerImage,
    category: "Mains",
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { id: "extra-cheese", name: "Extra Cheese", price: 1.50 },
      { id: "bacon", name: "Add Bacon", price: 2.00 },
    ],
  },
  {
    id: "2",
    name: "Pasta Carbonara",
    description: "Creamy pasta with crispy bacon, parmesan cheese, and fresh parsley",
    price: 16.99,
    image: pastaImage,
    category: "Mains",
    allergens: ["Gluten", "Dairy", "Eggs"],
    modifiers: [
      { id: "extra-bacon", name: "Extra Bacon", price: 2.50 },
    ],
  },
  {
    id: "3",
    name: "Caesar Salad",
    description: "Fresh romaine lettuce with croutons, parmesan, and creamy Caesar dressing",
    price: 11.99,
    image: saladImage,
    category: "Starters",
    isGlutenFree: true,
    allergens: ["Dairy", "Fish"],
    modifiers: [
      { id: "grilled-chicken", name: "Add Grilled Chicken", price: 4.00 },
    ],
  },
  {
    id: "4",
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables",
    price: 22.99,
    image: salmonImage,
    category: "Mains",
    isGlutenFree: true,
    allergens: ["Fish", "Dairy"],
  },
  {
    id: "5",
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, served with vanilla ice cream",
    price: 8.99,
    image: cakeImage,
    category: "Desserts",
    allergens: ["Gluten", "Dairy", "Eggs"],
  },
  {
    id: "6",
    name: "Margherita Pizza",
    description: "Classic pizza with fresh mozzarella, tomato sauce, and basil",
    price: 15.99,
    image: pizzaImage,
    category: "Mains",
    isVegan: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { id: "extra-mozzarella", name: "Extra Mozzarella", price: 2.00 },
      { id: "olives", name: "Add Olives", price: 1.00 },
    ],
  },
];

interface CustomerMenuProps {
  tableNumber?: string;
  userName?: string;
  onLogout: () => void;
}

export default function CustomerMenu({
  tableNumber = "12",
  userName = "Guest",
  onLogout,
}: CustomerMenuProps) {
  const [activeFilter, setActiveFilter] = useState<DietaryFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  const categories = useMemo(() => {
    const cats = new Set(mockMenuItems.map((item) => item.category));
    return ["All", ...Array.from(cats)];
  }, []);

  const filteredItems = useMemo(() => {
    return mockMenuItems.filter((item) => {
      if (activeCategory !== "All" && item.category !== activeCategory) {
        return false;
      }
      if (activeFilter === "vegan" && !item.isVegan) return false;
      if (activeFilter === "glutenFree" && !item.isGlutenFree) return false;
      if (activeFilter === "spicy" && !item.isSpicy) return false;
      return true;
    });
  }, [activeFilter, activeCategory]);

  const handleAddToCart = (
    item: MenuItem,
    quantity: number,
    modifiers: string[]
  ) => {
    const modifierDetails = item.modifiers?.filter((m) =>
      modifiers.includes(m.id)
    ) || [];
    const modifierTotal = modifierDetails.reduce((sum, m) => sum + m.price, 0);

    const newCartItem: CartItemData = {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      price: item.price + modifierTotal,
      quantity,
      image: item.image,
      modifiers,
      modifierNames: modifierDetails.map((m) => m.name),
    };

    setCartItems((prev) => [...prev, newCartItem]);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${item.name} added`,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    toast({
      title: "Order Placed!",
      description: "Your order has been sent to the kitchen",
    });
    setCartItems([]);
    // todo: remove mock functionality - send order to API
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <CustomerHeader
        tableNumber={tableNumber}
        userName={userName}
        onLogout={onLogout}
      />

      <div className="px-4 py-4 space-y-4">
        <DietaryFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items match your filters</p>
          </div>
        )}
      </div>

      <CartButton
        itemCount={cartItemCount}
        total={cartTotal * 1.1}
        onClick={() => setIsCartOpen(true)}
      />

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
        onCheckout={handleCheckout}
        tableNumber={tableNumber}
      />
    </div>
  );
}
