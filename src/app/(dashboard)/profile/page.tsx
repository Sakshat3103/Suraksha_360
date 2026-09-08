"use client";

import * as React from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import { updateProfileAction } from "@/lib/actions/profile";
import { getInitials } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-t";

export default function ProfilePage() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [isPending, startTransition] = React.useTransition();
  const { t } = useT();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Traveller";

  function handleSubmit(formData: FormData) {
    const input = {
      full_name: String(formData.get("full_name") || ""),
      phone: String(formData.get("phone") || ""),
      city: String(formData.get("city") || ""),
      bio: String(formData.get("bio") || ""),
    };

    startTransition(async () => {
      try {
        await updateProfileAction(input);
        setProfile(profile ? { ...profile, ...input } : null);
        toast.success("Profile updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="size-24">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <button className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg">
              <Camera className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
            <h2 className="text-xl font-semibold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex gap-2">
              <Badge variant="success">{t("profile.verifiedTraveller")}</Badge>
              {user?.created_at && (
                <Badge variant="secondary">{t("profile.memberSince")} {new Date(user.created_at).getFullYear()}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.personalInfo")}</CardTitle>
          <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">{t("profile.fullName")}</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">{t("profile.phoneNumber")}</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="city">{t("profile.city")}</Label>
              <Input id="city" name="city" defaultValue={profile?.city ?? ""} placeholder="Jaipur" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">{t("profile.about")}</Label>
              <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} placeholder={t("profile.aboutPlaceholder")} />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" variant="glow" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t("profile.saveChanges")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
