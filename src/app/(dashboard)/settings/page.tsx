"use client";

import { useTheme } from "next-themes";
import { Bell, Moon, Palette, ShieldAlert, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

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
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="safety" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4.5 text-destructive" /> Safety controls
              </CardTitle>
              <CardDescription>Configure how Suraksha360 reacts during a journey.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SettingRow
                title="Physical SOS gesture"
                description="Double-tap phone back triggers a silent alarm"
                checked={settings.sos_gesture_enabled}
                onCheckedChange={(v) => updateSettings.mutate({ sos_gesture_enabled: v })}
              />
              <SettingRow
                title="Silent mode"
                description="Mutes phone sound during escalation"
                checked={settings.silent_mode}
                onCheckedChange={(v) => updateSettings.mutate({ silent_mode: v })}
              />
              <SettingRow
                title="Live location sharing"
                description="Share location with trusted circle during active journeys"
                checked={settings.location_sharing}
                onCheckedChange={(v) => updateSettings.mutate({ location_sharing: v })}
              />

              <Separator className="my-1" />

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Anomaly sensitivity</p>
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
                  Escalates when you exceed this multiple of the expected arrival time.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4.5 text-brand-blue" /> Notifications
              </CardTitle>
              <CardDescription>Choose how Suraksha360 keeps you in the loop.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SettingRow
                title="Push notifications"
                description="Journey updates and safety check prompts"
                checked={settings.push_notifications}
                onCheckedChange={(v) => updateSettings.mutate({ push_notifications: v })}
              />
              <SettingRow
                title="Email notifications"
                description="Weekly safety summaries and account activity"
                checked={settings.email_notifications}
                onCheckedChange={(v) => updateSettings.mutate({ email_notifications: v })}
              />
              <SettingRow
                title="Sound alerts"
                description="Play a tone for high-priority notifications"
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
                <Palette className="size-4.5 text-brand-violet" /> Appearance
              </CardTitle>
              <CardDescription>Suraksha360 is designed dark-first for low-light commutes.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("dark")}
                className={
                  "flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors " +
                  (theme === "dark" ? "border-primary bg-white/[0.06]" : "border-white/10 bg-white/[0.02]")
                }
              >
                <Moon className="size-5" />
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => setTheme("light")}
                className={
                  "flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors " +
                  (theme === "light" ? "border-primary bg-white/[0.06]" : "border-white/10 bg-white/[0.02]")
                }
              >
                <Sun className="size-5" />
                <span className="text-sm font-medium">Light</span>
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
