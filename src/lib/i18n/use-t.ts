"use client";

import { useLocaleStore } from "@/store/use-locale-store";
import { dictionary, translate } from "@/lib/i18n/dictionary";

/**
 * useT — tiny translation hook.
 * `t("nav.dashboard")` returns the string in the user's chosen language,
 * falling back to English, then to the raw key, so nothing ever renders
 * broken if a key hasn't been translated yet.
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  function t(key: keyof typeof dictionary | (string & {})): string {
    return translate(key as string, locale);
  }
  return { t, locale };
}
