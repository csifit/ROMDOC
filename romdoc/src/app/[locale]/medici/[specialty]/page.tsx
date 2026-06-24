import type {
  Metadata,
} from "next";

import {
  getSpecialtyMetadata,
} from "@/lib/seo/public-metadata";
import {
  type AppLocale,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
    specialty: string;
  }>;
};

export async function
generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    locale,
    specialty,
  } = await params;

  return getSpecialtyMetadata({
    locale,
    specialtySlug:
      specialty,
  });
}

export {
  default,
} from "@/app/medici/[specialty]/page";
