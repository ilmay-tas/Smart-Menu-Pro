import type { Express, Request, Response } from "express";
import type { Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { supabase, supabaseMenuBucket, supabasePublicBaseUrl } from "./supabase";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG and PNG images are allowed"));
  },
});
import {
  staffSignUpSchema,
  staffSignInSchema,
  customerSignUpSchema,
  customerSignInSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  createTableCallSchema,
  ownerStaffSignUpSchema,
  staffJoinRestaurantSchema,
  updateCustomerPreferencesSchema,
  staffApprovalSchema,
  submitFeedbackSchema,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    staffId: number;
    staffRole: string;
    customerId: number;
    userType: "staff" | "customer";
    restaurantId: number;
    guestOrderIds: number[];
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

  // ============ HEALTH CHECK ============
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  // Explicitly handle HEAD /health for lightweight checks.
  app.head("/health", (_req, res) => {
    res.status(200).end();
  });

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

  const isValidHexColor = (value: string): boolean => /^#([0-9a-fA-F]{6})$/.test(value);

  const resolveRestaurantIdAsync = async (req: Request): Promise<number | null> => {
    if (req.query.restaurantId) {
      const parsed = parseInt(req.query.restaurantId as string, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    if (req.session.restaurantId) {
      return req.session.restaurantId;
    }

    const restaurants = await storage.getRestaurants();
    return restaurants.length > 0 ? restaurants[0].id : null;
  };

  const parsePersonalizedFlag = (req: Request): boolean =>
    req.query.personalized === "true";

  type StaffEventType =
    | "orders.updated"
    | "table_calls.updated"
    | "menu.updated"
    | "offers.updated"
    | "staff.updated"
    | "theme.updated";

  interface StaffSseClient {
    id: number;
    role: string;
    res: Response;
  }

  interface StaffStreamEvent {
    type: StaffEventType;
    restaurantId: number;
    source?: string;
    timestamp: string;
  }

  let nextSseClientId = 1;
  const sseClientsByRestaurant = new Map<number, Set<StaffSseClient>>();

  const removeSseClient = (restaurantId: number, clientId: number) => {
    const clients = sseClientsByRestaurant.get(restaurantId);
    if (!clients) {
      return;
    }
    for (const client of Array.from(clients)) {
      if (client.id === clientId) {
        clients.delete(client);
        break;
      }
    }
    if (clients.size === 0) {
      sseClientsByRestaurant.delete(restaurantId);
    }
  };

  const publishStaffEvent = (
    restaurantId: number,
    type: StaffEventType,
    options: { source?: string; targetRoles?: string[] } = {},
  ) => {
    const clients = sseClientsByRestaurant.get(restaurantId);
    if (!clients || clients.size === 0) {
      return;
    }

    const payload: StaffStreamEvent = {
      type,
      restaurantId,
      source: options.source,
      timestamp: new Date().toISOString(),
    };
    const serialized = `event: staff-event\ndata: ${JSON.stringify(payload)}\n\n`;
    const allowedRoles = options.targetRoles ? new Set(options.targetRoles) : null;

    for (const client of Array.from(clients)) {
      if (allowedRoles && !allowedRoles.has(client.role)) {
        continue;
      }
      try {
        client.res.write(serialized);
      } catch {
        removeSseClient(restaurantId, client.id);
      }
    }
  };

  const resolveStaffRestaurantId = async (req: Request): Promise<number | null> => {
    if (req.session.restaurantId) {
      return req.session.restaurantId;
    }
    if (req.session.userType !== "staff" || !req.session.staffId) {
      return null;
    }

    if (req.session.staffRole === "owner") {
      const ownedRestaurant = await storage.getRestaurantByOwnerId(req.session.staffId);
      if (!ownedRestaurant) {
        return null;
      }
      req.session.restaurantId = ownedRestaurant.id;
      return ownedRestaurant.id;
    }

    const assignment = await storage.getApprovedAssignmentForStaff(req.session.staffId);
    if (!assignment) {
      return null;
    }
    req.session.restaurantId = assignment.restaurantId;
    return assignment.restaurantId;
  };

  const buildCustomerMenuResponse = async (
    items: Awaited<ReturnType<typeof storage.getMenuItems>>,
    categoryMap: Record<number, string>,
    rankingMetaByItemId?: Map<number, { rankingScore: number; reasonLabel: string; reasonCodes: string[] }>,
    modifiersMap?: Map<number, any>,
  ) => {
    return Promise.all(
      items.map(async (item) => {
        const mods = modifiersMap?.get(item.id) || [];
        const rankingMeta = rankingMetaByItemId?.get(item.id);
        return {
          id: String(item.id),
          name: item.name,
          description: item.description || "",
          price: item.price,
          image: item.imageUrl || "/menu/default.png",
          category: item.categoryId ? categoryMap[item.categoryId] || "Other" : "Other",
          isVegan: item.isVegan,
          isVegetarian: item.isVegetarian,
          isGlutenFree: item.isGlutenFree,
          isDairyFree: item.isDairyFree,
          isNutFree: item.isNutFree,
          isHalal: item.isHalal,
          isKosher: item.isKosher,
          isSpicy: item.isSpicy,
          spiceLevel: item.spiceLevel,
          allergens: item.allergens,
          cuisineType: item.cuisineType,
          proteinType: item.proteinType,
          cookingMethod: item.cookingMethod,
          mealType: item.mealType,
          isAlcoholic: item.isAlcoholic,
          isCaffeinated: item.isCaffeinated,
          isOrganic: item.isOrganic,
          isLocallySourced: item.isLocallySourced,
          calories: item.calories,
          protein: item.proteinGrams,
          carbs: item.carbsGrams,
          fat: item.fatGrams,
          rankingScore: rankingMeta?.rankingScore,
          reasonLabel: rankingMeta?.reasonLabel,
          reasonCodes: rankingMeta?.reasonCodes,
          modifiers: (mods as any[]).map((m: any) => ({
            id: String(m.id),
            name: m.name,
            price: m.additionalCost,
          })),
        };
      }),
    );
  };

  // ============ STAFF EVENTS (SSE) ============
  app.get("/api/events/stream", async (req, res) => {
    if (req.session.userType !== "staff" || !req.session.staffId) {
      return res.status(401).json({ error: "Staff authentication required" });
    }

    const restaurantId = await resolveStaffRestaurantId(req);
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant context is required for event stream" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const clientId = nextSseClientId++;
    const role = req.session.staffRole || "staff";
    const client: StaffSseClient = { id: clientId, role, res };
    const existingClients = sseClientsByRestaurant.get(restaurantId) ?? new Set<StaffSseClient>();
    existingClients.add(client);
    sseClientsByRestaurant.set(restaurantId, existingClients);

    const connectedPayload = {
      type: "connected",
      restaurantId,
      role,
      timestamp: new Date().toISOString(),
    };
    res.write(`event: connected\ndata: ${JSON.stringify(connectedPayload)}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: keepalive ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        removeSseClient(restaurantId, clientId);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeSseClient(restaurantId, clientId);
    });
  });

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
      
      const staffMember = await storage.getStaffByUsername(data.username);
      if (!staffMember) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isValidPassword = await verifyPassword(data.password, staffMember.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Non-owner staff must have an approved restaurant assignment
      let approvedAssignment = null;
      if (staffMember.role !== "owner") {
        approvedAssignment = await storage.getApprovedAssignmentForStaff(staffMember.id);
        if (!approvedAssignment) {
          return res.status(403).json({ 
            error: "Your account is pending approval from the restaurant owner. Please wait for approval before signing in.",
            pendingApproval: true
          });
        }
      }

      req.session.staffId = staffMember.id;
      req.session.staffRole = staffMember.role;
      req.session.userType = "staff";
      if (staffMember.role === "owner") {
        const ownedRestaurant = await storage.getRestaurantByOwnerId(staffMember.id);
        if (ownedRestaurant) req.session.restaurantId = ownedRestaurant.id;
      } else if (approvedAssignment) {
        req.session.restaurantId = approvedAssignment.restaurantId;
      }

      res.json({ user: { id: staffMember.id, name: staffMember.name, username: staffMember.username, role: staffMember.role, type: "staff" } });
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
      // Determine restaurant: use query param, session, or fallback default.
      const restaurantId = await resolveRestaurantIdAsync(req);

      if (restaurantId) {
        req.session.restaurantId = restaurantId;
      }

      const items = restaurantId
        ? await storage.getMenuItemsByRestaurant(restaurantId)
        : await storage.getMenuItems();
      const nonSoldOut = items.filter((item) => !item.isSoldOut);
      const cats = restaurantId
        ? await storage.getCategoriesByRestaurant(restaurantId)
        : await storage.getCategories();
      const categoryMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

      let sortedItems = nonSoldOut;
      let rankingMetaByItemId: Map<number, { rankingScore: number; reasonLabel: string; reasonCodes: string[] }> | undefined;
      if (parsePersonalizedFlag(req) && req.session.userType === "customer" && req.session.customerId) {
        const ranked = await storage.rankMenuItemsForCustomer(
          req.session.customerId,
          nonSoldOut,
          restaurantId ?? undefined,
          nonSoldOut.length,
          false,
        );
        if (ranked.length > 0) {
          sortedItems = ranked.map((entry) => entry.item);
          rankingMetaByItemId = new Map(
            ranked.map((entry) => [
              entry.item.id,
              {
                rankingScore: entry.rankingScore,
                reasonLabel: entry.reasonLabel,
                reasonCodes: entry.reasonCodes,
              },
            ]),
          );
        }
      }

      // TC-20: Batch load modifiers for performance (single query instead of N+1)
      const menuItemIds = sortedItems.map(item => item.id);
      const modifiersMap = await storage.getModifiersForItems(menuItemIds);

      // Pagination support (optional query params)
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 200;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = sortedItems.slice(startIndex, endIndex);
      
      // Create filtered modifiers map for paginated items only
      const paginatedModifiersMap = new Map<number, any>();
      for (const item of paginatedItems) {
        const mods = modifiersMap.get(item.id);
        if (mods) {
          paginatedModifiersMap.set(item.id, mods);
        }
      }

      const itemsWithDetails = await buildCustomerMenuResponse(
        paginatedItems, 
        categoryMap, 
        rankingMetaByItemId,
        paginatedModifiersMap
      );
      
      // Return array for backward compatibility with frontend
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

  app.get("/api/restaurants/:id/categories", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const cats = await storage.getCategoriesByRestaurant(restaurantId);
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ INGREDIENTS & STOCK ============
  app.get("/api/ingredients", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const list = await storage.getIngredients();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ingredients", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const unit = typeof req.body?.unit === "string" ? req.body.unit.trim() : "";
      if (!name) {
        return res.status(400).json({ error: "Ingredient name is required" });
      }
      const existing = await storage.getIngredientByName(name);
      if (existing) {
        return res.json(existing);
      }
      const created = await storage.createIngredient({
        name,
        unit: unit || null,
      });
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create ingredient" });
    }
  });

  app.post("/api/ingredients/seed", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.length === 0) {
        return res.status(400).json({ error: "No ingredients provided" });
      }
      const created = [];
      for (const item of items) {
        const name = typeof item?.name === "string" ? item.name.trim() : "";
        const unit = typeof item?.unit === "string" ? item.unit.trim() : "";
        if (!name) continue;
        const existing = await storage.getIngredientByName(name);
        if (existing) continue;
        const row = await storage.createIngredient({
          name,
          unit: unit || null,
        });
        created.push(row);
      }
      res.status(201).json({ created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to seed ingredients" });
    }
  });

  app.get("/api/restaurants/:id/ingredient-stocks", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }
      const stocks = await storage.getIngredientStocksByRestaurant(restaurantId);
      res.json(stocks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/restaurants/:id/ingredient-stocks", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }
      const ingredientId = Number(req.body?.ingredientId);
      if (!ingredientId || Number.isNaN(ingredientId)) {
        return res.status(400).json({ error: "ingredientId is required" });
      }
      const quantityRaw = req.body?.quantity;
      const thresholdRaw = req.body?.lowStockThreshold;
      const quantity = quantityRaw === "" || quantityRaw == null ? null : String(quantityRaw);
      const lowStockThreshold = thresholdRaw === "" || thresholdRaw == null ? null : String(thresholdRaw);
      const row = await storage.upsertIngredientStock(restaurantId, ingredientId, {
        quantity,
        lowStockThreshold,
      });
      res.json(row);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update stock" });
    }
  });

  app.put("/api/restaurants/:id/ingredient-stocks/:ingredientId", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }
      const ingredientId = parseInt(req.params.ingredientId);
      if (!ingredientId || Number.isNaN(ingredientId)) {
        return res.status(400).json({ error: "ingredientId is required" });
      }
      const quantityRaw = req.body?.quantity;
      const thresholdRaw = req.body?.lowStockThreshold;
      const quantity = quantityRaw === "" || quantityRaw == null ? null : String(quantityRaw);
      const lowStockThreshold = thresholdRaw === "" || thresholdRaw == null ? null : String(thresholdRaw);
      const row = await storage.upsertIngredientStock(restaurantId, ingredientId, {
        quantity,
        lowStockThreshold,
      });
      res.json(row);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update stock" });
    }
  });

  app.post("/api/restaurants/:id/categories", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const cat = await storage.createCategory(name.trim(), restaurantId);
      publishStaffEvent(restaurantId, "menu.updated", { source: "categories.create" });
      res.status(201).json(cat);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MENU ITEM RECIPES ============
  app.get("/api/menu-items/:id/recipes", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const menuItemId = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem || !menuItem.restaurantId) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      const restaurant = await storage.getRestaurant(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }
      const rows = await storage.getRecipesByMenuItem(menuItemId);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/menu-items/:id/recipes", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const menuItemId = parseInt(req.params.id);
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem || !menuItem.restaurantId) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      const restaurant = await storage.getRestaurant(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const normalized = items
        .map((row: any) => ({
          ingredientId: Number(row.ingredientId),
          quantityRequired: String(row.quantityRequired ?? "").trim(),
        }))
        .filter((row: any) => row.ingredientId && row.quantityRequired);

      await storage.replaceRecipesForMenuItem(menuItemId, normalized);
      if (menuItem.restaurantId) {
        publishStaffEvent(menuItem.restaurantId, "menu.updated", { source: "menu.recipes.update" });
      }
      res.json({ success: true, count: normalized.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update recipes" });
    }
  });

  app.put("/api/restaurants/:id/categories/:catId", async (req, res) => {
    try {
      const catId = parseInt(req.params.catId);
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const updated = await storage.updateCategory(catId, name.trim());
      if (!updated) {
        return res.status(404).json({ error: "Category not found" });
      }
      const restaurantId = parseInt(req.params.id);
      if (!Number.isNaN(restaurantId)) {
        publishStaffEvent(restaurantId, "menu.updated", { source: "categories.update" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/restaurants/:id/categories/:catId", async (req, res) => {
    try {
      const catId = parseInt(req.params.catId);
      await storage.deleteCategory(catId);
      const restaurantId = parseInt(req.params.id);
      if (!Number.isNaN(restaurantId)) {
        publishStaffEvent(restaurantId, "menu.updated", { source: "categories.delete" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ SPECIAL OFFERS ============
  app.get("/api/offers/active", async (req, res) => {
    try {
      let restaurantId: number | null = null;
      if (req.query.restaurantId) {
        restaurantId = parseInt(req.query.restaurantId as string);
      } else if (req.session.restaurantId) {
        restaurantId = req.session.restaurantId;
      }

      const offers = restaurantId
        ? await storage.getActiveOffersByRestaurant(restaurantId)
        : await storage.getAllActiveOffers();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/restaurants/:id/offers", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const offers = await storage.getOffersByRestaurant(restaurantId);
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/restaurants/:id/offers/active", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const offers = await storage.getActiveOffersByRestaurant(restaurantId);
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/restaurants/:id/offers", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const { title, description, discountType, discountValue, menuItemId, isActive, startDate, endDate } = req.body;
      if (!title || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: "Title, discount type, and discount value are required" });
      }
      const offer = await storage.createOffer({
        restaurantId,
        title,
        description: description || null,
        discountType,
        discountValue: discountValue.toString(),
        menuItemId: menuItemId || null,
        isActive: isActive !== undefined ? isActive : true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });
      publishStaffEvent(restaurantId, "offers.updated", { source: "offers.create" });
      publishStaffEvent(restaurantId, "menu.updated", { source: "offers.create" });
      res.status(201).json(offer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/restaurants/:id/offers/:offerId", async (req, res) => {
    try {
      const offerId = parseInt(req.params.offerId);
      const { title, description, discountType, discountValue, menuItemId, isActive, startDate, endDate } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (discountType !== undefined) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = discountValue.toString();
      if (menuItemId !== undefined) updateData.menuItemId = menuItemId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

      const updated = await storage.updateOffer(offerId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Offer not found" });
      }
      const restaurantId = parseInt(req.params.id);
      if (!Number.isNaN(restaurantId)) {
        publishStaffEvent(restaurantId, "offers.updated", { source: "offers.update" });
        publishStaffEvent(restaurantId, "menu.updated", { source: "offers.update" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/restaurants/:id/offers/:offerId", async (req, res) => {
    try {
      const offerId = parseInt(req.params.offerId);
      await storage.deleteOffer(offerId);
      const restaurantId = parseInt(req.params.id);
      if (!Number.isNaN(restaurantId)) {
        publishStaffEvent(restaurantId, "offers.updated", { source: "offers.delete" });
        publishStaffEvent(restaurantId, "menu.updated", { source: "offers.delete" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ORDERS ============
  app.get("/api/orders", async (req, res) => {
    try {
      const { status } = req.query;
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      let orders;
      
      if (status && status !== "all") {
        orders = await storage.getOrdersByStatus(status as string, restaurantId);
      } else {
        orders = await storage.getOrders(restaurantId);
      }

      // Transform orders to include item names and table numbers
      const tables = await storage.getTables(restaurantId);
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
                unitPrice: item.unitPrice,
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
      
      const restaurantId = await resolveRestaurantIdAsync(req);
      if (!restaurantId) {
        return res.status(400).json({ error: "Restaurant context is required to place an order" });
      }

      const totalAmount = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const totalOrders = await storage.getTotalOrders(restaurantId);
      const orderNumber = String(totalOrders + 1).padStart(3, "0");

      const table = await storage.getTableByNumber(data.tableNumber, restaurantId);
      
      const order = await storage.createOrder({
        orderNumber,
        restaurantId,
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
      publishStaffEvent(restaurantId, "orders.updated", { source: "orders.create" });
      if (!req.session.customerId) {
        const existing = Array.isArray(req.session.guestOrderIds) ? req.session.guestOrderIds : [];
        req.session.guestOrderIds = [...new Set([...existing, order.id])];
      }
      res.json(fullOrder);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Guest orders (session-based, active only)
  app.get("/api/guest/orders", async (req, res) => {
    try {
      const ids = Array.isArray(req.session.guestOrderIds) ? req.session.guestOrderIds : [];
      if (ids.length === 0) {
        return res.json([]);
      }
      const orders = await Promise.all(ids.map((id) => storage.getOrder(id)));
      const active = orders
        .filter((order): order is NonNullable<typeof order> => Boolean(order))
        .filter((order) => order.status !== "delivered" || order.paymentStatus !== "paid");
      const tables = await storage.getTables(req.session.restaurantId);
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));
      const transformed = await Promise.all(
        active.map(async (order) => {
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
      res.json(transformed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const orderId = parseInt(req.params.id);
      const existingOrder = await storage.getOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (data.status === "in_progress" && !existingOrder.stockDeductedAt) {
        try {
          await storage.deductStockForOrder(orderId);
        } catch (error: any) {
          return res.status(400).json({ error: error.message || "Insufficient stock" });
        }
      }

      const order = await storage.updateOrderStatus(orderId, data.status);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const fullOrder = await storage.getOrder(order.id);
      publishStaffEvent(existingOrder.restaurantId, "orders.updated", { source: "orders.status" });
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
      publishStaffEvent(order.restaurantId, "orders.updated", { source: "orders.payment" });
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
      const tables = await storage.getTables(req.session.restaurantId);
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
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      const calls = await storage.getActiveCalls(restaurantId);
      const tables = await storage.getTables(restaurantId);
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
      const restaurantId = await resolveRestaurantIdAsync(req);
      if (!restaurantId) {
        return res.status(400).json({ error: "Restaurant context is required to call a waiter" });
      }
      const table = await storage.getTableByNumber(data.tableNumber, restaurantId);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check if there's already an active call for this table
      const existingCalls = await storage.getCallsByTable(table.id);
      const pendingCall = existingCalls.find((call) => call.status === "pending");
      if (pendingCall) {
        return res.status(400).json({ error: "There's already an active waiter call for your table" });
      }
      if (existingCalls.some((call) => call.status === "acknowledged")) {
        await storage.resolveAcknowledgedCallsByTable(table.id);
      }

      const call = await storage.createTableCall({
        tableId: table.id,
        customerId: req.session.customerId,
      });

      publishStaffEvent(restaurantId, "table_calls.updated", { source: "table_calls.create" });
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

      const restaurantId = await resolveStaffRestaurantId(req);
      if (restaurantId) {
        publishStaffEvent(restaurantId, "table_calls.updated", { source: "table_calls.acknowledge" });
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

      const restaurantId = await resolveStaffRestaurantId(req);
      if (restaurantId) {
        publishStaffEvent(restaurantId, "table_calls.updated", { source: "table_calls.resolve" });
      }
      res.json(call);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ TABLES ============
  app.get("/api/tables", async (req, res) => {
    try {
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      const tables = await storage.getTables(restaurantId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ ANALYTICS ============
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      const [totalRevenue, totalOrders, tables] = await Promise.all([
        storage.getTotalRevenue(restaurantId),
        storage.getTotalOrders(restaurantId),
        storage.getTables(restaurantId),
      ]);

      const orders = await storage.getOrders(restaurantId);
      const activeOrders = orders.filter((o) => o.status !== "delivered").length;
      const occupiedTableIds = new Set(
        orders
          .filter((o) => o.tableId && (o.status !== "delivered" || o.paymentStatus !== "paid"))
          .map((o) => o.tableId as number)
      );
      const occupiedTables = occupiedTableIds.size;
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
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      const data = await storage.getTopSellingItems(limit, restaurantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/daily-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const restaurantId = req.query.restaurantId
        ? parseInt(req.query.restaurantId as string)
        : req.session.restaurantId;
      const data = await storage.getDailyRevenue(days, restaurantId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ FEEDBACK ============
  app.post("/api/orders/:id/feedback", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const orderId = parseInt(req.params.id);
      const data = submitFeedbackSchema.parse(req.body);

      // Verify the order exists and belongs to this customer
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.customerId !== req.session.customerId) {
        return res.status(403).json({ error: "You can only rate your own orders" });
      }
      if (order.paymentStatus !== "paid") {
        return res.status(400).json({ error: "You can only rate paid orders" });
      }

      // Check if feedback already submitted
      const existing = await storage.getFeedbackByOrder(orderId);
      if (existing) {
        return res.status(400).json({ error: "Feedback already submitted for this order" });
      }

      const feedback = await storage.createFeedback({
        orderId,
        speedRating: data.speedRating,
        serviceRating: data.serviceRating,
        tasteRating: data.tasteRating,
        comment: data.comment || null,
      });

      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to submit feedback" });
    }
  });

  app.get("/api/orders/:id/feedback", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const fb = await storage.getFeedbackByOrder(orderId);
      res.json(fb || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/feedback", async (req, res) => {
    try {
      const [aggregated, recent] = await Promise.all([
        storage.getAggregatedFeedback(),
        storage.getRecentFeedback(20),
      ]);

      res.json({
        ...aggregated,
        recentFeedback: recent,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ RESTAURANTS ============
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/theme/current", async (req, res) => {
    try {
      const restaurantId = await resolveRestaurantIdAsync(req);
      if (!restaurantId) {
        return res.json(null);
      }

      req.session.restaurantId = restaurantId;
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.json(null);
      }

      res.json({
        restaurantId: restaurant.id,
        menuThemePrimary: restaurant.menuThemePrimary,
        menuThemeAccent: restaurant.menuThemeAccent,
        menuThemeBackground: restaurant.menuThemeBackground,
        menuThemeForeground: restaurant.menuThemeForeground,
        menuThemeCard: restaurant.menuThemeCard,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/restaurant", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }
      const restaurant = await storage.getRestaurantByOwnerId(req.session.staffId!);
      res.json(restaurant || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(parseInt(req.params.id));
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/restaurants/:id/theme", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id, 10);
      if (Number.isNaN(restaurantId)) {
        return res.status(400).json({ error: "Invalid restaurant id" });
      }
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      res.json({
        restaurantId: restaurant.id,
        menuThemePrimary: restaurant.menuThemePrimary,
        menuThemeAccent: restaurant.menuThemeAccent,
        menuThemeBackground: restaurant.menuThemeBackground,
        menuThemeForeground: restaurant.menuThemeForeground,
        menuThemeCard: restaurant.menuThemeCard,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/restaurants/:id/theme", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id, 10);
      if (Number.isNaN(restaurantId)) {
        return res.status(400).json({ error: "Invalid restaurant id" });
      }
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      const themeFields = [
        "menuThemePrimary",
        "menuThemeAccent",
        "menuThemeBackground",
        "menuThemeForeground",
        "menuThemeCard",
      ] as const;

      const updateData: Record<string, string | null> = {};
      for (const field of themeFields) {
        if (!(field in (req.body ?? {}))) {
          continue;
        }
        const rawValue = req.body[field];

        if (rawValue === null || rawValue === "") {
          updateData[field] = null;
          continue;
        }

        if (typeof rawValue !== "string" || !isValidHexColor(rawValue)) {
          return res.status(400).json({ error: `${field} must be a valid hex color like #ff3366` });
        }

        updateData[field] = rawValue;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No theme updates were provided" });
      }

      const updated = await storage.updateRestaurant(restaurantId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      publishStaffEvent(restaurantId, "theme.updated", { source: "theme.update" });
      res.json({
        restaurantId: updated.id,
        menuThemePrimary: updated.menuThemePrimary,
        menuThemeAccent: updated.menuThemeAccent,
        menuThemeBackground: updated.menuThemeBackground,
        menuThemeForeground: updated.menuThemeForeground,
        menuThemeCard: updated.menuThemeCard,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update theme" });
    }
  });

  // ============ OWNER SIGNUP (creates restaurant) ============
  app.post("/api/staff/owner-signup", async (req, res) => {
    try {
      const data = ownerStaffSignUpSchema.parse(req.body);
      
      const existing = await storage.getStaffByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const hashedPassword = await hashPassword(data.password);
      
      // Create the staff member as owner
      const staffMember = await storage.createStaff({
        username: data.username,
        passwordHash: hashedPassword,
        name: data.name,
        role: "owner",
      });

      // Create the restaurant with this owner
      const restaurant = await storage.createRestaurant({
        name: data.restaurant.name,
        address: data.restaurant.address,
        phone: data.restaurant.phone,
        email: data.restaurant.email,
        description: data.restaurant.description,
        logoUrl: data.restaurant.logoUrl,
        ownerId: staffMember.id,
      });

      // Auto-approve owner's assignment to their restaurant
      const assignment = await storage.createStaffAssignment({
        staffId: staffMember.id,
        restaurantId: restaurant.id,
        status: "approved",
      });

      req.session.staffId = staffMember.id;
      req.session.staffRole = staffMember.role;
      req.session.userType = "staff";

      res.json({ 
        user: { id: staffMember.id, name: staffMember.name, username: staffMember.username, role: staffMember.role, type: "staff" },
        restaurant,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // ============ STAFF JOIN RESTAURANT ============
  app.post("/api/staff/join-restaurant", async (req, res) => {
    try {
      const data = staffJoinRestaurantSchema.parse(req.body);
      
      const existing = await storage.getStaffByUsername(data.username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Check restaurant exists
      const restaurant = await storage.getRestaurant(data.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const hashedPassword = await hashPassword(data.password);
      
      // Create the staff member
      const staffMember = await storage.createStaff({
        username: data.username,
        passwordHash: hashedPassword,
        name: data.name,
        role: data.role,
      });

      // Create pending assignment
      await storage.createStaffAssignment({
        staffId: staffMember.id,
        restaurantId: data.restaurantId,
        status: "pending",
      });

      publishStaffEvent(data.restaurantId, "staff.updated", { source: "staff.join_request" });

      res.json({ 
        message: "Account created. Waiting for restaurant owner approval.",
        pendingApproval: true,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // ============ OWNER: STAFF MANAGEMENT ============
  app.get("/api/restaurants/:id/staff", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      const assignments = await storage.getStaffAssignmentsByRestaurant(restaurantId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/restaurants/:id/staff/approve", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const data = staffApprovalSchema.parse(req.body);
      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      const assignment = await storage.getStaffAssignment(data.staffId, restaurantId);
      if (!assignment) {
        return res.status(404).json({ error: "Staff assignment not found" });
      }

      if (data.action === "approve") {
        const updated = await storage.approveStaffAssignment(assignment.id, req.session.staffId);
        publishStaffEvent(restaurantId, "staff.updated", { source: "staff.approve" });
        res.json({ message: "Staff approved", assignment: updated });
      } else if (data.action === "revoke") {
        const updated = await storage.revokeStaffAssignment(assignment.id);
        publishStaffEvent(restaurantId, "staff.updated", { source: "staff.revoke" });
        res.json({ message: "Staff access revoked", assignment: updated });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ IMAGE UPLOAD ============
  app.post("/api/upload/menu-image", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const ext = path.extname(req.file.originalname || "");
      const fallbackExt =
        req.file.mimetype === "image/jpeg"
          ? ".jpg"
          : req.file.mimetype === "image/png"
            ? ".png"
            : req.file.mimetype === "image/webp"
              ? ".webp"
              : req.file.mimetype === "image/gif"
                ? ".gif"
                : "";
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = `menu-${uniqueSuffix}${ext || fallbackExt}`;
      const objectPath = `menu-items/${filename}`;

      supabase.storage
        .from(supabaseMenuBucket)
        .upload(objectPath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        })
        .then(({ error }) => {
          if (error) {
            return res.status(500).json({ error: error.message });
          }
          const imageUrl = `${supabasePublicBaseUrl}/${objectPath}`;
          res.json({ imageUrl });
        })
        .catch((err) => {
          res.status(500).json({ error: err.message || "Upload failed" });
        });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ OWNER: MENU MANAGEMENT ============
  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      const items = await storage.getMenuItemsByRestaurant(restaurantId);
      const cats = await storage.getCategoriesByRestaurant(restaurantId);
      res.json({ items, categories: cats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/restaurants/:id/menu", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      if (typeof req.body?.description === "string" && req.body.description.length > 300) {
        return res.status(400).json({ error: "Description must be 300 characters or less" });
      }

      const itemData = { ...req.body, restaurantId };
      const item = await storage.createMenuItem(itemData);
      publishStaffEvent(restaurantId, "menu.updated", { source: "menu.create" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create menu item" });
    }
  });

  app.put("/api/restaurants/:id/menu/:itemId", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      // Verify item belongs to this restaurant
      const existingItem = await storage.getMenuItem(itemId);
      if (!existingItem || existingItem.restaurantId !== restaurantId) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      if (typeof req.body?.description === "string" && req.body.description.length > 300) {
        return res.status(400).json({ error: "Description must be 300 characters or less" });
      }

      const updated = await storage.updateMenuItem(itemId, req.body);
      publishStaffEvent(restaurantId, "menu.updated", { source: "menu.update" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update menu item" });
    }
  });

  app.delete("/api/restaurants/:id/menu/:itemId", async (req, res) => {
    try {
      if (req.session.userType !== "staff" || req.session.staffRole !== "owner") {
        return res.status(403).json({ error: "Owner access required" });
      }

      const restaurantId = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      const restaurant = await storage.getRestaurant(restaurantId);
      
      if (!restaurant || restaurant.ownerId !== req.session.staffId) {
        return res.status(403).json({ error: "You don't own this restaurant" });
      }

      // Verify item belongs to this restaurant
      const existingItem = await storage.getMenuItem(itemId);
      if (!existingItem || existingItem.restaurantId !== restaurantId) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      await storage.deleteMenuItem(itemId);
      publishStaffEvent(restaurantId, "menu.updated", { source: "menu.delete" });
      res.json({ message: "Menu item deleted" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to delete menu item" });
    }
  });

  // ============ CUSTOMER PREFERENCES ============
  app.get("/api/customer/preferences", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const prefs = await storage.getCustomerPreferences(req.session.customerId);
      res.json(prefs || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/customer/preferences", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const normalized = Object.fromEntries(
        Object.entries(req.body ?? {}).map(([key, value]) => [
          key,
          value === null ? undefined : value,
        ]),
      );
      const data = updateCustomerPreferencesSchema.parse(normalized);
      const prefs = await storage.upsertCustomerPreferences(req.session.customerId, data);
      res.json(prefs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ SUGGESTED ITEMS ============
  app.get("/api/customer/suggested", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const restaurantId = await resolveRestaurantIdAsync(req);
      if (restaurantId) {
        req.session.restaurantId = restaurantId;
      }
      const suggestions = await storage.getSuggestedItems(req.session.customerId, 6, restaurantId ?? undefined);
      const cats = restaurantId
        ? await storage.getCategoriesByRestaurant(restaurantId)
        : await storage.getCategories();
      const categoryMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

      const transformedItems = await Promise.all(suggestions.map(async (item) => {
        const menuItem = item.item;
        const itemModifiers = await storage.getModifiersForItem(menuItem.id);
        return {
          id: String(menuItem.id),
          name: menuItem.name,
          description: menuItem.description || "",
          price: menuItem.price,
          image: menuItem.imageUrl || "",
          category: menuItem.categoryId ? categoryMap[menuItem.categoryId] || "Other" : "Other",
          isVegan: menuItem.isVegan,
          isVegetarian: menuItem.isVegetarian,
          isGlutenFree: menuItem.isGlutenFree,
          isSpicy: menuItem.isSpicy,
          allergens: menuItem.allergens,
          modifiers: itemModifiers.map((m) => ({ id: String(m.id), name: m.name, price: m.additionalCost })),
          calories: menuItem.calories,
          protein: menuItem.proteinGrams,
          carbs: menuItem.carbsGrams,
          fat: menuItem.fatGrams,
          rankingScore: item.rankingScore,
          reasonLabel: item.reasonLabel,
          reasonCodes: item.reasonCodes,
        };
      }));

      res.json({ items: transformedItems });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get suggestions" });
    }
  });

  // ============ CUSTOMER ORDERS WITH NUTRITION ============
  app.get("/api/customer/orders/nutrition", async (req, res) => {
    try {
      if (req.session.userType !== "customer" || !req.session.customerId) {
        return res.status(401).json({ error: "Customer authentication required" });
      }

      const orders = await storage.getOrdersWithNutrition(req.session.customerId);
      const tables = await storage.getTables(req.session.restaurantId);
      const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableNumber]));
      
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const transformedOrders = orders.map((order) => {
        const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
        orderDate.setHours(0, 0, 0, 0);
        const isToday = orderDate.getTime() === today.getTime();

        // Calculate nutrition totals for the order
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        const itemsWithNutrition = order.items.map((item) => {
          const menuItem = item.menuItem;
          const calories = (menuItem?.calories || 0) * item.quantity;
          const protein = parseFloat(String(menuItem?.proteinGrams || 0)) * item.quantity;
          const carbs = parseFloat(String(menuItem?.carbsGrams || 0)) * item.quantity;
          const fat = parseFloat(String(menuItem?.fatGrams || 0)) * item.quantity;

          totalCalories += calories;
          totalProtein += protein;
          totalCarbs += carbs;
          totalFat += fat;

          return {
            id: String(item.id),
            name: menuItem?.name || "Unknown Item",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            calories,
            protein,
            carbs,
            fat,
          };
        });

        return {
          id: String(order.id),
          orderNumber: order.orderNumber,
          tableNumber: order.tableId ? tableMap[order.tableId] || null : null,
          items: itemsWithNutrition,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
          isToday,
          nutrition: {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
          },
        };
      });

      // Separate today's orders from past orders
      const todayOrders = transformedOrders.filter((o) => o.isToday);
      const pastOrders = transformedOrders.filter((o) => !o.isToday);

      // Calculate daily and weekly totals
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const weeklyOrders = transformedOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= weekAgo;
      });

      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      monthAgo.setHours(0, 0, 0, 0);

      const last30DaysOrders = transformedOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthAgo;
      });

      const dailyNutrition = todayOrders.reduce(
        (acc, order) => ({
          calories: acc.calories + order.nutrition.calories,
          protein: acc.protein + order.nutrition.protein,
          carbs: acc.carbs + order.nutrition.carbs,
          fat: acc.fat + order.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const weeklyNutrition = weeklyOrders.reduce(
        (acc, order) => ({
          calories: acc.calories + order.nutrition.calories,
          protein: acc.protein + order.nutrition.protein,
          carbs: acc.carbs + order.nutrition.carbs,
          fat: acc.fat + order.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const last7Totals = weeklyOrders.reduce(
        (acc, order) => ({
          calories: acc.calories + order.nutrition.calories,
          protein: acc.protein + order.nutrition.protein,
          carbs: acc.carbs + order.nutrition.carbs,
          fat: acc.fat + order.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const last30Totals = last30DaysOrders.reduce(
        (acc, order) => ({
          calories: acc.calories + order.nutrition.calories,
          protein: acc.protein + order.nutrition.protein,
          carbs: acc.carbs + order.nutrition.carbs,
          fat: acc.fat + order.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const avg7DayNutrition = {
        calories: last7Totals.calories / 7,
        protein: last7Totals.protein / 7,
        carbs: last7Totals.carbs / 7,
        fat: last7Totals.fat / 7,
      };

      const avg30DayNutrition = {
        calories: last30Totals.calories / 30,
        protein: last30Totals.protein / 30,
        carbs: last30Totals.carbs / 30,
        fat: last30Totals.fat / 30,
      };

      const toDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const dailyTotalsByDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      for (const order of last30DaysOrders) {
        const orderDate = new Date(order.createdAt);
        const key = toDateKey(orderDate);
        const current = dailyTotalsByDate.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dailyTotalsByDate.set(key, {
          calories: current.calories + order.nutrition.calories,
          protein: current.protein + order.nutrition.protein,
          carbs: current.carbs + order.nutrition.carbs,
          fat: current.fat + order.nutrition.fat,
        });
      }

      const last30DailyNutrition = Array.from({ length: 30 }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (29 - index));
        const key = toDateKey(day);
        const totals = dailyTotalsByDate.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
        return { date: key, ...totals };
      });

      res.json({
        todayOrders,
        pastOrders,
        dailyNutrition,
        weeklyNutrition,
        avg7DayNutrition,
        avg30DayNutrition,
        last30DailyNutrition,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MENU WITH FILTER ============
  app.get("/api/menu/filtered", async (req, res) => {
    try {
      // Determine restaurant context.
      const restaurantId = await resolveRestaurantIdAsync(req);

      if (restaurantId) {
        req.session.restaurantId = restaurantId;
      }

      const rawItems = restaurantId
        ? await storage.getMenuItemsByRestaurant(restaurantId)
        : await storage.getMenuItems();
      const items = rawItems.filter((item) => !item.isSoldOut);
      const cats = restaurantId
        ? await storage.getCategoriesByRestaurant(restaurantId)
        : await storage.getCategories();
      const categoryMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));

      let filteredItems = items;

      // Apply customer preferences if authenticated and requested
      if (req.session.userType === "customer" && req.session.customerId && req.query.applyFilter === "true") {
        const prefs = await storage.getCustomerPreferences(req.session.customerId);
        
        if (prefs) {
          filteredItems = items.filter((item) => {
            // Dietary restrictions
            if (prefs.dietaryRestrictions?.includes("vegan") && !item.isVegan) return false;
            if (prefs.dietaryRestrictions?.includes("vegetarian") && !item.isVegetarian && !item.isVegan) return false;
            if (prefs.dietaryRestrictions?.includes("halal") && !item.isHalal) return false;
            if (prefs.dietaryRestrictions?.includes("kosher") && !item.isKosher) return false;

            // Allergen avoidance
            if (prefs.allergensToAvoid?.length) {
              const itemAllergens = (item.allergens || []).map((allergen) =>
                allergen.toLowerCase(),
              );
              for (const allergen of prefs.allergensToAvoid) {
                if (itemAllergens.includes(allergen)) return false;
              }
            }

            // Gluten-free
            if (prefs.dietaryRestrictions?.includes("gluten_free") && !item.isGlutenFree) return false;
            if (prefs.allergensToAvoid?.includes("gluten") && !item.isGlutenFree) return false;

            // Avoid spicy
            if (prefs.avoidSpicy && item.isSpicy) return false;
            if (prefs.preferSpicy && !item.isSpicy) return false;

            // Avoid alcohol
            if (prefs.avoidAlcohol && item.isAlcoholic) return false;

            // Avoid caffeine
            if (prefs.avoidCaffeine && item.isCaffeinated) return false;

            // Calorie limits
            if (prefs.calorieTargetMax && item.calories && item.calories > prefs.calorieTargetMax) return false;

            return true;
          });
        }
      }

      let sortedItems = filteredItems;
      let rankingMetaByItemId: Map<number, { rankingScore: number; reasonLabel: string; reasonCodes: string[] }> | undefined;
      if (parsePersonalizedFlag(req) && req.session.userType === "customer" && req.session.customerId) {
        const ranked = await storage.rankMenuItemsForCustomer(
          req.session.customerId,
          filteredItems,
          restaurantId ?? undefined,
          filteredItems.length,
          true,
        );
        if (ranked.length > 0) {
          sortedItems = ranked.map((entry) => entry.item);
          rankingMetaByItemId = new Map(
            ranked.map((entry) => [
              entry.item.id,
              {
                rankingScore: entry.rankingScore,
                reasonLabel: entry.reasonLabel,
                reasonCodes: entry.reasonCodes,
              },
            ]),
          );
        }
      }

      // TC-20: Batch load modifiers for performance
      const menuItemIds = sortedItems.map(item => item.id);
      const modifiersMap = await storage.getModifiersForItems(menuItemIds);

      const itemsWithDetails = await buildCustomerMenuResponse(sortedItems, categoryMap, rankingMetaByItemId, modifiersMap);
      // Return array for backward compatibility with frontend
      res.json(itemsWithDetails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
