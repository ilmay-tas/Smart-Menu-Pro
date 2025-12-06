import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiPost, apiGet } from '@/lib/api';
import { Restaurant, User } from '@/types/restaurant';
import { Utensils, Users, ChefHat, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({
    username: '',
    password: '',
    role: 'waiter' as 'owner' | 'waiter' | 'kitchen',
    restaurant_id: '',
    restaurant_name: '',
    restaurant_address: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectByRole(user.role);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const data = await apiGet<{ restaurants: Restaurant[] }>('/restaurants/');
      setRestaurants(data.restaurants);
    } catch {
      console.error('Failed to load restaurants');
    }
  };

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'owner':
        setLocation('/owner');
        break;
      case 'waiter':
      case 'kitchen':
        setLocation('/staff');
        break;
      default:
        setLocation('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiPost<{ user: User; access_token: string; pending?: boolean }>('/auth/login', loginData);
      
      login(data.access_token, data.user);
      toast({ title: 'Login successful', description: `Welcome back, ${data.user.username}!` });
      redirectByRole(data.user.role);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      if (message.includes('pending')) {
        toast({ 
          title: 'Account Pending', 
          description: 'Your account is waiting for owner approval.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Login Failed', description: message, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = signupData.role === 'owner' 
        ? {
            username: signupData.username,
            password: signupData.password,
            role: signupData.role,
            restaurant_name: signupData.restaurant_name,
            restaurant_address: signupData.restaurant_address,
          }
        : {
            username: signupData.username,
            password: signupData.password,
            role: signupData.role,
            restaurant_id: parseInt(signupData.restaurant_id),
          };

      const data = await apiPost<{ user: User; access_token?: string; message: string }>('/auth/signup', payload);
      
      if (signupData.role === 'owner' && data.access_token) {
        login(data.access_token, data.user);
        toast({ title: 'Account Created', description: 'Welcome to Restaurant Management!' });
        setLocation('/owner');
      } else {
        toast({ 
          title: 'Account Created', 
          description: 'Your account is pending owner approval. Please wait for approval to log in.',
        });
        setSignupData({
          username: '',
          password: '',
          role: 'waiter',
          restaurant_id: '',
          restaurant_name: '',
          restaurant_address: '',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      toast({ title: 'Signup Failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Utensils className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Restaurant Management</CardTitle>
          <CardDescription>Sign in or create an account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    data-testid="input-login-username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    data-testid="input-login-password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    data-testid="input-signup-username"
                    value={signupData.username}
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    data-testid="input-signup-password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={signupData.role}
                    onValueChange={(value: 'owner' | 'waiter' | 'kitchen') => 
                      setSignupData({ ...signupData, role: value })
                    }
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          <span>Owner</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="waiter">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Waiter</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="kitchen">
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-4 w-4" />
                          <span>Kitchen Staff</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {signupData.role === 'owner' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-name">Restaurant Name</Label>
                      <Input
                        id="restaurant-name"
                        data-testid="input-restaurant-name"
                        value={signupData.restaurant_name}
                        onChange={(e) => setSignupData({ ...signupData, restaurant_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-address">Restaurant Address</Label>
                      <Input
                        id="restaurant-address"
                        data-testid="input-restaurant-address"
                        value={signupData.restaurant_address}
                        onChange={(e) => setSignupData({ ...signupData, restaurant_address: e.target.value })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Restaurant</Label>
                    <Select
                      value={signupData.restaurant_id}
                      onValueChange={(value) => setSignupData({ ...signupData, restaurant_id: value })}
                    >
                      <SelectTrigger data-testid="select-restaurant">
                        <SelectValue placeholder="Choose a restaurant" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurants.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No restaurants available</div>
                        ) : (
                          restaurants.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
