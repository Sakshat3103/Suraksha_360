"use client";
import { Phone, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EMERGENCY_NUMBERS, telHref } from "@/lib/emergency-numbers";
import { useT } from "@/lib/i18n/use-t";

export function EmergencyNumbersCard() {
  const { t } = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-4.5 text-destructive" /> {t("emergency.title")}
        </CardTitle>
        <CardDescription>{t("emergency.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {EMERGENCY_NUMBERS.map((n) => (
          <a
            key={n.number}
            href={telHref(n.number)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-destructive/40 hover:bg-destructive/5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t(n.labelKey)}</p>
              <p className="truncate text-xs text-muted-foreground">{t(n.descKey)}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground">
              <Phone className="size-3.5" /> {n.number}
            </span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
