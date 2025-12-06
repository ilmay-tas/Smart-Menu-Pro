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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2, UserCheck, UserX, Clock, ChefHat, UtensilsCrossed, Crown } from "lucide-react";
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

interface OwnerDashboardProps {
  userName?: string;
  onLogout: () => void;
}

export default function OwnerDashboard({ userName = "Restaurant Owner", onLogout }: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "staff">("analytics");
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
    queryKey: ["/api/restaurants", 1, "staff"],
    enabled: activeTab === "staff",
  });

  const approveMutation = useMutation({
    mutationFn: async ({ staffId, action }: { staffId: number; action: "approve" | "revoke" }) => {
      return apiRequest("POST", `/api/restaurants/1/staff/approve`, { staffId, action });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", 1, "staff"] });
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "analytics" | "staff")}>
              <TabsList className="mb-6">
                <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
                <TabsTrigger value="staff" data-testid="tab-staff">
                  Staff Management
                  {pendingStaff.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{pendingStaff.length}</Badge>
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
                      <CardContent>
                        {approvedStaff.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No active staff members yet</p>
                        ) : (
                          <div className="space-y-3">
                            {approvedStaff.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                                data-testid={`approved-staff-${assignment.staffId}`}
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
                                  onClick={() => approveMutation.mutate({ staffId: assignment.staffId, action: "revoke" })}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-revoke-${assignment.staffId}`}
                                >
                                  <UserX className="w-4 h-4 mr-1" />
                                  Revoke Access
                                </Button>
                              </div>
                            ))}
                          </div>
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
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
