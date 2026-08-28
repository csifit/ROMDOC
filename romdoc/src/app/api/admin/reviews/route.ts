import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_DIRECTORY_CODES } from "@/lib/api/platform-operator-directory-codes";
import { requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const REVIEW_STATUSES = ["published", "hidden", "removed"] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];

type ReviewActionBody = {
  reviewId?: unknown;
  action?: unknown;
  moderationReason?: unknown;
};

function normalizeString(value: unknown, maximumLength = 2000) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function success(
  code: string,
  message: string,
  extra?: Record<string, unknown>
) {
  return json({ code, message, ...extra });
}

export async function GET(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const requestedStatus = request.nextUrl.searchParams.get("status");
  const status = REVIEW_STATUSES.includes(requestedStatus as ReviewStatus)
    ? (requestedStatus as ReviewStatus)
    : null;
  const admin = createAdminClient();

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
        public_name,
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
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const [reviewsResult, countResults] = await Promise.all([
    query,
    Promise.all(
      REVIEW_STATUSES.map((reviewStatus) =>
        admin
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("status", reviewStatus)
      )
    ),
  ]);

  if (reviewsResult.error) {
    console.error("Admin reviews query failed:", reviewsResult.error);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewsLoadFailed,
      "Recenziile nu au putut fi încărcate.",
      500
    );
  }

  const statusCounts = Object.fromEntries(
    REVIEW_STATUSES.map((reviewStatus, index) => [
      reviewStatus,
      countResults[index]?.count ?? 0,
    ])
  );

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.reviewsLoaded,
    "Recenziile au fost încărcate.",
    {
      reviews: reviewsResult.data ?? [],
      statusCounts,
      operatorRole: authorization.role,
      capabilities: {
        canModerateReviews: true,
      },
    }
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  let body: ReviewActionBody;

  try {
    body = (await request.json()) as ReviewActionBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const reviewId = normalizeString(body.reviewId, 100);
  const action = normalizeString(body.action, 50);
  const moderationReason = normalizeString(body.moderationReason, 2000);

  if (!reviewId) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewIdRequired,
      "Recenzia lipsește.",
      400
    );
  }

  if (!["hide", "restore", "remove"].includes(action)) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewActionInvalid,
      "Acțiunea solicitată nu este validă.",
      400
    );
  }

  if (
    (action === "hide" || action === "remove") &&
    moderationReason.length < 3
  ) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewReasonRequired,
      "Introdu motivul moderării.",
      400
    );
  }

  const nextStatus: ReviewStatus =
    action === "restore"
      ? "published"
      : action === "hide"
        ? "hidden"
        : "removed";
  const admin = createAdminClient();
  const { data: updatedReview, error } = await admin
    .from("reviews")
    .update({
      status: nextStatus,
      approved: nextStatus === "published",
      moderation_reason: action === "restore" ? null : moderationReason,
      moderated_by_profile_id: authorization.profileId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();

  if (error || !updatedReview) {
    console.error("Review moderation failed:", error);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewUpdateFailed,
      "Recenzia nu a putut fi actualizată.",
      500
    );
  }

  if (action === "restore") {
    return success(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewRestored,
      "Recenzia a fost republicată."
    );
  }

  if (action === "hide") {
    return success(
      PLATFORM_OPERATOR_DIRECTORY_CODES.reviewHidden,
      "Recenzia a fost ascunsă."
    );
  }

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.reviewRemoved,
    "Recenzia a fost eliminată."
  );
}
