"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/auth-card";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/use-t";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = React.useTransition();
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const { t } = useT();

  function handleSubmit(formData: FormData) {
    const value = String(formData.get("email"));
    setEmail(value);

    startTransition(async () => {
      const result = await requestPasswordResetAction(value);
      if (!result.success) {
        toast.error(result.message ?? "Unable to send reset link");
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <AuthCard title={t("auth.checkYourInbox")} description="">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-emerald/15 text-brand-emerald">
            <MailCheck className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            {t("auth.resetLinkSentDesc")} <span className="text-foreground">{email}</span>.
            {" "}{t("auth.expiresIn30Min")}
          </p>
          <Button variant="outline" asChild className="mt-2 w-full">
            <Link href="/login">
              <ArrowLeft className="size-4" /> {t("auth.backToSignIn")}
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.resetYourPassword")}
      description={t("auth.resetPasswordDesc")}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>

        <Button type="submit" variant="glow" size="lg" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
          {t("auth.sendResetLink")}
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {t("auth.backToSignIn")}
      </Link>
    </AuthCard>
  );
}
