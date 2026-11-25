"use client";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  // Full navigation: starts the signed-in app with a clean query cache.
  return <LoginForm onSignedIn={() => window.location.replace("/")} />;
}
