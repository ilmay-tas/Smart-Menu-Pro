import { db } from "./db";
import { menuItems, menuModifiers, tables } from "@shared/schema";

const menuData = [
  {
    name: "Classic Beef Burger",
    description: "Juicy beef patty with melted cheese, fresh lettuce, tomato, and our special sauce",
    price: "14.99",
    image: "/menu/burger.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { name: "Extra Cheese", price: "1.50" },
      { name: "Add Bacon", price: "2.00" },
    ],
  },
  {
    name: "Pasta Carbonara",
    description: "Creamy pasta with crispy bacon, parmesan cheese, and fresh parsley",
    price: "16.99",
    image: "/menu/pasta.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy", "Eggs"],
    modifiers: [
      { name: "Extra Bacon", price: "2.50" },
    ],
  },
  {
    name: "Caesar Salad",
    description: "Fresh romaine lettuce with croutons, parmesan, and creamy Caesar dressing",
    price: "11.99",
    image: "/menu/salad.png",
    category: "Starters",
    isVegan: false,
    isGlutenFree: true,
    isSpicy: false,
    allergens: ["Dairy", "Fish"],
    modifiers: [
      { name: "Add Grilled Chicken", price: "4.00" },
    ],
  },
  {
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables",
    price: "22.99",
    image: "/menu/salmon.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: true,
    isSpicy: false,
    allergens: ["Fish", "Dairy"],
    modifiers: [],
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, served with vanilla ice cream",
    price: "8.99",
    image: "/menu/cake.png",
    category: "Desserts",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy", "Eggs"],
    modifiers: [],
  },
  {
    name: "Margherita Pizza",
    description: "Classic pizza with fresh mozzarella, tomato sauce, and basil",
    price: "15.99",
    image: "/menu/pizza.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { name: "Extra Mozzarella", price: "2.00" },
      { name: "Add Olives", price: "1.00" },
    ],
  },
];

const tableNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export async function seedDatabase() {
  console.log("Seeding database...");

  // Check if menu items already exist
  const existingItems = await db.select().from(menuItems);
  if (existingItems.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Seed menu items
  for (const item of menuData) {
    const { modifiers, ...menuItem } = item;
    const [created] = await db.insert(menuItems).values(menuItem).returning();
    
    // Add modifiers for the menu item
    for (const modifier of modifiers) {
      await db.insert(menuModifiers).values({
        menuItemId: created.id,
        name: modifier.name,
        price: modifier.price,
      });
    }
  }

  // Seed tables
  for (const tableNumber of tableNumbers) {
    await db.insert(tables).values({ tableNumber, isOccupied: false });
  }

  console.log("Database seeded successfully!");
}
