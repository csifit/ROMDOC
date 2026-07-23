export const CLINIC_ORGANIZATION_API_CODES = {
  invalidJson:
    "invalid_json",
  authenticationRequired:
    "authentication_required",
  clinicManagerRequired:
    "clinic_manager_required",
  activeManagerRequired:
    "active_manager_required",
  organizationRequired:
    "organization_required",
  organizationAccessDenied:
    "organization_access_denied",
  organizationNotFound:
    "organization_not_found",
  organizationNotActive:
    "organization_not_active",
  doctorEmailInvalid:
    "doctor_email_invalid",
  invitationCheckFailed:
    "invitation_check_failed",
  invitationAlreadyExists:
    "invitation_already_exists",
  invitationCreateFailed:
    "invitation_create_failed",
  invitationSent:
    "invitation_sent",
  invitationCreatedEmailFailed:
    "invitation_created_email_failed",
  locationNameRequired:
    "location_name_required",
  locationAddressRequired:
    "location_address_required",
  locationEmailInvalid:
    "location_email_invalid",
  locationWebsiteInvalid:
    "location_website_invalid",
  locationAddressVerificationFailed:
    "location_address_verification_failed",
  locationCityResolutionFailed:
    "location_city_resolution_failed",
  clinicLookupFailed:
    "clinic_lookup_failed",
  locationCreateFailed:
    "location_create_failed",
  locationTranslationFailed:
    "location_translation_failed",
  organizationLocationLookupFailed:
    "organization_location_lookup_failed",
  organizationLocationAlreadyActive:
    "organization_location_already_active",
  organizationLocationAlreadyPending:
    "organization_location_already_pending",
  organizationLocationCreateFailed:
    "organization_location_create_failed",
  organizationLocationSubmitted:
    "organization_location_submitted",
  relationshipRequired:
    "relationship_required",
  clinicRequired:
    "clinic_required",
  doctorRelationshipNotFound:
    "doctor_relationship_not_found",
  approvedLocationRequired:
    "approved_location_required",
  doctorLocationUpdateFailed:
    "doctor_location_update_failed",
  organizationLocationsLookupFailed:
    "organization_locations_lookup_failed",
  doctorLocationCleanupFailed:
    "doctor_location_cleanup_failed",
  doctorLocationSyncFailed:
    "doctor_location_sync_failed",
  doctorLocationAssigned:
    "doctor_location_assigned",
  doctorLocationPrepared:
    "doctor_location_prepared",
} as const;

export type ClinicOrganizationApiCode =
  (typeof CLINIC_ORGANIZATION_API_CODES)[keyof typeof CLINIC_ORGANIZATION_API_CODES];

export type ClinicOrganizationApiPayload = {
  success?: boolean;
  code?: ClinicOrganizationApiCode;
  error?: string;
  message?: string;
};
