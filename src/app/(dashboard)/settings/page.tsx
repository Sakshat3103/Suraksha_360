"use client";

import { useTheme } from "next-themes";
import { Bell, Moon, Palette, ShieldAlert, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useT } from "@/lib/i18n/use-t";

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { t } = useT();

  if (isLoading || !settings) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Tabs defaultValue="safety">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="safety">{t("settings.safety")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.notifications")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="safety" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4.5 text-destructive" /> {t("settings.safetyControls")}
              </CardTitle>
              <CardDescription>{t("settings.safetyControlsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SettingRow
                title={t("settings.sosGesture")}
                description={t("settings.sosGestureDesc")}
                checked={settings.sos_gesture_enabled}
                onCheckedChange={(v) => updateSettings.mutate({ sos_gesture_enabled: v })}
              />
              <SettingRow
                title={t("settings.silentMode")}
                description={t("settings.silentModeDesc")}
                checked={settings.silent_mode}
                onCheckedChange={(v) => updateSettings.mutate({ silent_mode: v })}
              />
              <SettingRow
                title={t("settings.locationSharing")}
                description={t("settings.locationSharingDesc")}
                checked={settings.location_sharing}
                onCheckedChange={(v) => updateSettings.mutate({ location_sharing: v })}
              />

              <Separator className="my-1" />

              <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">{t("settings.anomalySensitivity")}</p>
                  <span className="text-sm font-semibold text-brand-blue">
                    {settings.anomaly_sensitivity}×
                  </span>
                </div>
                <input
                  type="range"
                  min={1.1}
                  max={2}
                  step={0.1}
                  defaultValue={settings.anomaly_sensitivity}
                  onChange={(e) =>
                    updateSettings.mutate({ anomaly_sensitivity: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--brand-blue)]"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("settings.anomalySensitivityDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4.5 text-brand-blue" /> {t("settings.notifications")}
              </CardTitle>
              <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SettingRow
                title={t("settings.pushNotifications")}
                description={t("settings.pushNotificationsDesc")}
                checked={settings.push_notifications}
                onCheckedChange={(v) => updateSettings.mutate({ push_notifications: v })}
              />
              <SettingRow
                title={t("settings.emailNotifications")}
                description={t("settings.emailNotificationsDesc")}
                checked={settings.email_notifications}
                onCheckedChange={(v) => updateSettings.mutate({ email_notifications: v })}
              />
              <SettingRow
                title={t("settings.soundAlerts")}
                description={t("settings.soundAlertsDesc")}
                checked={true}
                onCheckedChange={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-4.5 text-brand-violet" /> {t("settings.appearance")}
              </CardTitle>
              <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("dark")}
                className={
                  "flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors " +
                  (theme === "dark" ? "border-primary bg-foreground/[0.06]" : "border-foreground/10 bg-foreground/[0.02]")
                }
              >
                <Moon className="size-5" />
                <span className="text-sm font-medium">{t("settings.dark")}</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={
                  "flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors " +
                  (theme === "light" ? "border-primary bg-foreground/[0.06]" : "border-foreground/10 bg-foreground/[0.02]")
                }
              >
                <Sun className="size-5" />
                <span className="text-sm font-medium">{t("settings.light")}</span>
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
