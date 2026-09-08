"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createContactAction,
  deleteContactAction,
  getContactsAction,
  updateContactAction,
  type ContactInput,
} from "@/lib/actions/contacts";

export const CONTACTS_QUERY_KEY = ["emergency-contacts"] as const;

export function useContacts() {
  return useQuery({
    queryKey: CONTACTS_QUERY_KEY,
    queryFn: getContactsAction,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) => createContactAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      toast.success("Contact added to your trusted circle");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContactAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      toast.success("Contact removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ContactInput> }) =>
      updateContactAction(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
      toast.success("Contact updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
