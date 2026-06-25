import {
  NextResponse,
} from "next/server";

import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import { createClient } from "@/lib/supabase/server";

export type PlatformOperatorRole =
  | "admin"
  | "manager";

type PlatformOperatorAuthorization =
  | {
      supabase:
        Awaited<
          ReturnType<
            typeof createClient
          >
        >;
      profileId: string;
      role:
        PlatformOperatorRole;
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
      role: null;
      response: NextResponse;
    };

export async function
requirePlatformOperatorAal2Api(): Promise<PlatformOperatorAuthorization> {
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
      role: null,
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

  const role =
    profile?.role ===
      "admin" ||
    profile?.role ===
      "manager"
      ? profile.role
      : null;

  if (
    profileError ||
    !role ||
    profile?.account_status !==
      "active"
  ) {
    return {
      supabase,
      profileId: null,
      role: null,
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

  /*
   * The trusted-IP exception remains available only to administrators.
   * Managers always need an AAL2 session.
   */
  const trustedIp =
    role === "admin"
      ? await isTrustedAdminMfaIp()
      : false;

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
      assurance?.currentLevel !==
        "aal2"
    ) {
      return {
        supabase,
        profileId: null,
        role: null,
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
    role,
    response: null,
  };
}

export function
requireAdministratorCapability(
  role:
    PlatformOperatorRole,
  message =
    "Doar administratorii pot efectua această acțiune."
) {
  if (
    role ===
    "admin"
  ) {
    return null;
  }

  return NextResponse.json(
    {
      error: message,
      code:
        "admin_required",
    },
    {
      status: 403,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
