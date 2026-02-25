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
import { Textarea } from "@/components/ui/textarea";
import { User, Lock, Loader2, Eye, EyeOff, Building2, Phone, Mail, MapPin, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant } from "@shared/schema";

import { Link } from "wouter";

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
}

export default function StaffAuthPage({ onLogin }: StaffAuthPageProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  // Restaurant fields for owner signup
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [restaurantDescription, setRestaurantDescription] = useState("");

  // Restaurant selection for staff signup
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  const { toast } = useToast();

  // Fetch restaurants for staff to join
  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: role !== "owner",
  });

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
      if (error.message.includes("pending approval")) {
        toast({
          title: "Pending Approval",
          description: "Your account is waiting for owner approval. Please try again later.",
          variant: "destructive"
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  // Owner signup mutation
  const ownerSignUpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/staff/owner-signup", {
        username,
        password,
        name,
        restaurant: {
          name: restaurantName,
          address: restaurantAddress,
          phone: restaurantPhone || undefined,
          email: restaurantEmail || undefined,
          description: restaurantDescription || undefined,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Restaurant created!", description: "Welcome to MyDine!" });
      onLogin(data.user);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Staff join restaurant mutation
  const staffJoinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/staff/join-restaurant", {
        username,
        password,
        name,
        role,
        restaurantId: selectedRestaurantId,
      });
      return res.json();
    },
    onSuccess: () => {
      setPendingApproval(true);
      toast({
        title: "Account created!",
        description: "Your account is pending owner approval. You'll be able to sign in once approved."
      });
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

    if (role === "owner") {
      // Owner signup requires restaurant info
      if (!restaurantName || !restaurantAddress) {
        toast({ title: "Error", description: "Please enter restaurant name and address", variant: "destructive" });
        return;
      }
      ownerSignUpMutation.mutate();
    } else {
      // Staff must select a restaurant
      if (!selectedRestaurantId) {
        toast({ title: "Error", description: "Please select a restaurant to join", variant: "destructive" });
        return;
      }
      staffJoinMutation.mutate();
    }
  };

  const isLoading = signInMutation.isPending || ownerSignUpMutation.isPending || staffJoinMutation.isPending;

  // Show pending approval confirmation
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Account Created!</h1>
            <p className="text-muted-foreground mb-6">
              Your account is pending approval from the restaurant owner.
              You will be able to sign in once your account is approved.
            </p>
            <Button onClick={() => { setPendingApproval(false); setActiveTab("signin"); }} className="w-full">
              Go to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img src="/menu/logo.png" alt="MyDine logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">MyDine Staff</h1>
          <p className="text-muted-foreground text-sm">Restaurant Staff Portal</p>
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
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
              {/* Role selection first */}
              <div className="space-y-2">
                <Label htmlFor="signup-role">I am a...</Label>
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

              {/* Basic info */}
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
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Restaurant selection for non-owners */}
              {role !== "owner" && (
                <div className="space-y-2">
                  <Label>Select Restaurant to Join</Label>
                  <Select
                    value={selectedRestaurantId?.toString() || ""}
                    onValueChange={(v) => setSelectedRestaurantId(parseInt(v))}
                    disabled={isLoading}
                  >
                    <SelectTrigger data-testid="select-restaurant">
                      <SelectValue placeholder="Choose a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The restaurant owner will need to approve your account before you can sign in.
                  </p>
                </div>
              )}

              {/* Restaurant info for owners */}
              {role === "owner" && (
                <div className="space-y-4 pt-2 border-t">
                  <h3 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Restaurant Information
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name">Restaurant Name *</Label>
                    <Input
                      id="restaurant-name"
                      type="text"
                      placeholder="My Restaurant"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      data-testid="input-restaurant-name"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-address">Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea
                        id="restaurant-address"
                        placeholder="123 Main St, City, State"
                        value={restaurantAddress}
                        onChange={(e) => setRestaurantAddress(e.target.value)}
                        className="pl-10 min-h-[60px]"
                        data-testid="input-restaurant-address"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="restaurant-phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={restaurantPhone}
                          onChange={(e) => setRestaurantPhone(e.target.value)}
                          className="pl-10"
                          data-testid="input-restaurant-phone"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="restaurant-email"
                          type="email"
                          placeholder="info@restaurant.com"
                          value={restaurantEmail}
                          onChange={(e) => setRestaurantEmail(e.target.value)}
                          className="pl-10"
                          data-testid="input-restaurant-email"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-description">Description</Label>
                    <Textarea
                      id="restaurant-description"
                      placeholder="Tell us about your restaurant..."
                      value={restaurantDescription}
                      onChange={(e) => setRestaurantDescription(e.target.value)}
                      className="min-h-[60px]"
                      data-testid="input-restaurant-description"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" data-testid="button-staff-signup" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {role === "owner" ? "Create Restaurant" : "Request to Join"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>


      </Card>
    </div>
  );
}
