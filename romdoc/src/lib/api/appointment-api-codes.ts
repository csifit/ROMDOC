export const APPOINTMENT_API_CODES = {
  invalidJson:
    "invalid_json",
  requiredFields:
    "required_fields",
  doctorIdInvalid:
    "doctor_id_invalid",
  clinicIdInvalid:
    "clinic_id_invalid",
  patientNameInvalid:
    "patient_name_invalid",
  patientPhoneInvalid:
    "patient_phone_invalid",
  providerDataInvalid:
    "provider_data_invalid",
  appointmentDateInvalid:
    "appointment_date_invalid",
  appointmentTimeInvalid:
    "appointment_time_invalid",
  appointmentDurationInvalid:
    "appointment_duration_invalid",
  appointmentNotesTooLong:
    "appointment_notes_too_long",
  appointmentTooSoon:
    "appointment_too_soon",
  appointmentTooFar:
    "appointment_too_far",
  authenticationRequired:
    "authentication_required",
  emailConfirmationRequired:
    "email_confirmation_required",
  patientEmailMissing:
    "patient_email_missing",
  patientProfileLookupFailed:
    "patient_profile_lookup_failed",
  activePatientRequired:
    "active_patient_required",
  doctorLookupFailed:
    "doctor_lookup_failed",
  doctorUnavailable:
    "doctor_unavailable",
  clinicScopeLookupFailed:
    "clinic_scope_lookup_failed",
  doctorClinicUnavailable:
    "doctor_clinic_unavailable",
  appointmentSlotsLookupFailed:
    "appointment_slots_lookup_failed",
  appointmentSlotUnavailable:
    "appointment_slot_unavailable",
  appointmentSlotConflict:
    "appointment_slot_conflict",
  appointmentOutsideWorkingHours:
    "appointment_outside_working_hours",
  appointmentOverlapsBreak:
    "appointment_overlaps_break",
  doctorUnavailableForPeriod:
    "doctor_unavailable_for_period",
  appointmentDurationMismatch:
    "appointment_duration_mismatch",
  appointmentCreateDenied:
    "appointment_create_denied",
  appointmentCreateFailed:
    "appointment_create_failed",
  appointmentCreated:
    "appointment_created",
  appointmentRoleRequired:
    "appointment_role_required",
  appointmentIdInvalid:
    "appointment_id_invalid",
  appointmentActionInvalid:
    "appointment_action_invalid",
  appointmentScheduleRequired:
    "appointment_schedule_required",
  rescheduleReasonRequired:
    "reschedule_reason_required",
  appointmentReasonTooLong:
    "appointment_reason_too_long",
  appointmentNotFound:
    "appointment_not_found",
  appointmentActionNotPermitted:
    "appointment_action_not_permitted",
  appointmentClinicUnavailable:
    "appointment_clinic_unavailable",
  appointmentDateInPast:
    "appointment_date_in_past",
  appointmentTransitionInvalid:
    "appointment_transition_invalid",
  appointmentRescheduleSameSlot:
    "appointment_reschedule_same_slot",
  appointmentUpdateFailed:
    "appointment_update_failed",
  appointmentConfirmed:
    "appointment_confirmed",
  appointmentRescheduled:
    "appointment_rescheduled",
  appointmentCancelled:
    "appointment_cancelled",
  appointmentCompleted:
    "appointment_completed",
  appointmentNoShow:
    "appointment_no_show",
  unexpectedError:
    "unexpected_error",
} as const;

export type AppointmentApiCode =
  (typeof APPOINTMENT_API_CODES)[keyof typeof APPOINTMENT_API_CODES];

export type AppointmentApiPayload = {
  success?: boolean;
  code?: AppointmentApiCode;
  error?: string;
  message?: string;
};
