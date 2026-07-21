import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PLATFORM_OPERATOR_DOCTOR_CODES as CODE,
} from "@/lib/api/platform-operator-doctor-codes";
import {
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME =
  "doctor-verification-documents";
const SIGNED_URL_SECONDS = 300;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type ReviewAction =
  | "start_review"
  | "approve"
  | "reject"
  | "mark_expired";

type ReviewBody = {
  submissionId?: unknown;
  action?: unknown;
  rejectionReason?: unknown;
  privateNote?: unknown;
};

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

function failure(
  code: string,
  error: string,
  status: number
) {
  return json(
    {
      code,
      error,
    },
    status
  );
}

function normalizeString(
  value: unknown,
  maximumLength: number
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

function relationOne<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(
    value
  )
    ? value[0] ?? null
    : value;
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const documentId =
    request.nextUrl.searchParams.get(
      "documentId"
    );
  const admin =
    createAdminClient();

  if (documentId) {
    const {
      data: document,
      error: documentError,
    } = await admin
      .from(
        "doctor_verification_documents"
      )
      .select(`
        id,
        storage_bucket,
        storage_path,
        original_file_name,
        deleted_at
      `)
      .eq(
        "id",
        documentId
      )
      .maybeSingle();

    if (
      documentError
    ) {
      console.error(
        "Admin verification document query failed:",
        documentError
      );

      return failure(
        CODE.verificationDocumentLoadFailed,
        "Documentul nu a putut fi încărcat.",
        500
      );
    }

    if (
      !document ||
      document.deleted_at
    ) {
      return failure(
        CODE.verificationDocumentNotFound,
        "Documentul nu a fost găsit.",
        404
      );
    }

    const {
      data: signedData,
      error: signedError,
    } = await admin.storage
      .from(
        document.storage_bucket ||
          BUCKET_NAME
      )
      .createSignedUrl(
        document.storage_path,
        SIGNED_URL_SECONDS,
        {
          download:
            document.original_file_name,
        }
      );

    if (
      signedError ||
      !signedData?.signedUrl
    ) {
      console.error(
        "Admin verification signed URL failed:",
        signedError
      );

      return failure(
        CODE.verificationSignedUrlFailed,
        "Linkul temporar nu a putut fi creat.",
        500
      );
    }

    return json({
      signedUrl:
        signedData.signedUrl,
      expiresInSeconds:
        SIGNED_URL_SECONDS,
    });
  }

  const status =
    request.nextUrl.searchParams.get(
      "status"
    ) ?? "all";

  let submissionsQuery =
    admin
      .from(
        "doctor_verification_submissions"
      )
      .select(`
        id,
        doctor_id,
        status,
        professional_registration_number,
        issuing_authority,
        professional_title,
        registration_country,
        registration_expires_at,
        submitted_at,
        reviewed_at,
        reviewed_by_profile_id,
        rejection_reason,
        created_at,
        updated_at,
        doctor:doctors!doctor_verification_submissions_doctor_id_fkey (
          id,
          slug,
          verification_status,
          profile:profiles!doctors_profile_id_fkey (
            id,
            first_name,
            last_name
          ),
          doctor_translations (
            locale,
            title
          )
        ),
        documents:doctor_verification_documents (
          id,
          document_type,
          original_file_name,
          mime_type,
          file_size_bytes,
          created_at,
          deleted_at
        ),
        admin_notes:doctor_verification_admin_notes (
          id,
          note,
          created_at,
          author:profiles!doctor_verification_admin_notes_author_profile_id_fkey (
            first_name,
            last_name
          )
        ),
        audit_events:doctor_verification_audit_events (
          id,
          event_type,
          from_status,
          to_status,
          source,
          created_at,
          actor:profiles!doctor_verification_audit_events_actor_profile_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .neq(
        "status",
        "draft"
      )
      .order(
        "submitted_at",
        {
          ascending:
            true,
          nullsFirst:
            false,
        }
      );

  if (
    status === "submitted" ||
    status ===
      "under_review" ||
    status === "verified" ||
    status === "rejected" ||
    status === "expired"
  ) {
    submissionsQuery =
      submissionsQuery.eq(
        "status",
        status
      );
  }

  const {
    data,
    error,
  } = await submissionsQuery;

  if (error) {
    console.error(
      "Admin verification submissions query failed:",
      error
    );

    return failure(
      CODE.verificationSubmissionsLoadFailed,
      "Cererile de verificare nu au putut fi încărcate.",
      500
    );
  }

  const submissions =
    (data ?? []).map(
      (submission: any) => {
        const doctor =
          relationOne(
            submission.doctor
          );
        const profile =
          relationOne(
            doctor?.profile
          );
        const translations =
          Array.isArray(
            doctor?.doctor_translations
          )
            ? doctor
                .doctor_translations
            : [];
        const romanianTranslation =
          translations.find(
            (item: any) =>
              item.locale ===
              "ro"
          ) ??
          translations[0] ??
          null;

        const documents =
          Array.isArray(
            submission.documents
          )
            ? submission.documents.filter(
                (document: any) =>
                  !document.deleted_at
              )
            : [];

        const notes =
          Array.isArray(
            submission.admin_notes
          )
            ? [
                ...submission.admin_notes,
              ].sort(
                (first, second) =>
                  String(
                    first.created_at
                  ).localeCompare(
                    String(
                      second.created_at
                    )
                  )
              )
            : [];

        const auditEvents =
          Array.isArray(
            submission.audit_events
          )
            ? [
                ...submission.audit_events,
              ].sort(
                (first, second) =>
                  String(
                    first.created_at
                  ).localeCompare(
                    String(
                      second.created_at
                    )
                  )
              )
            : [];

        return {
          ...submission,
          doctor: doctor
            ? {
                id:
                  doctor.id,
                slug:
                  doctor.slug,
                verification_status:
                  doctor.verification_status,
                name:
                  [
                    profile?.first_name,
                    profile?.last_name,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")
                    .trim() ||
                  doctor.slug,
                title:
                  romanianTranslation?.title ??
                  null,
                translations:
                  translations.map(
                    (translation: any) => ({
                      locale:
                        translation.locale,
                      title:
                        translation.title,
                    })
                  ),
              }
            : null,
          documents,
          admin_notes:
            notes,
          audit_events:
            auditEvents,
        };
      }
    );

  return json({
    code:
      CODE.verificationSubmissionsLoaded,
    submissions,
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body: ReviewBody;

  try {
    body =
      (await request.json()) as ReviewBody;
  } catch {
    return failure(
      CODE.invalidRequestData,
      "Datele trimise nu sunt valide.",
      400
    );
  }

  const submissionId =
    normalizeString(
      body.submissionId,
      100
    );
  const action =
    normalizeString(
      body.action,
      50
    ) as ReviewAction;
  const rejectionReason =
    normalizeString(
      body.rejectionReason,
      2000
    );
  const privateNote =
    normalizeString(
      body.privateNote,
      5000
    );

  if (!submissionId) {
    return failure(
      CODE.verificationSubmissionRequired,
      "Cererea de verificare lipsește.",
      400
    );
  }

  if (
    action !==
      "start_review" &&
    action !== "approve" &&
    action !== "reject" &&
    action !==
      "mark_expired"
  ) {
    return failure(
      CODE.invalidVerificationAction,
      "Acțiunea solicitată nu este validă.",
      400
    );
  }

  if (
    action === "reject" &&
    !rejectionReason
  ) {
    return failure(
      CODE.verificationRejectionReasonRequired,
      "Motivul respingerii este obligatoriu.",
      400
    );
  }

  const {
    data,
    error,
  } =
    await authorization.supabase.rpc(
      "admin_review_doctor_verification",
      {
        target_submission_id:
          submissionId,
        review_action:
          action,
        review_reason:
          rejectionReason ||
          null,
        private_note:
          privateNote ||
          null,
      }
    );

  if (error) {
    console.error(
      "Admin verification review failed:",
      error
    );

    const message =
      error.message ?? "";

    if (
      message.includes(
        "not_found"
      ) ||
      error.code === "P0002"
    ) {
      return failure(
        CODE.verificationSubmissionNotFound,
        "Cererea de verificare nu a fost găsită.",
        404
      );
    }

    if (
      message.includes(
        "cannot"
      ) ||
      message.includes(
        "required"
      ) ||
      message.includes(
        "invalid"
      ) ||
      error.code === "22023" ||
      error.code === "23514"
    ) {
      return failure(
        CODE.verificationActionConflict,
        "Cererea nu mai poate primi această acțiune în starea curentă.",
        409
      );
    }

    return failure(
      CODE.verificationUpdateFailed,
      "Verificarea nu a putut fi actualizată.",
      500
    );
  }

  const resultByAction = {
    start_review: {
      code:
        CODE.verificationReviewStarted,
      message:
        "Cererea a fost preluată pentru analiză.",
    },
    approve: {
      code:
        CODE.verificationApproved,
      message:
        "Medicul a fost verificat cu succes.",
    },
    reject: {
      code:
        CODE.verificationRejected,
      message:
        "Cererea a fost respinsă.",
    },
    mark_expired: {
      code:
        CODE.verificationExpired,
      message:
        "Verificarea a fost marcată ca expirată.",
    },
  } as const;

  const result =
    resultByAction[action];

  return json({
    success: true,
    code:
      result.code,
    message:
      result.message,
    submission: data,
  });
}
