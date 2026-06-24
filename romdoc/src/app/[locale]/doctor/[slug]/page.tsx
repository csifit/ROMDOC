import type {
  Metadata,
} from "next";

import DoctorPage from "@/app/doctor/[slug]/page";
import DoctorStructuredData from "@/components/seo/doctor-structured-data";
import {
  type AppLocale,
} from "@/i18n/routing";
import {
  getDoctorProfileMetadata,
} from "@/lib/seo/public-metadata";

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

export default async function
LocalizedDoctorPage({
  params,
}: Props) {
  const {
    locale,
    slug,
  } = await params;

  return (
    <>
      <DoctorStructuredData
        locale={locale}
        slug={slug}
      />

      <DoctorPage
        params={
          Promise.resolve({
            slug,
          })
        }
      />
    </>
  );
}
