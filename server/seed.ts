import { db } from "./db";
import { menuItems, modifiers, restaurantTables, categories } from "@shared/schema";

const categoryData = [
  { name: "Starters" },
  { name: "Mains" },
  { name: "Desserts" },
  { name: "Drinks" },
];

const menuData = [
  {
    name: "Classic Beef Burger",
    description: "Juicy beef patty with melted cheese, fresh lettuce, tomato, and our special sauce",
    price: "14.99",
    imageUrl: "/menu/burger.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { name: "Extra Cheese", additionalCost: "1.50" },
      { name: "Add Bacon", additionalCost: "2.00" },
    ],
  },
  {
    name: "Pasta Carbonara",
    description: "Creamy pasta with crispy bacon, parmesan cheese, and fresh parsley",
    price: "16.99",
    imageUrl: "/menu/pasta.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy", "Eggs"],
    modifiers: [
      { name: "Extra Bacon", additionalCost: "2.50" },
    ],
  },
  {
    name: "Caesar Salad",
    description: "Fresh romaine lettuce with croutons, parmesan, and creamy Caesar dressing",
    price: "11.99",
    imageUrl: "/menu/salad.png",
    category: "Starters",
    isVegan: false,
    isGlutenFree: true,
    isSpicy: false,
    allergens: ["Dairy", "Fish"],
    modifiers: [
      { name: "Add Grilled Chicken", additionalCost: "4.00" },
    ],
  },
  {
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables",
    price: "22.99",
    imageUrl: "/menu/salmon.png",
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
    imageUrl: "/menu/cake.png",
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
    imageUrl: "/menu/pizza.png",
    category: "Mains",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { name: "Extra Mozzarella", additionalCost: "2.00" },
      { name: "Add Olives", additionalCost: "1.00" },
    ],
  },
];

export async function seedDatabase() {
  console.log("Seeding database...");

  // Check if menu items already exist
  const existingItems = await db.select().from(menuItems);
  if (existingItems.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Seed categories
  const categoryMap: Record<string, number> = {};
  for (const cat of categoryData) {
    const [created] = await db.insert(categories).values(cat).returning();
    categoryMap[cat.name] = created.id;
  }

  // Seed menu items
  for (const item of menuData) {
    const { modifiers: itemModifiers, category, ...menuItem } = item;
    const [created] = await db.insert(menuItems).values({
      ...menuItem,
      categoryId: categoryMap[category],
    }).returning();
    
    // Add modifiers
    for (const mod of itemModifiers) {
      await db.insert(modifiers).values({
        menuItemId: created.id,
        name: mod.name,
        additionalCost: mod.additionalCost,
      });
    }
  }

  // Seed tables (1-12)
  for (let i = 1; i <= 12; i++) {
    await db.insert(restaurantTables).values({ tableNumber: i });
  }

  console.log("Database seeded successfully!");
}
