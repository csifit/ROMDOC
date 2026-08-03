import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isUuid,
  type PermanentEmergencyShareAction,
  type PermanentEmergencyShareCredential,
  type PermanentEmergencyShareResponse,
} from "@/lib/medical-folder-share-grants";
import {
  createPermanentEmergencyShareToken,
} from "@/lib/medical-folder/permanent-emergency-share-token";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",
  Pragma:
    "no-cache",
  "Referrer-Policy":
    "no-referrer",
  "X-Content-Type-Options":
    "nosniff",
};

type PermanentGrantRow = {
  id: string;
  access_count: number;
  last_accessed_at: string | null;
  disabled_at: string | null;
  created_at: string;
};

function errorResponse(
  error: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error,
      message,
    },
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

function getSiteUrl() {
  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    process.env
      .NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (configured.trim()) {
    return configured
      .trim()
      .replace(/\/$/, "");
  }

  if (
    process.env.VERCEL_URL
  ) {
    return `https://${process.env.VERCEL_URL}`
      .replace(/\/$/, "");
  }

  return "https://www.romdoc.fit";
}

function isAction(
  value: unknown
): value is PermanentEmergencyShareAction {
  return (
    value === "activate" ||
    value === "replace" ||
    value === "deactivate" ||
    value === "reactivate"
  );
}

async function requireActivePatient() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return {
      supabase,
      userId: null,
      response:
        errorResponse(
          "authentication_required",
          "Trebuie să fii autentificat.",
          401
        ),
    };
  }

  if (
    !user.email_confirmed_at
  ) {
    return {
      supabase,
      userId: null,
      response:
        errorResponse(
          "active_patient_account_required",
          "Confirmă adresa de e-mail înainte de a administra codul QR de urgență.",
          403
        ),
    };
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    return {
      supabase,
      userId: null,
      response:
        errorResponse(
          "active_patient_account_required",
          "Este necesar un cont activ de pacient.",
          403
        ),
    };
  }

  return {
    supabase,
    userId: user.id,
    response: null,
  };
}

async function loadCredential(
  userId: string
): Promise<
  PermanentEmergencyShareCredential |
  null
> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "medical_folder_share_grants"
    )
    .select(`
      id,
      access_count,
      last_accessed_at,
      disabled_at,
      created_at
    `)
    .eq(
      "patient_profile_id",
      userId
    )
    .eq(
      "is_permanent",
      true
    )
    .is(
      "revoked_at",
      null
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      "permanent_emergency_share_load_failed"
    );
  }

  if (!data) {
    return null;
  }

  const grant =
    data as
      PermanentGrantRow;

  const shareToken =
    createPermanentEmergencyShareToken(
      grant.id
    );

  const baseUrl =
    `${getSiteUrl()}/share/medical-folder`;

  const encodedToken =
    encodeURIComponent(
      shareToken
    );

  return {
    grantId:
      grant.id,
    status:
      grant.disabled_at
        ? "disabled"
        : "active",
    shareToken,
    tokenHint:
      shareToken.slice(
        0,
        13
      ),
    shareUrl:
      `${baseUrl}#token=${encodedToken}&channel=secure_link`,
    qrUrl:
      `${baseUrl}#token=${encodedToken}&channel=qr`,
    accessCount:
      grant.access_count,
    lastAccessedAt:
      grant.last_accessed_at,
    createdAt:
      grant.created_at,
    disabledAt:
      grant.disabled_at,
  };
}

function databaseError(
  message: string | undefined
) {
  switch (message) {
    case "authentication_required":
      return {
        error:
          "authentication_required",
        message:
          "Trebuie să fii autentificat.",
        status: 401,
      };

    case "active_patient_account_required":
      return {
        error:
          "active_patient_account_required",
        message:
          "Este necesar un cont activ de pacient.",
        status: 403,
      };

    case "permanent_emergency_share_not_found":
      return {
        error:
          "permanent_emergency_share_not_found",
        message:
          "Codul QR permanent de urgență nu a fost găsit.",
        status: 404,
      };

    default:
      return {
        error:
          "permanent_emergency_share_action_failed",
        message:
          "Acțiunea nu a putut fi finalizată.",
        status: 500,
      };
  }
}

export async function GET():
Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    authorization.response ||
    !authorization.userId
  ) {
    return (
      authorization.response ??
      errorResponse(
        "authentication_required",
        "Trebuie să fii autentificat.",
        401
      )
    );
  }

  try {
    const response:
      PermanentEmergencyShareResponse = {
        credential:
          await loadCredential(
            authorization.userId
          ),
      };

    return NextResponse.json(
      response,
      {
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error &&
        error.message ===
          "permanent_emergency_share_secret_missing"
        ? "configuration_missing"
        : "permanent_emergency_share_load_failed",
      "Codul QR permanent de urgență nu a putut fi încărcat.",
      500
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    authorization.response ||
    !authorization.userId
  ) {
    return (
      authorization.response ??
      errorResponse(
        "authentication_required",
        "Trebuie să fii autentificat.",
        401
      )
    );
  }

  let body: {
    action?: unknown;
  };

  try {
    body =
      await request.json() as {
        action?: unknown;
      };
  } catch {
    return errorResponse(
      "invalid_request",
      "Datele trimise nu sunt valide.",
      400
    );
  }

  if (!isAction(body.action)) {
    return errorResponse(
      "invalid_action",
      "Acțiunea selectată nu este validă.",
      400
    );
  }

  let rpcName:
    | "create_own_permanent_emergency_share_grant"
    | "replace_own_permanent_emergency_share_grant"
    | "set_own_permanent_emergency_share_enabled";

  let rpcArguments:
    Record<string, never> |
    {
      target_enabled: boolean;
    };

  switch (body.action) {
    case "activate":
      rpcName =
        "create_own_permanent_emergency_share_grant";
      rpcArguments = {};
      break;

    case "replace":
      rpcName =
        "replace_own_permanent_emergency_share_grant";
      rpcArguments = {};
      break;

    case "deactivate":
      rpcName =
        "set_own_permanent_emergency_share_enabled";
      rpcArguments = {
        target_enabled:
          false,
      };
      break;

    case "reactivate":
      rpcName =
        "set_own_permanent_emergency_share_enabled";
      rpcArguments = {
        target_enabled:
          true,
      };
      break;
  }

  const {
    data:
      grantId,
    error:
      rpcError,
  } =
    await authorization.supabase
      .rpc(
        rpcName,
        rpcArguments
      );

  if (
    rpcError ||
    !isUuid(grantId)
  ) {
    const mapped =
      databaseError(
        rpcError?.message
      );

    return errorResponse(
      mapped.error,
      mapped.message,
      mapped.status
    );
  }

  try {
    const credential =
      await loadCredential(
        authorization.userId
      );

    if (!credential) {
      return errorResponse(
        "permanent_emergency_share_not_found",
        "Codul QR permanent de urgență nu a fost găsit.",
        404
      );
    }

    const response:
      PermanentEmergencyShareResponse = {
        credential,
      };

    return NextResponse.json(
      response,
      {
        headers:
          NO_STORE_HEADERS,
      }
    );
  } catch {
    return errorResponse(
      "permanent_emergency_share_load_failed",
      "Codul QR permanent de urgență nu a putut fi încărcat.",
      500
    );
  }
}
