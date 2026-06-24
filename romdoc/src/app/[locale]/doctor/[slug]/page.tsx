import type {
  Metadata,
} from "next";

import {
  getDoctorProfileMetadata,
} from "@/lib/seo/public-metadata";
import {
  type AppLocale,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
    slug: string;
  }>;
};

export async function
generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    locale,
    slug,
  } = await params;

  return getDoctorProfileMetadata({
    locale,
    slug,
  });
}

export {
  default,
} from "@/app/doctor/[slug]/page";
