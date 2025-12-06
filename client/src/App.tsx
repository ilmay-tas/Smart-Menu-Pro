import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import AuthPage from "@/pages/AuthPage";
import CustomerMenu from "@/pages/CustomerMenu";
import KitchenDashboard from "@/pages/KitchenDashboard";
import WaiterDashboard from "@/pages/WaiterDashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import NotFound from "@/pages/not-found";

type UserRole = "customer" | "waiter" | "kitchen" | "owner";

interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case "customer":
        return (
          <CustomerMenu
            tableNumber="12"
            userName={user.name}
            onLogout={handleLogout}
          />
        );
      case "kitchen":
        return (
          <KitchenDashboard userName={user.name} onLogout={handleLogout} />
        );
      case "waiter":
        return <WaiterDashboard userName={user.name} onLogout={handleLogout} />;
      case "owner":
        return <OwnerDashboard userName={user.name} onLogout={handleLogout} />;
      default:
        return <NotFound />;
    }
  };

  return (
    <Switch>
      <Route path="/" component={() => renderDashboard()} />
      <Route path="/menu" component={() => (
        <CustomerMenu tableNumber="12" userName={user.name} onLogout={handleLogout} />
      )} />
      <Route path="/kitchen" component={() => (
        <KitchenDashboard userName={user.name} onLogout={handleLogout} />
      )} />
      <Route path="/waiter" component={() => (
        <WaiterDashboard userName={user.name} onLogout={handleLogout} />
      )} />
      <Route path="/dashboard" component={() => (
        <OwnerDashboard userName={user.name} onLogout={handleLogout} />
      )} />
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
