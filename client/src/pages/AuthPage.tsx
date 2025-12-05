import AuthForm, { type UserRole } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";

interface AuthPageProps {
  onLogin: (role: UserRole, userName: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const { toast } = useToast();

  const handleSignIn = (email: string, password: string, role: UserRole) => {
    // todo: remove mock functionality - implement real authentication
    console.log("Sign in:", { email, password, role });
    toast({
      title: "Signed in successfully",
      description: `Welcome back!`,
    });
    onLogin(role, email.split("@")[0]);
  };

  const handleSignUp = (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => {
    // todo: remove mock functionality - implement real authentication
    console.log("Sign up:", { email, password, name, role });
    toast({
      title: "Account created",
      description: "Welcome to MyDine!",
    });
    onLogin(role, name);
  };

  return <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} />;
}
