import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  sameOriginErrorResponse,
  validateSameOrigin,
} from "@/lib/security/same-origin";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrivacyActionBody = {
  action?: unknown;
  subjectProfileId?: unknown;
  resourceType?: unknown;
  resourceId?: unknown;
  reasonCategory?: unknown;
  reason?: unknown;
  referenceNumber?: unknown;
  reviewDueAt?: unknown;
  expiresAt?: unknown;
  legalHoldId?: unknown;
  releaseReason?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength = 4000
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function normalizeNullableUuid(
  value: unknown
) {
  const normalized =
    normalizeString(
      value,
      100
    );

  return normalized ||
    null;
}

function normalizeNullableDate(
  value: unknown
) {
  const normalized =
    normalizeString(
      value,
      100
    );

  if (!normalized) {
    return null;
  }

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

async function requireAdmin() {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return authorization;
  }

  const adminOnly =
    requireAdministratorCapability(
      authorization.role,
      "Numai administratorii pot accesa operațiunile de confidențialitate."
    );

  if (adminOnly) {
    return {
      ...authorization,
      response:
        adminOnly,
    };
  }

  return authorization;
}

export async function GET():
  Promise<Response> {
  const authorization =
    await requireAdmin();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const [
    closureResult,
    holdResult,
    runResult,
  ] =
    await Promise.all([
      admin
        .from(
          "privacy_account_closure_requests"
        )
        .select(`
          id,
          profile_id,
          request_source,
          status,
          reason,
          requested_at,
          cooling_off_ends_at,
          restricted_at,
          processing_started_at,
          completed_at,
          cancelled_at,
          processing_attempt_count,
          processing_last_error,
          profiles!privacy_account_closure_requests_profile_id_fkey (
            first_name,
            last_name,
            role,
            account_status
          ),
          privacy_account_closure_plan_items (
            id,
            action_type,
            action_status,
            reason_code,
            completed_at
          )
        `)
        .order(
          "requested_at",
          {
            ascending:
              false,
          }
        )
        .limit(100),

      admin
        .from(
          "privacy_legal_holds"
        )
        .select(`
          id,
          subject_profile_id,
          resource_type,
          resource_id,
          reason_category,
          reason,
          reference_number,
          status,
          starts_at,
          review_due_at,
          expires_at,
          released_at,
          release_reason,
          created_by_profile_id,
          reviewed_by_profile_id,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(100),

      admin
        .from(
          "privacy_retention_runs"
        )
        .select(`
          id,
          run_type,
          status,
          worker_id,
          retention_class,
          started_at,
          completed_at,
          scanned_count,
          eligible_count,
          skipped_legal_hold_count,
          deleted_count,
          anonymized_count,
          retained_count,
          failed_count,
          error_summary
        `)
        .order(
          "started_at",
          {
            ascending:
              false,
          }
        )
        .limit(50),
    ]);

  if (
    closureResult.error ||
    holdResult.error ||
    runResult.error
  ) {
    console.error(
      "Admin privacy dashboard query failed:",
      {
        closures:
          closureResult.error,
        holds:
          holdResult.error,
        runs:
          runResult.error,
      }
    );

    return NextResponse.json(
      {
        error:
          "Datele operaționale de confidențialitate nu au putut fi încărcate.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      closures:
        closureResult.data ??
        [],
      legalHolds:
        holdResult.data ??
        [],
      retentionRuns:
        runResult.data ??
        [],
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  if (
    !validateSameOrigin(
      request
    )
  ) {
    return sameOriginErrorResponse();
  }

  const authorization =
    await requireAdmin();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    PrivacyActionBody;

  try {
    body =
      (await request.json()) as
        PrivacyActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const action =
    normalizeString(
      body.action,
      50
    );

  if (
    action !==
    "create_legal_hold"
  ) {
    return NextResponse.json(
      {
        error:
          "Acțiunea nu este validă.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const subjectProfileId =
    normalizeNullableUuid(
      body.subjectProfileId
    );

  const resourceType =
    normalizeString(
      body.resourceType,
      100
    );

  const resourceId =
    normalizeNullableUuid(
      body.resourceId
    );

  const reasonCategory =
    normalizeString(
      body.reasonCategory,
      100
    );

  const reason =
    normalizeString(
      body.reason,
      4000
    );

  const referenceNumber =
    normalizeString(
      body.referenceNumber,
      200
    ) || null;

  const reviewDueAt =
    normalizeNullableDate(
      body.reviewDueAt
    );

  const expiresAt =
    normalizeNullableDate(
      body.expiresAt
    );

  if (
    !resourceType ||
    !reasonCategory ||
    reason.length <
      3 ||
    !reviewDueAt
  ) {
    return NextResponse.json(
      {
        error:
          "Completează tipul resursei, categoria, motivul și data revizuirii.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  if (
    (
      resourceType ===
        "profile" ||
      resourceType ===
        "all_subject_data"
    ) &&
    !subjectProfileId
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul vizat este obligatoriu pentru această categorie.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: createdHold,
    error: createError,
  } =
    await admin
      .from(
        "privacy_legal_holds"
      )
      .insert({
        subject_profile_id:
          subjectProfileId,
        resource_type:
          resourceType,
        resource_id:
          resourceId,
        reason_category:
          reasonCategory,
        reason,
        reference_number:
          referenceNumber,
        created_by_profile_id:
          authorization.profileId,
        review_due_at:
          reviewDueAt,
        expires_at:
          expiresAt,
      })
      .select(`
        id
      `)
      .single();

  if (
    createError ||
    !createdHold
  ) {
    console.error(
      "Privacy legal hold creation failed:",
      createError
    );

    return NextResponse.json(
      {
        error:
          "Măsura de păstrare nu a putut fi creată.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      legalHoldId:
        createdHold.id,
      message:
        "Măsura de păstrare a fost creată.",
    },
    {
      status: 201,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  if (
    !validateSameOrigin(
      request
    )
  ) {
    return sameOriginErrorResponse();
  }

  const authorization =
    await requireAdmin();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    PrivacyActionBody;

  try {
    body =
      (await request.json()) as
        PrivacyActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const action =
    normalizeString(
      body.action,
      50
    );

  const legalHoldId =
    normalizeString(
      body.legalHoldId,
      100
    );

  const releaseReason =
    normalizeString(
      body.releaseReason,
      2000
    );

  if (
    action !==
      "release_legal_hold" ||
    !legalHoldId ||
    releaseReason.length <
      3
  ) {
    return NextResponse.json(
      {
        error:
          "Identificatorul și motivul eliberării sunt obligatorii.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: releasedHold,
    error: releaseError,
  } =
    await admin
      .from(
        "privacy_legal_holds"
      )
      .update({
        status:
          "released",
        released_at:
          new Date().toISOString(),
        release_reason:
          releaseReason,
        reviewed_by_profile_id:
          authorization.profileId,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        legalHoldId
      )
      .eq(
        "status",
        "active"
      )
      .select("id")
      .maybeSingle();

  if (
    releaseError ||
    !releasedHold
  ) {
    return NextResponse.json(
      {
        error:
          "Măsura de păstrare nu a fost găsită sau este deja închisă.",
      },
      {
        status: 409,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message:
        "Măsura de păstrare a fost eliberată.",
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
