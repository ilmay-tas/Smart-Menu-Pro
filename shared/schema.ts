import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const staffRoleEnum = pgEnum("staff_role", ["waiter", "kitchen", "owner"]);
export const orderStatusEnum = pgEnum("order_status", ["new", "in_progress", "ready", "delivered"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid"]);

// Configuration Tables
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const kitchenStations = pgTable("kitchen_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const dietaryTags = pgTable("dietary_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  iconUrl: varchar("icon_url", { length: 500 }),
});

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  lowStockThreshold: integer("low_stock_threshold"),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  tableNumber: integer("table_number").notNull().unique(),
  qrCodeString: varchar("qr_code_string", { length: 255 }).unique(),
  isOccupied: boolean("is_occupied").default(false),
});

// Staff table (for Waiters, Kitchen, Owner)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer table (for diners using phone)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  preferences: text("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Menu Items & Composition
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  nutritionalInfo: text("nutritional_info"),
  isSoldOut: boolean("is_sold_out").default(false),
  categoryId: integer("category_id").references(() => categories.id),
  stationId: integer("station_id").references(() => kitchenStations.id),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isSpicy: boolean("is_spicy").default(false),
  allergens: text("allergens").array(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id),
  quantityRequired: decimal("quantity_required", { precision: 10, scale: 2 }),
});

export const modifiers = pgTable("modifiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).notNull(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
});

export const menuDietaryTags = pgTable("menu_dietary_tags", {
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => dietaryTags.id, { onDelete: "cascade" }),
});

// Orders & Transactions
export const orderTickets = pgTable("order_tickets", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull(),
  tableId: integer("table_id").references(() => restaurantTables.id),
  customerId: integer("customer_id").references(() => customers.id),
  status: orderStatusEnum("status").notNull().default("new"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orderTickets.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const orderItemModifiers = pgTable("order_item_modifiers", {
  orderItemId: integer("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  modifierId: integer("modifier_id").notNull().references(() => modifiers.id),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orderTickets.id, { onDelete: "cascade" }).unique(),
  rating: integer("rating"),
  comment: text("comment"),
});

// Insert Schemas
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertModifierSchema = createInsertSchema(modifiers).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertRestaurantTableSchema = createInsertSchema(restaurantTables).omit({ id: true });
export const insertOrderTicketSchema = createInsertSchema(orderTickets).omit({ id: true, createdAt: true, completedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// Types
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertModifier = z.infer<typeof insertModifierSchema>;
export type Modifier = typeof modifiers.$inferSelect;

export type Category = typeof categories.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type OrderTicket = typeof orderTickets.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

// API Request/Response Schemas
export const staffSignUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["waiter", "kitchen", "owner"]),
});

export const staffSignInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const customerSignUpSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  name: z.string().min(1, "Name is required"),
});

export const customerSignInSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export const createOrderSchema = z.object({
  tableNumber: z.number(),
  items: z.array(z.object({
    menuItemId: z.number(),
    name: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number(),
    modifierIds: z.array(z.number()).optional(),
    note: z.string().optional(),
  })),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "ready", "delivered"]),
});

export type StaffSignUpRequest = z.infer<typeof staffSignUpSchema>;
export type StaffSignInRequest = z.infer<typeof staffSignInSchema>;
export type CustomerSignUpRequest = z.infer<typeof customerSignUpSchema>;
export type CustomerSignInRequest = z.infer<typeof customerSignInSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;
