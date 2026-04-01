import { db } from "./db";
import { eq, desc, sql, and, ne, gte, inArray, isNull } from "drizzle-orm";
import {
  staff,
  customers,
  menuItems,
  modifiers,
  orderTickets,
  orderItems,
  restaurantTables,
  categories,
  ingredients,
  ingredientStocks,
  recipes,
  tableCalls,
  restaurants,
  customerPreferences,
  staffRestaurantAssignments,
  feedback,
  specialOffers,
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
  type Ingredient,
  type InsertIngredient,
  type IngredientStock,
  type TableCall,
  type InsertTableCall,
  type Restaurant,
  type InsertRestaurant,
  type CustomerPreference,
  type InsertCustomerPreference,
  type StaffRestaurantAssignment,
  type InsertStaffRestaurantAssignment,
  type Feedback,
  type InsertFeedback,
  type SpecialOffer,
  type InsertSpecialOffer,
} from "@shared/schema";
import {
  rankPersonalizedMenuItems,
  type CustomerHistorySignal,
  type RankedMenuItem,
} from "./recommendation/ranking";

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
  getMenuItemsByRestaurant(restaurantId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Modifiers
  getModifiersForItem(menuItemId: number): Promise<Modifier[]>;
  createModifier(data: { name: string; additionalCost: string; menuItemId: number }): Promise<Modifier>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesByRestaurant(restaurantId: number): Promise<Category[]>;
  createCategory(name: string, restaurantId?: number): Promise<Category>;
  updateCategory(id: number, name: string): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Ingredients & Stock
  getIngredients(): Promise<Ingredient[]>;
  getIngredientByName(name: string): Promise<Ingredient | undefined>;
  createIngredient(data: InsertIngredient): Promise<Ingredient>;
  getIngredientStocksByRestaurant(restaurantId: number): Promise<IngredientStock[]>;
  upsertIngredientStock(
    restaurantId: number,
    ingredientId: number,
    data: { quantity: string | null; lowStockThreshold: string | null },
  ): Promise<IngredientStock>;

  // Recipes (menu item ingredients)
  getRecipesByMenuItem(menuItemId: number): Promise<{ ingredientId: number; quantityRequired: string | null }[]>;
  replaceRecipesForMenuItem(menuItemId: number, items: { ingredientId: number; quantityRequired: string }[]): Promise<void>;

  // Stock deduction
  deductStockForOrder(orderId: number): Promise<void>;

  // Tables
  getTables(restaurantId?: number): Promise<RestaurantTable[]>;
  getTableByNumber(tableNumber: number, restaurantId?: number): Promise<RestaurantTable | undefined>;
  createTable(tableNumber: number, restaurantId: number): Promise<RestaurantTable>;

  // Orders
  getOrders(restaurantId?: number): Promise<(OrderTicket & { items: OrderItem[] })[]>;
  getOrder(id: number): Promise<(OrderTicket & { items: OrderItem[] }) | undefined>;
  getOrdersByStatus(status: string, restaurantId?: number): Promise<(OrderTicket & { items: OrderItem[] })[]>;
  createOrder(data: { orderNumber: string; restaurantId: number; tableId: number | null; customerId: number | null; totalAmount: string }): Promise<OrderTicket>;
  updateOrderStatus(id: number, status: string): Promise<OrderTicket | undefined>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(data: { orderId: number; menuItemId: number; quantity: number; unitPrice: string; note?: string }): Promise<OrderItem>;

  // Payment
  updatePaymentStatus(orderId: number, paymentStatus: string): Promise<OrderTicket | undefined>;

  // Table Calls
  getActiveCalls(restaurantId?: number): Promise<TableCall[]>;
  getCallsByTable(tableId: number, restaurantId?: number): Promise<TableCall[]>;
  resolveAcknowledgedCallsByTable(tableId: number): Promise<number>;
  createTableCall(data: InsertTableCall): Promise<TableCall>;
  acknowledgeCall(callId: number, staffId: number): Promise<TableCall | undefined>;
  resolveCall(callId: number): Promise<TableCall | undefined>;

  // Customer Orders
  getOrdersByCustomer(customerId: number): Promise<(OrderTicket & { items: OrderItem[] })[]>;

  // Analytics
  getTotalRevenue(restaurantId?: number): Promise<number>;
  getTotalOrders(restaurantId?: number): Promise<number>;
  getTopSellingItems(limit: number, restaurantId?: number): Promise<{ name: string; orders: number; revenue: number }[]>;
  getDailyRevenue(days: number, restaurantId?: number): Promise<{ date: string; revenue: number; orders: number }[]>;

  // Restaurants
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByOwnerId(ownerId: number): Promise<Restaurant | undefined>;
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

  // Suggested items based on personalized ranking
  getSuggestedItems(customerId: number, limit?: number, restaurantId?: number): Promise<RankedMenuItem[]>;
  rankMenuItemsForCustomer(
    customerId: number,
    items: MenuItem[],
    restaurantId?: number,
    limit?: number,
    includePreferences?: boolean,
  ): Promise<RankedMenuItem[]>;
  getPopularityByItemId(restaurantId?: number): Promise<Map<number, number>>;
  getPopularItems(limit?: number, restaurantId?: number): Promise<MenuItem[]>;

  // Feedback
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  getFeedbackByOrder(orderId: number): Promise<Feedback | undefined>;
  getAggregatedFeedback(): Promise<{ avgSpeed: number; avgService: number; avgTaste: number; totalReviews: number }>;
  getRecentFeedback(limit: number): Promise<(Feedback & { orderNumber: string; tableNumber: number | null })[]>;

  // Special Offers
  getOffersByRestaurant(restaurantId: number): Promise<SpecialOffer[]>;
  getActiveOffersByRestaurant(restaurantId: number): Promise<SpecialOffer[]>;
  getAllActiveOffers(): Promise<SpecialOffer[]>;
  createOffer(data: InsertSpecialOffer): Promise<SpecialOffer>;
  updateOffer(id: number, data: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined>;
  deleteOffer(id: number): Promise<boolean>;
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

  async getMenuItemsByRestaurant(restaurantId: number): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id));
    return true;
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

  async getCategoriesByRestaurant(restaurantId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.restaurantId, restaurantId));
  }

  async createCategory(name: string, restaurantId?: number): Promise<Category> {
    const [created] = await db.insert(categories).values({ name, restaurantId: restaurantId ?? null }).returning();
    return created;
  }

  async updateCategory(id: number, name: string): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set({ name }).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Set menuItems with this category to null
    await db.update(menuItems).set({ categoryId: null }).where(eq(menuItems.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Ingredients & Stock
  async getIngredients(): Promise<Ingredient[]> {
    return db.select().from(ingredients).orderBy(ingredients.name);
  }

  async getIngredientByName(name: string): Promise<Ingredient | undefined> {
    const normalized = name.trim().toLowerCase();
    const [ingredient] = await db
      .select()
      .from(ingredients)
      .where(sql`lower(${ingredients.name}) = ${normalized}`);
    return ingredient;
  }

  async createIngredient(data: InsertIngredient): Promise<Ingredient> {
    const [created] = await db.insert(ingredients).values(data).returning();
    return created;
  }

  async getIngredientStocksByRestaurant(restaurantId: number): Promise<IngredientStock[]> {
    return db.select().from(ingredientStocks).where(eq(ingredientStocks.restaurantId, restaurantId));
  }

  async upsertIngredientStock(
    restaurantId: number,
    ingredientId: number,
    data: { quantity: string | null; lowStockThreshold: string | null },
  ): Promise<IngredientStock> {
    const [row] = await db
      .insert(ingredientStocks)
      .values({
        restaurantId,
        ingredientId,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold,
      })
      .onConflictDoUpdate({
        target: [ingredientStocks.restaurantId, ingredientStocks.ingredientId],
        set: {
          quantity: data.quantity,
          lowStockThreshold: data.lowStockThreshold,
        },
      })
      .returning();
    return row;
  }

  // Recipes (menu item ingredients)
  async getRecipesByMenuItem(menuItemId: number): Promise<{ ingredientId: number; quantityRequired: string | null }[]> {
    const rows = await db
      .select({
        ingredientId: recipes.ingredientId,
        quantityRequired: recipes.quantityRequired,
      })
      .from(recipes)
      .where(eq(recipes.menuItemId, menuItemId));
    return rows;
  }

  async replaceRecipesForMenuItem(
    menuItemId: number,
    items: { ingredientId: number; quantityRequired: string }[],
  ): Promise<void> {
    await db.delete(recipes).where(eq(recipes.menuItemId, menuItemId));
    if (items.length === 0) return;
    await db.insert(recipes).values(
      items.map((item) => ({
        menuItemId,
        ingredientId: item.ingredientId,
        quantityRequired: item.quantityRequired,
      }))
    );
  }

  async deductStockForOrder(orderId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orderTickets).where(eq(orderTickets.id, orderId));
      if (!order) {
        throw new Error("Order not found");
      }
      if (order.stockDeductedAt) {
        return;
      }

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      if (items.length === 0) {
        await tx.update(orderTickets)
          .set({ stockDeductedAt: new Date() })
          .where(and(eq(orderTickets.id, orderId), isNull(orderTickets.stockDeductedAt)));
        return;
      }

      const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)));
      const recipeRows = menuItemIds.length > 0
        ? await tx.select().from(recipes).where(inArray(recipes.menuItemId, menuItemIds))
        : [];

      if (recipeRows.length === 0) {
        await tx.update(orderTickets)
          .set({ stockDeductedAt: new Date() })
          .where(and(eq(orderTickets.id, orderId), isNull(orderTickets.stockDeductedAt)));
        return;
      }

      const recipesByMenuItem = new Map<number, typeof recipeRows>();
      for (const row of recipeRows) {
        const list = recipesByMenuItem.get(row.menuItemId) ?? [];
        list.push(row);
        recipesByMenuItem.set(row.menuItemId, list);
      }

      const requiredByIngredient = new Map<number, number>();
      for (const item of items) {
        const rows = recipesByMenuItem.get(item.menuItemId) ?? [];
        for (const row of rows) {
          const baseQty = row.quantityRequired ? Number(row.quantityRequired) : 0;
          if (!baseQty || Number.isNaN(baseQty)) continue;
          const totalQty = baseQty * item.quantity;
          if (totalQty <= 0) continue;
          requiredByIngredient.set(
            row.ingredientId,
            (requiredByIngredient.get(row.ingredientId) ?? 0) + totalQty
          );
        }
      }

      for (const [ingredientId, neededQty] of Array.from(requiredByIngredient.entries())) {
        const needed = Number(neededQty.toFixed(2));
        const [updated] = await tx.update(ingredientStocks)
          .set({ quantity: sql`${ingredientStocks.quantity} - ${needed}` })
          .where(and(
            eq(ingredientStocks.restaurantId, order.restaurantId),
            eq(ingredientStocks.ingredientId, ingredientId),
            sql`${ingredientStocks.quantity} >= ${needed}`
          ))
          .returning();

        if (!updated) {
          throw new Error(`Insufficient stock for ingredient ${ingredientId}`);
        }
      }

      const [marked] = await tx.update(orderTickets)
        .set({ stockDeductedAt: new Date() })
        .where(and(eq(orderTickets.id, orderId), isNull(orderTickets.stockDeductedAt)))
        .returning();

      if (!marked) {
        throw new Error("Stock already deducted for this order");
      }
    });
  }

  // Tables
  async getTables(restaurantId?: number): Promise<RestaurantTable[]> {
    if (restaurantId) {
      return db.select().from(restaurantTables).where(eq(restaurantTables.restaurantId, restaurantId));
    }
    return db.select().from(restaurantTables);
  }

  async getTableByNumber(tableNumber: number, restaurantId?: number): Promise<RestaurantTable | undefined> {
    const whereClause = restaurantId
      ? and(eq(restaurantTables.tableNumber, tableNumber), eq(restaurantTables.restaurantId, restaurantId))
      : eq(restaurantTables.tableNumber, tableNumber);
    const [table] = await db.select().from(restaurantTables).where(whereClause);
    return table;
  }

  async createTable(tableNumber: number, restaurantId: number): Promise<RestaurantTable> {
    const [created] = await db.insert(restaurantTables).values({ tableNumber, restaurantId }).returning();
    return created;
  }

  // Orders
  async getOrders(restaurantId?: number): Promise<(OrderTicket & { items: OrderItem[] })[]> {
    const orders = restaurantId
      ? await db.select().from(orderTickets)
          .where(eq(orderTickets.restaurantId, restaurantId))
          .orderBy(desc(orderTickets.createdAt))
      : await db.select().from(orderTickets)
          .orderBy(desc(orderTickets.createdAt));
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

  async getOrdersByStatus(status: string, restaurantId?: number): Promise<(OrderTicket & { items: OrderItem[] })[]> {
    const statusClause = eq(orderTickets.status, status as any);
    const whereClause = restaurantId
      ? and(statusClause, eq(orderTickets.restaurantId, restaurantId))
      : statusClause;
    const orders = await db.select().from(orderTickets)
      .where(whereClause)
      .orderBy(desc(orderTickets.createdAt));
    return Promise.all(orders.map(async (order) => {
      const items = await this.getOrderItems(order.id);
      return { ...order, items };
    }));
  }

  async createOrder(data: { orderNumber: string; restaurantId: number; tableId: number | null; customerId: number | null; totalAmount: string }): Promise<OrderTicket> {
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
  async getActiveCalls(restaurantId?: number): Promise<TableCall[]> {
    if (!restaurantId) {
      return db.select().from(tableCalls)
        .where(ne(tableCalls.status, "resolved"))
        .orderBy(desc(tableCalls.createdAt));
    }
    const tables = await db.select({ id: restaurantTables.id }).from(restaurantTables)
      .where(eq(restaurantTables.restaurantId, restaurantId));
    const tableIds = tables.map((t) => t.id);
    if (tableIds.length === 0) return [];
    return db.select().from(tableCalls)
      .where(and(ne(tableCalls.status, "resolved"), inArray(tableCalls.tableId, tableIds)))
      .orderBy(desc(tableCalls.createdAt));
  }

  async getCallsByTable(tableId: number, restaurantId?: number): Promise<TableCall[]> {
    if (restaurantId) {
      const [table] = await db.select().from(restaurantTables)
        .where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.restaurantId, restaurantId)));
      if (!table) return [];
    }
    return db.select().from(tableCalls)
      .where(and(eq(tableCalls.tableId, tableId), ne(tableCalls.status, "resolved")));
  }

  async resolveAcknowledgedCallsByTable(tableId: number): Promise<number> {
    const resolved = await db.update(tableCalls)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(tableCalls.tableId, tableId), eq(tableCalls.status, "acknowledged")))
      .returning();
    return resolved.length;
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
  async getTotalRevenue(restaurantId?: number): Promise<number> {
    const result = restaurantId
      ? await db.execute(sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM order_tickets WHERE restaurant_id = ${restaurantId}`)
      : await db.execute(sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM order_tickets`);
    return parseFloat((result.rows[0] as any)?.total || "0");
  }

  async getTotalOrders(restaurantId?: number): Promise<number> {
    const result = restaurantId
      ? await db.execute(sql`SELECT COUNT(*) as count FROM order_tickets WHERE restaurant_id = ${restaurantId}`)
      : await db.execute(sql`SELECT COUNT(*) as count FROM order_tickets`);
    return parseInt((result.rows[0] as any)?.count || "0");
  }

  async getTopSellingItems(limit: number, restaurantId?: number): Promise<{ name: string; orders: number; revenue: number }[]> {
    const result = restaurantId
      ? await db.execute(sql`
          SELECT 
            oi.menu_item_id,
            mi.name,
            CAST(SUM(oi.quantity) AS INTEGER) as orders,
            CAST(SUM(CAST(oi.unit_price AS DECIMAL) * oi.quantity) AS DECIMAL) as revenue
          FROM order_items oi
          JOIN order_tickets ot ON oi.order_id = ot.id
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE ot.restaurant_id = ${restaurantId}
          GROUP BY oi.menu_item_id, mi.name
          ORDER BY orders DESC
          LIMIT ${limit}
        `)
      : await db.execute(sql`
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

  async getDailyRevenue(days: number, restaurantId?: number): Promise<{ date: string; revenue: number; orders: number }[]> {
    const result = restaurantId
      ? await db.execute(sql`
          SELECT 
            TO_CHAR(created_at, 'Dy') as date,
            COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as revenue,
            COUNT(*) as orders
          FROM order_tickets
          WHERE restaurant_id = ${restaurantId}
            AND created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
          GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
          ORDER BY DATE(created_at)
        `)
      : await db.execute(sql`
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

  async getRestaurantByOwnerId(ownerId: number): Promise<Restaurant | undefined> {
    const [r] = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
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

  async getPopularityByItemId(restaurantId?: number): Promise<Map<number, number>> {
    const popularityRows = restaurantId
      ? await db
          .select({
            menuItemId: orderItems.menuItemId,
            popularity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.as("popularity"),
          })
          .from(orderItems)
          .innerJoin(orderTickets, eq(orderItems.orderId, orderTickets.id))
          .where(eq(orderTickets.restaurantId, restaurantId))
          .groupBy(orderItems.menuItemId)
      : await db
          .select({
            menuItemId: orderItems.menuItemId,
            popularity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.as("popularity"),
          })
          .from(orderItems)
          .groupBy(orderItems.menuItemId);

    const popularityByItem = new Map<number, number>();
    for (const row of popularityRows) {
      popularityByItem.set(row.menuItemId, Number(row.popularity) || 0);
    }
    return popularityByItem;
  }

  async rankMenuItemsForCustomer(
    customerId: number,
    items: MenuItem[],
    restaurantId?: number,
    limit?: number,
    includePreferences: boolean = true,
  ): Promise<RankedMenuItem[]> {
    if (items.length === 0) {
      return [];
    }

    const historyRows = restaurantId
      ? await db
          .select({
            menuItemId: orderItems.menuItemId,
            categoryId: menuItems.categoryId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            createdAt: orderTickets.createdAt,
          })
          .from(orderItems)
          .innerJoin(orderTickets, eq(orderItems.orderId, orderTickets.id))
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(and(eq(orderTickets.customerId, customerId), eq(orderTickets.restaurantId, restaurantId)))
      : await db
          .select({
            menuItemId: orderItems.menuItemId,
            categoryId: menuItems.categoryId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            createdAt: orderTickets.createdAt,
          })
          .from(orderItems)
          .innerJoin(orderTickets, eq(orderItems.orderId, orderTickets.id))
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderTickets.customerId, customerId));

    const customerHistory: CustomerHistorySignal[] = historyRows.map((row) => ({
      menuItemId: row.menuItemId,
      categoryId: row.categoryId,
      quantity: row.quantity,
      unitPrice: Number.parseFloat(row.unitPrice),
      createdAt: row.createdAt,
    }));

    const [preferences, popularityByItemId, activeOffers] = await Promise.all([
      includePreferences ? this.getCustomerPreferences(customerId) : Promise.resolve(undefined),
      this.getPopularityByItemId(restaurantId),
      restaurantId ? this.getActiveOffersByRestaurant(restaurantId) : this.getAllActiveOffers(),
    ]);

    return rankPersonalizedMenuItems({
      candidates: items,
      customerHistory,
      preferences,
      popularityByItemId,
      activeOffers,
      limit,
    });
  }

  // Get suggested items based on personalized ranking
  async getSuggestedItems(customerId: number, limit: number = 6, restaurantId?: number): Promise<RankedMenuItem[]> {
    const candidates = restaurantId
      ? await this.getMenuItemsByRestaurant(restaurantId)
      : await this.getMenuItems();

    const ranked = await this.rankMenuItemsForCustomer(
      customerId,
      candidates.filter((item) => !item.isSoldOut),
      restaurantId,
      limit,
    );

    if (ranked.length > 0) {
      return ranked;
    }

    // Fallback when customer has no usable signals/preferences.
    return (await this.getPopularItems(limit, restaurantId)).map((item) => ({
      item,
      rankingScore: 0,
      reasonCodes: ["popular_in_restaurant"],
      reasonLabel: "Popular at this restaurant",
      scoreBreakdown: { fallback: 1 },
    }));
  }

  // Feedback
  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values(data).returning();
    return created;
  }

  async getFeedbackByOrder(orderId: number): Promise<Feedback | undefined> {
    const [fb] = await db.select().from(feedback).where(eq(feedback.orderId, orderId));
    return fb;
  }

  async getAggregatedFeedback(): Promise<{ avgSpeed: number; avgService: number; avgTaste: number; totalReviews: number }> {
    const result = await db.execute(sql`
      SELECT 
        COALESCE(AVG(speed_rating), 0) as avg_speed,
        COALESCE(AVG(service_rating), 0) as avg_service,
        COALESCE(AVG(taste_rating), 0) as avg_taste,
        COUNT(*) as total_reviews
      FROM feedback
    `);
    const row = result.rows[0] as any;
    return {
      avgSpeed: parseFloat(row.avg_speed || "0"),
      avgService: parseFloat(row.avg_service || "0"),
      avgTaste: parseFloat(row.avg_taste || "0"),
      totalReviews: parseInt(row.total_reviews || "0"),
    };
  }

  async getRecentFeedback(limit: number): Promise<(Feedback & { orderNumber: string; tableNumber: number | null })[]> {
    const result = await db.execute(sql`
      SELECT 
        f.*,
        ot.order_number,
        rt.table_number
      FROM feedback f
      JOIN order_tickets ot ON f.order_id = ot.id
      LEFT JOIN restaurant_tables rt ON ot.table_id = rt.id
      ORDER BY f.created_at DESC
      LIMIT ${limit}
    `);
    return result.rows.map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      speedRating: row.speed_rating,
      serviceRating: row.service_rating,
      tasteRating: row.taste_rating,
      comment: row.comment,
      createdAt: row.created_at,
      orderNumber: row.order_number,
      tableNumber: row.table_number,
    }));
  }

  // Get popular items based on order frequency
  async getPopularItems(limit: number = 6, restaurantId?: number): Promise<MenuItem[]> {
    const popularRows = restaurantId
      ? await db
          .select({
            menuItemId: orderItems.menuItemId,
            popularity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.as("popularity"),
          })
          .from(orderItems)
          .innerJoin(orderTickets, eq(orderItems.orderId, orderTickets.id))
          .where(eq(orderTickets.restaurantId, restaurantId))
          .groupBy(orderItems.menuItemId)
          .orderBy(sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`)
          .limit(limit)
      : await db
          .select({
            menuItemId: orderItems.menuItemId,
            popularity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.as("popularity"),
          })
          .from(orderItems)
          .groupBy(orderItems.menuItemId)
          .orderBy(sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`)
          .limit(limit);

    if (popularRows.length === 0) {
      return restaurantId
        ? db
            .select()
            .from(menuItems)
            .where(and(eq(menuItems.isSoldOut, false), eq(menuItems.restaurantId, restaurantId)))
            .limit(limit)
        : db
            .select()
            .from(menuItems)
            .where(eq(menuItems.isSoldOut, false))
            .limit(limit);
    }

    const ids = popularRows.map((p) => p.menuItemId);
    if (ids.length === 0) {
      return [];
    }
    const popularItems = restaurantId
      ? await db
          .select()
          .from(menuItems)
          .where(and(inArray(menuItems.id, ids), eq(menuItems.restaurantId, restaurantId), eq(menuItems.isSoldOut, false)))
      : await db
          .select()
          .from(menuItems)
          .where(and(inArray(menuItems.id, ids), eq(menuItems.isSoldOut, false)));

    const itemById = new Map(popularItems.map((item) => [item.id, item]));
    return ids.map((id) => itemById.get(id)).filter((item): item is MenuItem => Boolean(item));
  }
  // Special Offers
  async getOffersByRestaurant(restaurantId: number): Promise<SpecialOffer[]> {
    return db.select().from(specialOffers)
      .where(eq(specialOffers.restaurantId, restaurantId))
      .orderBy(desc(specialOffers.createdAt));
  }

  async getActiveOffersByRestaurant(restaurantId: number): Promise<SpecialOffer[]> {
    const now = new Date();
    return db.select().from(specialOffers)
      .where(
        and(
          eq(specialOffers.restaurantId, restaurantId),
          eq(specialOffers.isActive, true),
          sql`(${specialOffers.startDate} IS NULL OR ${specialOffers.startDate} <= ${now})`,
          sql`(${specialOffers.endDate} IS NULL OR ${specialOffers.endDate} >= ${now})`
        )
      );
  }

  async getAllActiveOffers(): Promise<SpecialOffer[]> {
    const now = new Date();
    return db.select().from(specialOffers)
      .where(
        and(
          eq(specialOffers.isActive, true),
          sql`(${specialOffers.startDate} IS NULL OR ${specialOffers.startDate} <= ${now})`,
          sql`(${specialOffers.endDate} IS NULL OR ${specialOffers.endDate} >= ${now})`
        )
      );
  }

  async createOffer(data: InsertSpecialOffer): Promise<SpecialOffer> {
    const [created] = await db.insert(specialOffers).values(data).returning();
    return created;
  }

  async updateOffer(id: number, data: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined> {
    const [updated] = await db.update(specialOffers).set(data).where(eq(specialOffers.id, id)).returning();
    return updated;
  }

  async deleteOffer(id: number): Promise<boolean> {
    await db.delete(specialOffers).where(eq(specialOffers.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
