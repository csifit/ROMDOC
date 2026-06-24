import type {
  Metadata,
} from "next";

import {
  getDirectoryMetadata,
} from "@/lib/seo/public-metadata";
import {
  type AppLocale,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
    specialty: string;
    city: string;
  }>;
};

export async function
generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    locale,
    specialty,
    city,
  } = await params;

  return getDirectoryMetadata({
    locale,
    specialtySlug:
      specialty,
    citySlug: city,
  });
}

export {
  default,
} from "@/app/medici/[specialty]/[city]/page";
