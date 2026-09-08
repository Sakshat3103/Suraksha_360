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

export function ReportDialog() {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<ReportCategory>("Harassment");
  const [image, setImage] = React.useState<string | undefined>(undefined);
  const { position, isLocating, getOnce } = useLiveLocation();
  const addReport = useCommunityStore((s) => s.addReport);

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
          <MegaphoneIcon className="size-4" /> Report anonymously
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a safety concern</DialogTitle>
          <DialogDescription>
            Submitted anonymously. Helps the AI Community Summary warn others nearby.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Brief summary" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="What happened, when, and any detail that helps others" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Location</Label>
            <Button type="button" variant="outline" onClick={getOnce} disabled={isLocating}>
              {isLocating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              {position ? "Location captured" : "Use my current location"}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="image">Photo (optional)</Label>
            <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <DialogFooter>
            <Button type="submit" variant="glow">
              Submit report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
