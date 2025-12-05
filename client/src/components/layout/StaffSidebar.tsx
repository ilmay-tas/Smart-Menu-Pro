import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed,
  LayoutDashboard,
  ClipboardList,
  Menu,
  Settings,
  LogOut,
  ChefHat,
  UserRound,
} from "lucide-react";

type StaffRole = "kitchen" | "waiter" | "owner";

interface StaffSidebarProps {
  role: StaffRole;
  userName: string;
  onLogout: () => void;
}

const menuItems = {
  kitchen: [
    { title: "Orders", url: "/kitchen", icon: ClipboardList },
  ],
  waiter: [
    { title: "Orders", url: "/waiter", icon: ClipboardList },
  ],
  owner: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Orders", url: "/owner/orders", icon: ClipboardList },
    { title: "Menu", url: "/owner/menu", icon: Menu },
    { title: "Settings", url: "/owner/settings", icon: Settings },
  ],
};

const roleIcons = {
  kitchen: ChefHat,
  waiter: UserRound,
  owner: UtensilsCrossed,
};

const roleLabels = {
  kitchen: "Kitchen Staff",
  waiter: "Waiter",
  owner: "Restaurant Owner",
};

export default function StaffSidebar({
  role,
  userName,
  onLogout,
}: StaffSidebarProps) {
  const [location] = useLocation();
  const items = menuItems[role];
  const RoleIcon = roleIcons[role];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold">MyDine</h2>
            <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <RoleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-staff-name">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onLogout}
          data-testid="button-sidebar-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
