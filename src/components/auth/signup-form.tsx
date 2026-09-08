"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthCard } from "@/components/auth/auth-card";
import { signUpAction } from "@/lib/actions/auth";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(formData: FormData) {
    const fullName = String(formData.get("fullName"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));
    const agreed = formData.get("terms");

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!agreed) {
      toast.error("Please accept the terms to continue");
      return;
    }

    startTransition(async () => {
      const result = await signUpAction(fullName, email, password);
      if (!result.success) {
        toast.error(result.message ?? "Unable to create account");
        return;
      }
      toast.success("Account created — check your email to confirm.");
      router.push("/login");
    });
  }

  return (
    <AuthCard title="Create your account" description="Set up your safety circle in under two minutes.">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" placeholder="Ananya Sharma" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" placeholder="At least 8 characters" minLength={8} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" name="confirmPassword" placeholder="Re-enter your password" required />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox name="terms" className="mt-0.5" />
          <span>
            I agree to the{" "}
            <Link href="#" className="text-primary hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button type="submit" variant="glow" size="lg" disabled={isPending} className="mt-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
