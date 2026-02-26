import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import KPICard from "@/components/dashboard/KPICard";
import TopSellingChart from "@/components/dashboard/TopSellingChart";
import SalesChart from "@/components/dashboard/SalesChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, UserCheck, UserX, Clock, ChefHat, UtensilsCrossed, Crown, Plus, Pencil, Trash2, Menu, Star, MessageSquare, X, Check, Tag, Upload, ImagePlus, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrencyTRY } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
  avgOrderValue: number;
}

interface TopSellingItem {
  name: string;
  orders: number;
  revenue: number;
}

interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface StaffAssignment {
  id: number;
  staffId: number;
  restaurantId: number;
  status: "pending" | "approved" | "revoked";
  requestedAt: string;
  approvedAt: string | null;
  staff: {
    id: number;
    username: string;
    name: string;
    role: "waiter" | "kitchen" | "owner";
  };
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  calories: number | null;
  proteinGrams: string | null;
  carbsGrams: string | null;
  fatGrams: string | null;
  isSoldOut: boolean | null;
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  isGlutenFree: boolean | null;
  isSpicy: boolean | null;
  categoryId: number | null;
  restaurantId: number | null;
}

interface Category {
  id: number;
  name: string;
  restaurantId: number | null;
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  logoUrl: string | null;
  menuThemePrimary: string | null;
  menuThemeAccent: string | null;
  menuThemeBackground: string | null;
  menuThemeForeground: string | null;
  menuThemeCard: string | null;
  ownerId: number | null;
  isActive: boolean | null;
}

interface RestaurantTheme {
  restaurantId: number;
  menuThemePrimary: string | null;
  menuThemeAccent: string | null;
  menuThemeBackground: string | null;
  menuThemeForeground: string | null;
  menuThemeCard: string | null;
}

interface ThemeFormState {
  menuThemePrimary: string;
  menuThemeAccent: string;
  menuThemeBackground: string;
  menuThemeForeground: string;
  menuThemeCard: string;
}

interface SpecialOffer {
  id: number;
  restaurantId: number;
  menuItemId: number | null;
  title: string;
  description: string | null;
  discountType: "percentage" | "fixed_amount" | "bogo";
  discountValue: string;
  isActive: boolean | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface FeedbackEntry {
  id: number;
  orderId: number;
  speedRating: number;
  serviceRating: number;
  tasteRating: number;
  comment: string | null;
  createdAt: string;
  orderNumber: string;
  tableNumber: number | null;
}

interface FeedbackSummary {
  avgSpeed: number;
  avgService: number;
  avgTaste: number;
  totalReviews: number;
  recentFeedback: FeedbackEntry[];
}

interface OwnerDashboardProps {
  userName?: string;
  onLogout: () => void;
  initialTab?: "analytics" | "staff" | "menu" | "feedback";
}

const DEFAULT_THEME = {
  primary: "#ec407a",
  accent: "#ffffff",
  background: "#f0f0f0",
  foreground: "#1a1a1a",
  card: "#fcfcfc",
};

function mapThemeToForm(theme: Partial<RestaurantTheme> | Partial<Restaurant>): ThemeFormState {
  return {
    menuThemePrimary: theme.menuThemePrimary || DEFAULT_THEME.primary,
    menuThemeAccent: theme.menuThemeAccent || DEFAULT_THEME.accent,
    menuThemeBackground: theme.menuThemeBackground || DEFAULT_THEME.background,
    menuThemeForeground: theme.menuThemeForeground || DEFAULT_THEME.foreground,
    menuThemeCard: theme.menuThemeCard || DEFAULT_THEME.card,
  };
}

export default function OwnerDashboard({ userName = "Restaurant Owner", onLogout, initialTab = "analytics" }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "staff" | "menu" | "feedback">(initialTab);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [stableRestaurantId, setStableRestaurantId] = useState<number | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    calories: "",
    proteinGrams: "",
    carbsGrams: "",
    fatGrams: "",
    categoryId: "" as string,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    isSoldOut: false,
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed_amount" | "bogo",
    discountValue: "",
    menuItemId: "" as string,
    isActive: true,
    startDate: "",
    endDate: "",
  });
  const [themeForm, setThemeForm] = useState<ThemeFormState>(mapThemeToForm({}));
  const [isThemeHydrated, setIsThemeHydrated] = useState(false);
  const { toast } = useToast();

  const { data: ownerRestaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/owner/restaurant"],
  });

  useEffect(() => {
    if (ownerRestaurant?.id && !stableRestaurantId) {
      setStableRestaurantId(ownerRestaurant.id);
    }
  }, [ownerRestaurant?.id, stableRestaurantId]);

  const restaurantId = stableRestaurantId ?? ownerRestaurant?.id ?? null;

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: topSelling = [], isLoading: topSellingLoading } = useQuery<TopSellingItem[]>({
    queryKey: ["/api/analytics/top-selling"],
  });

  const { data: salesData = [], isLoading: salesLoading } = useQuery<SalesDataPoint[]>({
    queryKey: ["/api/analytics/daily-revenue"],
  });

  const { data: staffAssignments = [], isLoading: staffLoading } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/restaurants", restaurantId, "staff"],
    enabled: activeTab === "staff" && !!restaurantId,
  });

  const { data: feedbackData, isLoading: feedbackLoading } = useQuery<FeedbackSummary>({
    queryKey: ["/api/analytics/feedback"],
    enabled: activeTab === "feedback",
  });

  const { data: menuData, isLoading: menuLoading } = useQuery<{ items: MenuItem[]; categories: Category[] }>({
    queryKey: ["/api/restaurants", restaurantId, "menu"],
    enabled: activeTab === "menu" && !!restaurantId,
  });

  const themeQueryKey = ["/api/restaurants", restaurantId, "theme"] as const;
  const {
    data: restaurantTheme,
    isLoading: themeLoading,
    error: themeError,
  } = useQuery<RestaurantTheme | null>({
    queryKey: themeQueryKey,
    enabled: !!restaurantId,
  });

  const { data: offersData = [], isLoading: offersLoading } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/restaurants", restaurantId, "offers"],
    enabled: activeTab === "menu" && !!restaurantId,
  });

  const menuItems = menuData?.items || [];
  const menuCategories = menuData?.categories || [];
  const hasCustomTheme =
    !!restaurantTheme?.menuThemePrimary ||
    !!restaurantTheme?.menuThemeAccent ||
    !!restaurantTheme?.menuThemeBackground ||
    !!restaurantTheme?.menuThemeForeground ||
    !!restaurantTheme?.menuThemeCard;

  useEffect(() => {
    if (!ownerRestaurant) {
      return;
    }
    setThemeForm(mapThemeToForm(ownerRestaurant));
    setIsThemeHydrated(true);
  }, [ownerRestaurant]);

  useEffect(() => {
    if (!restaurantTheme) {
      return;
    }
    setThemeForm(mapThemeToForm(restaurantTheme));
    setIsThemeHydrated(true);
  }, [restaurantTheme]);

  const filteredMenuItems = selectedCategoryFilter === "all"
    ? menuItems
    : selectedCategoryFilter === "uncategorized"
    ? menuItems.filter((item) => !item.categoryId)
    : menuItems.filter((item) => item.categoryId === parseInt(selectedCategoryFilter));

  const approveMutation = useMutation({
    mutationFn: async ({ staffId, action, restId }: { staffId: number; action: "approve" | "revoke"; restId: number }) => {
      return apiRequest("POST", `/api/restaurants/${restId}/staff/approve`, { staffId, action });
    },
    onSuccess: (_, { action, restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "staff"] });
      toast({
        title: action === "approve" ? "Staff Approved" : "Access Revoked",
        description: action === "approve" ? "Staff member can now access the restaurant." : "Staff member's access has been revoked.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update staff status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createMenuMutation = useMutation({
    mutationFn: async ({ data, restId }: { data: typeof menuForm; restId: number }) => {
      return apiRequest("POST", `/api/restaurants/${restId}/menu`, {
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        calories: data.calories ? parseInt(data.calories) : null,
        proteinGrams: data.proteinGrams || null,
        carbsGrams: data.carbsGrams || null,
        fatGrams: data.fatGrams || null,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        isVegan: data.isVegan,
        isVegetarian: data.isVegetarian,
        isGlutenFree: data.isGlutenFree,
        isSpicy: data.isSpicy,
        isSoldOut: data.isSoldOut,
      });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Menu Item Created", description: "New menu item has been added." });
      setIsMenuDialogOpen(false);
      resetMenuForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMenuMutation = useMutation({
    mutationFn: async ({ id, data, restId }: { id: number; data: typeof menuForm; restId: number }) => {
      return apiRequest("PUT", `/api/restaurants/${restId}/menu/${id}`, {
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        calories: data.calories ? parseInt(data.calories) : null,
        proteinGrams: data.proteinGrams || null,
        carbsGrams: data.carbsGrams || null,
        fatGrams: data.fatGrams || null,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        isVegan: data.isVegan,
        isVegetarian: data.isVegetarian,
        isGlutenFree: data.isGlutenFree,
        isSpicy: data.isSpicy,
        isSoldOut: data.isSoldOut,
      });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Menu Item Updated", description: "Menu item has been updated." });
      setIsMenuDialogOpen(false);
      setEditingItem(null);
      resetMenuForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async ({ id, restId }: { id: number; restId: number }) => {
      return apiRequest("DELETE", `/api/restaurants/${restId}/menu/${id}`);
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Menu Item Deleted", description: "Menu item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, restId }: { name: string; restId: number }) => {
      return apiRequest("POST", `/api/restaurants/${restId}/categories`, { name });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Category Created", description: "New category has been added." });
      setNewCategoryName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ catId, name, restId }: { catId: number; name: string; restId: number }) => {
      return apiRequest("PUT", `/api/restaurants/${restId}/categories/${catId}`, { name });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Category Updated", description: "Category has been renamed." });
      setEditingCategoryId(null);
      setEditingCategoryName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ catId, restId }: { catId: number; restId: number }) => {
      return apiRequest("DELETE", `/api/restaurants/${restId}/categories/${catId}`);
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "menu"] });
      toast({ title: "Category Deleted", description: "Category has been removed. Items have been uncategorized." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createOfferMutation = useMutation({
    mutationFn: async ({ data, restId }: { data: typeof offerForm; restId: number }) => {
      return apiRequest("POST", `/api/restaurants/${restId}/offers`, {
        title: data.title,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        menuItemId: data.menuItemId ? parseInt(data.menuItemId) : null,
        isActive: data.isActive,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "offers"] });
      toast({ title: "Offer Created", description: "New special offer has been added." });
      setIsOfferDialogOpen(false);
      resetOfferForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data, restId }: { id: number; data: typeof offerForm; restId: number }) => {
      return apiRequest("PUT", `/api/restaurants/${restId}/offers/${id}`, {
        title: data.title,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
        menuItemId: data.menuItemId ? parseInt(data.menuItemId) : null,
        isActive: data.isActive,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      });
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "offers"] });
      toast({ title: "Offer Updated", description: "Special offer has been updated." });
      setIsOfferDialogOpen(false);
      setEditingOffer(null);
      resetOfferForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async ({ id, restId }: { id: number; restId: number }) => {
      return apiRequest("DELETE", `/api/restaurants/${restId}/offers/${id}`);
    },
    onSuccess: (_, { restId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "offers"] });
      toast({ title: "Offer Deleted", description: "Special offer has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveThemeMutation = useMutation({
    mutationFn: async ({
      restId,
      data,
    }: {
      restId: number;
      data: {
        menuThemePrimary: string | null;
        menuThemeAccent: string | null;
        menuThemeBackground: string | null;
        menuThemeForeground: string | null;
        menuThemeCard: string | null;
      };
    }): Promise<RestaurantTheme> => {
      return apiRequest("PUT", `/api/restaurants/${restId}/theme`, data).then((res) => res.json());
    },
    onSuccess: (savedTheme, { restId }) => {
      queryClient.setQueryData(themeQueryKey, savedTheme);
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restId, "theme"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme/current"] });
      setThemeForm(mapThemeToForm(savedTheme));
      setIsThemeHydrated(true);
      toast({ title: "Theme Saved", description: "Customer theme has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleThemeSave = () => {
    if (!restaurantId || !isThemeHydrated) {
      return;
    }
    saveThemeMutation.mutate({
      restId: restaurantId,
      data: {
        menuThemePrimary: themeForm.menuThemePrimary,
        menuThemeAccent: themeForm.menuThemeAccent,
        menuThemeBackground: themeForm.menuThemeBackground,
        menuThemeForeground: themeForm.menuThemeForeground,
        menuThemeCard: themeForm.menuThemeCard,
      },
    });
  };

  const handleThemeReset = () => {
    if (!restaurantId || !isThemeHydrated) {
      return;
    }
    setThemeForm({
      menuThemePrimary: DEFAULT_THEME.primary,
      menuThemeAccent: DEFAULT_THEME.accent,
      menuThemeBackground: DEFAULT_THEME.background,
      menuThemeForeground: DEFAULT_THEME.foreground,
      menuThemeCard: DEFAULT_THEME.card,
    });
    saveThemeMutation.mutate({
      restId: restaurantId,
      data: {
        menuThemePrimary: null,
        menuThemeAccent: null,
        menuThemeBackground: null,
        menuThemeForeground: null,
        menuThemeCard: null,
      },
    });
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      menuItemId: "",
      isActive: true,
      startDate: "",
      endDate: "",
    });
  };

  const openCreateOfferDialog = () => {
    setEditingOffer(null);
    resetOfferForm();
    setIsOfferDialogOpen(true);
  };

  const openEditOfferDialog = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description || "",
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      menuItemId: offer.menuItemId?.toString() || "",
      isActive: offer.isActive ?? true,
      startDate: offer.startDate ? offer.startDate.split("T")[0] : "",
      endDate: offer.endDate ? offer.endDate.split("T")[0] : "",
    });
    setIsOfferDialogOpen(true);
  };

  const handleOfferSubmit = () => {
    if (!restaurantId) {
      toast({ title: "Error", description: "Restaurant not loaded yet.", variant: "destructive" });
      return;
    }
    if (!offerForm.title || !offerForm.discountValue) {
      toast({ title: "Error", description: "Title and discount value are required", variant: "destructive" });
      return;
    }
    if (editingOffer) {
      updateOfferMutation.mutate({ id: editingOffer.id, data: offerForm, restId: restaurantId });
    } else {
      createOfferMutation.mutate({ data: offerForm, restId: restaurantId });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/menu-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const { imageUrl } = await res.json();
      setMenuForm((prev) => ({ ...prev, imageUrl }));
      toast({ title: "Image Uploaded", description: "Image has been uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const resetMenuForm = () => {
    setMenuForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      calories: "",
      proteinGrams: "",
      carbsGrams: "",
      fatGrams: "",
      categoryId: "",
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isSpicy: false,
      isSoldOut: false,
    });
    setImagePreview(null);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    resetMenuForm();
    setIsMenuDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setImagePreview(item.imageUrl || null);
    setMenuForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      imageUrl: item.imageUrl || "",
      calories: item.calories?.toString() || "",
      proteinGrams: item.proteinGrams || "",
      carbsGrams: item.carbsGrams || "",
      fatGrams: item.fatGrams || "",
      categoryId: item.categoryId?.toString() || "",
      isVegan: item.isVegan || false,
      isVegetarian: item.isVegetarian || false,
      isGlutenFree: item.isGlutenFree || false,
      isSpicy: item.isSpicy || false,
      isSoldOut: item.isSoldOut || false,
    });
    setIsMenuDialogOpen(true);
  };

  const handleMenuSubmit = () => {
    if (!restaurantId) {
      toast({ title: "Error", description: "Restaurant not loaded yet. Please wait.", variant: "destructive" });
      return;
    }
    if (!menuForm.name || !menuForm.price) {
      toast({ title: "Error", description: "Name and price are required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMenuMutation.mutate({ id: editingItem.id, data: menuForm, restId: restaurantId });
    } else {
      createMenuMutation.mutate({ data: menuForm, restId: restaurantId });
    }
  };

  const isLoading = summaryLoading || topSellingLoading || salesLoading;

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ownerRestaurant || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No restaurant found for this owner.</p>
          <p className="text-sm text-muted-foreground">Please create a restaurant first.</p>
        </div>
      </div>
    );
  }

  const kpis = summary
    ? [
        {
          title: "Total Revenue",
          value: formatCurrencyTRY(summary.totalRevenue),
          icon: <DollarSign className="w-6 h-6" />,
        },
        {
          title: "Total Orders",
          value: String(summary.totalOrders),
          icon: <ShoppingCart className="w-6 h-6" />,
        },
        {
          title: "Active Tables",
          value: `${summary.occupiedTables}/${summary.totalTables}`,
          icon: <Users className="w-6 h-6" />,
        },
        {
          title: "Avg. Order Value",
          value: formatCurrencyTRY(summary.avgOrderValue),
          icon: <TrendingUp className="w-6 h-6" />,
        },
      ]
    : [];

  const pendingStaff = staffAssignments.filter((s) => s.status === "pending");
  const approvedStaff = staffAssignments.filter((s) => s.status === "approved");
  const revokedStaff = staffAssignments.filter((s) => s.status === "revoked");

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "kitchen":
        return <ChefHat className="w-4 h-4" />;
      case "waiter":
        return <UtensilsCrossed className="w-4 h-4" />;
      case "owner":
        return <Crown className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const sidebarStyle = { "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <StaffSidebar role="owner" userName={userName} onLogout={onLogout} />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-bold">Dashboard</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "analytics" | "staff" | "menu" | "feedback")}>
              <TabsList className="mb-6">
                <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
                <TabsTrigger value="staff" data-testid="tab-staff">
                  Staff Management
                  {pendingStaff.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{pendingStaff.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="menu" data-testid="tab-menu">
                  Menu Management
                </TabsTrigger>
                <TabsTrigger value="feedback" data-testid="tab-feedback">
                  Feedback
                  {feedbackData && feedbackData.totalReviews > 0 && (
                    <Badge variant="secondary" className="ml-2">{feedbackData.totalReviews}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-6 mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {kpis.map((kpi) => (
                        <KPICard key={kpi.title} {...kpi} />
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SalesChart
                        data={salesData.length > 0 ? salesData : [
                          { date: "Mon", revenue: 0, orders: 0 },
                          { date: "Tue", revenue: 0, orders: 0 },
                          { date: "Wed", revenue: 0, orders: 0 },
                          { date: "Thu", revenue: 0, orders: 0 },
                          { date: "Fri", revenue: 0, orders: 0 },
                          { date: "Sat", revenue: 0, orders: 0 },
                          { date: "Sun", revenue: 0, orders: 0 },
                        ]}
                        title="Weekly Sales Overview"
                      />
                      <TopSellingChart
                        items={topSelling.length > 0 ? topSelling : [{ name: "No data yet", orders: 0, revenue: 0 }]}
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="staff" className="space-y-6 mt-0">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {pendingStaff.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Pending Requests ({pendingStaff.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {pendingStaff.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                              data-testid={`pending-staff-${assignment.staffId}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-background">
                                  {getRoleIcon(assignment.staff.role)}
                                </div>
                                <div>
                                  <p className="font-medium">{assignment.staff.name}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>@{assignment.staff.username}</span>
                                    <Badge variant="outline" className="capitalize">{assignment.staff.role}</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "approve", restId: restaurantId! })}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${assignment.staffId}`}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "revoke", restId: restaurantId! })}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-reject-${assignment.staffId}`}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-green-500" />
                          Active Staff ({approvedStaff.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {approvedStaff.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No active staff members</p>
                        ) : (
                          approvedStaff.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                              data-testid={`active-staff-${assignment.staffId}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-background">
                                  {getRoleIcon(assignment.staff.role)}
                                </div>
                                <div>
                                  <p className="font-medium">{assignment.staff.name}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>@{assignment.staff.username}</span>
                                    <Badge variant="outline" className="capitalize">{assignment.staff.role}</Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "revoke", restId: restaurantId! })}
                                disabled={approveMutation.isPending}
                                data-testid={`button-revoke-${assignment.staffId}`}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {revokedStaff.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <UserX className="w-5 h-5 text-muted-foreground" />
                            Revoked Staff ({revokedStaff.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {revokedStaff.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 opacity-60"
                              data-testid={`revoked-staff-${assignment.staffId}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-background">
                                  {getRoleIcon(assignment.staff.role)}
                                </div>
                                <div>
                                  <p className="font-medium">{assignment.staff.name}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>@{assignment.staff.username}</span>
                                    <Badge variant="outline" className="capitalize">{assignment.staff.role}</Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "approve", restId: restaurantId! })}
                                disabled={approveMutation.isPending}
                                data-testid={`button-reinstate-${assignment.staffId}`}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Reinstate
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {pendingStaff.length === 0 && approvedStaff.length === 0 && revokedStaff.length === 0 && (
                      <Card className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No staff members have requested access yet</p>
                        <p className="text-sm text-muted-foreground mt-2">Staff can join by signing up and selecting this restaurant</p>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="menu" className="space-y-6 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Customer Theme
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      If empty, MyDine default theme is used on customer auth, menu and orders screens.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="theme-primary">Primary</Label>
                        <Input
                          id="theme-primary"
                          type="color"
                          value={themeForm.menuThemePrimary}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, menuThemePrimary: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="theme-accent">Accent</Label>
                        <Input
                          id="theme-accent"
                          type="color"
                          value={themeForm.menuThemeAccent}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, menuThemeAccent: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="theme-background">Background</Label>
                        <Input
                          id="theme-background"
                          type="color"
                          value={themeForm.menuThemeBackground}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, menuThemeBackground: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="theme-foreground">Text</Label>
                        <Input
                          id="theme-foreground"
                          type="color"
                          value={themeForm.menuThemeForeground}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, menuThemeForeground: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="theme-card">Card</Label>
                        <Input
                          id="theme-card"
                          type="color"
                          value={themeForm.menuThemeCard}
                          onChange={(e) => setThemeForm((prev) => ({ ...prev, menuThemeCard: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCustomTheme ? <Badge variant="secondary">Custom theme active</Badge> : <Badge variant="outline">Using defaults</Badge>}
                      <Button size="sm" onClick={handleThemeSave} disabled={saveThemeMutation.isPending || themeLoading || !isThemeHydrated}>
                        {saveThemeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                        Save Theme
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleThemeReset} disabled={saveThemeMutation.isPending || themeLoading || !isThemeHydrated}>
                        Reset to Default
                      </Button>
                    </div>
                    {themeError ? (
                      <p className="text-xs text-destructive">
                        Theme settings could not be loaded. Please refresh and try again.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Category Management Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 items-center">
                      {menuCategories.map((cat) => (
                        <div key={cat.id} className="group">
                          {editingCategoryId === cat.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="h-8 w-32 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && editingCategoryName.trim() && restaurantId) {
                                    updateCategoryMutation.mutate({ catId: cat.id, name: editingCategoryName.trim(), restId: restaurantId });
                                  } else if (e.key === "Escape") {
                                    setEditingCategoryId(null);
                                    setEditingCategoryName("");
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (editingCategoryName.trim() && restaurantId) {
                                    updateCategoryMutation.mutate({ catId: cat.id, name: editingCategoryName.trim(), restId: restaurantId });
                                  }
                                }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="px-3 py-1.5 text-sm flex items-center gap-1.5 cursor-default">
                              {cat.name}
                              <button
                                className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                                onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                className="opacity-50 hover:opacity-100 transition-opacity text-destructive"
                                onClick={() => {
                                  if (restaurantId) {
                                    deleteCategoryMutation.mutate({ catId: cat.id, restId: restaurantId });
                                  }
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category..."
                          className="h-8 w-36 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newCategoryName.trim() && restaurantId) {
                              createCategoryMutation.mutate({ name: newCategoryName.trim(), restId: restaurantId });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          onClick={() => {
                            if (newCategoryName.trim() && restaurantId) {
                              createCategoryMutation.mutate({ name: newCategoryName.trim(), restId: restaurantId });
                            }
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Offers Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Special Offers
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={openCreateOfferDialog}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add Offer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {offersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : offersData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No special offers yet. Create one to attract more customers!
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {offersData.map((offer) => {
                          const linkedItem = menuItems.find((m) => m.id === offer.menuItemId);
                          return (
                            <div
                              key={offer.id}
                              className={`border rounded-lg p-3 ${offer.isActive ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-muted bg-muted/20 opacity-60"}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm truncate">{offer.title}</h4>
                                    {offer.isActive ? (
                                      <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-primary mt-1">
                                    {offer.discountType === "percentage" && `${offer.discountValue}% OFF`}
                                    {offer.discountType === "fixed_amount" && `${formatCurrencyTRY(offer.discountValue)} OFF`}
                                    {offer.discountType === "bogo" && "Buy One Get One"}
                                  </p>
                                  {linkedItem && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Applies to: {linkedItem.name}
                                    </p>
                                  )}
                                  {offer.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                                  )}
                                  {(offer.startDate || offer.endDate) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {offer.startDate && `From: ${new Date(offer.startDate).toLocaleDateString()}`}
                                      {offer.startDate && offer.endDate && " — "}
                                      {offer.endDate && `Until: ${new Date(offer.endDate).toLocaleDateString()}`}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditOfferDialog(offer)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => deleteOfferMutation.mutate({ id: offer.id, restId: restaurantId! })}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Menu Items Section */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Menu Items</h2>
                    {menuCategories.length > 0 && (
                      <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="uncategorized">Uncategorized</SelectItem>
                          {menuCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={openCreateDialog} data-testid="button-add-menu-item">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Menu Item
                  </Button>
                </div>

                {menuLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Menu className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {menuItems.length === 0 ? "No menu items yet" : "No items in this category"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {menuItems.length === 0 ? "Add your first menu item to get started" : "Try selecting a different category filter"}
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMenuItems.map((item) => {
                      const itemCategory = menuCategories.find((c) => c.id === item.categoryId);
                      const itemOffer = offersData.find((o) => o.menuItemId === item.id && o.isActive);
                      return (
                        <Card key={item.id} className="overflow-hidden" data-testid={`menu-item-${item.id}`}>
                          {item.imageUrl && (
                            <div className="h-32 overflow-hidden">
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-lg font-bold text-primary">{formatCurrencyTRY(item.price)}</p>
                              </div>
                              {item.isSoldOut && <Badge variant="destructive">Sold Out</Badge>}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {itemOffer && (
                                <Badge className="bg-orange-500 text-white">
                                  {itemOffer.discountType === "percentage" && `${itemOffer.discountValue}% OFF`}
                                  {itemOffer.discountType === "fixed_amount" && `${formatCurrencyTRY(itemOffer.discountValue)} OFF`}
                                  {itemOffer.discountType === "bogo" && "BOGO"}
                                </Badge>
                              )}
                              {itemCategory && <Badge variant="outline">{itemCategory.name}</Badge>}
                              {item.isVegan && <Badge variant="secondary">Vegan</Badge>}
                              {item.isVegetarian && <Badge variant="secondary">Vegetarian</Badge>}
                              {item.isGlutenFree && <Badge variant="secondary">GF</Badge>}
                              {item.isSpicy && <Badge variant="secondary">Spicy</Badge>}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(item)}
                                data-testid={`button-edit-${item.id}`}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMenuMutation.mutate({ id: item.id, restId: restaurantId! })}
                                disabled={deleteMenuMutation.isPending}
                                data-testid={`button-delete-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6 mt-0">
                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !feedbackData || feedbackData.totalReviews === 0 ? (
                  <Card className="p-8 text-center">
                    <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No feedback received yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Customer reviews will appear here after they rate their orders</p>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <Star className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Speed</p>
                            <p className="text-2xl font-bold">{feedbackData.avgSpeed.toFixed(1)}</p>
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= Math.round(feedbackData.avgSpeed) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Users className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Service</p>
                            <p className="text-2xl font-bold">{feedbackData.avgService.toFixed(1)}</p>
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= Math.round(feedbackData.avgService) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                            <UtensilsCrossed className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Taste</p>
                            <p className="text-2xl font-bold">{feedbackData.avgTaste.toFixed(1)}</p>
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= Math.round(feedbackData.avgTaste) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <MessageSquare className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Reviews</p>
                            <p className="text-2xl font-bold">{feedbackData.totalReviews}</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Recent Reviews
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {feedbackData.recentFeedback.map((fb) => (
                          <div key={fb.id} className="p-3 rounded-md bg-muted/50 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Order #{fb.orderNumber}</span>
                                {fb.tableNumber && (
                                  <Badge variant="outline">Table {fb.tableNumber}</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Speed:</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-3 h-3 ${s <= fb.speedRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Service:</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-3 h-3 ${s <= fb.serviceRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Taste:</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-3 h-3 ${s <= fb.tasteRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            {fb.comment && (
                              <p className="text-sm italic text-muted-foreground">"{fb.comment}"</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={menuForm.name}
                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="Dish name"
                data-testid="input-menu-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                value={menuForm.price}
                onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                placeholder="12.99"
                type="number"
                step="0.01"
                data-testid="input-menu-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={menuForm.description}
                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                placeholder="Describe this dish..."
                data-testid="input-menu-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreview || menuForm.imageUrl ? (
                <div className="relative group">
                  <img
                    src={imagePreview || menuForm.imageUrl}
                    alt="Menu item preview"
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      Replace
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setMenuForm({ ...menuForm, imageUrl: "" });
                        setImagePreview(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-sm">Click to upload image</span>
                      <span className="text-xs">JPEG, PNG, WebP or GIF (max 5MB)</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                value={menuForm.calories}
                onChange={(e) => setMenuForm({ ...menuForm, calories: e.target.value })}
                placeholder="500"
                type="number"
                data-testid="input-menu-calories"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="proteinGrams">Protein (g)</Label>
                <Input
                  id="proteinGrams"
                  value={menuForm.proteinGrams}
                  onChange={(e) => setMenuForm({ ...menuForm, proteinGrams: e.target.value })}
                  placeholder="24.5"
                  type="number"
                  step="0.1"
                  min="0"
                  data-testid="input-menu-protein"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbsGrams">Carbs (g)</Label>
                <Input
                  id="carbsGrams"
                  value={menuForm.carbsGrams}
                  onChange={(e) => setMenuForm({ ...menuForm, carbsGrams: e.target.value })}
                  placeholder="38.0"
                  type="number"
                  step="0.1"
                  min="0"
                  data-testid="input-menu-carbs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatGrams">Fat (g)</Label>
                <Input
                  id="fatGrams"
                  value={menuForm.fatGrams}
                  onChange={(e) => setMenuForm({ ...menuForm, fatGrams: e.target.value })}
                  placeholder="12.0"
                  type="number"
                  step="0.1"
                  min="0"
                  data-testid="input-menu-fat"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={menuForm.categoryId}
                onValueChange={(val) => setMenuForm({ ...menuForm, categoryId: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {menuCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVegan"
                  checked={menuForm.isVegan}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, isVegan: checked })}
                  data-testid="switch-vegan"
                />
                <Label htmlFor="isVegan">Vegan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVegetarian"
                  checked={menuForm.isVegetarian}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, isVegetarian: checked })}
                  data-testid="switch-vegetarian"
                />
                <Label htmlFor="isVegetarian">Vegetarian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isGlutenFree"
                  checked={menuForm.isGlutenFree}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, isGlutenFree: checked })}
                  data-testid="switch-gluten-free"
                />
                <Label htmlFor="isGlutenFree">Gluten-Free</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isSpicy"
                  checked={menuForm.isSpicy}
                  onCheckedChange={(checked) => setMenuForm({ ...menuForm, isSpicy: checked })}
                  data-testid="switch-spicy"
                />
                <Label htmlFor="isSpicy">Spicy</Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isSoldOut"
                checked={menuForm.isSoldOut}
                onCheckedChange={(checked) => setMenuForm({ ...menuForm, isSoldOut: checked })}
                data-testid="switch-sold-out"
              />
              <Label htmlFor="isSoldOut">Sold Out</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenuDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMenuSubmit}
              disabled={createMenuMutation.isPending || updateMenuMutation.isPending}
              data-testid="button-save-menu-item"
            >
              {(createMenuMutation.isPending || updateMenuMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Special Offer" : "Add Special Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offerTitle">Title *</Label>
              <Input
                id="offerTitle"
                value={offerForm.title}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                placeholder="e.g. Deal of the Day"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offerDescription">Description</Label>
              <Textarea
                id="offerDescription"
                value={offerForm.description}
                onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                placeholder="Describe this offer..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type *</Label>
                <Select
                  value={offerForm.discountType}
                  onValueChange={(val) => setOfferForm({ ...offerForm, discountType: val as "percentage" | "fixed_amount" | "bogo" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (TL)</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {offerForm.discountType === "percentage" ? "Discount (%)" : offerForm.discountType === "fixed_amount" ? "Amount (TL)" : "Value"} *
                </Label>
                <Input
                  id="discountValue"
                  value={offerForm.discountValue}
                  onChange={(e) => setOfferForm({ ...offerForm, discountValue: e.target.value })}
                  placeholder={offerForm.discountType === "percentage" ? "20" : "5.00"}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Apply to Menu Item (optional)</Label>
              <Select
                value={offerForm.menuItemId}
                onValueChange={(val) => setOfferForm({ ...offerForm, menuItemId: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All items (general offer)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Items (General Offer)</SelectItem>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} — {formatCurrencyTRY(item.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={offerForm.startDate}
                  onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={offerForm.endDate}
                  onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="offerActive"
                checked={offerForm.isActive}
                onCheckedChange={(checked) => setOfferForm({ ...offerForm, isActive: checked })}
              />
              <Label htmlFor="offerActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOfferSubmit}
              disabled={createOfferMutation.isPending || updateOfferMutation.isPending}
            >
              {(createOfferMutation.isPending || updateOfferMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingOffer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
