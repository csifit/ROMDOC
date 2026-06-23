import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorized(
  request: NextRequest
) {
  const secret =
    process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get(
      "authorization"
    ) === `Bearer ${secret}`
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: documents,
    error,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .select(`
      id,
      patient_profile_id,
      appointment_id,
      storage_bucket,
      storage_path
    `)
    .eq(
      "content_format",
      "file"
    )
    .not(
      "deleted_at",
      "is",
      null
    )
    .is(
      "storage_removed_at",
      null
    )
    .order(
      "deleted_at",
      {
        ascending: true,
      }
    )
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error:
          "Cleanup query failed.",
      },
      { status: 500 }
    );
  }

  let removed = 0;
  let failed = 0;

  for (
    const document
    of documents ?? []
  ) {
    const attemptedAt =
      new Date().toISOString();

    const {
      error: removalError,
    } = await admin.storage
      .from(
        document.storage_bucket
      )
      .remove([
        document.storage_path,
      ]);

    if (removalError) {
      failed += 1;

      await admin
        .from(
          "patient_medical_documents"
        )
        .update({
          storage_cleanup_attempted_at:
            attemptedAt,
          storage_removal_error:
            removalError.message.slice(
              0,
              2000
            ),
        })
        .eq("id", document.id);

      await admin
        .from(
          "patient_medical_document_events"
        )
        .insert({
          document_id:
            document.id,
          patient_profile_id:
            document.patient_profile_id,
          appointment_id:
            document.appointment_id,
          event_type:
            "storage_cleanup_failed",
          actor_profile_id:
            null,
          actor_role:
            "system",
          metadata: {
            error:
              removalError.message.slice(
                0,
                500
              ),
          },
        });

      continue;
    }

    removed += 1;

    await admin
      .from(
        "patient_medical_documents"
      )
      .update({
        storage_removed_at:
          attemptedAt,
        storage_cleanup_attempted_at:
          attemptedAt,
        storage_removal_error:
          null,
      })
      .eq("id", document.id);

    await admin
      .from(
        "patient_medical_document_events"
      )
      .insert({
        document_id:
          document.id,
        patient_profile_id:
          document.patient_profile_id,
        appointment_id:
          document.appointment_id,
        event_type:
          "storage_removed",
        actor_profile_id:
          null,
        actor_role:
          "system",
        metadata: {},
      });
  }

  return NextResponse.json({
    checked:
      documents?.length ?? 0,
    removed,
    failed,
  });
}
