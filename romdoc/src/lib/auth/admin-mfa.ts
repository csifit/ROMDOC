import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export function sanitizePlatformOperatorNextPath(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return "/dashboard";
  }

  const isAdminPath =
    value ===
      "/admin" ||
    value.startsWith(
      "/admin/"
    );

  const isManagerPath =
    value ===
      "/manager-dashboard" ||
    value.startsWith(
      "/manager-dashboard/"
    );

  const isClinicManagerPath =
    value ===
      "/clinic-manager-dashboard" ||
    value.startsWith(
      "/clinic-manager-dashboard/"
    );

  if (
    value.startsWith(
      "//"
    ) ||
    (
      !isAdminPath &&
      !isManagerPath &&
      !isClinicManagerPath
    )
  ) {
    return "/dashboard";
  }

  return value;
}

function buildMfaHref({
  route,
  nextPath,
  locale,
}: {
  route: string;
  nextPath: string;
  locale?:
    AppLocale;
}) {
  const parameters =
    new URLSearchParams({
      next:
        nextPath,
    });

  if (
    locale
  ) {
    parameters.set(
      "locale",
      locale
    );
  }

  return `${route}?${parameters.toString()}`;
}

export async function getAdminMfaRedirect({
  supabase,
  nextPath,
  locale,
}: {
  supabase:
    SupabaseClient;
  nextPath: string;
  locale?:
    AppLocale;
}) {
  const safeNext =
    sanitizePlatformOperatorNextPath(
      nextPath
    );

  const {
    data:
      assurance,
    error:
      assuranceError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (
    assuranceError
  ) {
    console.error(
      "Administrative MFA assurance lookup failed:",
      assuranceError
    );

    return buildMfaHref({
      route:
        "/mfa/admin/verify",
      nextPath:
        safeNext,
      locale,
    });
  }

  if (
    assurance
      .currentLevel ===
    "aal2"
  ) {
    return null;
  }

  const {
    data:
      factors,
    error:
      factorsError,
  } =
    await supabase.auth.mfa
      .listFactors();

  if (
    factorsError
  ) {
    console.error(
      "Administrative MFA factor lookup failed:",
      factorsError
    );

    return buildMfaHref({
      route:
        "/mfa/admin/setup",
      nextPath:
        safeNext,
      locale,
    });
  }

  const hasVerifiedTotp =
    factors.totp.length >
    0;

  const route =
    hasVerifiedTotp
      ? "/mfa/admin/verify"
      : "/mfa/admin/setup";

  return buildMfaHref({
    route,
    nextPath:
      safeNext,
    locale,
  });
}
