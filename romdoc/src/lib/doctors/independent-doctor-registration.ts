export const INDEPENDENT_DOCTOR_ACCOUNT_TYPE =
  "independent" as const;

export const INDEPENDENT_DOCTOR_REGISTRATION_SOURCE =
  "public_independent_registration" as const;

export type IndependentDoctorAccountType =
  typeof INDEPENDENT_DOCTOR_ACCOUNT_TYPE;

export function getIndependentDoctorRegistrationMetadata() {
  return {
    doctor_account_type:
      INDEPENDENT_DOCTOR_ACCOUNT_TYPE,

    registration_source:
      INDEPENDENT_DOCTOR_REGISTRATION_SOURCE,
  };
}
