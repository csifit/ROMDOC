import {
  NextResponse,
} from "next/server";

import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import { createClient } from "@/lib/supabase/server";

type AdminAal2Authorization =
  | {
      supabase:
        Awaited<
          ReturnType<
            typeof createClient
          >
        >;
      profileId: string;
      response: null;
    }
  | {
      supabase:
        Awaited<
          ReturnType<
            typeof createClient
          >
        >;
      profileId: null;
      response: NextResponse;
    };

export async function
requireAdminAal2Api(): Promise<AdminAal2Authorization> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      supabase,
      profileId: null,
      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          {
            status: 401,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    return {
      supabase,
      profileId: null,
      response:
        NextResponse.json(
          {
            error:
              "Nu ai permisiunea necesară.",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        ),
    };
  }

  const trustedIp =
    await isTrustedAdminMfaIp();

  if (!trustedIp) {
    const {
      data: assurance,
      error:
        assuranceError,
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if (
      assuranceError ||
      assurance.currentLevel !==
        "aal2"
    ) {
      return {
        supabase,
        profileId: null,
        response:
          NextResponse.json(
            {
              error:
                "Este necesară verificarea Google Authenticator.",
              code:
                "mfa_required",
            },
            {
              status: 403,
              headers: {
                "Cache-Control":
                  "no-store",
              },
            }
          ),
      };
    }
  }

  return {
    supabase,
    profileId:
      user.id,
    response: null,
  };
}
