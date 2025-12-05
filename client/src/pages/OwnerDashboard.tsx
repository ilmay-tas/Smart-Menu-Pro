import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import StaffSidebar from "@/components/layout/StaffSidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
import KPICard from "@/components/dashboard/KPICard";
import TopSellingChart from "@/components/dashboard/TopSellingChart";
import SalesChart from "@/components/dashboard/SalesChart";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

// todo: remove mock functionality - replace with API data
const mockKPIs = [
  {
    title: "Total Revenue",
    value: "$12,450",
    icon: <DollarSign className="w-6 h-6" />,
    trend: { value: 12.5, isPositive: true },
    subtitle: "vs last week",
  },
  {
    title: "Total Orders",
    value: "342",
    icon: <ShoppingCart className="w-6 h-6" />,
    trend: { value: 8.2, isPositive: true },
    subtitle: "vs last week",
  },
  {
    title: "Active Tables",
    value: "18/24",
    icon: <Users className="w-6 h-6" />,
    trend: { value: 5, isPositive: true },
    subtitle: "occupancy",
  },
  {
    title: "Avg. Order Value",
    value: "$36.40",
    icon: <TrendingUp className="w-6 h-6" />,
    trend: { value: 3.1, isPositive: true },
    subtitle: "vs last week",
  },
];

const mockTopSelling = [
  { name: "Beef Burger", orders: 89, revenue: 1334.11 },
  { name: "Pasta Carbonara", orders: 67, revenue: 1138.33 },
  { name: "Grilled Salmon", orders: 54, revenue: 1241.46 },
  { name: "Caesar Salad", orders: 48, revenue: 575.52 },
  { name: "Margherita Pizza", orders: 42, revenue: 671.58 },
];

const mockSalesData = [
  { date: "Mon", revenue: 1450, orders: 42 },
  { date: "Tue", revenue: 1820, orders: 51 },
  { date: "Wed", revenue: 1650, orders: 48 },
  { date: "Thu", revenue: 2100, orders: 58 },
  { date: "Fri", revenue: 2450, orders: 68 },
  { date: "Sat", revenue: 2980, orders: 82 },
  { date: "Sun", revenue: 2200, orders: 61 },
];

interface OwnerDashboardProps {
  userName?: string;
  onLogout: () => void;
}

export default function OwnerDashboard({
  userName = "Restaurant Owner",
  onLogout,
}: OwnerDashboardProps) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockKPIs.map((kpi) => (
                <KPICard key={kpi.title} {...kpi} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={mockSalesData} title="Weekly Sales Overview" />
              <TopSellingChart items={mockTopSelling} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
