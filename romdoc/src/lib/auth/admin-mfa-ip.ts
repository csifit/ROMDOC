import {
  headers,
} from "next/headers";

function normalizeIp(
  value: string
) {
  return value
    .trim()
    .replace(
      /^\[|\]$/g,
      ""
    )
    .toLowerCase();
}

function getTrustedAdminIps() {
  return new Set(
    (
      process.env
        .ADMIN_MFA_TRUSTED_IPS ??
      ""
    )
      .split(",")
      .map(normalizeIp)
      .filter(Boolean)
  );
}

export async function
getAdminRequestIp() {
  const requestHeaders =
    await headers();

  const forwarded =
    requestHeaders.get(
      "x-vercel-forwarded-for"
    ) ??
    requestHeaders.get(
      "x-forwarded-for"
    ) ??
    requestHeaders.get(
      "x-real-ip"
    );

  if (!forwarded) {
    return null;
  }

  const firstIp =
    forwarded
      .split(",")[0]
      ?.trim();

  return firstIp
    ? normalizeIp(
        firstIp
      )
    : null;
}

export async function
isTrustedAdminMfaIp() {
  /*
   * Never trust forwarded IP headers outside Vercel production.
   * This prevents a local or self-hosted caller from supplying a
   * forged x-forwarded-for header to bypass MFA.
   */
  if (
    process.env.VERCEL !==
    "1"
  ) {
    return false;
  }

  const trustedIps =
    getTrustedAdminIps();

  if (
    trustedIps.size === 0
  ) {
    return false;
  }

  const requestIp =
    await getAdminRequestIp();

  if (!requestIp) {
    return false;
  }

  return trustedIps.has(
    requestIp
  );
}
