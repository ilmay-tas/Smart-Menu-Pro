import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Loader2, User, ArrowRight, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import SaladBowl from "@/components/SaladBowl";

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

interface CustomerAuthPageProps {
  onLogin: (user: CustomerUser | GuestUser) => void;
}

export default function CustomerAuthPage({ onLogin }: CustomerAuthPageProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
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
    if (showNameField && getDigitsOnly(formatted).length < 10) {
      setShowNameField(false);
      setName("");
    }
  };

  const getDigitsOnly = (p: string) => p.replace(/\D/g, "");
  const digitCount = getDigitsOnly(phone).length;
  const isPhoneComplete = digitCount === 10;

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/customer/signin", { phone: getDigitsOnly(phone) });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Welcome back!", description: `Good to see you, ${data.user.name}` });
      onLogin(data.user);
    },
    onError: () => {
      // Phone not found -> show name field for sign up
      setShowNameField(true);
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/customer/signup", { phone: getDigitsOnly(phone), name });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Welcome to MyDine!", description: "Your account has been created" });
      onLogin(data.user);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = signInMutation.isPending || signUpMutation.isPending;

  const handleContinue = () => {
    if (!isPhoneComplete) return;
    signInMutation.mutate();
  };

  const handleCreateAccount = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
      return;
    }
    signUpMutation.mutate();
  };

  const handleSignUpDirect = () => {
    if (!isPhoneComplete) {
      toast({ title: "Enter your phone first", description: "Please enter your 10-digit phone number", variant: "destructive" });
      return;
    }
    setShowNameField(true);
  };

  const handleGuestContinue = () => {
    onLogin({ name: "Guest", type: "guest" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (showNameField && name.trim()) {
        handleCreateAccount();
      } else if (isPhoneComplete && !showNameField) {
        handleContinue();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-card p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo & Title */}
        <motion.div
          className="flex flex-col items-center mb-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">MyDine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Order & Enjoy</p>
        </motion.div>

        {/* Salad Bowl Animation */}
        <motion.div
          className="my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <SaladBowl digitCount={digitCount} />
        </motion.div>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              style={{ width: 20 }}
              animate={{
                scale: i === digitCount - 1 && digitCount > 0 ? [1, 1.3, 1] : 1,
                backgroundColor: i < digitCount ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            />
          ))}
        </div>

        {/* Phone Input */}
        <div className="w-full space-y-3">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={handlePhoneChange}
              onKeyDown={handleKeyDown}
              className="pl-12 pr-12 h-14 text-lg text-center tracking-wider font-medium rounded-xl border-2 focus:border-primary transition-colors"
              data-testid="input-customer-phone"
              disabled={isLoading}
              autoFocus
            />
            {/* Info button */}
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowInfo(!showInfo)}
              aria-label="Why do we ask for your phone number?"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Info tooltip */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="bg-accent border border-border rounded-xl p-3 text-sm text-foreground relative">
                  <button
                    type="button"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowInfo(false)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="pr-5">
                    <strong>Why phone number?</strong> We use your phone number to identify your account so
                    you can track orders and get a personalized experience. We never share your number with third parties.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name field - slides in when phone not found or user taps "New here?" */}
          <AnimatePresence>
            {showNameField && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground text-center mb-2">
                  New here? Tell us your name to get started.
                </p>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-12 pr-4 h-14 text-lg text-center font-medium rounded-xl border-2 focus:border-primary transition-colors"
                    data-testid="input-customer-name"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue / Create Account button */}
          <AnimatePresence mode="wait">
            {showNameField ? (
              <motion.div
                key="create-btn"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Button
                  onClick={handleCreateAccount}
                  className="w-full h-14 text-lg rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-lg shadow-rose-200 transition-all"
                  disabled={isLoading || !name.trim()}
                  data-testid="button-customer-signup"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  Create Account
                </Button>
                <button
                  type="button"
                  className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setShowNameField(false); setName(""); }}
                >
                  Already have an account? Go back
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="continue-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  animate={{
                    opacity: isPhoneComplete ? 1 : 0.5,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Button
                    onClick={handleContinue}
                    className={`w-full h-14 text-lg rounded-xl font-semibold transition-all ${isPhoneComplete
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    disabled={!isPhoneComplete || isLoading}
                    data-testid="button-customer-signin"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 mr-2" />
                    )}
                    Continue
                  </Button>
                </motion.div>
                {/* New here? link for direct sign-up */}
                <button
                  type="button"
                  className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleSignUpDirect}
                >
                  New here? <span className="underline">Sign up</span>
                </button>
                <button
                  type="button"
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleGuestContinue}
                  data-testid="button-guest-continue"
                >
                  Continue as guest
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </motion.div>
    </div>
  );
}
