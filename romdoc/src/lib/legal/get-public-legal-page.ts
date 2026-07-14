import { cache } from "react";
import { getLocale } from "next-intl/server";

import {
  getLegalPageDefinition,
  normalizeLegalLocale,
  type LegalPageKey,
  type LegalLocale,
} from "@/lib/legal/legal-pages";
import { createClient } from "@/lib/supabase/server";

export type PublicLegalPage = {
  pageKey: LegalPageKey;
  locale: LegalLocale;
  title: string;
  route: string;
  eyebrow: string;
  description: string;
  notice: string;
  content: string;
  updatedAt: string;
};

type LegalPageRow = {
  page_key: string;
  locale: string;
  title: string;
  content: string;
  updated_at: string;
};

export const getPublicLegalPage = cache(async (key: LegalPageKey): Promise<PublicLegalPage> => {
  const locale = normalizeLegalLocale(await getLocale());
  const definition = getLegalPageDefinition(key, locale);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_pages")
      .select("page_key, locale, title, content, updated_at")
      .eq("page_key", key)
      .in("locale", locale === "ro" ? ["ro"] : [locale, "ro"])
      .eq("is_published", true);

    if (error) console.error(`Public legal page query failed for ${key}/${locale}:`, error);

    const rows = (data ?? []) as LegalPageRow[];
    const row = rows.find((item) => item.locale === locale) ?? rows.find((item) => item.locale === "ro");
    if (row) {
      return {
        pageKey: key,
        locale,
        title: row.locale === locale ? row.title : definition.title,
        route: definition.route,
        eyebrow: definition.eyebrow,
        description: definition.description,
        notice: definition.notice,
        content: row.content || definition.defaultContent,
        updatedAt: row.updated_at || definition.fallbackUpdatedAt,
      };
    }
  } catch (error) {
    console.error(`Public legal page loading failed for ${key}/${locale}:`, error);
  }

  return {
    pageKey: key,
    locale,
    title: definition.title,
    route: definition.route,
    eyebrow: definition.eyebrow,
    description: definition.description,
    notice: definition.notice,
    content: definition.defaultContent,
    updatedAt: definition.fallbackUpdatedAt,
  };
});
