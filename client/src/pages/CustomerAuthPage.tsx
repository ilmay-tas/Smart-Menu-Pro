import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  type: "customer";
}

interface CustomerAuthPageProps {
  onLogin: (user: CustomerUser) => void;
  onSwitchToStaff: () => void;
}

export default function CustomerAuthPage({ onLogin, onSwitchToStaff }: CustomerAuthPageProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const getDigitsOnly = (p: string) => p.replace(/\D/g, "");

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/customer/signin", { phone: getDigitsOnly(phone) });
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
      const res = await apiRequest("POST", "/api/customer/signup", { phone: getDigitsOnly(phone), name });
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
    if (getDigitsOnly(phone).length < 10) {
      toast({ title: "Error", description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    signInMutation.mutate();
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
      return;
    }
    if (getDigitsOnly(phone).length < 10) {
      toast({ title: "Error", description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    signUpMutation.mutate();
  };

  const isLoading = signInMutation.isPending || signUpMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img src="/menu/logo.png" alt="MyDine logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold">MyDine</h1>
          <p className="text-muted-foreground text-sm">Order & Enjoy</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" data-testid="tab-customer-signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-customer-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    data-testid="input-customer-phone"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-customer-signin" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Your Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-customer-name"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    data-testid="input-customer-signup-phone"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-customer-signup" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Staff member?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={onSwitchToStaff}
              data-testid="link-staff-login"
            >
              Sign in here
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
}
