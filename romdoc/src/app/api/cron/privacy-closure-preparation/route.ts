import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  randomUUID,
} from "node:crypto";

import {
  cronUnauthorizedResponse,
  validateCronRequest,
} from "@/lib/security/cron-auth";
import {
  sendAccountClosureNotification,
} from "@/lib/privacy/send-account-closure-notification";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 25;
const RETENTION_CLASS =
  "account_closure_preparation";

type PreparedClosure = {
  closure_request_id: string;
  profile_id: string;
  revoked_share_count: number;
  prepared_at: string;
};

function normalizeError(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message.slice(
      0,
      2000
    );
  }

  return String(error).slice(
    0,
    2000
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  if (
    !validateCronRequest(
      request
    )
  ) {
    return cronUnauthorizedResponse();
  }

  const admin =
    createAdminClient();

  const workerId =
    `closure-preparation:${randomUUID()}`;

  const startedAt =
    new Date().toISOString();

  const {
    data: retentionRun,
    error: runInsertError,
  } =
    await admin
      .from(
        "privacy_retention_runs"
      )
      .insert({
        run_type:
          "execute",
        status:
          "running",
        worker_id:
          workerId,
        retention_class:
          RETENTION_CLASS,
        started_at:
          startedAt,
        metadata: {
          batch_size:
            BATCH_SIZE,
          phase:
            "preparation_only",
          deletes_personal_data:
            false,
          deletes_auth_user:
            false,
          deletes_medical_records:
            false,
        },
      })
      .select("id")
      .single();

  if (
    runInsertError ||
    !retentionRun
  ) {
    console.error(
      "Closure preparation run creation failed:",
      runInsertError
    );

    return NextResponse.json(
      {
        error:
          "Closure preparation could not be started.",
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

  let releasedStaleLocks =
    0;

  try {
    const {
      data: releasedData,
      error: releaseError,
    } =
      await admin.rpc(
        "release_stale_account_closure_locks",
        {
          maximum_lock_age:
            "2 hours",
        }
      );

    if (releaseError) {
      throw releaseError;
    }

    releasedStaleLocks =
      Number(
        releasedData ??
          0
      );

    const {
      data: preparedData,
      error: prepareError,
    } =
      await admin.rpc(
        "prepare_due_account_closures",
        {
          worker_id:
            workerId,
          batch_size:
            BATCH_SIZE,
        }
      );

    if (prepareError) {
      throw prepareError;
    }

    const prepared =
      (preparedData ??
        []) as PreparedClosure[];

    let revokedShares =
      0;
    let finalizedLocks =
      0;
    let failedLocks =
      0;

    for (
      const item
      of prepared
    ) {
      revokedShares +=
        Number(
          item.revoked_share_count ??
            0
        );

      const {
        data: finalized,
        error: finalizeError,
      } =
        await admin.rpc(
          "complete_account_closure_preparation",
          {
            target_closure_request_id:
              item.closure_request_id,
            worker_id:
              workerId,
          }
        );

      if (
        finalizeError ||
        !finalized
      ) {
        failedLocks +=
          1;

        console.error(
          "Closure preparation lock finalization failed:",
          {
            closureRequestId:
              item.closure_request_id,
            error:
              finalizeError?.message ??
              "Lock was not owned by this worker.",
          }
        );
      } else {
        finalizedLocks +=
          1;
      }

      const { data: authUserResult, error: authUserError } =
        await admin.auth.admin.getUserById(item.profile_id);

      if (authUserError) {
        console.error("Closure processing email recipient lookup failed:", authUserError);
      } else if (authUserResult.user?.email) {
        const { data: profile } = await admin
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", item.profile_id)
          .maybeSingle();

        const recipientName =
          [profile?.first_name, profile?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          authUserResult.user.email.split("@")[0];

        const emailResult = await sendAccountClosureNotification({
          closureRequestId: item.closure_request_id,
          profileId: item.profile_id,
          recipientEmail: authUserResult.user.email,
          recipientName,
          notificationType: "processing_started",
          locale: authUserResult.user.user_metadata?.locale,
        });

        if (!emailResult.sent && !emailResult.skipped) {
          console.error("Closure processing-start email failed:", emailResult);
        }
      }

      await admin
        .from(
          "privacy_retention_run_items"
        )
        .insert({
          retention_run_id:
            retentionRun.id,
          retention_class:
            RETENTION_CLASS,
          resource_type:
            "account_closure_request",
          resource_id:
            item.closure_request_id,
          subject_profile_id:
            item.profile_id,
          decision:
            "retained",
          reason_code:
            "RESTRICTED_AND_PLAN_CREATED",
          metadata: {
            prepared_at:
              item.prepared_at,
            revoked_share_count:
              item.revoked_share_count,
            profile_restricted:
              true,
            execution_plan_created:
              true,
            personal_data_deleted:
              false,
            auth_user_deleted:
              false,
            medical_records_deleted:
              false,
          },
        });
    }

    const completedAt =
      new Date().toISOString();

    const status =
      failedLocks >
      0
        ? "completed_with_errors"
        : "completed";

    const {
      error: runUpdateError,
    } =
      await admin
        .from(
          "privacy_retention_runs"
        )
        .update({
          status,
          completed_at:
            completedAt,
          scanned_count:
            prepared.length,
          eligible_count:
            prepared.length,
          retained_count:
            prepared.length,
          failed_count:
            failedLocks,
          metadata: {
            batch_size:
              BATCH_SIZE,
            phase:
              "preparation_only",
            released_stale_locks:
              releasedStaleLocks,
            finalized_locks:
              finalizedLocks,
            revoked_document_shares:
              revokedShares,
            deletes_personal_data:
              false,
            deletes_auth_user:
              false,
            deletes_medical_records:
              false,
          },
        })
        .eq(
          "id",
          retentionRun.id
        );

    if (runUpdateError) {
      throw runUpdateError;
    }

    return NextResponse.json(
      {
        success: true,
        phase:
          "preparation_only",
        runId:
          retentionRun.id,
        workerId,
        releasedStaleLocks,
        prepared:
          prepared.length,
        finalizedLocks,
        failedLocks,
        revokedDocumentShares:
          revokedShares,
        profilesRestricted:
          prepared.length,
        executionPlansCreated:
          prepared.length,
        personalDataDeleted:
          false,
        authUsersDeleted:
          false,
        medicalRecordsDeleted:
          false,
        processedAt:
          completedAt,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      normalizeError(
        error
      );

    console.error(
      "Account closure preparation failed:",
      error
    );

    const completedAt =
      new Date().toISOString();

    const {
      error: failureUpdateError,
    } =
      await admin
        .from(
          "privacy_retention_runs"
        )
        .update({
          status:
            "failed",
          completed_at:
            completedAt,
          failed_count:
            1,
          error_summary:
            message,
          metadata: {
            batch_size:
              BATCH_SIZE,
            phase:
              "preparation_only",
            released_stale_locks:
              releasedStaleLocks,
            deletes_personal_data:
              false,
            deletes_auth_user:
              false,
            deletes_medical_records:
              false,
          },
        })
        .eq(
          "id",
          retentionRun.id
        );

    if (
      failureUpdateError
    ) {
      console.error(
        "Closure preparation failure logging failed:",
        failureUpdateError
      );
    }

    return NextResponse.json(
      {
        error:
          "Account closure preparation failed.",
        phase:
          "preparation_only",
        personalDataDeleted:
          false,
        authUsersDeleted:
          false,
        medicalRecordsDeleted:
          false,
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
}
