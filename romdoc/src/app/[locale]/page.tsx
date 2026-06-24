import type {
  Metadata,
} from "next";

import {
  getHomeMetadata,
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

  return getHomeMetadata(locale);
}

export {
  default,
} from "@/app/page";
