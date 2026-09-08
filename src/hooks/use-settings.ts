"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSettingsAction, updateSettingsAction } from "@/lib/actions/profile";
import type { UserSettings } from "@/types/database";

const KEY = ["user-settings"] as const;

export function useSettings() {
  return useQuery({ queryKey: KEY, queryFn: getSettingsAction });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UserSettings>) => updateSettingsAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
