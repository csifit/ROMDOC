export const CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE =
  "clinic_invited" as const;

export const CLINIC_INVITED_DOCTOR_REGISTRATION_SOURCE =
  "clinic_invitation" as const;

export type ClinicInvitedDoctorAccountType =
  typeof CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE;

export function getClinicInvitedDoctorRegistrationMetadata(
  invitationToken: string
) {
  return {
    registration_type:
      "clinic_invited_doctor",

    doctor_account_type:
      CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE,

    registration_source:
      CLINIC_INVITED_DOCTOR_REGISTRATION_SOURCE,

    clinic_invite_token:
      invitationToken,

    clinic_paid:
      true,
  };
}
