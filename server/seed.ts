import { db } from "./db";
import bcrypt from "bcryptjs";
import { menuItems, modifiers, restaurantTables, categories, staff, restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    calories: 780,
    proteinGrams: "42",
    carbsGrams: "52",
    fatGrams: "45",
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
    calories: 860,
    proteinGrams: "32",
    carbsGrams: "78",
    fatGrams: "46",
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
    calories: 420,
    proteinGrams: "12",
    carbsGrams: "24",
    fatGrams: "30",
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
    calories: 520,
    proteinGrams: "45",
    carbsGrams: "12",
    fatGrams: "32",
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
    calories: 690,
    proteinGrams: "8",
    carbsGrams: "76",
    fatGrams: "40",
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
    calories: 860,
    proteinGrams: "36",
    carbsGrams: "98",
    fatGrams: "34",
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Gluten", "Dairy"],
    modifiers: [
      { name: "Extra Mozzarella", additionalCost: "2.00" },
      { name: "Add Olives", additionalCost: "1.00" },
    ],
  },
  {
    name: "Vegan Buddha Bowl",
    description: "Quinoa, roasted veggies, chickpeas, and tahini dressing",
    price: "13.99",
    imageUrl: "/menu/buddha_bowl.png",
    category: "Mains",
    calories: 560,
    proteinGrams: "20",
    carbsGrams: "78",
    fatGrams: "18",
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isNutFree: true,
    isSpicy: false,
    allergens: [],
    modifiers: [
      { name: "Add Avocado", additionalCost: "2.00" },
    ],
  },
  {
    name: "Mediterranean Falafel Wrap",
    description: "Crispy falafel with lettuce, tomato, and garlic sauce",
    price: "12.49",
    imageUrl: "/menu/falafel_wrap.png",
    category: "Mains",
    calories: 640,
    proteinGrams: "18",
    carbsGrams: "84",
    fatGrams: "24",
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    isSpicy: false,
    allergens: ["Gluten"],
    modifiers: [
      { name: "Add Hummus", additionalCost: "1.50" },
    ],
  },
  {
    name: "Spicy Tofu Stir-Fry",
    description: "Tofu, mixed vegetables, and chili garlic sauce",
    price: "14.49",
    imageUrl: "/menu/tofu_stirfry.png",
    category: "Mains",
    calories: 510,
    proteinGrams: "28",
    carbsGrams: "48",
    fatGrams: "22",
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isSpicy: true,
    spiceLevel: "hot",
    allergens: ["Soy"],
    modifiers: [
      { name: "Extra Chili", additionalCost: "1.00" },
    ],
  },
  {
    name: "Grilled Chicken Skewers",
    description: "Lemon herb chicken with grilled peppers",
    price: "15.49",
    imageUrl: "/menu/chicken_skewers.png",
    category: "Starters",
    calories: 360,
    proteinGrams: "34",
    carbsGrams: "10",
    fatGrams: "18",
    isVegan: false,
    isGlutenFree: true,
    isHalal: true,
    isSpicy: false,
    allergens: [],
    modifiers: [
      { name: "Add Garlic Sauce", additionalCost: "1.00" },
    ],
  },
  {
    name: "Fresh Fruit Parfait",
    description: "Seasonal fruit, yogurt, and granola",
    price: "7.99",
    imageUrl: "/menu/chia_pudding.png",
    category: "Desserts",
    calories: 320,
    proteinGrams: "9",
    carbsGrams: "54",
    fatGrams: "8",
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isSpicy: false,
    allergens: ["Dairy", "Gluten"],
    modifiers: [
      { name: "Add Honey", additionalCost: "0.75" },
    ],
  },
  {
    name: "Iced Mint Lemonade",
    description: "Fresh lemon juice, mint, and sparkling water",
    price: "4.99",
    imageUrl: "/menu/lemonade.png",
    category: "Drinks",
    calories: 120,
    proteinGrams: "1",
    carbsGrams: "30",
    fatGrams: "0",
    isVegan: true,
    isGlutenFree: true,
    isDairyFree: true,
    isSpicy: false,
    isAlcoholic: false,
    isCaffeinated: false,
    allergens: [],
    modifiers: [
      { name: "Add Ginger", additionalCost: "0.50" },
    ],
  },
  {
    name: "Iced Latte",
    description: "Chilled espresso with milk and a touch of vanilla",
    price: "5.49",
    imageUrl: "/menu/iced_latte.png",
    category: "Drinks",
    calories: 180,
    proteinGrams: "8",
    carbsGrams: "22",
    fatGrams: "6",
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    isSpicy: false,
    isAlcoholic: false,
    isCaffeinated: true,
    allergens: ["Dairy"],
    modifiers: [
      { name: "Oat Milk", additionalCost: "0.75" },
    ],
  },
];

export async function seedDatabase() {
  console.log("Seeding database...");

  // Categories are no longer seeded — owners manage their own categories via the dashboard

  // Seed staff users (before restaurant & menu items so we have ownerId)
  const staffData = [
    { username: "kitchen1", password: "kitchen123", name: "Kitchen Staff", role: "kitchen" as const },
    { username: "waiter1", password: "waiter123", name: "Waiter Staff", role: "waiter" as const },
    { username: "owner1", password: "owner123", name: "Restaurant Owner", role: "owner" as const },
  ];

  let ownerId: number | null = null;
  const existingStaff = await db.select().from(staff);
  if (existingStaff.length === 0) {
    for (const staffUser of staffData) {
      const passwordHash = await bcrypt.hash(staffUser.password, 10);
      const [created] = await db.insert(staff).values({
        username: staffUser.username,
        passwordHash,
        name: staffUser.name,
        role: staffUser.role,
      }).returning();
      
      if (staffUser.role === "owner") {
        ownerId = created.id;
      }
    }
  } else {
    ownerId = existingStaff.find((user) => user.role === "owner")?.id ?? null;
  }

  // Seed default restaurant for owner (before menu items so we have restaurantId)
  let restaurantId: number | null = null;
  const existingRestaurants = await db.select().from(restaurants);
  if (existingRestaurants.length > 0) {
    restaurantId = existingRestaurants[0].id;
  } else if (ownerId) {
    const [created] = await db.insert(restaurants).values({
      name: "MyDine Restaurant",
      address: "123 Main Street, Foodville, CA 90210",
      phone: "(555) 123-4567",
      email: "info@mydine.com",
      description: "A wonderful dining experience with great food and service",
      ownerId: ownerId,
      isActive: true,
    }).returning();
    restaurantId = created.id;
  }

  // Menu items are no longer seeded — owners manage their own menus via the dashboard

  // Seed tables (1-12) for the default restaurant
  const existingTables = await db.select().from(restaurantTables);
  if (existingTables.length === 0 && restaurantId) {
    for (let i = 1; i <= 12; i++) {
      await db.insert(restaurantTables).values({ tableNumber: i, restaurantId });
    }
  }

  console.log("Database seeded successfully!");
}
