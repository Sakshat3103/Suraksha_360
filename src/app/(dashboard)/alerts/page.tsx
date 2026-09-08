"use client";

import { ShieldAlert, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-t";

export default function AlertsPage() {
  const { t } = useT();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("nav.alerts")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("alerts.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4.5 text-brand-blue" />
            {t("alerts.history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/10 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
              <BellOff className="size-5" />
            </span>
            <p className="text-sm font-medium">{t("alerts.noAlertsYet")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {t("alerts.noAlertsDesc")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
