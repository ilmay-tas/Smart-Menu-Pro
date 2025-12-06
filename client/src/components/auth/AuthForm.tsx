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
import { UtensilsCrossed, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type UserRole = "customer" | "waiter" | "kitchen" | "owner";

interface AuthFormProps {
  onSignIn: (phone: string, role: UserRole) => void;
  onSignUp: (phone: string, name: string, role: UserRole) => void;
}

export default function AuthForm({ onSignIn, onSignUp }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const getDigitsOnly = (phone: string) => phone.replace(/\D/g, "");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = getDigitsOnly(phone);
    if (digits.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    onSignIn(phone, role);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = getDigitsOnly(phone);
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }
    if (digits.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    onSignUp(phone, name, role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">MyDine</h1>
          <p className="text-muted-foreground text-sm">Smart Menu Platform</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" data-testid="tab-signin">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">
              Sign Up
            </TabsTrigger>
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
                    data-testid="input-signin-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-role">Sign in as</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                >
                  <SelectTrigger data-testid="select-signin-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="owner">Restaurant Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-signin"
              >
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
                  data-testid="input-signup-name"
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
                    data-testid="input-signup-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-role">Register as</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                >
                  <SelectTrigger data-testid="select-signup-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="owner">Restaurant Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-signup"
              >
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
