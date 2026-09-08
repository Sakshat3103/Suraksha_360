"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Users2 } from "lucide-react";
import Link from "next/link";
import { useContacts } from "@/hooks/use-contacts";
import { getInitials } from "@/lib/utils";
import { useJourneyStore } from "@/store/use-journey-store";

export function TrustedCircleCard() {
  const { data: contacts, isLoading } = useContacts();
  const journeyStatus = useJourneyStore((s) => s.status);
  const hasActiveJourney = journeyStatus !== "idle";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users2 className="size-4.5 text-brand-violet" />
          Trusted Circle
        </CardTitle>
        <Badge variant="secondary">{contacts?.length ?? 0} members</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        ) : !contacts || contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 p-6 text-center">
            <p className="text-sm font-medium">No trusted contacts yet</p>
            <p className="text-xs text-muted-foreground">
              Add at least one person Suraksha360 can alert if something goes wrong.
            </p>
          </div>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <Avatar>
                <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.relation}</p>
              </div>
              <span
                className={
                  "text-[11px] " +
                  (hasActiveJourney ? "text-brand-emerald" : "text-muted-foreground")
                }
              >
                {hasActiveJourney ? "Watching journey" : "No active journey"}
              </span>
            </div>
          ))
        )}

        <Button variant="outline" asChild>
          <Link href="/contacts">
            <UserPlus className="size-4" /> Manage contacts
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
