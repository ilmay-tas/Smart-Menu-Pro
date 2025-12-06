import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users,
  menuItems,
  menuModifiers,
  orders,
  orderItems,
  tables,
  type User,
  type InsertUser,
  type MenuItem,
  type InsertMenuItem,
  type MenuModifier,
  type InsertMenuModifier,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Table,
  type InsertTable,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Menu Modifiers
  getModifiersForItem(menuItemId: string): Promise<MenuModifier[]>;
  createModifier(modifier: InsertMenuModifier): Promise<MenuModifier>;

  // Tables
  getTables(): Promise<Table[]>;
  getTable(tableNumber: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTableOccupancy(tableNumber: string, isOccupied: boolean): Promise<void>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, status: string): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Analytics
  getDailyRevenue(days: number): Promise<{ date: string; revenue: number; orders: number }[]>;
  getTopSellingItems(limit: number): Promise<{ name: string; orders: number; revenue: number }[]>;
  getTotalRevenue(): Promise<number>;
  getTotalOrders(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "");
    const [user] = await db.select().from(users).where(
      sql`REGEXP_REPLACE(${users.phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db.insert(menuItems).values(item).returning();
    return menuItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(item).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const result = await db.update(menuItems).set({ isAvailable: false }).where(eq(menuItems.id, id));
    return true;
  }

  // Menu Modifiers
  async getModifiersForItem(menuItemId: string): Promise<MenuModifier[]> {
    return db.select().from(menuModifiers).where(eq(menuModifiers.menuItemId, menuItemId));
  }

  async createModifier(modifier: InsertMenuModifier): Promise<MenuModifier> {
    const [created] = await db.insert(menuModifiers).values(modifier).returning();
    return created;
  }

  // Tables
  async getTables(): Promise<Table[]> {
    return db.select().from(tables);
  }

  async getTable(tableNumber: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.tableNumber, tableNumber));
    return table;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [created] = await db.insert(tables).values(table).returning();
    return created;
  }

  async updateTableOccupancy(tableNumber: string, isOccupied: boolean): Promise<void> {
    await db.update(tables).set({ isOccupied }).where(eq(tables.tableNumber, tableNumber));
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.status, status as any))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ paymentStatus: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  // Analytics
  async getDailyRevenue(days: number): Promise<{ date: string; revenue: number; orders: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'Dy') as date,
        COALESCE(SUM(CAST(total AS DECIMAL)), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
      ORDER BY DATE(created_at)
    `);
    return result.rows as any;
  }

  async getTopSellingItems(limit: number): Promise<{ name: string; orders: number; revenue: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        name,
        SUM(quantity) as orders,
        SUM(CAST(price AS DECIMAL) * quantity) as revenue
      FROM order_items
      GROUP BY name
      ORDER BY orders DESC
      LIMIT ${limit}
    `);
    return result.rows as any;
  }

  async getTotalRevenue(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total FROM orders
    `);
    return parseFloat((result.rows[0] as any)?.total || "0");
  }

  async getTotalOrders(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM orders
    `);
    return parseInt((result.rows[0] as any)?.count || "0");
  }
}

export const storage = new DatabaseStorage();
