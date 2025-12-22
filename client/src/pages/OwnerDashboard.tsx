import { useState } from "react";
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
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, UserCheck, UserX, Clock, ChefHat, UtensilsCrossed, Crown, Plus, Pencil, Trash2, Menu } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
}

interface OwnerDashboardProps {
  userName?: string;
  onLogout: () => void;
}

const RESTAURANT_ID = 1; // TODO: Get from owner's session/context

export default function OwnerDashboard({ userName = "Restaurant Owner", onLogout }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "staff" | "menu">("analytics");
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    calories: "",
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isSpicy: false,
    isSoldOut: false,
  });
  const { toast } = useToast();

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
    queryKey: ["/api/restaurants", RESTAURANT_ID, "staff"],
    enabled: activeTab === "staff",
  });

  const { data: menuData, isLoading: menuLoading } = useQuery<{ items: MenuItem[]; categories: Category[] }>({
    queryKey: ["/api/restaurants", RESTAURANT_ID, "menu"],
    enabled: activeTab === "menu",
  });

  const menuItems = menuData?.items || [];

  const approveMutation = useMutation({
    mutationFn: async ({ staffId, action }: { staffId: number; action: "approve" | "revoke" }) => {
      return apiRequest("POST", `/api/restaurants/${RESTAURANT_ID}/staff/approve`, { staffId, action });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", RESTAURANT_ID, "staff"] });
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
    mutationFn: async (data: typeof menuForm) => {
      return apiRequest("POST", `/api/restaurants/${RESTAURANT_ID}/menu`, {
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        calories: data.calories ? parseInt(data.calories) : null,
        isVegan: data.isVegan,
        isVegetarian: data.isVegetarian,
        isGlutenFree: data.isGlutenFree,
        isSpicy: data.isSpicy,
        isSoldOut: data.isSoldOut,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", RESTAURANT_ID, "menu"] });
      toast({ title: "Menu Item Created", description: "New menu item has been added." });
      setIsMenuDialogOpen(false);
      resetMenuForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMenuMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof menuForm }) => {
      return apiRequest("PUT", `/api/restaurants/${RESTAURANT_ID}/menu/${id}`, {
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        calories: data.calories ? parseInt(data.calories) : null,
        isVegan: data.isVegan,
        isVegetarian: data.isVegetarian,
        isGlutenFree: data.isGlutenFree,
        isSpicy: data.isSpicy,
        isSoldOut: data.isSoldOut,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", RESTAURANT_ID, "menu"] });
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
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/restaurants/${RESTAURANT_ID}/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", RESTAURANT_ID, "menu"] });
      toast({ title: "Menu Item Deleted", description: "Menu item has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetMenuForm = () => {
    setMenuForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      calories: "",
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false,
      isSpicy: false,
      isSoldOut: false,
    });
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    resetMenuForm();
    setIsMenuDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      imageUrl: item.imageUrl || "",
      calories: item.calories?.toString() || "",
      isVegan: item.isVegan || false,
      isVegetarian: item.isVegetarian || false,
      isGlutenFree: item.isGlutenFree || false,
      isSpicy: item.isSpicy || false,
      isSoldOut: item.isSoldOut || false,
    });
    setIsMenuDialogOpen(true);
  };

  const handleMenuSubmit = () => {
    if (!menuForm.name || !menuForm.price) {
      toast({ title: "Error", description: "Name and price are required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMenuMutation.mutate({ id: editingItem.id, data: menuForm });
    } else {
      createMenuMutation.mutate(menuForm);
    }
  };

  const isLoading = summaryLoading || topSellingLoading || salesLoading;

  const kpis = summary
    ? [
        {
          title: "Total Revenue",
          value: `$${summary.totalRevenue.toFixed(2)}`,
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
          value: `$${summary.avgOrderValue.toFixed(2)}`,
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "analytics" | "staff" | "menu")}>
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
                                  onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "approve" })}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${assignment.staffId}`}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "revoke" })}
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
                                onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "revoke" })}
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
                                onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "approve" })}
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
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-lg font-semibold">Menu Items</h2>
                  <Button onClick={openCreateDialog} data-testid="button-add-menu-item">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Menu Item
                  </Button>
                </div>

                {menuLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : menuItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Menu className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No menu items yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Add your first menu item to get started</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.map((item) => (
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
                              <p className="text-lg font-bold text-primary">${parseFloat(item.price).toFixed(2)}</p>
                            </div>
                            {item.isSoldOut && <Badge variant="destructive">Sold Out</Badge>}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex gap-1 mt-2 flex-wrap">
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
                              onClick={() => deleteMenuMutation.mutate(item.id)}
                              disabled={deleteMenuMutation.isPending}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={menuForm.imageUrl}
                onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-menu-image"
              />
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
    </SidebarProvider>
  );
}
