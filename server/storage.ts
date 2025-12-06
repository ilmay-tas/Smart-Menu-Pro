import { db } from "./db";
import { eq, desc, sql, and, ne, gte } from "drizzle-orm";
import {
  staff,
  customers,
  menuItems,
  modifiers,
  orderTickets,
  orderItems,
  restaurantTables,
  categories,
  tableCalls,
  restaurants,
  customerPreferences,
  staffRestaurantAssignments,
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
  type TableCall,
  type InsertTableCall,
  type Restaurant,
  type InsertRestaurant,
  type CustomerPreference,
  type InsertCustomerPreference,
  type StaffRestaurantAssignment,
  type InsertStaffRestaurantAssignment,
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

  // Payment
  updatePaymentStatus(orderId: number, paymentStatus: string): Promise<OrderTicket | undefined>;

  // Table Calls
  getActiveCalls(): Promise<TableCall[]>;
  getCallsByTable(tableId: number): Promise<TableCall[]>;
  createTableCall(data: InsertTableCall): Promise<TableCall>;
  acknowledgeCall(callId: number, staffId: number): Promise<TableCall | undefined>;
  resolveCall(callId: number): Promise<TableCall | undefined>;

  // Customer Orders
  getOrdersByCustomer(customerId: number): Promise<(OrderTicket & { items: OrderItem[] })[]>;

  // Analytics
  getTotalRevenue(): Promise<number>;
  getTotalOrders(): Promise<number>;
  getTopSellingItems(limit: number): Promise<{ name: string; orders: number; revenue: number }[]>;
  getDailyRevenue(days: number): Promise<{ date: string; revenue: number; orders: number }[]>;

  // Restaurants
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(data: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;

  // Customer Preferences
  getCustomerPreferences(customerId: number): Promise<CustomerPreference | undefined>;
  upsertCustomerPreferences(customerId: number, data: Partial<InsertCustomerPreference>): Promise<CustomerPreference>;

  // Staff Restaurant Assignments
  getStaffAssignment(staffId: number, restaurantId: number): Promise<StaffRestaurantAssignment | undefined>;
  getStaffAssignmentsByRestaurant(restaurantId: number): Promise<(StaffRestaurantAssignment & { staff: Staff })[]>;
  getApprovedAssignmentForStaff(staffId: number): Promise<StaffRestaurantAssignment | undefined>;
  createStaffAssignment(data: InsertStaffRestaurantAssignment): Promise<StaffRestaurantAssignment>;
  approveStaffAssignment(assignmentId: number, approvedBy: number): Promise<StaffRestaurantAssignment | undefined>;
  revokeStaffAssignment(assignmentId: number): Promise<StaffRestaurantAssignment | undefined>;

  // Customer Orders with nutrition
  getOrdersWithNutrition(customerId: number): Promise<(OrderTicket & { items: (OrderItem & { menuItem: MenuItem })[] })[]>;
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

  // Payment
  async updatePaymentStatus(orderId: number, paymentStatus: string): Promise<OrderTicket | undefined> {
    const [updated] = await db.update(orderTickets)
      .set({ paymentStatus: paymentStatus as any })
      .where(eq(orderTickets.id, orderId))
      .returning();
    return updated;
  }

  // Table Calls
  async getActiveCalls(): Promise<TableCall[]> {
    return db.select().from(tableCalls)
      .where(ne(tableCalls.status, "resolved"))
      .orderBy(desc(tableCalls.createdAt));
  }

  async getCallsByTable(tableId: number): Promise<TableCall[]> {
    return db.select().from(tableCalls)
      .where(and(eq(tableCalls.tableId, tableId), ne(tableCalls.status, "resolved")));
  }

  async createTableCall(data: InsertTableCall): Promise<TableCall> {
    const [created] = await db.insert(tableCalls).values(data).returning();
    return created;
  }

  async acknowledgeCall(callId: number, staffId: number): Promise<TableCall | undefined> {
    const [updated] = await db.update(tableCalls)
      .set({ status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: staffId })
      .where(eq(tableCalls.id, callId))
      .returning();
    return updated;
  }

  async resolveCall(callId: number): Promise<TableCall | undefined> {
    const [updated] = await db.update(tableCalls)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(tableCalls.id, callId))
      .returning();
    return updated;
  }

  // Customer Orders
  async getOrdersByCustomer(customerId: number): Promise<(OrderTicket & { items: OrderItem[] })[]> {
    const orders = await db.select().from(orderTickets)
      .where(eq(orderTickets.customerId, customerId))
      .orderBy(desc(orderTickets.createdAt));
    return Promise.all(orders.map(async (order) => {
      const items = await this.getOrderItems(order.id);
      return { ...order, items };
    }));
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

  // Restaurants
  async getRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants).where(eq(restaurants.isActive, true));
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [r] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return r;
  }

  async createRestaurant(data: InsertRestaurant): Promise<Restaurant> {
    const [created] = await db.insert(restaurants).values(data).returning();
    return created;
  }

  async updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db.update(restaurants).set(data).where(eq(restaurants.id, id)).returning();
    return updated;
  }

  // Customer Preferences
  async getCustomerPreferences(customerId: number): Promise<CustomerPreference | undefined> {
    const [prefs] = await db.select().from(customerPreferences).where(eq(customerPreferences.customerId, customerId));
    return prefs;
  }

  async upsertCustomerPreferences(customerId: number, data: Partial<InsertCustomerPreference>): Promise<CustomerPreference> {
    const existing = await this.getCustomerPreferences(customerId);
    if (existing) {
      const [updated] = await db.update(customerPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(customerPreferences.customerId, customerId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(customerPreferences)
        .values({ ...data, customerId })
        .returning();
      return created;
    }
  }

  // Staff Restaurant Assignments
  async getStaffAssignment(staffId: number, restaurantId: number): Promise<StaffRestaurantAssignment | undefined> {
    const [assignment] = await db.select().from(staffRestaurantAssignments)
      .where(and(
        eq(staffRestaurantAssignments.staffId, staffId),
        eq(staffRestaurantAssignments.restaurantId, restaurantId)
      ));
    return assignment;
  }

  async getStaffAssignmentsByRestaurant(restaurantId: number): Promise<(StaffRestaurantAssignment & { staff: Staff })[]> {
    const assignments = await db.select().from(staffRestaurantAssignments)
      .where(eq(staffRestaurantAssignments.restaurantId, restaurantId));
    return Promise.all(assignments.map(async (assignment) => {
      const [staffMember] = await db.select().from(staff).where(eq(staff.id, assignment.staffId));
      return { ...assignment, staff: staffMember };
    }));
  }

  async getApprovedAssignmentForStaff(staffId: number): Promise<StaffRestaurantAssignment | undefined> {
    const [assignment] = await db.select().from(staffRestaurantAssignments)
      .where(and(
        eq(staffRestaurantAssignments.staffId, staffId),
        eq(staffRestaurantAssignments.status, "approved")
      ));
    return assignment;
  }

  async createStaffAssignment(data: InsertStaffRestaurantAssignment): Promise<StaffRestaurantAssignment> {
    const [created] = await db.insert(staffRestaurantAssignments).values(data).returning();
    return created;
  }

  async approveStaffAssignment(assignmentId: number, approvedBy: number): Promise<StaffRestaurantAssignment | undefined> {
    const [updated] = await db.update(staffRestaurantAssignments)
      .set({ status: "approved", approvedAt: new Date(), approvedBy })
      .where(eq(staffRestaurantAssignments.id, assignmentId))
      .returning();
    return updated;
  }

  async revokeStaffAssignment(assignmentId: number): Promise<StaffRestaurantAssignment | undefined> {
    const [updated] = await db.update(staffRestaurantAssignments)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(eq(staffRestaurantAssignments.id, assignmentId))
      .returning();
    return updated;
  }

  // Customer Orders with nutrition
  async getOrdersWithNutrition(customerId: number): Promise<(OrderTicket & { items: (OrderItem & { menuItem: MenuItem })[] })[]> {
    const orders = await db.select().from(orderTickets)
      .where(eq(orderTickets.customerId, customerId))
      .orderBy(desc(orderTickets.createdAt));
    return Promise.all(orders.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const itemsWithMenuItems = await Promise.all(items.map(async (item) => {
        const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId));
        return { ...item, menuItem };
      }));
      return { ...order, items: itemsWithMenuItems };
    }));
  }
}

export const storage = new DatabaseStorage();
