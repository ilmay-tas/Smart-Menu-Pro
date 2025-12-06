import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UtensilsCrossed, User, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type StaffRole = "waiter" | "kitchen" | "owner";

interface StaffUser {
  id: number;
  name: string;
  username: string;
  role: StaffRole;
  type: "staff";
}

interface StaffAuthPageProps {
  onLogin: (user: StaffUser) => void;
  onSwitchToCustomer: () => void;
}

export default function StaffAuthPage({ onLogin, onSwitchToCustomer }: StaffAuthPageProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/staff/signin", { username, password });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Signed in successfully", description: `Welcome back, ${data.user.name}!` });
      onLogin(data.user);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/staff/signup", { username, password, name, role });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Account created", description: "Welcome to MyDine!" });
      onLogin(data.user);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    signInMutation.mutate();
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    signUpMutation.mutate();
  };

  const isLoading = signInMutation.isPending || signUpMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">MyDine Staff</h1>
          <p className="text-muted-foreground text-sm">Waiter & Kitchen Login</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" data-testid="tab-staff-signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-staff-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    data-testid="input-staff-username"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-staff-password"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-staff-signin" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-staff-name"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    data-testid="input-staff-signup-username"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-staff-signup-password"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as StaffRole)} disabled={isLoading}>
                  <SelectTrigger data-testid="select-staff-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="owner">Restaurant Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" data-testid="button-staff-signup" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Are you a customer?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={onSwitchToCustomer}
              data-testid="link-customer-login"
            >
              Sign in here
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
}
