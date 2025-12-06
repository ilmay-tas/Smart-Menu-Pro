import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import KPICard from "@/components/dashboard/KPICard";
import TopSellingChart from "@/components/dashboard/TopSellingChart";
import SalesChart from "@/components/dashboard/SalesChart";
import { DollarSign, ShoppingCart, Users, TrendingUp, Loader2 } from "lucide-react";

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

interface OwnerDashboardProps {
  userName?: string;
  onLogout: () => void;
}

export default function OwnerDashboard({ userName = "Restaurant Owner", onLogout }: OwnerDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: topSelling = [], isLoading: topSellingLoading } = useQuery<TopSellingItem[]>({
    queryKey: ["/api/analytics/top-selling"],
  });

  const { data: salesData = [], isLoading: salesLoading } = useQuery<SalesDataPoint[]>({
    queryKey: ["/api/analytics/daily-revenue"],
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
          <main className="flex-1 overflow-auto p-4 space-y-6">
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
