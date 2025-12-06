import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import {
  staffSignUpSchema,
  staffSignInSchema,
  customerSignUpSchema,
  customerSignInSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  createTableCallSchema,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    staffId: number;
    staffRole: string;
    customerId: number;
    userType: "staff" | "customer";
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerRoutes(app: Express, httpServer: Server): Promise<void> {
  // Seed database on startup
  await seedDatabase();

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "mydine-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // ============ STAFF AUTH ============
  app.post("/api/staff/signup", async (req, res) => {
    try {
      const data = staffSignUpSchema.parse(req.body);
      
      const existing = await storage.getStaffByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const hashedPassword = await hashPassword(data.password);
      const staff = await storage.createStaff({
        username: data.username,
        passwordHash: hashedPassword,
        name: data.name,
        role: data.role,
      });

      req.session.staffId = staff.id;
      req.session.staffRole = staff.role;
      req.session.userType = "staff";

      res.json({ user: { id: staff.id, name: staff.name, username: staff.username, role: staff.role, type: "staff" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/staff/signin", async (req, res) => {
    try {
      const data = staffSignInSchema.parse(req.body);
      
      const staff = await storage.getStaffByUsername(data.username);
      if (!staff) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isValidPassword = await verifyPassword(data.password, staff.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.staffId = staff.id;
      req.session.staffRole = staff.role;
      req.session.userType = "staff";

      res.json({ user: { id: staff.id, name: staff.name, username: staff.username, role: staff.role, type: "staff" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // ============ CUSTOMER AUTH ============
  app.post("/api/customer/signup", async (req, res) => {
    try {
      const data = customerSignUpSchema.parse(req.body);
      const normalizedPhone = data.phone.replace(/\D/g, "");
      
      const existing = await storage.getCustomerByPhone(normalizedPhone);
      if (existing) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      const customer = await storage.createCustomer({
        phone: normalizedPhone,
        name: data.name,
      });

      req.session.customerId = customer.id;
      req.session.userType = "customer";

      res.json({ user: { id: customer.id, name: customer.name, phone: customer.phone, type: "customer" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/customer/signin", async (req, res) => {
    try {
      const data = customerSignInSchema.parse(req.body);
      const normalizedPhone = data.phone.replace(/\D/g, "");
      
      const customer = await storage.getCustomerByPhone(normalizedPhone);
      if (!customer) {
        return res.status(401).json({ error: "Phone number not found. Please sign up first." });
      }

      req.session.customerId = customer.id;
      req.session.userType = "customer";

      res.json({ user: { id: customer.id, name: customer.name, phone: customer.phone, type: "customer" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // ============ COMMON AUTH ============
  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.userType === "staff" && req.session.staffId) {
      const staff = await storage.getStaff(req.session.staffId);
      if (!staff) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ user: { id: staff.id, name: staff.name, username: staff.username, role: staff.role, type: "staff" } });
    }

    if (req.session.userType === "customer" && req.session.customerId) {
      const customer = await storage.getCustomer(req.session.customerId);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ user: { id: customer.id, name: customer.name, phone: customer.phone, type: "customer" } });
    }

    return res.status(401).json({ error: "Not authenticated" });
  });

  // ============ MENU ============
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      const cats = await storage.getCategories();
      const categoryMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
      
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const mods = await storage.getModifiersForItem(item.id);
          return {
            id: String(item.id),
            name: item.name,
            description: item.description || "",
            price: item.price,
            image: item.imageUrl || "/menu/default.png",
            category: item.categoryId ? categoryMap[item.categoryId] || "Other" : "Other",
            isVegan: item.isVegan,
            isGlutenFree: item.isGlutenFree,
            isSpicy: item.isSpicy,
            allergens: item.allergens,
            modifiers: mods.map((m) => ({
              id: String(m.id),
              name: m.name,
              price: m.additionalCost,
            })),
          };
        })
      );
      res.json(itemsWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ORDERS ============
  app.get("/api/orders", async (req, res) => {
    try {
      const { status } = req.query;
      let orders;
      
      if (status && status !== "all") {
        orders = await storage.getOrdersByStatus(status as string);
      } else {
        orders = await storage.getOrders();
      }

      // Transform orders to include item names and table numbers
      const tables = await storage.getTables();
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));
      
      const transformedOrders = await Promise.all(
        orders.map(async (order) => {
          const itemsWithNames = await Promise.all(
            order.items.map(async (item) => {
              const menuItem = await storage.getMenuItem(item.menuItemId);
              return {
                id: String(item.id),
                name: menuItem?.name || "Unknown Item",
                quantity: item.quantity,
                modifiers: [],
                notes: item.note,
              };
            })
          );
          
          return {
            id: String(order.id),
            orderNumber: order.orderNumber,
            tableNumber: String(order.tableId ? tableMap[order.tableId] || "N/A" : "N/A"),
            items: itemsWithNames,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
          };
        })
      );

      res.json(transformedOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const data = createOrderSchema.parse(req.body);
      
      const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const totalOrders = await storage.getTotalOrders();
      const orderNumber = String(totalOrders + 1).padStart(3, "0");

      const table = await storage.getTableByNumber(data.tableNumber);
      
      const order = await storage.createOrder({
        orderNumber,
        tableId: table?.id || null,
        customerId: req.session.customerId || null,
        totalAmount: totalAmount.toFixed(2),
      });

      // Create order items
      await Promise.all(
        data.items.map((item) =>
          storage.createOrderItem({
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            note: item.note,
          })
        )
      );

      const fullOrder = await storage.getOrder(order.id);
      res.json(fullOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const order = await storage.updateOrderStatus(parseInt(req.params.id), data.status);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const fullOrder = await storage.getOrder(order.id);
      res.json(fullOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || !["waiter", "owner"].includes(req.session.staffRole || "")) {
        return res.status(403).json({ error: "Only waiters and owners can process payments" });
      }

      const data = updatePaymentStatusSchema.parse(req.body);
      const order = await storage.updatePaymentStatus(parseInt(req.params.id), data.paymentStatus);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const fullOrder = await storage.getOrder(order.id);
      res.json(fullOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Customer orders endpoint
  app.get("/api/customer/orders", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const orders = await storage.getOrdersByCustomer(req.session.customerId);
      const tables = await storage.getTables();
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));
      
      const transformedOrders = await Promise.all(
        orders.map(async (order) => {
          const itemsWithNames = await Promise.all(
            order.items.map(async (item) => {
              const menuItem = await storage.getMenuItem(item.menuItemId);
              return {
                id: String(item.id),
                name: menuItem?.name || "Unknown Item",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              };
            })
          );
          
          return {
            id: String(order.id),
            orderNumber: order.orderNumber,
            tableNumber: order.tableId ? tableMap[order.tableId] || null : null,
            items: itemsWithNames,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
          };
        })
      );

      res.json(transformedOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ TABLE CALLS ============
  app.get("/api/table-calls", async (req, res) => {
    try {
      const calls = await storage.getActiveCalls();
      const tables = await storage.getTables();
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));
      
      const transformedCalls = calls.map((call) => ({
        id: call.id,
        tableNumber: call.tableId ? tableMap[call.tableId] || null : null,
        status: call.status,
        createdAt: call.createdAt?.toISOString(),
        acknowledgedAt: call.acknowledgedAt?.toISOString(),
      }));

      res.json(transformedCalls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/table-calls", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const data = createTableCallSchema.parse(req.body);
      const table = await storage.getTableByNumber(data.tableNumber);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check if there's already an active call for this table
      const existingCalls = await storage.getCallsByTable(table.id);
      if (existingCalls.length > 0) {
        return res.status(400).json({ error: "There's already an active waiter call for your table" });
      }

      const call = await storage.createTableCall({
        tableId: table.id,
        customerId: req.session.customerId,
      });

      res.json({
        id: call.id,
        tableNumber: data.tableNumber,
        status: call.status,
        createdAt: call.createdAt?.toISOString(),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/table-calls/:id/acknowledge", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || !req.session.staffId) {
        return res.status(403).json({ error: "Staff authentication required" });
      }

      const call = await storage.acknowledgeCall(parseInt(req.params.id), req.session.staffId);
      
      if (!call) {
        return res.status(404).json({ error: "Table call not found" });
      }

      res.json(call);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/table-calls/:id/resolve", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || !req.session.staffId) {
        return res.status(403).json({ error: "Staff authentication required" });
      }

      const call = await storage.resolveCall(parseInt(req.params.id));
      
      if (!call) {
        return res.status(404).json({ error: "Table call not found" });
      }

      res.json(call);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ TABLES ============
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ANALYTICS ============
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const [totalRevenue, totalOrders, tables] = await Promise.all([
        storage.getTotalRevenue(),
        storage.getTotalOrders(),
        storage.getTables(),
      ]);

      const orders = await storage.getOrders();
      const activeOrders = orders.filter((o) => o.status !== "delivered").length;
      const occupiedTables = tables.filter((t) => t.isOccupied).length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      res.json({
        totalRevenue,
        totalOrders,
        activeOrders,
        occupiedTables,
        totalTables: tables.length,
        avgOrderValue,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/top-selling", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const data = await storage.getTopSellingItems(limit);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/daily-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const data = await storage.getDailyRevenue(days);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
