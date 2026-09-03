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
  PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
  getPublicMinimumBookingDate,
} from "@/lib/appointments/calculate-available-slots";
import {
  resolveAppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";
import {
  sendAppointmentRequestEmail,
} from "@/lib/appointments/send-appointment-request-email";
import {
  doctorCanUseClinic,
} from "@/lib/doctors/clinic-subaccount-scope";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { TELEHEALTH_CONSENT_VERSION } from "@/lib/telehealth/constants";

type AppointmentRequestBody = {
  doctorId?: string;
  clinicId?: string;
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  patientPhone?: string;
  requestedDate?: string;
  requestedTime?: string;
  durationMinutes?: number;
  notes?:
    string | null;
  notificationLocale?:
    unknown;
  consultationMode?: unknown;
  telehealthConsentAccepted?: unknown;
  telehealthConsentVersion?: unknown;
};

type AvailableSlotRow = {
  slot_time: string;
  duration_minutes: number;
};

type DoctorRow = {
  id: string;
  account_type:
    string | null;
  clinic_organization_id: string | null;
};

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
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function getLocalDateString(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function apiError(
  locale: AppLocale,
  code:
    AppointmentApiCode,
  status: number,
  parameters?: {
    leadDays?: number;
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

function classifyCreateError(
  message:
    string | undefined,
  databaseCode:
    string | undefined
): {
  code:
    AppointmentApiCode;
  status: number;
} {
  const normalized =
    message
      ?.toLowerCase() ??
    "";

  if (
    databaseCode ===
      "23P01" ||
    normalized.includes(
      "appointments_no_doctor_overlap"
    ) ||
    normalized.includes(
      "conflicting key value violates exclusion constraint"
    ) ||
    normalized.includes(
      "exclusion constraint"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .appointmentSlotConflict,
      status: 409,
    };
  }

  if (
    normalized.includes(
      "outside the doctor's working hours"
    ) ||
    normalized.includes(
      "appointment_outside_working_hours"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .appointmentOutsideWorkingHours,
      status: 409,
    };
  }

  if (
    normalized.includes(
      "overlaps a configured break"
    ) ||
    normalized.includes(
      "appointment_overlaps_break"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .appointmentOverlapsBreak,
      status: 409,
    };
  }

  if (
    normalized.includes(
      "doctor is unavailable"
    ) ||
    normalized.includes(
      "doctor_unavailable_for_period"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .doctorUnavailableForPeriod,
      status: 409,
    };
  }

  if (
    normalized.includes(
      "duration does not match"
    ) ||
    normalized.includes(
      "appointment_duration_mismatch"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .appointmentDurationMismatch,
      status: 409,
    };
  }

  if (
    normalized.includes(
      "selected clinic is not associated"
    ) ||
    normalized.includes(
      "doctor_clinic_not_available"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .doctorClinicUnavailable,
      status: 409,
    };
  }

  if (
    databaseCode ===
      "42501" ||
    normalized.includes(
      "row-level security"
    )
  ) {
    return {
      code:
        APPOINTMENT_API_CODES
          .appointmentCreateDenied,
      status: 403,
    };
  }

  return {
    code:
      APPOINTMENT_API_CODES
        .appointmentCreateFailed,
    status: 500,
  };
}

export async function POST(
  request:
    NextRequest
): Promise<Response> {
  let body:
    AppointmentRequestBody;

  try {
    body =
      (await request
        .json()) as
        AppointmentRequestBody;
  } catch {
    const locale =
      getRequestAppLocale(
        request
      );

    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .invalidJson,
      400
    );
  }

  const locale =
    resolveAppointmentNotificationLocale(
      body.notificationLocale ??
        getRequestAppLocale(
          request
        )
    );

  const doctorId =
    body.doctorId
      ?.trim();

  const clinicId =
    body.clinicId
      ?.trim();

  const doctorName =
    body.doctorName
      ?.trim();

  const clinicName =
    body.clinicName
      ?.trim();

  const patientName =
    body.patientName
      ?.trim();

  const patientPhone =
    body.patientPhone
      ?.trim();

  const requestedDate =
    body.requestedDate
      ?.trim();

  const requestedTime =
    body.requestedTime
      ?.trim();

  const durationMinutes =
    Number(
      body.durationMinutes
    );

  const notes =
    body.notes
      ?.trim() ||
    null;

  const consultationMode =
    body.consultationMode === "video" ? "video" : "in_person";

  if (
    consultationMode === "video" &&
    (
      body.telehealthConsentAccepted !== true ||
      body.telehealthConsentVersion !== TELEHEALTH_CONSENT_VERSION
    )
  ) {
    return stableApiError(
      "TELEHEALTH_CONSENT_REQUIRED",
      "Telehealth consent is required before payment.",
      400
    );
  }

  if (
    !doctorId ||
    !clinicId ||
    !doctorName ||
    !clinicName ||
    !patientName ||
    !patientPhone ||
    !requestedDate ||
    !requestedTime
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .requiredFields,
      400
    );
  }

  if (
    !isUuid(
      doctorId
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .doctorIdInvalid,
      400
    );
  }

  if (
    !isUuid(
      clinicId
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .clinicIdInvalid,
      400
    );
  }

  if (
    patientName.length <
      2 ||
    patientName.length >
      120
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .patientNameInvalid,
      400
    );
  }

  if (
    patientPhone.length <
      7 ||
    patientPhone.length >
      40
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .patientPhoneInvalid,
      400
    );
  }

  if (
    doctorName.length >
      160 ||
    clinicName.length >
      200
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .providerDataInvalid,
      400
    );
  }

  if (
    !isValidDate(
      requestedDate
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentDateInvalid,
      400
    );
  }

  if (
    !isValidTime(
      requestedTime
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentTimeInvalid,
      400
    );
  }

  if (
    !Number.isInteger(
      durationMinutes
    ) ||
    durationMinutes < 5 ||
    durationMinutes > 480
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentDurationInvalid,
      400
    );
  }

  if (
    notes &&
    notes.length > 2000
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentNotesTooLong,
      400
    );
  }

  const minimumBookingDate =
    getPublicMinimumBookingDate();

  if (
    requestedDate <
    minimumBookingDate
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentTooSoon,
      400,
      {
        leadDays:
          PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
      }
    );
  }

  const maximumDays =
    180;

  const maximumDate =
    new Date();

  maximumDate.setDate(
    maximumDate.getDate() +
      maximumDays
  );

  if (
    requestedDate >
    getLocalDateString(
      maximumDate
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentTooFar,
      400,
      {
        maximumDays,
      }
    );
  }

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

  if (
    !user
      .email_confirmed_at
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .emailConfirmationRequired,
      403
    );
  }

  if (!user.email) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .patientEmailMissing,
      400
    );
  }

  const {
    data:
      patientProfile,
    error:
      patientProfileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "id, role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    patientProfileError
  ) {
    console.error(
      "Patient profile lookup failed:",
      patientProfileError
    );

    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .patientProfileLookupFailed,
      500
    );
  }

  if (
    !patientProfile ||
    ![
      "patient",
      "user",
    ].includes(
      patientProfile.role
    ) ||
    (
      patientProfile
        .account_status &&
      patientProfile
        .account_status !==
        "active"
    )
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .activePatientRequired,
      403
    );
  }

  const patientEmail =
    user.email
      .trim()
      .toLowerCase();

  const {
    data:
      doctor,
    error:
      doctorError,
  } =
    await supabase
      .from(
        "doctors"
      )
      .select(
        "id, account_type, clinic_organization_id"
      )
      .eq(
        "id",
        doctorId
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (doctorError) {
    console.error(
      "Appointment doctor lookup failed:",
      doctorError
    );

    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .doctorLookupFailed,
      500
    );
  }

  if (!doctor) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .doctorUnavailable,
      400
    );
  }

  let doctorClinicIsAllowed =
    false;

  try {
    doctorClinicIsAllowed =
      await doctorCanUseClinic(
        supabase,
        doctor as
          DoctorRow,
        clinicId
      );
  } catch (
    scopeError
  ) {
    console.error(
      "Appointment doctor-clinic scope check failed:",
      scopeError
    );

    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .clinicScopeLookupFailed,
      500
    );
  }

  if (
    !doctorClinicIsAllowed
  ) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .doctorClinicUnavailable,
      400
    );
  }

  const {
    data:
      availableSlots,
    error:
      slotsError,
  } =
    await supabase.rpc(
      "get_available_appointment_slots",
      {
        target_doctor_id:
          doctorId,
        target_clinic_id:
          clinicId,
        target_date:
          requestedDate,
        target_duration_minutes:
          durationMinutes,
      }
    );

  if (slotsError) {
    console.error(
      "Appointment slot verification failed:",
      slotsError
    );

    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentSlotsLookupFailed,
      500
    );
  }

  const slotRows =
    (
      availableSlots as
        | AvailableSlotRow[]
        | null
    ) ??
    [];

  const selectedSlot =
    slotRows.find(
      (
        slot
      ) =>
        slot.slot_time
          .slice(
            0,
            5
          ) ===
          requestedTime &&
        Number(
          slot.duration_minutes
        ) ===
          durationMinutes
    );

  if (!selectedSlot) {
    return apiError(
      locale,
      APPOINTMENT_API_CODES
        .appointmentSlotUnavailable,
      409
    );
  }

  const admin = createAdminClient();
  let telehealthSnapshot: null | {
    priceMinor: number;
    currency: "RON" | "EUR";
    durationMinutes: number;
    recipientType: "doctor" | "clinic_organization";
    recipientId: string;
    commercialAccountId: string;
    stripeAccountId: string;
  } = null;

  if (consultationMode === "video") {
    const { data: publicOffer, error: offerError } = await supabase.rpc(
      "get_public_telehealth_offer",
      { target_doctor_id: doctorId }
    );
    const offer = ((publicOffer ?? []) as Array<{
      price_minor: number;
      currency: "RON" | "EUR";
      duration_minutes: number;
    }>)[0];

    if (offerError || !offer) {
      return stableApiError("TELEHEALTH_UNAVAILABLE", "Video consultations are not currently available for this Doctor.", 409);
    }
    if (durationMinutes !== Number(offer.duration_minutes)) {
      return stableApiError("TELEHEALTH_DURATION_CHANGED", "The video consultation duration changed. Select an available time again.", 409);
    }

    const recipientType = doctor.account_type === "clinic_invited" ? "clinic_organization" : "doctor";
    const recipientId = recipientType === "clinic_organization" ? doctor.clinic_organization_id : doctor.id;
    if (!recipientId) {
      return stableApiError("TELEHEALTH_RECIPIENT_MISSING", "The video consultation payment recipient is not configured.", 409);
    }

    const { data: commercialAccount } = await admin
      .from("telehealth_commercial_accounts")
      .select("id, stripe_account_id, details_submitted, charges_enabled, payouts_enabled")
      .eq(recipientType === "doctor" ? "doctor_id" : "organization_id", recipientId)
      .maybeSingle();

    if (!commercialAccount?.stripe_account_id || !commercialAccount.details_submitted || !commercialAccount.charges_enabled || !commercialAccount.payouts_enabled) {
      return stableApiError("TELEHEALTH_PAYMENT_UNAVAILABLE", "Video consultation payment is not currently available.", 409);
    }

    telehealthSnapshot = {
      priceMinor: Number(offer.price_minor),
      currency: offer.currency,
      durationMinutes: Number(offer.duration_minutes),
      recipientType,
      recipientId,
      commercialAccountId: commercialAccount.id,
      stripeAccountId: commercialAccount.stripe_account_id,
    };
  }

  const appointmentId =
    crypto.randomUUID();

  const {
    error:
      appointmentError,
  } =
    await supabase
      .from(
        "appointments"
      )
      .insert({
        id:
          appointmentId,
        patient_profile_id:
          user.id,
        doctor_id:
          doctorId,
        clinic_id:
          clinicId,
        patient_name:
          patientName,
        patient_email:
          patientEmail,
        patient_phone:
          patientPhone,
        notification_locale:
          locale,
        requested_date:
          requestedDate,
        requested_time:
          requestedTime,
        duration_minutes:
          durationMinutes,
        notes,
        status:
          "pending",
        source:
          "online",
        created_by_profile_id:
          user.id,
        consultation_mode:
          consultationMode,
        telehealth_public_reference:
          telehealthSnapshot ? crypto.randomUUID() : null,
        telehealth_consent_at:
          telehealthSnapshot ? new Date().toISOString() : null,
        telehealth_consent_version:
          telehealthSnapshot ? TELEHEALTH_CONSENT_VERSION : null,
        telehealth_price_minor:
          telehealthSnapshot?.priceMinor ?? null,
        telehealth_currency:
          telehealthSnapshot?.currency ?? null,
        telehealth_recipient_type:
          telehealthSnapshot?.recipientType ?? null,
        telehealth_recipient_id:
          telehealthSnapshot?.recipientId ?? null,
      });

  if (
    appointmentError
  ) {
    console.error(
      "Appointment insert failed:",
      appointmentError
    );

    const classified =
      classifyCreateError(
        appointmentError
          .message,
        appointmentError
          .code
      );

    return apiError(
      locale,
      classified.code,
      classified.status
    );
  }

  if (telehealthSnapshot) {
    const paymentId = crypto.randomUUID();
    const { error: paymentInsertError } = await admin.from("telehealth_payments").insert({
      id: paymentId,
      appointment_id: appointmentId,
      recipient_type: telehealthSnapshot.recipientType,
      recipient_id: telehealthSnapshot.recipientId,
      stripe_account_id: telehealthSnapshot.stripeAccountId,
      amount_minor: telehealthSnapshot.priceMinor,
      currency: telehealthSnapshot.currency,
      status: "checkout_pending",
    });

    if (paymentInsertError) {
      console.error("Telehealth payment record creation failed:", paymentInsertError);
      await admin.from("appointments").update({ status: "cancelled", cancellation_reason: "Telehealth payment setup failed." }).eq("id", appointmentId);
      return stableApiError("TELEHEALTH_PAYMENT_SETUP_FAILED", "Secure payment could not be prepared.", 500);
    }

    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? request.nextUrl.origin;
      const session = await getStripe().checkout.sessions.create(
        {
          mode: "payment",
          customer_email: patientEmail,
          line_items: [{
            quantity: 1,
            price_data: {
              currency: telehealthSnapshot.currency.toLowerCase(),
              unit_amount: telehealthSnapshot.priceMinor,
              product_data: { name: "RomDoc video consultation" },
            },
          }],
          success_url: `${origin}/appointments/${appointmentId}/request-received?locale=${locale}&payment=success`,
          cancel_url: `${origin}/appointments/${appointmentId}/request-received?locale=${locale}&payment=cancelled`,
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
          metadata: {
            romdoc_flow: "telehealth",
            romdoc_appointment_id: appointmentId,
            romdoc_payment_id: paymentId,
          },
          payment_intent_data: {
            metadata: {
              romdoc_flow: "telehealth",
              romdoc_appointment_id: appointmentId,
              romdoc_payment_id: paymentId,
            },
          },
        },
        { stripeAccount: telehealthSnapshot.stripeAccountId }
      );

      const { error: sessionUpdateError } = await admin
        .from("telehealth_payments")
        .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
        .eq("id", paymentId);
      if (sessionUpdateError || !session.url) throw sessionUpdateError ?? new Error("Stripe Checkout URL missing.");

      await admin.from("telehealth_audit_events").insert([
        { appointment_id: appointmentId, doctor_id: doctorId, event_type: "consent_recorded", actor_profile_id: user.id, metadata: { consent_version: TELEHEALTH_CONSENT_VERSION } },
        { appointment_id: appointmentId, doctor_id: doctorId, event_type: "checkout_created", actor_profile_id: user.id, metadata: { payment_id: paymentId, recipient_type: telehealthSnapshot.recipientType, amount_minor: telehealthSnapshot.priceMinor, currency: telehealthSnapshot.currency } },
      ]);

      return stableApiSuccess(
        APPOINTMENT_API_CODES.appointmentCreated,
        { message: getAppointmentApiMessage(locale, APPOINTMENT_API_CODES.appointmentCreated), appointmentId, checkoutUrl: session.url, emailSent: false },
        201
      );
    } catch (checkoutError) {
      console.error("Telehealth Checkout creation failed:", checkoutError);
      await admin.from("telehealth_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", paymentId);
      await admin.from("appointments").update({ status: "cancelled", cancellation_reason: "Telehealth payment setup failed." }).eq("id", appointmentId);
      return stableApiError("TELEHEALTH_PAYMENT_SETUP_FAILED", "Secure payment could not be prepared.", 500);
    }
  }

  const emailResult =
    await sendAppointmentRequestEmail({
      appointmentId,
      locale,
      patientName,
      patientEmail,
      patientPhone,
      doctorName,
      clinicName,
      requestedDate,
      requestedTime,
      notes,
    });

  if (
    !emailResult.sent &&
    !emailResult.skipped
  ) {
    console.error(
      "Patient appointment request email failed:",
      {
        errorCode:
          emailResult.errorCode,
        errorMessage:
          emailResult.errorMessage,
      }
    );
  }

  return stableApiSuccess(
    APPOINTMENT_API_CODES
      .appointmentCreated,
    {
      message:
        getAppointmentApiMessage(
          locale,
          APPOINTMENT_API_CODES
            .appointmentCreated
        ),
      appointmentId,
      emailSent:
        emailResult.sent,
    },
    201
  );
}
