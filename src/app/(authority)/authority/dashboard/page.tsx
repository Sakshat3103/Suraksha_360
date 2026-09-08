"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, LogOut, Moon, Radio, ShieldHalf, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthorityMapClient } from "@/components/authority/authority-map-client";
import { EmergencyNumbersCard } from "@/components/dashboard/emergency-numbers-card";
import { useAuthorityStore } from "@/store/use-authority-store";
import { useAuthorityFeedStore } from "@/store/use-authority-feed-store";
import { useJourneyStore } from "@/store/use-journey-store";
import { MOCK_TRACKED_TRAVELLERS, STATUS_META, type TrackedTraveller } from "@/lib/mock-authority-data";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";

const MUJ_AREA_CENTER = { lat: 26.8408, lng: 75.5581 };

export default function AuthorityDashboardPage() {
  const router = useRouter();
  const isAuthed = useAuthorityStore((s) => s.isAuthed);
  const officerId = useAuthorityStore((s) => s.officerId);
  const logout = useAuthorityStore((s) => s.logout);
  const { theme, setTheme } = useTheme();
  const { status: journeyStatus, route, destination } = useJourneyStore();
  const packets = useAuthorityFeedStore((s) => s.packets);
  const { t } = useT();

  React.useEffect(() => {
    if (!isAuthed) router.replace("/authority/login");
  }, [isAuthed, router]);

  const travellers: TrackedTraveller[] = React.useMemo(() => {
    const list = [...MOCK_TRACKED_TRAVELLERS];
    // Fold the real, currently-active journey (if any) into the same feed —
    // anonymized, since a real control room shouldn't see a raw user name.
    if (journeyStatus !== "idle" && route) {
      list.unshift({
        id: "LIVE",
        label: `Live journey — ${destination ?? "unknown destination"}`,
        position: { lat: route.originLat, lng: route.originLng },
        status: journeyStatus === "escalated" ? "escalated" : "normal",
        mode: "live",
        lastPing: "just now",
      });
    }
    return list;
  }, [journeyStatus, route, destination]);

  const flagged = travellers.filter((t) => t.status !== "normal");

  if (!isAuthed) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-brand text-white">
            <ShieldHalf className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{t("authority.controlRoom")} — Suraksha360</h1>
            <p className="text-xs text-muted-foreground">{t("authority.signedInAs")} {officerId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => { logout(); router.push("/authority/login"); }}>
            <LogOut className="size-4" /> {t("nav.signOut")}
          </Button>
          <Link href="/dashboard"><Button variant="ghost">{t("authority.travellerApp")}</Button></Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Users className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">{travellers.length}</p><p className="text-xs text-muted-foreground">{t("authority.beingMonitored")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><AlertTriangle className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">{flagged.length}</p><p className="text-xs text-muted-foreground">{t("authority.flaggedForAttention")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-emerald/10 text-brand-emerald"><Radio className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">Live</p><p className="text-xs text-muted-foreground">Jaipur — NH48 / MUJ corridor</p></div>
          </CardContent>
        </Card>
      </div>

      {packets.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4.5" /> {t("authority.incomingPackets")}
            </CardTitle>
            <CardDescription>{t("authority.packetsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {packets.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div>
                  <p className="text-sm font-medium">{p.areaLabel}</p>
                  <p className="text-xs text-muted-foreground">{p.lat.toFixed(4)}, {p.lng.toFixed(4)} · risk {p.riskScore}/100</p>
                </div>
                <Badge className="bg-destructive/15 text-destructive">{t("authority.unresolved")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("authority.areaMap")}</CardTitle><CardDescription>{t("authority.anonymizedNote")}</CardDescription></CardHeader>
          <CardContent><AuthorityMapClient travellers={travellers} center={MUJ_AREA_CENTER} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("authority.activeFeed")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {travellers.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.mode} · updated {t.lastPing}</p>
                </div>
                <Badge className={cn("shrink-0", t.status === "normal" ? "bg-brand-emerald/15 text-brand-emerald" : "bg-destructive/15 text-destructive")}>
                  {STATUS_META[t.status].label}
                </Badge>
              </div>
            ))}
            {flagged.length > 0 && (
              <Button variant="destructive" className="mt-2 gap-2">
                <Radio className="size-4" /> {t("authority.dispatchPatrol")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <EmergencyNumbersCard />
    </div>
  );
}
