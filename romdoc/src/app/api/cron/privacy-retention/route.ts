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
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 100;
const RETENTION_CLASS =
  "account_closure_cooling_off";

type ClosureCandidate = {
  id: string;
  profile_id: string;
  status: string;
  requested_at: string;
  cooling_off_ends_at:
    | string
    | null;
};

type LegalHoldResult = boolean | null;

type RunCounters = {
  scanned: number;
  eligible: number;
  skippedLegalHold: number;
  failed: number;
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
    `privacy-retention:${randomUUID()}`;

  const startedAt =
    new Date().toISOString();

  const {
    data: createdRun,
    error: runInsertError,
  } =
    await admin
      .from(
        "privacy_retention_runs"
      )
      .insert({
        run_type:
          "dry_run",
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
          destructive_actions:
            false,
        },
      })
      .select(`
        id
      `)
      .single();

  if (
    runInsertError ||
    !createdRun
  ) {
    console.error(
      "Privacy retention run creation failed:",
      runInsertError
    );

    return NextResponse.json(
      {
        error:
          "Privacy retention dry run could not be started.",
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

  const counters:
    RunCounters = {
      scanned: 0,
      eligible: 0,
      skippedLegalHold: 0,
      failed: 0,
    };

  try {
    const now =
      new Date().toISOString();

    const {
      data: candidates,
      error:
        candidateError,
    } =
      await admin
        .from(
          "privacy_account_closure_requests"
        )
        .select(`
          id,
          profile_id,
          status,
          requested_at,
          cooling_off_ends_at
        `)
        .eq(
          "status",
          "cooling_off"
        )
        .not(
          "cooling_off_ends_at",
          "is",
          null
        )
        .lte(
          "cooling_off_ends_at",
          now
        )
        .order(
          "cooling_off_ends_at",
          {
            ascending:
              true,
          }
        )
        .limit(
          BATCH_SIZE
        );

    if (candidateError) {
      throw candidateError;
    }

    const typedCandidates =
      (candidates ??
        []) as ClosureCandidate[];

    counters.scanned =
      typedCandidates.length;

    for (
      const candidate
      of typedCandidates
    ) {
      try {
        const {
          data:
            legalHoldData,
          error:
            legalHoldError,
        } =
          await admin.rpc(
            "has_active_privacy_legal_hold",
            {
              target_profile_id:
                candidate.profile_id,
              target_resource_type:
                "all_subject_data",
              target_resource_id:
                null,
            }
          );

        if (legalHoldError) {
          throw legalHoldError;
        }

        const hasLegalHold =
          Boolean(
            legalHoldData as
              LegalHoldResult
          );

        if (hasLegalHold) {
          counters.skippedLegalHold +=
            1;

          const {
            error:
              heldItemError,
          } =
            await admin
              .from(
                "privacy_retention_run_items"
              )
              .insert({
                retention_run_id:
                  createdRun.id,
                retention_class:
                  RETENTION_CLASS,
                resource_type:
                  "account_closure_request",
                resource_id:
                  candidate.id,
                subject_profile_id:
                  candidate.profile_id,
                decision:
                  "skipped_legal_hold",
                reason_code:
                  "ACTIVE_LEGAL_HOLD",
                metadata: {
                  request_status:
                    candidate.status,
                  cooling_off_ends_at:
                    candidate.cooling_off_ends_at,
                },
              });

          if (
            heldItemError
          ) {
            throw heldItemError;
          }

          continue;
        }

        counters.eligible +=
          1;

        const {
          error:
            eligibleItemError,
        } =
          await admin
            .from(
              "privacy_retention_run_items"
            )
            .insert({
              retention_run_id:
                createdRun.id,
              retention_class:
                RETENTION_CLASS,
              resource_type:
                "account_closure_request",
              resource_id:
                candidate.id,
              subject_profile_id:
                candidate.profile_id,
              decision:
                "eligible",
              reason_code:
                "COOLING_OFF_COMPLETE",
              metadata: {
                request_status:
                  candidate.status,
                requested_at:
                  candidate.requested_at,
                cooling_off_ends_at:
                  candidate.cooling_off_ends_at,
                destructive_action_taken:
                  false,
              },
            });

        if (
          eligibleItemError
        ) {
          throw eligibleItemError;
        }
      } catch (
        candidateError
      ) {
        counters.failed +=
          1;

        const message =
          normalizeError(
            candidateError
          );

        console.error(
          "Privacy retention candidate inspection failed:",
          {
            requestId:
              candidate.id,
            profileId:
              candidate.profile_id,
            error:
              message,
          }
        );

        const {
          error:
            failedItemError,
        } =
          await admin
            .from(
              "privacy_retention_run_items"
            )
            .insert({
              retention_run_id:
                createdRun.id,
              retention_class:
                RETENTION_CLASS,
              resource_type:
                "account_closure_request",
              resource_id:
                candidate.id,
              subject_profile_id:
                candidate.profile_id,
              decision:
                "failed",
              error_code:
                "CANDIDATE_INSPECTION_FAILED",
              error_message:
                message,
              metadata: {
                destructive_action_taken:
                  false,
              },
            });

        if (
          failedItemError
        ) {
          console.error(
            "Privacy retention failed-item logging failed:",
            failedItemError
          );
        }
      }
    }

    const completedAt =
      new Date().toISOString();

    const runStatus =
      counters.failed >
      0
        ? "completed_with_errors"
        : "completed";

    const {
      error:
        runUpdateError,
    } =
      await admin
        .from(
          "privacy_retention_runs"
        )
        .update({
          status:
            runStatus,
          completed_at:
            completedAt,
          scanned_count:
            counters.scanned,
          eligible_count:
            counters.eligible,
          skipped_legal_hold_count:
            counters.skippedLegalHold,
          failed_count:
            counters.failed,
          metadata: {
            batch_size:
              BATCH_SIZE,
            destructive_actions:
              false,
            finished_at:
              completedAt,
          },
        })
        .eq(
          "id",
          createdRun.id
        );

    if (runUpdateError) {
      throw runUpdateError;
    }

    return NextResponse.json(
      {
        success: true,
        dryRun: true,
        runId:
          createdRun.id,
        workerId,
        retentionClass:
          RETENTION_CLASS,
        scanned:
          counters.scanned,
        eligible:
          counters.eligible,
        skippedLegalHold:
          counters.skippedLegalHold,
        failed:
          counters.failed,
        destructiveActions:
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
      "Privacy retention dry run failed:",
      error
    );

    const completedAt =
      new Date().toISOString();

    const {
      error:
        failureUpdateError,
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
          scanned_count:
            counters.scanned,
          eligible_count:
            counters.eligible,
          skipped_legal_hold_count:
            counters.skippedLegalHold,
          failed_count:
            Math.max(
              counters.failed,
              1
            ),
          error_summary:
            message,
          metadata: {
            batch_size:
              BATCH_SIZE,
            destructive_actions:
              false,
            failed_at:
              completedAt,
          },
        })
        .eq(
          "id",
          createdRun.id
        );

    if (
      failureUpdateError
    ) {
      console.error(
        "Privacy retention run failure logging failed:",
        failureUpdateError
      );
    }

    return NextResponse.json(
      {
        error:
          "Privacy retention dry run failed.",
        dryRun: true,
        destructiveActions:
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
