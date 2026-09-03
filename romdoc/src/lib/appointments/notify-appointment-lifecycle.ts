import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  getNotificationEntityFallback,
  resolveAppointmentNotificationLocale,
  selectNotificationTranslation,
  type AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";
import {
  sendAppointmentSms,
} from "@/lib/appointments/send-appointment-sms";
import {
  sendAppointmentStatusEmail,
  type PatientNotificationStatus,
} from "@/lib/appointments/send-appointment-status-email";

type LifecycleNotificationInput = {
  appointmentId: string;
  status: PatientNotificationStatus;
  triggeredByProfileId: string | null;
};

type DeliveryResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type AppointmentRow = {
  id: string;
  patient_profile_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  notification_locale:
    string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  requested_date: string | null;
  requested_time: string | null;
  reschedule_reason: string | null;
  consultation_mode: string;
  telehealth_public_reference: string | null;
  doctors:
    | {
        id: string;
        slug: string;
        profile_id: string;
        doctor_translations:
          | {
              locale: string;
              title: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        slug: string;
        profile_id: string;
        doctor_translations:
          | {
              locale: string;
              title: string | null;
            }[]
          | null;
      }[]
    | null;
  clinics:
    | {
        slug: string;
        clinic_translations:
          | {
              locale: string;
              name: string | null;
            }[]
          | null;
      }
    | {
        slug: string;
        clinic_translations:
          | {
              locale: string;
              name: string | null;
            }[]
          | null;
      }[]
    | null;
};

type AuditEventRow = {
  id: string;
  event_type: string;
  created_at: string;
};

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
) {
  return Array.isArray(
    value
  )
    ? value[0] ??
        null
    : value;
}

function formatNameFromSlug(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getDoctorName(
  appointment: AppointmentRow,
  locale:
    AppointmentNotificationLocale
) {
  const doctor =
    firstRelation(
      appointment.doctors
    );

  const translation =
    selectNotificationTranslation(
      doctor
        ?.doctor_translations,
      locale
    );

  return (
    translation?.title ??
    (
      doctor
        ? formatNameFromSlug(
            doctor.slug
          )
        : getNotificationEntityFallback(
            locale,
            "doctor"
          )
    )
  );
}

function getClinicName(
  appointment: AppointmentRow,
  locale:
    AppointmentNotificationLocale
) {
  const clinic =
    firstRelation(
      appointment.clinics
    );

  const translation =
    selectNotificationTranslation(
      clinic
        ?.clinic_translations,
      locale
    );

  return (
    translation?.name ??
    (
      clinic
        ? formatNameFromSlug(
            clinic.slug
          )
        : getNotificationEntityFallback(
            locale,
            "clinic"
          )
    )
  );
}

function getDashboardContent(
  status: PatientNotificationStatus
) {
  switch (
    status
  ) {
    case "confirmed":
      return {
        title:
          "Programare confirmată",
        body:
          "Programarea a fost confirmată.",
      };

    case "rescheduled":
      return {
        title:
          "Programare reprogramată",
        body:
          "Data sau ora programării a fost modificată.",
      };

    case "cancelled":
      return {
        title:
          "Programare anulată",
        body:
          "Programarea a fost anulată.",
      };

    case "completed":
      return {
        title:
          "Consultație finalizată",
        body:
          "Programarea a fost marcată ca finalizată.",
      };

    case "no_show":
      return {
        title:
          "Neprezentare înregistrată",
        body:
          "Programarea a fost marcată ca neprezentare.",
      };
  }
}

function resultStatus(
  result: DeliveryResult
) {
  if (
    result.sent
  ) {
    return "sent";
  }

  if (
    result.skipped
  ) {
    return "skipped";
  }

  return "failed";
}

async function insertDeliveryAttempt({
  appointmentId,
  auditEventId,
  recipientProfileId,
  channel,
  notificationType,
  recipientEmail = null,
  recipientPhone = null,
  provider,
  result,
  triggeredByProfileId,
  idempotencyKey,
}: {
  appointmentId: string;
  auditEventId: string | null;
  recipientProfileId: string | null;
  channel:
    | "email"
    | "sms";
  notificationType: PatientNotificationStatus;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  provider: string;
  result: DeliveryResult;
  triggeredByProfileId: string | null;
  idempotencyKey: string;
}) {
  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from(
      "appointment_notification_deliveries"
    )
    .insert({
      appointment_id:
        appointmentId,
      audit_event_id:
        auditEventId,
      recipient_profile_id:
        recipientProfileId,
      notification_type:
        notificationType,
      channel,
      recipient_email:
        recipientEmail,
      recipient_phone:
        recipientPhone,
      delivery_status:
        resultStatus(
          result
        ),
      provider,
      provider_message_id:
        result.providerMessageId,
      error_code:
        result.errorCode,
      error_message:
        result.errorMessage
          ?.slice(
            0,
            2000
          ) ??
        null,
      triggered_by_profile_id:
        triggeredByProfileId,
      idempotency_key:
        idempotencyKey,
    });

  if (
    error?.code ===
    "23505"
  ) {
    return {
      logged:
        false,
      duplicate:
        true,
    };
  }

  if (error) {
    console.error(
      "Appointment notification delivery insert failed:",
      error
    );

    return {
      logged:
        false,
      duplicate:
        false,
    };
  }

  return {
    logged:
      true,
    duplicate:
      false,
  };
}

async function alreadyAttempted(
  idempotencyKey: string
) {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "appointment_notification_deliveries"
    )
    .select("id")
    .eq(
      "idempotency_key",
      idempotencyKey
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Appointment notification idempotency lookup failed:",
      error
    );
  }

  return Boolean(
    data
  );
}

export async function notifyAppointmentLifecycle({
  appointmentId,
  status,
  triggeredByProfileId,
}: LifecycleNotificationInput) {
  const admin =
    createAdminClient();

  const {
    data:
      appointmentData,
    error:
      appointmentError,
  } = await admin
    .from(
      "appointments"
    )
    .select(`
      id,
      patient_profile_id,
      patient_name,
      patient_email,
      patient_phone,
      notification_locale,
      scheduled_date,
      scheduled_time,
      requested_date,
      requested_time,
      reschedule_reason,
      consultation_mode,
      telehealth_public_reference,
      doctors (
        id,
        slug,
        profile_id,
        doctor_translations (
          locale,
          title
        )
      ),
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (
    appointmentError ||
    !appointmentData
  ) {
    console.error(
      "Appointment notification lookup failed:",
      appointmentError
    );

    return {
      dashboardCreated:
        false,
      emailSent:
        null,
      smsSent:
        null,
      smsSkipped:
        null,
    };
  }

  const appointment =
    appointmentData as unknown as
      AppointmentRow;

  const notificationLocale =
    resolveAppointmentNotificationLocale(
      appointment
        .notification_locale
    );

  const doctor =
    firstRelation(
      appointment.doctors
    );

  const {
    data:
      auditEventData,
    error:
      auditEventError,
  } = await admin
    .from(
      "appointment_audit_events"
    )
    .select(
      "id, event_type, created_at"
    )
    .eq(
      "appointment_id",
      appointmentId
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (
    auditEventError
  ) {
    console.error(
      "Appointment notification audit-event lookup failed:",
      auditEventError
    );
  }

  const auditEvent =
    auditEventData as
      AuditEventRow | null;

  const eventKey =
    auditEvent?.id ??
    `${appointmentId}:${status}`;

  const dashboardContent =
    getDashboardContent(
      status
    );

  const dashboardRecipients =
    [
      appointment.patient_profile_id,
      doctor?.profile_id ??
        null,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value
        ) &&
        value !==
          triggeredByProfileId
    );

  let dashboardCreated =
    false;

  for (
    const recipientProfileId of
    dashboardRecipients
  ) {
    const {
      error,
    } = await admin
      .from(
        "dashboard_notifications"
      )
      .upsert(
        {
          recipient_profile_id:
            recipientProfileId,
          appointment_id:
            appointmentId,
          audit_event_id:
            auditEvent?.id ??
            null,
          notification_type:
            status,
          title:
            dashboardContent.title,
          body:
            dashboardContent.body,
          href:
            `/appointments/${appointmentId}/messages`,
        },
        {
          onConflict:
            "audit_event_id,recipient_profile_id,notification_type",
          ignoreDuplicates:
            true,
        }
      );

    if (error) {
      console.error(
        "Dashboard notification insert failed:",
        error
      );
    } else {
      dashboardCreated =
        true;
    }
  }

  const emailIdempotencyKey =
    `${eventKey}:email:${appointment.patient_email}`;

  let emailSent:
    boolean | null =
      null;

  if (
    !(
      await alreadyAttempted(
        emailIdempotencyKey
      )
    )
  ) {
    const emailResult =
      await sendAppointmentStatusEmail({
        appointmentId,
        locale:
          notificationLocale,
        status,
        patientName:
          appointment.patient_name,
        patientEmail:
          appointment.patient_email,
        doctorName:
          getDoctorName(
            appointment,
            notificationLocale
          ),
        clinicName:
          getClinicName(
            appointment,
            notificationLocale
          ),
        scheduledDate:
          appointment.scheduled_date ??
          appointment.requested_date,
        scheduledTime:
          appointment.scheduled_time ??
          appointment.requested_time,
        rescheduleReason:
          status ===
          "rescheduled"
            ? appointment.reschedule_reason
            : null,
        consultationMode:
          appointment.consultation_mode,
        telehealthReference:
          appointment.telehealth_public_reference,
      });

    emailSent =
      emailResult.sent;

    await insertDeliveryAttempt({
      appointmentId,
      auditEventId:
        auditEvent?.id ??
        null,
      recipientProfileId:
        appointment.patient_profile_id,
      channel:
        "email",
      notificationType:
        status,
      recipientEmail:
        appointment.patient_email,
      provider:
        "resend",
      result:
        emailResult,
      triggeredByProfileId,
      idempotencyKey:
        emailIdempotencyKey,
    });
  }

  let smsSent:
    boolean | null =
      null;

  let smsSkipped:
    boolean | null =
      null;

  if (
    status ===
    "confirmed"
  ) {
    const smsIdempotencyKey =
      `${eventKey}:sms:${appointment.patient_phone}`;

    if (
      !(
        await alreadyAttempted(
          smsIdempotencyKey
        )
      )
    ) {
      const smsResult =
        await sendAppointmentSms({
          appointmentId,
          event:
            "confirmed",
          triggeredByProfileId,
        });

      smsSent =
        smsResult.sent;

      smsSkipped =
        smsResult.skipped;

      await insertDeliveryAttempt({
        appointmentId,
        auditEventId:
          auditEvent?.id ??
          null,
        recipientProfileId:
          appointment.patient_profile_id,
        channel:
          "sms",
        notificationType:
          status,
        recipientPhone:
          appointment.patient_phone,
        provider:
          "smslink",
        result:
          smsResult,
        triggeredByProfileId,
        idempotencyKey:
          smsIdempotencyKey,
      });
    }
  }

  return {
    dashboardCreated,
    emailSent,
    smsSent,
    smsSkipped,
  };
}
