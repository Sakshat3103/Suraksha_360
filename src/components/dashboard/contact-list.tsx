"use client";

import { Phone, ShieldCheck, Trash2, MessageSquareText } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, useDeleteContact } from "@/hooks/use-contacts";
import { getInitials } from "@/lib/utils";

export function ContactList() {
  const { data: contacts, isLoading } = useContacts();
  const deleteContact = useDeleteContact();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-white">
          <ShieldCheck className="size-6" />
        </span>
        <p className="font-medium">No trusted contacts yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add at least two contacts so Suraksha360 always has someone to notify, even if one is
          unreachable.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {contacts.map((c) => (
        <div key={c.id} className="glass flex items-start gap-3 rounded-2xl p-4">
          <Avatar className="size-11">
            <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{c.name}</p>
              {c.is_primary && <Badge variant="secondary">Primary</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{c.relation}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.phone}</p>
            <div className="mt-2 flex items-center gap-2">
              <a href={`tel:${c.phone}`}>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs">
                  <Phone className="size-3" /> Call
                </Button>
              </a>
              {c.notify_sms && (
                <a href={`sms:${c.phone}`}>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs">
                    <MessageSquareText className="size-3" /> SMS
                  </Button>
                </a>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => deleteContact.mutate(c.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
