import type {
  SupabaseClient,
} from "@supabase/supabase-js";

function safeNextPath(
  value: string
) {
  const isAdminPath =
    value === "/admin" ||
    value.startsWith(
      "/admin/"
    );

  const isManagerPath =
    value ===
      "/manager-dashboard" ||
    value.startsWith(
      "/manager-dashboard/"
    );

  if (
    value.startsWith("//") ||
    (
      !isAdminPath &&
      !isManagerPath
    )
  ) {
    return "/dashboard";
  }

  return value;
}

export async function
getAdminMfaRedirect({
  supabase,
  nextPath,
}: {
  supabase:
    SupabaseClient;
  nextPath: string;
}) {
  const safeNext =
    safeNextPath(
      nextPath
    );

  const {
    data: assurance,
    error: assuranceError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    console.error(
      "Administrative MFA assurance lookup failed:",
      assuranceError
    );

    return (
      "/mfa/admin/verify?next=" +
      encodeURIComponent(
        safeNext
      )
    );
  }

  if (
    assurance.currentLevel ===
    "aal2"
  ) {
    return null;
  }

  const {
    data: factors,
    error: factorsError,
  } =
    await supabase.auth.mfa
      .listFactors();

  if (factorsError) {
    console.error(
      "Administrative MFA factor lookup failed:",
      factorsError
    );

    return (
      "/mfa/admin/setup?next=" +
      encodeURIComponent(
        safeNext
      )
    );
  }

  const hasVerifiedTotp =
    factors.totp.length > 0;

  const route =
    hasVerifiedTotp
      ? "/mfa/admin/verify"
      : "/mfa/admin/setup";

  return (
    route +
    "?next=" +
    encodeURIComponent(
      safeNext
    )
  );
}
