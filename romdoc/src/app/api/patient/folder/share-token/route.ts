import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isMedicalFolderShareToken,
  isUuid,
  type MedicalFolderShareTokenIssueResponse,
} from "@/lib/medical-folder-share-grants";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type TokenRpcRow = {
  share_token: string;
  token_hint: string;
  issued_at: string;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",
    Pragma:
      "no-cache",
    "Referrer-Policy":
      "no-referrer",
    "X-Content-Type-Options":
      "nosniff",
  };
}

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
        noStoreHeaders(),
    }
  );
}

function mapDatabaseError(
  message: string
) {
  switch (message) {
    case "medical_folder_share_grant_not_found":
      return {
        error:
          "share_grant_not_found",
        message:
          "Partajarea nu a fost găsită.",
        status:
          404,
      };

    case "medical_folder_share_grant_revoked":
      return {
        error:
          "share_grant_revoked",
        message:
          "Partajarea a fost revocată.",
        status:
          409,
      };

    case "medical_folder_share_grant_expired":
      return {
        error:
          "share_grant_expired",
        message:
          "Partajarea a expirat.",
        status:
          409,
      };

    case "medical_folder_share_grant_consumed":
      return {
        error:
          "share_grant_consumed",
        message:
          "Partajarea cu o singură utilizare a fost deja folosită.",
        status:
          409,
      };

    case "authentication_required":
      return {
        error:
          "authentication_required",
        message:
          "Trebuie să fii autentificat.",
        status:
          401,
      };

    case "active_patient_account_required":
      return {
        error:
          "active_patient_account_required",
        message:
          "Este necesar un cont activ de pacient.",
        status:
          403,
      };

    default:
      return {
        error:
          "share_token_issue_failed",
        message:
          "Linkul securizat nu a putut fi generat.",
        status:
          500,
      };
  }
}

export async function POST(
  request: NextRequest
): Promise<Response> {
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
    return errorResponse(
      "authentication_required",
      "Trebuie să fii autentificat.",
      401
    );
  }

  if (
    !user.email_confirmed_at
  ) {
    return errorResponse(
      "active_patient_account_required",
      "Confirmă adresa de e-mail înainte de a genera un link.",
      403
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
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
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    return errorResponse(
      "active_patient_account_required",
      "Este necesar un cont activ de pacient.",
      403
    );
  }

  let body: {
    shareGrantId?:
      unknown;
  };

  try {
    body =
      await request.json() as {
        shareGrantId?:
          unknown;
      };
  } catch {
    return errorResponse(
      "invalid_request",
      "Datele trimise nu sunt valide.",
      400
    );
  }

  if (
    !isUuid(
      body.shareGrantId
    )
  ) {
    return errorResponse(
      "invalid_share_grant_id",
      "Partajarea selectată nu este validă.",
      400
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "issue_own_medical_folder_share_token",
      {
        target_share_grant_id:
          body.shareGrantId.trim(),
      }
    );

  if (error) {
    const mapped =
      mapDatabaseError(
        error.message
      );

    return errorResponse(
      mapped.error,
      mapped.message,
      mapped.status
    );
  }

  const row =
    (
      Array.isArray(data)
        ? data[0]
        : data
    ) as
      TokenRpcRow |
      null;

  if (
    !row ||
    !isMedicalFolderShareToken(
      row.share_token
    ) ||
    typeof row.token_hint !==
      "string" ||
    typeof row.issued_at !==
      "string"
  ) {
    return errorResponse(
      "share_token_issue_failed",
      "Linkul securizat nu a putut fi generat.",
      500
    );
  }

  const response:
    MedicalFolderShareTokenIssueResponse = {
      success:
        true,
      shareToken:
        row.share_token,
      tokenHint:
        row.token_hint,
      issuedAt:
        row.issued_at,
    };

  return NextResponse.json(
    response,
    {
      status:
        201,
      headers:
        noStoreHeaders(),
    }
  );
}
