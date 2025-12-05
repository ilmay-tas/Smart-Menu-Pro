import AuthForm from "../auth/AuthForm";

export default function AuthFormExample() {
  return (
    <div className="w-full">
      <AuthForm
        onSignIn={(email, password, role) => {
          console.log("Sign in:", { email, password, role });
        }}
        onSignUp={(email, password, name, role) => {
          console.log("Sign up:", { email, password, name, role });
        }}
      />
    </div>
  );
}
