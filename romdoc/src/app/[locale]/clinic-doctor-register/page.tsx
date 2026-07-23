import {
  redirect,
} from "next/navigation";

import ClinicDoctorRegisterPage from "@/app/clinic-doctor-register/page";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type LocalizedClinicDoctorRegisterPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    token?: string;
    email?: string;
    locale?: string;
  }>;
};

export default async function
LocalizedClinicDoctorRegisterPage({
  params,
  searchParams,
}: LocalizedClinicDoctorRegisterPageProps) {
  const [
    routeParameters,
    queryParameters,
  ] =
    await Promise.all([
      params,
      searchParams,
    ]);

  const routeLocale =
    normalizeAppLocale(
      routeParameters.locale
    );

  const invitationLocale =
    normalizeAppLocale(
      queryParameters.locale ??
        routeLocale
    );

  if (
    routeLocale !==
    invitationLocale
  ) {
    const query =
      new URLSearchParams();

    if (
      queryParameters.token
    ) {
      query.set(
        "token",
        queryParameters.token
      );
    }

    if (
      queryParameters.email
    ) {
      query.set(
        "email",
        queryParameters.email
      );
    }

    query.set(
      "locale",
      invitationLocale
    );

    redirect(
      `/${invitationLocale}/clinic-doctor-register?${query.toString()}`
    );
  }

  return (
    <ClinicDoctorRegisterPage
      searchParams={
        Promise.resolve({
          ...queryParameters,
          locale:
            invitationLocale,
        })
      }
    />
  );
}
