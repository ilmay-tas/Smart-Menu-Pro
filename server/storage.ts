import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  staff,
  customers,
  menuItems,
  modifiers,
  orderTickets,
  orderItems,
  restaurantTables,
  categories,
  type Staff,
  type InsertStaff,
  type Customer,
  type InsertCustomer,
  type MenuItem,
  type InsertMenuItem,
  type Modifier,
  type OrderTicket,
  type OrderItem,
  type RestaurantTable,
  type Category,
} from "@shared/schema";

export interface IStorage {
  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffByUsername(username: string): Promise<Staff | undefined>;
  createStaff(data: InsertStaff): Promise<Staff>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;

  // Modifiers
  getModifiersForItem(menuItemId: number): Promise<Modifier[]>;
  createModifier(data: { name: string; additionalCost: string; menuItemId: number }): Promise<Modifier>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(name: string): Promise<Category>;

  // Tables
  getTables(): Promise<RestaurantTable[]>;
  getTableByNumber(tableNumber: number): Promise<RestaurantTable | undefined>;
  createTable(tableNumber: number): Promise<RestaurantTable>;

  // Orders
  getOrders(): Promise<(OrderTicket & { items: OrderItem[] })[]>;
  getOrder(id: number): Promise<(OrderTicket & { items: OrderItem[] }) | undefined>;
  getOrdersByStatus(status: string): Promise<(OrderTicket & { items: OrderItem[] })[]>;
  createOrder(data: { orderNumber: string; tableId: number | null; customerId: number | null; totalAmount: string }): Promise<OrderTicket>;
  updateOrderStatus(id: number, status: string): Promise<OrderTicket | undefined>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(data: { orderId: number; menuItemId: number; quantity: number; unitPrice: string; note?: string }): Promise<OrderItem>;

  // Analytics
  getTotalRevenue(): Promise<number>;
  getTotalOrders(): Promise<number>;
  getTopSellingItems(limit: number): Promise<{ name: string; orders: number; revenue: number }[]>;
  getDailyRevenue(days: number): Promise<{ date: string; revenue: number; orders: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Staff
  async getStaff(id: number): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.id, id));
    return s;
  }

  async getStaffByUsername(username: string): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.username, username));
    return s;
  }

  async createStaff(data: InsertStaff): Promise<Staff> {
    const [s] = await db.insert(staff).values(data).returning();
    return s;
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "");
    const [c] = await db.select().from(customers).where(
      sql`REGEXP_REPLACE(${customers.phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`
    );
    return c;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(data).returning();
    return c;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.isSoldOut, false));
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  // Modifiers
  async getModifiersForItem(menuItemId: number): Promise<Modifier[]> {
    return db.select().from(modifiers).where(eq(modifiers.menuItemId, menuItemId));
  }

  async createModifier(data: { name: string; additionalCost: string; menuItemId: number }): Promise<Modifier> {
    const [created] = await db.insert(modifiers).values(data).returning();
    return created;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(name: string): Promise<Category> {
    const [created] = await db.insert(categories).values({ name }).returning();
    return created;
  }

  // Tables
  async getTables(): Promise<RestaurantTable[]> {
    return db.select().from(restaurantTables);
  }

  async getTableByNumber(tableNumber: number): Promise<RestaurantTable | undefined> {
    const [table] = await db.select().from(restaurantTables).where(eq(restaurantTables.tableNumber, tableNumber));
    return table;
  }

  async createTable(tableNumber: number): Promise<RestaurantTable> {
    const [created] = await db.insert(restaurantTables).values({ tableNumber }).returning();
    return created;
  }

  // Orders
  async getOrders(): Promise<(OrderTicket & { items: OrderItem[] })[]> {
    const orders = await db.select().from(orderTickets).orderBy(desc(orderTickets.createdAt));
    return Promise.all(orders.map(async (order) => {
      const items = await this.getOrderItems(order.id);
      return { ...order, items };
    }));
  }

  async getOrder(id: number): Promise<(OrderTicket & { items: OrderItem[] }) | undefined> {
    const [order] = await db.select().from(orderTickets).where(eq(orderTickets.id, id));
    if (!order) return undefined;
    const items = await this.getOrderItems(order.id);
    return { ...order, items };
  }

  async getOrdersByStatus(status: string): Promise<(OrderTicket & { items: OrderItem[] })[]> {
    const orders = await db.select().from(orderTickets)
      .where(eq(orderTickets.status, status as any))
      .orderBy(desc(orderTickets.createdAt));
    return Promise.all(orders.map(async (order) => {
      const items = await this.getOrderItems(order.id);
      return { ...order, items };
    }));
  }

  async createOrder(data: { orderNumber: string; tableId: number | null; customerId: number | null; totalAmount: string }): Promise<OrderTicket> {
    const [created] = await db.insert(orderTickets).values(data).returning();
    return created;
  }

  async updateOrderStatus(id: number, status: string): Promise<OrderTicket | undefined> {
    const completedAt = status === "delivered" ? new Date() : undefined;
    const [updated] = await db.update(orderTickets)
      .set({ status: status as any, completedAt })
      .where(eq(orderTickets.id, id))
      .returning();
    return updated;
  }

  // Order Items
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(data: { orderId: number; menuItemId: number; quantity: number; unitPrice: string; note?: string }): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(data).returning();
    return created;
  }

  // Analytics
  async getTotalRevenue(): Promise<number> {
    const result = await db.execute(sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM order_tickets`);
    return parseFloat((result.rows[0] as any)?.total || "0");
  }

  async getTotalOrders(): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM order_tickets`);
    return parseInt((result.rows[0] as any)?.count || "0");
  }

  async getTopSellingItems(limit: number): Promise<{ name: string; orders: number; revenue: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        oi.menu_item_id,
        mi.name,
        CAST(SUM(oi.quantity) AS INTEGER) as orders,
        CAST(SUM(CAST(oi.unit_price AS DECIMAL) * oi.quantity) AS DECIMAL) as revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      GROUP BY oi.menu_item_id, mi.name
      ORDER BY orders DESC
      LIMIT ${limit}
    `);
    return result.rows.map((row: any) => ({
      name: row.name,
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
    }));
  }

  async getDailyRevenue(days: number): Promise<{ date: string; revenue: number; orders: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'Dy') as date,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as revenue,
        COUNT(*) as orders
      FROM order_tickets
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
      ORDER BY DATE(created_at)
    `);
    return result.rows.map((row: any) => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
    }));
  }
}

export const storage = new DatabaseStorage();
