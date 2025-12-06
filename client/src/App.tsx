import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import StaffAuthPage from "@/pages/StaffAuthPage";
import CustomerAuthPage from "@/pages/CustomerAuthPage";
import CustomerMenu from "@/pages/CustomerMenu";
import KitchenDashboard from "@/pages/KitchenDashboard";
import WaiterDashboard from "@/pages/WaiterDashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import NotFound from "@/pages/not-found";

type StaffRole = "waiter" | "kitchen" | "owner";

interface StaffUser {
  id: number;
  name: string;
  username: string;
  role: StaffRole;
  type: "staff";
}

interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  type: "customer";
}

type User = StaffUser | CustomerUser;

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"customer" | "staff">("customer");

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/signout");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setUser(null);
    queryClient.clear();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (authMode === "staff") {
      return (
        <StaffAuthPage
          onLogin={handleLogin}
          onSwitchToCustomer={() => setAuthMode("customer")}
        />
      );
    }
    return (
      <CustomerAuthPage
        onLogin={handleLogin}
        onSwitchToStaff={() => setAuthMode("staff")}
      />
    );
  }

  // Render based on user type
  if (user.type === "customer") {
    return (
      <CustomerMenu
        tableNumber="12"
        userName={user.name}
        onLogout={handleLogout}
      />
    );
  }

  // Staff user
  const staffUser = user as StaffUser;
  const renderStaffDashboard = () => {
    switch (staffUser.role) {
      case "kitchen":
        return <KitchenDashboard userName={staffUser.name} onLogout={handleLogout} />;
      case "waiter":
        return <WaiterDashboard userName={staffUser.name} onLogout={handleLogout} />;
      case "owner":
        return <OwnerDashboard userName={staffUser.name} onLogout={handleLogout} />;
      default:
        return <NotFound />;
    }
  };

  return (
    <Switch>
      <Route path="/" component={() => renderStaffDashboard()} />
      <Route path="/kitchen" component={() => <KitchenDashboard userName={staffUser.name} onLogout={handleLogout} />} />
      <Route path="/waiter" component={() => <WaiterDashboard userName={staffUser.name} onLogout={handleLogout} />} />
      <Route path="/dashboard" component={() => <OwnerDashboard userName={staffUser.name} onLogout={handleLogout} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
