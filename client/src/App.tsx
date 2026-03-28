import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import StaffAuthPage from "@/pages/StaffAuthPage";
import CustomerAuthPage from "@/pages/CustomerAuthPage";
import CustomerMenu from "@/pages/CustomerMenu";
import KitchenDashboard from "@/pages/KitchenDashboard";
import WaiterDashboard from "@/pages/WaiterDashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/not-found";
import { applyCustomerTheme, clearCustomerTheme, type CustomerThemeSettings } from "@/lib/customerTheme";

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

interface GuestUser {
  name: string;
  type: "guest";
}

type User = StaffUser | CustomerUser | GuestUser;

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, navigate] = useLocation();

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get("restaurantId");
    if (restaurantId) {
      window.sessionStorage.setItem("restaurantId", restaurantId);
      window.localStorage.setItem("restaurantId", restaurantId);
    }
  }, [location]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.type === "customer" || loggedInUser.type === "guest") {
      navigate("/");
    } else {
      // Redirect staff to their appropriate dashboard
      switch ((loggedInUser as StaffUser).role) {
        case "kitchen": navigate("/kitchen"); break;
        case "waiter": navigate("/waiter"); break;
        case "owner": navigate("/dashboard"); break;
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/signout");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    const params = new URLSearchParams(window.location.search);
    const restaurantId =
      params.get("restaurantId") ||
      window.sessionStorage.getItem("restaurantId") ||
      window.localStorage.getItem("restaurantId");
    const target =
      user?.type === "staff"
        ? "/staff/login"
        : restaurantId
          ? `/customer/login?restaurantId=${encodeURIComponent(restaurantId)}`
          : "/";
    setUser(null);
    queryClient.clear();
    navigate(target);
  };

  const isCustomerExperience =
    location.startsWith("/customer") || user?.type === "customer" || user?.type === "guest";

  const { data: customerTheme } = useQuery<CustomerThemeSettings | null>({
    queryKey: ["/api/theme/current", location, user?.type ?? "guest"],
    enabled: isCustomerExperience,
    queryFn: async () => {
      const restaurantId = new URLSearchParams(window.location.search).get("restaurantId");
      const url = restaurantId ? `/api/theme/current?restaurantId=${encodeURIComponent(restaurantId)}` : "/api/theme/current";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (isCustomerExperience) {
      applyCustomerTheme(customerTheme);
      return;
    }
    clearCustomerTheme();
  }, [isCustomerExperience, customerTheme]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Define staff dashboard rendering helper
  const renderStaffDashboard = (staffUser: StaffUser) => {
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
      {/* Login Routes */}
      <Route path="/customer/login">
        {user ? <Redirect to="/" /> : <CustomerAuthPage onLogin={handleLogin} />}
      </Route>
      <Route path="/staff/login">
        {user ? <Redirect to="/" /> : <StaffAuthPage onLogin={handleLogin} />}
      </Route>

      {/* Main Landing / Protected Routes */}
      <Route path="/">
        {!user ? (
          <LandingPage />
        ) : user.type === "customer" || user.type === "guest" ? (
          <CustomerMenu
            tableNumber="12"
            userName={user.name}
            onLogout={handleLogout}
            isGuest={user.type === "guest"}
          />
        ) : (
          renderStaffDashboard(user as StaffUser)
        )}
      </Route>

      {/* Staff Specific Routes */}
      <Route path="/kitchen">
        {!user || user.type !== "staff" || user.role !== "kitchen" ? (
          <Redirect to="/staff/login" />
        ) : (
          <KitchenDashboard userName={user.name} onLogout={handleLogout} />
        )}
      </Route>

      <Route path="/waiter">
        {!user || user.type !== "staff" || user.role !== "waiter" ? (
          <Redirect to="/staff/login" />
        ) : (
          <WaiterDashboard userName={user.name} onLogout={handleLogout} />
        )}
      </Route>

      <Route path="/dashboard">
        {!user || user.type !== "staff" || user.role !== "owner" ? (
          <Redirect to="/staff/login" />
        ) : (
          <OwnerDashboard userName={user.name} onLogout={handleLogout} />
        )}
      </Route>

      {/* Owner Detail Routes */}
      <Route path="/owner/orders">
        {!user || user.type !== "staff" || user.role !== "owner" ? (
          <Redirect to="/staff/login" />
        ) : (
          <OwnerDashboard userName={user.name} onLogout={handleLogout} initialTab="analytics" />
        )}
      </Route>

      <Route path="/owner/menu">
        {!user || user.type !== "staff" || user.role !== "owner" ? (
          <Redirect to="/staff/login" />
        ) : (
          <OwnerDashboard userName={user.name} onLogout={handleLogout} initialTab="menu" />
        )}
      </Route>

      <Route path="/owner/settings">
        {!user || user.type !== "staff" || user.role !== "owner" ? (
          <Redirect to="/staff/login" />
        ) : (
          <OwnerDashboard userName={user.name} onLogout={handleLogout} initialTab="staff" />
        )}
      </Route>

      {/* Fallback */}
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
