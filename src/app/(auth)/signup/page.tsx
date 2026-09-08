import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account — Suraksha360" };

export default function SignupPage() {
  return <SignupForm />;
}
