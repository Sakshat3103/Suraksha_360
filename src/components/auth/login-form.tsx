"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthCard } from "@/components/auth/auth-card";
import { signInAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/use-t";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const { t } = useT();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    startTransition(async () => {
      const result = await signInAction(email, password);
      if (!result.success) {
        toast.error(result.message ?? "Unable to sign in");
        return;
      }
      toast.success("Welcome back");
      router.push(searchParams.get("redirectTo") ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to continue your safety journey.">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" placeholder="••••••••" required />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox name="remember" />
          Remember me for 30 days
        </label>

        <Button type="submit" variant="glow" size="lg" disabled={isPending} className="mt-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {t("auth.signIn")}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <Button variant="outline" size="lg">
        <Mail className="size-4" />
        Continue with a magic link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Police / municipal safety desk?{" "}
        <Link href="/authority/login" className="font-medium text-primary hover:underline">
          Authority Portal
        </Link>
      </p>
    </AuthCard>
  );
}
