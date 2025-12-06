import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/api';
import { MenuItem } from '@/types/restaurant';
import { LogOut, UtensilsCrossed, Clock, Loader2 } from 'lucide-react';

export default function StaffDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (isAuthenticated && user?.is_approved) {
      loadMenu();
    } else if (isAuthenticated && !user?.is_approved) {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.is_approved]);

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<{ menu_items: MenuItem[] }>('/menu/');
      setMenuItems(data.menu_items);
    } catch (error) {
      console.error('Failed to load menu:', error);
      toast({ title: 'Error', description: 'Failed to load menu', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.is_approved) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Staff Dashboard</h1>
                <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 w-fit mx-auto mb-4">
                <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Waiting for Owner Approval</h2>
              <p className="text-muted-foreground">
                Your account is pending approval from the restaurant owner. 
                Please check back later.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Staff Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.restaurant_name} - <span className="capitalize">{user?.role}</span></p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Menu</h2>
        
        {menuItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No menu items available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <span className="text-xl font-bold text-primary">${item.price.toFixed(2)}</span>
                  </div>
                </CardHeader>
                {item.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Order Taking Features</h3>
            <p className="text-muted-foreground">
              Order management features will be available in future updates.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
