import MenuItemCard, { type MenuItem } from "../menu/MenuItemCard";
import burgerImage from "@assets/generated_images/gourmet_beef_burger_photo.png";

const sampleItem: MenuItem = {
  id: "1",
  name: "Classic Beef Burger",
  description: "Juicy beef patty with melted cheese, fresh lettuce, tomato, and our special sauce",
  price: 14.99,
  image: burgerImage,
  category: "Burgers",
  isSpicy: false,
  allergens: ["Gluten", "Dairy"],
  modifiers: [
    { id: "extra-cheese", name: "Extra Cheese", price: 1.50 },
    { id: "bacon", name: "Add Bacon", price: 2.00 },
  ],
};

export default function MenuItemCardExample() {
  return (
    <div className="w-72">
      <MenuItemCard
        item={sampleItem}
        onAddToCart={(item, qty, mods) => {
          console.log("Added to cart:", item.name, "qty:", qty, "mods:", mods);
        }}
      />
    </div>
  );
}
