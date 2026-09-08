"use client";

import { ShieldCheck, Timer, EyeOff, Users } from "lucide-react";
import { ContactDialog } from "@/components/dashboard/contact-dialog";
import { ContactList } from "@/components/dashboard/contact-list";
import { EmergencyNumbersCard } from "@/components/dashboard/emergency-numbers-card";
import { Card, CardContent } from "@/components/ui/card";
import { useContacts } from "@/hooks/use-contacts";
import { useJourneyStore } from "@/store/use-journey-store";
import { useT } from "@/lib/i18n/use-t";

export default function ContactsPage() {
  const { data: contacts } = useContacts();
  const history = useJourneyStore((s) => s.history);
  const notifiedJourneys = history.filter((h) => h.wasEscalated).length;
  const { t } = useT();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("contacts.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("contacts.subtitle")}
          </p>
        </div>
        <ContactDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Users className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">{contacts?.length ?? 0}</p><p className="text-xs text-muted-foreground">{t("contacts.trustedContacts")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-emerald/10 text-brand-emerald"><ShieldCheck className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">{history.length}</p><p className="text-xs text-muted-foreground">{t("contacts.journeysTracked")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Timer className="size-4.5" /></span>
            <div><p className="text-xl font-semibold">{notifiedJourneys}</p><p className="text-xs text-muted-foreground">{t("contacts.timesAlerted")}</p></div>
          </CardContent>
        </Card>
      </div>

      <ContactList />

      <EmergencyNumbersCard />

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Timer, text: t("contacts.noteLiveLocation") },
            { icon: ShieldCheck, text: t("contacts.noteInstantAlert") },
            { icon: EyeOff, text: t("contacts.noteRemoved") },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-brand-emerald">
                <item.icon className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
