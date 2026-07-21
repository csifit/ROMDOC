import { NextResponse } from "next/server";

import { PLATFORM_OPERATOR_ACCESS_CODES } from "@/lib/api/platform-operator-access-codes";
import { isTrustedAdminMfaIp } from "@/lib/auth/admin-mfa-ip";
import { createClient } from "@/lib/supabase/server";

type AdminAal2Authorization =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      profileId: string;
      response: null;
    }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      profileId: null;
      response: NextResponse;
    };

function apiError(
  code: string,
  error: string,
  status: number
) {
  return NextResponse.json(
    { code, error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function requireAdminAal2Api(): Promise<AdminAal2Authorization> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      profileId: null,
      response: apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.authenticationRequired,
        "Trebuie să fii autentificat.",
        401
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase,
      profileId: null,
      response: apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.accessDenied,
        "Nu ai permisiunea necesară.",
        403
      ),
    };
  }

  const trustedIp = await isTrustedAdminMfaIp();

  if (!trustedIp) {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      assuranceError ||
      assurance.currentLevel !== "aal2"
    ) {
      return {
        supabase,
        profileId: null,
        response: apiError(
          PLATFORM_OPERATOR_ACCESS_CODES.mfaRequired,
          "Este necesară verificarea Google Authenticator.",
          403
        ),
      };
    }
  }

  return {
    supabase,
    profileId: user.id,
    response: null,
  };
}
