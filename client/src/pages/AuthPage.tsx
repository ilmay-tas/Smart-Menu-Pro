import AuthForm, { type UserRole } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";

interface AuthPageProps {
  onLogin: (role: UserRole, userName: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const { toast } = useToast();

  const handleSignIn = (phone: string, role: UserRole) => {
    // todo: remove mock functionality - implement real authentication
    console.log("Sign in:", { phone, role });
    toast({
      title: "Signed in successfully",
      description: `Welcome back!`,
    });
    onLogin(role, "User");
  };

  const handleSignUp = (phone: string, name: string, role: UserRole) => {
    // todo: remove mock functionality - implement real authentication
    console.log("Sign up:", { phone, name, role });
    toast({
      title: "Account created",
      description: "Welcome to MyDine!",
    });
    onLogin(role, name);
  };

  return <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} />;
}
