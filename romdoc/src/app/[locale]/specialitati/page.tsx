import type {
  Metadata,
} from "next";

import {
  getSpecializationsMetadata,
} from "@/lib/seo/public-metadata";
import {
  type AppLocale,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

export async function
generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } =
    await params;

  return getSpecializationsMetadata(
    locale
  );
}

export {
  default,
} from "@/app/specialitati/page";
