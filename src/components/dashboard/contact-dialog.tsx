"use client";

import * as React from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateContact } from "@/hooks/use-contacts";
import { useT } from "@/lib/i18n/use-t";

export function ContactDialog() {
  const [open, setOpen] = React.useState(false);
  const [notifySms, setNotifySms] = React.useState(true);
  const [notifyCall, setNotifyCall] = React.useState(true);
  const createContact = useCreateContact();
  const { t } = useT();

  function handleSubmit(formData: FormData) {
    createContact.mutate(
      {
        name: String(formData.get("name")),
        relation: String(formData.get("relation")),
        phone: String(formData.get("phone")),
        email: String(formData.get("email") || "") || undefined,
        notify_sms: notifySms,
        notify_call: notifyCall,
      },
      { onSuccess: () => setOpen(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glow">
          <UserPlus className="size-4" /> {t("contacts.addTrustedContact")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("contacts.addTrustedContactDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("contacts.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("contacts.name")}</Label>
              <Input id="name" name="name" placeholder="Priya Sharma" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="relation">{t("contacts.relation")}</Label>
              <Input id="relation" name="relation" placeholder="Mother" required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">{t("contacts.phoneNumber")}</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("contacts.emailOptional")}</Label>
            <Input id="email" name="email" type="email" placeholder="priya@example.com" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
            <div>
              <p className="text-sm font-medium">{t("contacts.smsAlerts")}</p>
              <p className="text-xs text-muted-foreground">{t("contacts.smsAlertsDesc")}</p>
            </div>
            <Switch checked={notifySms} onCheckedChange={setNotifySms} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
            <div>
              <p className="text-sm font-medium">{t("contacts.voiceCall")}</p>
              <p className="text-xs text-muted-foreground">{t("contacts.voiceCallDesc")}</p>
            </div>
            <Switch checked={notifyCall} onCheckedChange={setNotifyCall} />
          </div>

          <DialogFooter>
            <Button type="submit" variant="glow" disabled={createContact.isPending}>
              {createContact.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("contacts.addContactShort")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
