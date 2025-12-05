import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import AuthPage from "@/pages/AuthPage";
import CustomerMenu from "@/pages/CustomerMenu";
import KitchenDashboard from "@/pages/KitchenDashboard";
import WaiterDashboard from "@/pages/WaiterDashboard";
import OwnerDashboard from "@/pages/OwnerDashboard";
import NotFound from "@/pages/not-found";

import { type UserRole } from "@/components/auth/AuthForm";

function App() {
  // todo: remove mock functionality - implement real authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [userName, setUserName] = useState("");

  const handleLogin = (role: UserRole, name: string) => {
    setUserRole(role);
    setUserName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("customer");
    setUserName("");
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthPage onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case "customer":
        return (
          <CustomerMenu
            tableNumber="12"
            userName={userName}
            onLogout={handleLogout}
          />
        );
      case "kitchen":
        return (
          <KitchenDashboard userName={userName} onLogout={handleLogout} />
        );
      case "waiter":
        return <WaiterDashboard userName={userName} onLogout={handleLogout} />;
      case "owner":
        return <OwnerDashboard userName={userName} onLogout={handleLogout} />;
      default:
        return <NotFound />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={() => renderDashboard()} />
          <Route path="/menu" component={() => (
            <CustomerMenu
              tableNumber="12"
              userName={userName}
              onLogout={handleLogout}
            />
          )} />
          <Route path="/kitchen" component={() => (
            <KitchenDashboard userName={userName} onLogout={handleLogout} />
          )} />
          <Route path="/waiter" component={() => (
            <WaiterDashboard userName={userName} onLogout={handleLogout} />
          )} />
          <Route path="/dashboard" component={() => (
            <OwnerDashboard userName={userName} onLogout={handleLogout} />
          )} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
