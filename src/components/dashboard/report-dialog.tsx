"use client";

import * as React from "react";
import { LocateFixed, Loader2, MegaphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCommunityStore, type ReportCategory } from "@/store/use-community-store";
import { useLiveLocation } from "@/hooks/use-live-location";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/use-t";

const CATEGORIES: ReportCategory[] = [
  "Harassment",
  "Broken Streetlights",
  "Road Hazard",
  "Unsafe Area",
  "Accident",
  "Suspicious Activity",
  "Police Patrol",
  "Medical Emergency",
];

const CATEGORY_LABEL_KEY: Record<ReportCategory, string> = {
  "Harassment": "community.catHarassment",
  "Broken Streetlights": "community.catStreetlights",
  "Road Hazard": "community.catRoadHazard",
  "Unsafe Area": "community.catUnsafeArea",
  "Accident": "community.catAccident",
  "Suspicious Activity": "community.catSuspicious",
  "Police Patrol": "community.catPolicePatrol",
  "Medical Emergency": "community.catMedical",
};

export function ReportDialog() {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<ReportCategory>("Harassment");
  const [image, setImage] = React.useState<string | undefined>(undefined);
  const { position, isLocating, getOnce } = useLiveLocation();
  const addReport = useCommunityStore((s) => s.addReport);
  const { t } = useT();

  function handleSubmit(formData: FormData) {
    if (!position) {
      toast.error("Share your location first so the report can be placed on the map");
      return;
    }
    addReport({
      category,
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      lat: position.lat,
      lng: position.lng,
      imageDataUrl: image,
    });
    toast.success("Report submitted anonymously — thank you for keeping the community safe");
    setOpen(false);
    setImage(undefined);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow">
          <MegaphoneIcon className="size-4" /> {t("community.reportAnonymously")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("community.reportSafetyConcern")}</DialogTitle>
          <DialogDescription>
            {t("community.reportDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("community.category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(CATEGORY_LABEL_KEY[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">{t("community.title2")}</Label>
            <Input id="title" name="title" placeholder={t("community.briefSummary")} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">{t("community.description")}</Label>
            <Textarea id="description" name="description" placeholder={t("community.descriptionPlaceholder")} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("community.location")}</Label>
            <Button type="button" variant="outline" onClick={getOnce} disabled={isLocating}>
              {isLocating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              {position ? t("community.locationCaptured") : t("community.useMyLocation")}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="image">{t("community.photoOptional")}</Label>
            <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <DialogFooter>
            <Button type="submit" variant="glow">
              {t("community.submitReport")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
