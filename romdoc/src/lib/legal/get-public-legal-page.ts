import { cache } from "react";

import {
  getLegalPageDefinition,
  type LegalPageKey,
} from "@/lib/legal/legal-pages";
import { createClient } from "@/lib/supabase/server";

export type PublicLegalPage = {
  pageKey: LegalPageKey;
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
  title: string;
  content: string;
  updated_at: string;
};

export const getPublicLegalPage = cache(
  async (
    key: LegalPageKey
  ): Promise<PublicLegalPage> => {
    const definition =
      getLegalPageDefinition(key);

    try {
      const supabase =
        await createClient();

      const {
        data,
        error,
      } = await supabase
        .from("legal_pages")
        .select(`
          page_key,
          title,
          content,
          updated_at
        `)
        .eq("page_key", key)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error(
          `Public legal page query failed for ${key}:`,
          error
        );
      }

      const row =
        data as LegalPageRow | null;

      if (row) {
        return {
          pageKey: key,
          title:
            row.title ||
            definition.title,
          route:
            definition.route,
          eyebrow:
            definition.eyebrow,
          description:
            definition.description,
          notice:
            definition.notice,
          content:
            row.content ||
            definition.defaultContent,
          updatedAt:
            row.updated_at ||
            definition.fallbackUpdatedAt,
        };
      }
    } catch (error) {
      console.error(
        `Public legal page loading failed for ${key}:`,
        error
      );
    }

    return {
      pageKey: key,
      title: definition.title,
      route: definition.route,
      eyebrow:
        definition.eyebrow,
      description:
        definition.description,
      notice: definition.notice,
      content:
        definition.defaultContent,
      updatedAt:
        definition.fallbackUpdatedAt,
    };
  }
);
