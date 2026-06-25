import type {
  PlatformOperatorRole,
} from "@/lib/auth/require-platform-operator-aal2-api";

export type PlatformOperatorCapabilities = {
  canManageManagers: boolean;
  canManageSpecialties: boolean;
  canCreateCities: boolean;
  canUpdateCities: boolean;
  canDeleteCities: boolean;
  canModerateReviews: boolean;
  canViewUsers: boolean;
  canSuspendUsers: boolean;
  canChangePrivilegedRoles: boolean;
  canManageClinics: boolean;
  canDeleteClinics: boolean;
  canManageDoctors: boolean;
  canDeleteDoctors: boolean;
  canUseSupportEndpoints: boolean;
};

export function
getPlatformOperatorCapabilities(
  role: PlatformOperatorRole
): PlatformOperatorCapabilities {
  const isAdmin =
    role === "admin";

  return {
    canManageManagers:
      isAdmin,

    canManageSpecialties:
      isAdmin,

    canCreateCities:
      isAdmin,

    canUpdateCities:
      true,

    canDeleteCities:
      isAdmin,

    canModerateReviews:
      true,

    canViewUsers:
      true,

    canSuspendUsers:
      true,

    canChangePrivilegedRoles:
      isAdmin,

    canManageClinics:
      true,

    canDeleteClinics:
      isAdmin,

    canManageDoctors:
      true,

    canDeleteDoctors:
      isAdmin,

    canUseSupportEndpoints:
      isAdmin,
  };
}
