"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark, Lock, ShieldHalf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthorityStore, AUTHORITY_DEMO_PASSWORD } from "@/store/use-authority-store";
import { useT } from "@/lib/i18n/use-t";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";

export default function AuthorityLoginPage() {
  const router = useRouter();
  const login = useAuthorityStore((s) => s.login);
  const [officerId, setOfficerId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useT();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(officerId, password);
    if (!ok) { setError("Invalid officer ID or password."); return; }
    router.push("/authority/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex justify-end"><LanguageSwitcher /></div>
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-gradient-brand text-white">
            <Landmark className="size-5.5" />
          </div>
          <CardTitle>{t("authority.title")}</CardTitle>
          <CardDescription>For police control rooms &amp; municipal safety desks monitoring active journeys in their jurisdiction.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="officerId">{t("authority.officerId")}</Label>
              <Input id="officerId" placeholder="e.g. JPR-CTRL-04" value={officerId} onChange={(e) => setOfficerId(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("authority.password")}</Label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2">
              <Lock className="size-4" /> {t("authority.signInToControlRoom")}
            </Button>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Demo credentials — any Officer ID, password <code className="font-mono text-foreground">{AUTHORITY_DEMO_PASSWORD}</code>. Mock login for the prototype; production would use verified government SSO.
            </p>
          </form>
        </CardContent>
      </Card>
      <Link href="/dashboard" className="absolute bottom-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ShieldHalf className="size-3.5" /> {t("authority.backToApp")}
      </Link>
    </div>
  );
}
