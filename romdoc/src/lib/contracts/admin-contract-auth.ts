import "server-only";

import { NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdminContractApi() {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return {
      ok: false as const,
      response: authorization.response,
    };
  }

  const capabilityError = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot gestiona contractele RomDoc."
  );

  if (capabilityError) {
    return {
      ok: false as const,
      response: capabilityError,
    };
  }

  return {
    ok: true as const,
    profileId: authorization.profileId,
    admin: createAdminClient(),
  };
}

export function contractApiError(
  error: string,
  status: number,
  code = "CONTRACT_ADMIN_ERROR"
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

export function contractApiSuccess(
  message: string,
  extra: Record<string, unknown> = {},
  status = 200
) {
  return NextResponse.json(
    {
      message,
      ...extra,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }

  return String(error);
}
