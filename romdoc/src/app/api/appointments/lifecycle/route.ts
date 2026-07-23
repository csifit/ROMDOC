import {
  NextRequest,
} from "next/server";

import {
  APPOINTMENT_API_CODES,
  type AppointmentApiCode,
} from "@/lib/api/appointment-api-codes";
import {
  stableApiError,
  stableApiSuccess,
} from "@/lib/api/stable-api-response";
import {
  notifyAppointmentLifecycle,
} from "@/lib/appointments/notify-appointment-lifecycle";
import {
  getAppointmentApiMessage,
} from "@/lib/i18n/appointment-api-copy";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type LifecycleAction =
  | "confirm"
  | "reschedule"
  | "cancel"
  | "complete"
  | "no_show";

type LifecycleRequestBody = {
  appointmentId?:
    unknown;
  action?: unknown;
  scheduledDate?:
    unknown;
  scheduledTime?:
    unknown;
  reason?: unknown;
};

const actionToStatus:
  Record<
    LifecycleAction,
    | "confirmed"
    | "rescheduled"
    | "cancelled"
    | "completed"
    | "no_show"
  > = {
    confirm:
      "confirmed",
    reschedule:
      "rescheduled",
    cancel:
      "cancelled",
    complete:
      "completed",
    no_show:
      "no_show",
  };

function normalizeString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidDate(
  value: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    new Date(
      `${value}T12:00:00`
    ).getTime()
  );
}

function isValidTime(
  value: string
) {
  return /^\d{2}:\d{2}$/.test(
    value
  );
}

function apiError(
  locale: AppLocale,
  code:
    AppointmentApiCode,
  status: number,
  parameters?: {
    maximumDays?: number;
  }
) {
  return stableApiError(
    code,
    getAppointmentApiMessage(
      locale,
      code,
      parameters
    ),
    status
  );
}

function transitionErrorResponse(
  locale: AppLocale,
  message: string,
  databaseCode?:
    string
) {
  const normalized =
    message.toLowerCase();

  if (
    databaseCode ===
      "P0002" ||
    normalized.includes(
      "appointment_not_found"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentNotFound,
      404
    );
  }

  if (
    databaseCode ===
      "42501" ||
    normalized.includes(
      "not_permitted"
    ) ||
    normalized.includes(
      "active_profile_required"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentActionNotPermitted,
      403
    );
  }

  if (
    databaseCode ===
      "23P01" ||
    normalized.includes(
      "appointment_slot_conflict"
    ) ||
    normalized.includes(
      "appointments_no_doctor_overlap"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentSlotConflict,
      409
    );
  }

  if (
    normalized.includes(
      "appointment_outside_working_hours"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentOutsideWorkingHours,
      409
    );
  }

  if (
    normalized.includes(
      "appointment_overlaps_break"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentOverlapsBreak,
      409
    );
  }

  if (
    normalized.includes(
      "doctor_unavailable_for_period"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .doctorUnavailableForPeriod,
      409
    );
  }

  if (
    normalized.includes(
      "doctor_clinic_not_available"
    ) ||
    normalized.includes(
      "appointment_clinic_required"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentClinicUnavailable,
      409
    );
  }

  if (
    normalized.includes(
      "appointment_duration_mismatch"
    ) ||
    normalized.includes(
      "invalid_appointment_duration"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentDurationMismatch,
      409
    );
  }

  if (
    normalized.includes(
      "appointment_date_is_in_the_past"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentDateInPast,
      400
    );
  }

  if (
    normalized.includes(
      "appointment_date_exceeds_advance_limit"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentTooFar,
      400,
      {
        maximumDays:
          180,
      }
    );
  }

  if (
    normalized.includes(
      "invalid_appointment_transition"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentTransitionInvalid,
      409
    );
  }

  if (
    normalized.includes(
      "reschedule_requires_new_slot"
    ) ||
    normalized.includes(
      "rescheduled_appointment_requires_a_new_slot"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentRescheduleSameSlot,
      409
    );
  }

  if (
    normalized.includes(
      "requires_date_and_time"
    ) ||
    normalized.includes(
      "scheduled_date_and_time_required"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentScheduleRequired,
      400
    );
  }

  if (
    databaseCode ===
      "22001" ||
    normalized.includes(
      "reason_too_long"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentReasonTooLong,
      400
    );
  }

  return apiError(
    locale,
    APPOINTMENT_API_CODES
      .appointmentUpdateFailed,
    500
  );
}

function successCode(
  action:
    LifecycleAction
): AppointmentApiCode {
  switch (
    action
  ) {
    case "confirm":
      return APPOINTMENT_API_CODES
        .appointmentConfirmed;
    case "reschedule":
      return APPOINTMENT_API_CODES
        .appointmentRescheduled;
    case "cancel":
      return APPOINTMENT_API_CODES
        .appointmentCancelled;
    case "complete":
      return APPOINTMENT_API_CODES
        .appointmentCompleted;
    case "no_show":
      return APPOINTMENT_API_CODES
        .appointmentNoShow;
  }
}

export async function PATCH(
  request:
    NextRequest
): Promise<Response> {
  const locale =
    getRequestAppLocale(
      request
    );

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
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .authenticationRequired,
      401
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
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    ![
      "doctor",
      "staff",
      "admin",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentRoleRequired,
      403
    );
  }

  let body:
    LifecycleRequestBody;

  try {
    body =
      (await request
        .json()) as
        LifecycleRequestBody;
  } catch {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .invalidJson,
      400
    );
  }

  const appointmentId =
    normalizeString(
      body.appointmentId
    );

  const action =
    normalizeString(
      body.action
    ) as
      LifecycleAction;

  const scheduledDate =
    normalizeString(
      body.scheduledDate
    );

  const scheduledTime =
    normalizeString(
      body.scheduledTime
    );

  const reason =
    normalizeString(
      body.reason
    );

  if (
    !isUuid(
      appointmentId
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentIdInvalid,
      400
    );
  }

  if (
    ![
      "confirm",
      "reschedule",
      "cancel",
      "complete",
      "no_show",
    ].includes(
      action
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentActionInvalid,
      400
    );
  }

  if (
    (
      action ===
        "confirm" ||
      action ===
        "reschedule"
    ) &&
    (
      !isValidDate(
        scheduledDate
      ) ||
      !isValidTime(
        scheduledTime
      )
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentScheduleRequired,
      400
    );
  }

  if (
    action ===
      "reschedule" &&
    reason.length < 3
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .rescheduleReasonRequired,
      400
    );
  }

  if (
    reason.length > 2000
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentReasonTooLong,
      400
    );
  }

  const {
    data:
      transitionData,
    error:
      transitionError,
  } =
    await supabase.rpc(
      "transition_own_appointment",
      {
        target_appointment_id:
          appointmentId,
        target_status:
          actionToStatus[
            action
          ],
        target_scheduled_date:
          action ===
            "confirm" ||
          action ===
            "reschedule"
            ? scheduledDate
            : null,
        target_scheduled_time:
          action ===
            "confirm" ||
          action ===
            "reschedule"
            ? scheduledTime
            : null,
        transition_reason:
          reason ||
          null,
      }
    );

  if (
    transitionError
  ) {
    console.error(
      "Unified appointment lifecycle transition failed:",
      transitionError
    );

    return transitionErrorResponse(
      locale,
      transitionError
        .message,
      transitionError
        .code
    );
  }

  const transition =
    Array.isArray(
      transitionData
    )
      ? transitionData[0] ??
        null
      : transitionData;

  const notificationStatus =
    actionToStatus[
      action
    ];

  let notificationResult = {
    dashboardCreated:
      false,
    emailSent:
      null as
        boolean | null,
    smsSent:
      null as
        boolean | null,
    smsSkipped:
      null as
        boolean | null,
  };

  try {
    notificationResult =
      await notifyAppointmentLifecycle({
        appointmentId,
        status:
          notificationStatus,
        triggeredByProfileId:
          user.id,
      });
  } catch (
    notificationError
  ) {
    console.error(
      `Appointment ${appointmentId} transitioned successfully, but lifecycle notifications failed:`,
      notificationError
    );
  }

  const code =
    successCode(
      action
    );

  return stableApiSuccess(
    code,
    {
      message:
        getAppointmentApiMessage(
          locale,
          code
        ),
      appointment:
        transition,
      dashboardCreated:
        notificationResult
          .dashboardCreated,
      emailSent:
        notificationResult
          .emailSent,
      smsSent:
        notificationResult
          .smsSent,
      smsSkipped:
        notificationResult
          .smsSkipped,
    }
  );
}
