import CartItem, { type CartItemData } from "../cart/CartItem";
import burgerImage from "@assets/generated_images/gourmet_beef_burger_photo.png";

const sampleCartItem: CartItemData = {
  id: "cart-1",
  menuItemId: "1",
  name: "Classic Beef Burger",
  price: 16.99,
  quantity: 2,
  image: burgerImage,
  modifiers: ["extra-cheese"],
  modifierNames: ["Extra Cheese"],
};

export default function CartItemExample() {
  return (
    <div className="w-80 bg-card p-4 rounded-lg">
      <CartItem
        item={sampleCartItem}
        onUpdateQuantity={(id, qty) => console.log("Update quantity:", id, qty)}
        onRemove={(id) => console.log("Remove:", id)}
      />
    </div>
  );
}
