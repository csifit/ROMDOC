import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";

export const runtime =
  "nodejs";

type ReviewActionBody = {
  reviewId?: unknown;
  action?: unknown;
  moderationReason?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength = 2000
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const requestedStatus =
    request.nextUrl
      .searchParams
      .get("status");

  const allowedStatuses = [
    "published",
    "hidden",
    "removed",
  ];

  const admin =
    createAdminClient();

  let query = admin
    .from("reviews")
    .select(`
      id,
      doctor_id,
      patient_profile_id,
      appointment_id,
      patient_name,
      rating,
      review_text,
      approved,
      status,
      moderation_reason,
      moderated_by_profile_id,
      moderated_at,
      created_at,
      updated_at,
      doctors (
        id,
        slug,
        doctor_translations (
          locale,
          title
        )
      ),
      appointments (
        id,
        scheduled_date,
        status
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (
    requestedStatus &&
    allowedStatuses.includes(
      requestedStatus
    )
  ) {
    query =
      query.eq(
        "status",
        requestedStatus
      );
  }

  const {
    data: reviews,
    error,
  } = await query;

  if (error) {
    console.error(
      "Admin reviews query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Recenziile nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    reviews:
      reviews ?? [],
    operatorRole:
      authorization.role,
    capabilities: {
      canModerateReviews:
        true,
    },
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: ReviewActionBody;

  try {
    body =
      (await request.json()) as
        ReviewActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const reviewId =
    normalizeString(
      body.reviewId,
      100
    );

  const action =
    normalizeString(
      body.action,
      50
    );

  const moderationReason =
    normalizeString(
      body.moderationReason,
      2000
    );

  if (!reviewId) {
    return NextResponse.json(
      {
        error:
          "Recenzia lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    ![
      "hide",
      "restore",
      "remove",
    ].includes(action)
  ) {
    return NextResponse.json(
      {
        error:
          "Acțiunea solicitată nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    (
      action === "hide" ||
      action === "remove"
    ) &&
    moderationReason.length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu motivul moderării.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const nextStatus =
    action === "restore"
      ? "published"
      : action === "hide"
        ? "hidden"
        : "removed";

  const {
    data: updatedReview,
    error,
  } = await admin
    .from("reviews")
    .update({
      status:
        nextStatus,

      approved:
        nextStatus ===
        "published",

      moderation_reason:
        action === "restore"
          ? null
          : moderationReason,

      moderated_by_profile_id:
        authorization.profileId,

      moderated_at:
        new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();

  if (
    error ||
    !updatedReview
  ) {
    console.error(
      "Review moderation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Recenzia nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      action === "restore"
        ? "Recenzia a fost republicată."
        : action === "hide"
          ? "Recenzia a fost ascunsă."
          : "Recenzia a fost eliminată.",
  });
}