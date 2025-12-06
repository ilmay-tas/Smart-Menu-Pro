import type { Express, Request, Response } from "express";
import type { Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import {
  signUpSchema,
  signInSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  insertMenuItemSchema,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signUpSchema.parse(req.body);
      const normalizedPhone = data.phone.replace(/\D/g, "");
      
      const existingUser = await storage.getUserByPhone(normalizedPhone);
      if (existingUser) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      const user = await storage.createUser({
        phone: data.phone,
        name: data.name,
        role: data.role,
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;

      res.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const data = signInSchema.parse(req.body);
      const user = await storage.getUserByPhone(data.phone);
      
      if (!user) {
        return res.status(401).json({ error: "Phone number not found. Please sign up first." });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;

      res.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  });

  // Menu routes
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      const itemsWithModifiers = await Promise.all(
        items.map(async (item) => {
          const modifiers = await storage.getModifiersForItem(item.id);
          return { ...item, modifiers };
        })
      );
      res.json(itemsWithModifiers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/menu/:id", async (req, res) => {
    try {
      const item = await storage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      const modifiers = await storage.getModifiersForItem(item.id);
      res.json({ ...item, modifiers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/menu", async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/menu/:id", async (req, res) => {
    try {
      const item = await storage.updateMenuItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/menu/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { status } = req.query;
      let ordersList;
      
      if (status && status !== "all") {
        ordersList = await storage.getOrdersByStatus(status as string);
      } else {
        ordersList = await storage.getOrders();
      }

      const ordersWithItems = await Promise.all(
        ordersList.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const data = createOrderSchema.parse(req.body);
      
      const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      // Generate order number
      const totalOrders = await storage.getTotalOrders();
      const orderNumber = String(totalOrders + 1).padStart(3, "0");

      const order = await storage.createOrder({
        orderNumber,
        tableNumber: data.tableNumber,
        userId: req.session.userId || null,
        status: "new",
        paymentStatus: "pending",
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      });

      // Create order items
      await Promise.all(
        data.items.map((item) =>
          storage.createOrderItem({
            orderId: order.id,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            modifiers: item.modifiers || [],
            notes: item.notes || null,
          })
        )
      );

      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const order = await storage.updateOrderStatus(req.params.id, data.status);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updatePaymentStatus(req.params.id, status);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Analytics routes (for owner dashboard)
  app.get("/api/analytics/daily-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const data = await storage.getDailyRevenue(days);
      res.json(data);
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

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const [totalRevenue, totalOrders, ordersData, tablesData] = await Promise.all([
        storage.getTotalRevenue(),
        storage.getTotalOrders(),
        storage.getOrders(),
        storage.getTables(),
      ]);

      const activeOrders = ordersData.filter(
        (o) => o.status !== "delivered"
      ).length;
      const occupiedTables = tablesData.filter((t) => t.isOccupied).length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      res.json({
        totalRevenue,
        totalOrders,
        activeOrders,
        occupiedTables,
        totalTables: tablesData.length,
        avgOrderValue,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tables routes
  app.get("/api/tables", async (req, res) => {
    try {
      const tablesList = await storage.getTables();
      res.json(tablesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tables", async (req, res) => {
    try {
      const table = await storage.createTable(req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

}
