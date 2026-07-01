import "server-only";

import {
  NextResponse,
} from "next/server";

import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import {
  getVoiceAssistantEnvironmentStatus,
} from "@/lib/ai/voice-assistant-environment";
import {
  VOICE_ASSISTANT_ALLOWED_ROLES,
  VOICE_ASSISTANT_FEATURE_KEY,
  isVoiceAssistantAllowedRole,
  isVoiceAssistantOperationalState,
  normalizeVoiceAssistantSettings,
  type VoiceAssistantAllowedRole,
  type VoiceAssistantOperationalState,
  type VoiceAssistantSettings,
} from "@/lib/ai/voice-assistant-settings";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export type VoiceAssistantCapability =
  | "voice_search"
  | "appointment_draft"
  | "appointment_confirmation";

export type VoiceAssistantAccessCode =
  | "not_authenticated"
  | "email_not_confirmed"
  | "profile_unavailable"
  | "profile_missing"
  | "account_inactive"
  | "unsupported_role"
  | "mfa_required"
  | "feature_unavailable"
  | "feature_missing"
  | "feature_disabled"
  | "invalid_configuration"
  | "standby"
  | "admin_testing_only"
  | "role_not_allowed"
  | "provider_not_supported"
  | "provider_not_configured"
  | "emergency_lock_active"
  | "capability_disabled";

type ServerSupabaseClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

type FeatureSettingRow = {
  id: string;
  feature_key: string;
  is_enabled: boolean;
  operational_state: string;
  allowed_roles: unknown;
  settings: unknown;
  maintenance_message_ro:
    string;
  maintenance_message_en:
    string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  role:
    | string
    | null;
  account_status:
    | string
    | null;
};

type VoiceAssistantAccessBase = {
  supabase:
    ServerSupabaseClient;
  userId:
    | string
    | null;
  profileId:
    | string
    | null;
  role:
    | VoiceAssistantAllowedRole
    | null;
};

export type VoiceAssistantAccessGranted =
  VoiceAssistantAccessBase & {
    allowed: true;
    response: null;
    userId: string;
    profileId: string;
    role:
      VoiceAssistantAllowedRole;
    operationalState:
      VoiceAssistantOperationalState;
    allowedRoles:
      VoiceAssistantAllowedRole[];
    settings:
      VoiceAssistantSettings;
    featureUpdatedAt: string;
  };

export type VoiceAssistantAccessDenied =
  VoiceAssistantAccessBase & {
    allowed: false;
    response:
      NextResponse;
    code:
      VoiceAssistantAccessCode;
  };

export type VoiceAssistantAccessResult =
  | VoiceAssistantAccessGranted
  | VoiceAssistantAccessDenied;

export type RequireVoiceAssistantAccessOptions = {
  capability?:
    VoiceAssistantCapability;
};

type DenyOptions =
  VoiceAssistantAccessBase & {
    code:
      VoiceAssistantAccessCode;
    status: number;
    message: string;
    maintenanceMessageRo?:
      string;
    maintenanceMessageEn?:
      string;
  };

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
    Pragma:
      "no-cache",
    Vary:
      "Cookie",
  };
}

function deny({
  supabase,
  userId,
  profileId,
  role,
  code,
  status,
  message,
  maintenanceMessageRo,
  maintenanceMessageEn,
}: DenyOptions):
  VoiceAssistantAccessDenied {
  return {
    allowed:
      false,
    supabase,
    userId,
    profileId,
    role,
    code,
    response:
      NextResponse.json(
        {
          available:
            false,
          code,
          message,
          maintenanceMessage: {
            ro:
              maintenanceMessageRo ??
              message,
            en:
              maintenanceMessageEn ??
              "The voice assistant is not available.",
          },
        },
        {
          status,
          headers:
            noStoreHeaders(),
        }
      ),
  };
}

function normalizeProfileRole(
  value:
    | string
    | null
):
  | VoiceAssistantAllowedRole
  | null {
  /*
   * Some older patient rows may still use "user".
   * For voice-access decisions they are treated as patients.
   */
  if (
    value ===
    "user"
  ) {
    return "patient";
  }

  return isVoiceAssistantAllowedRole(
    value
  )
    ? value
    : null;
}

function parseAllowedRoles(
  value: unknown
):
  | VoiceAssistantAllowedRole[]
  | null {
  if (
    !Array.isArray(value) ||
    value.length ===
      0
  ) {
    return null;
  }

  if (
    !value.every(
      isVoiceAssistantAllowedRole
    )
  ) {
    return null;
  }

  return Array.from(
    new Set(value)
  );
}

function hasValidSettingsShape(
  value: unknown
) {
  if (!isRecord(value)) {
    return false;
  }

  const positiveInteger = (
    item: unknown,
    maximum: number
  ) =>
    typeof item ===
      "number" &&
    Number.isInteger(item) &&
    item >= 1 &&
    item <= maximum;

  return (
    typeof value.provider ===
      "string" &&
    value.provider.trim()
      .length > 0 &&
    typeof value
      .voice_search_enabled ===
      "boolean" &&
    typeof value
      .appointment_draft_enabled ===
      "boolean" &&
    typeof value
      .appointment_confirmation_enabled ===
      "boolean" &&
    positiveInteger(
      value
        .maximum_session_minutes,
      60
    ) &&
    positiveInteger(
      value
        .maximum_sessions_per_user_per_day,
      100
    ) &&
    positiveInteger(
      value
        .maximum_platform_minutes_per_day,
      100000
    ) &&
    typeof value
      .automatic_pause_after_daily_limit ===
      "boolean"
  );
}

function capabilityEnabled(
  capability:
    VoiceAssistantCapability,
  settings:
    VoiceAssistantSettings
) {
  switch (capability) {
    case "voice_search":
      return settings
        .voiceSearchEnabled;

    case "appointment_draft":
      return settings
        .appointmentDraftEnabled;

    case "appointment_confirmation":
      return settings
        .appointmentConfirmationEnabled;
  }
}

async function operatorHasRequiredMfa(
  supabase:
    ServerSupabaseClient,
  role:
    VoiceAssistantAllowedRole
) {
  if (
    role !==
      "admin" &&
    role !==
      "manager"
  ) {
    return true;
  }

  const trustedIp =
    role ===
    "admin"
      ? await isTrustedAdminMfaIp()
      : false;

  if (trustedIp) {
    return true;
  }

  const {
    data,
    error,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  return (
    !error &&
    data?.currentLevel ===
      "aal2"
  );
}

export async function
requireVoiceAssistantAccess(
  options:
    RequireVoiceAssistantAccessOptions =
      {}
): Promise<
  VoiceAssistantAccessResult
> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return deny({
      supabase,
      userId:
        null,
      profileId:
        null,
      role:
        null,
      code:
        "not_authenticated",
      status:
        401,
      message:
        "Trebuie să fii autentificat pentru a folosi asistentul vocal.",
    });
  }

  if (
    !user.email_confirmed_at
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        null,
      role:
        null,
      code:
        "email_not_confirmed",
      status:
        403,
      message:
        "Confirmă adresa de e-mail înainte de a folosi asistentul vocal.",
    });
  }

  const {
    data: profileData,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Voice assistant profile lookup failed:",
      profileError
    );

    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        null,
      role:
        null,
      code:
        "profile_unavailable",
      status:
        503,
      message:
        "Contul nu a putut fi verificat momentan.",
    });
  }

  const profile =
    profileData as
      | ProfileRow
      | null;

  if (!profile) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        null,
      role:
        null,
      code:
        "profile_missing",
      status:
        403,
      message:
        "Profilul contului nu este disponibil.",
    });
  }

  const role =
    normalizeProfileRole(
      profile.role
    );

  if (!role) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role:
        null,
      code:
        "unsupported_role",
      status:
        403,
      message:
        "Tipul acestui cont nu este eligibil pentru asistentul vocal.",
    });
  }

  if (
    profile.account_status !==
    "active"
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "account_inactive",
      status:
        403,
      message:
        "Contul trebuie să fie activ pentru a folosi asistentul vocal.",
    });
  }

  const mfaSatisfied =
    await operatorHasRequiredMfa(
      supabase,
      role
    );

  if (!mfaSatisfied) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "mfa_required",
      status:
        403,
      message:
        "Este necesară verificarea Google Authenticator pentru acest cont.",
    });
  }

  const admin =
    createAdminClient();

  const {
    data: featureData,
    error: featureError,
  } =
    await admin
      .from(
        "platform_feature_settings"
      )
      .select(`
        id,
        feature_key,
        is_enabled,
        operational_state,
        allowed_roles,
        settings,
        maintenance_message_ro,
        maintenance_message_en,
        updated_at
      `)
      .eq(
        "feature_key",
        VOICE_ASSISTANT_FEATURE_KEY
      )
      .maybeSingle();

  if (featureError) {
    console.error(
      "Voice assistant feature lookup failed:",
      featureError
    );

    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "feature_unavailable",
      status:
        503,
      message:
        "Asistentul vocal nu poate fi verificat momentan.",
    });
  }

  const feature =
    featureData as
      | FeatureSettingRow
      | null;

  if (!feature) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "feature_missing",
      status:
        503,
      message:
        "Configurarea asistentului vocal nu este disponibilă.",
    });
  }

  const maintenance = {
    ro:
      feature
        .maintenance_message_ro,
    en:
      feature
        .maintenance_message_en,
  };

  const operationalState =
    isVoiceAssistantOperationalState(
      feature
        .operational_state
    )
      ? feature
          .operational_state
      : null;

  const allowedRoles =
    parseAllowedRoles(
      feature.allowed_roles
    );

  if (
    !operationalState ||
    !allowedRoles ||
    !hasValidSettingsShape(
      feature.settings
    )
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "invalid_configuration",
      status:
        503,
      message:
        "Configurarea asistentului vocal este invalidă și a fost blocată automat.",
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    !feature.is_enabled
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "feature_disabled",
      status:
        503,
      message:
        maintenance.ro,
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    operationalState ===
    "standby"
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "standby",
      status:
        503,
      message:
        maintenance.ro,
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    operationalState ===
      "admin_testing" &&
    role !==
      "admin"
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "admin_testing_only",
      status:
        403,
      message:
        "Asistentul vocal este disponibil momentan numai pentru testare administrativă.",
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    !allowedRoles.includes(
      role
    )
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "role_not_allowed",
      status:
        403,
      message:
        "Asistentul vocal nu este disponibil pentru rolul acestui cont.",
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  const settings =
    normalizeVoiceAssistantSettings(
      feature.settings
    );

  if (
    settings.provider
      .trim()
      .toLowerCase() !==
    "openai"
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "provider_not_supported",
      status:
        503,
      message:
        "Furnizorul configurat pentru asistentul vocal nu este acceptat.",
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  const environment =
    getVoiceAssistantEnvironmentStatus();

  if (
    !environment
      .providerConfigured
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "provider_not_configured",
      status:
        503,
      message:
        maintenance.ro,
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    environment
      .emergencyLockActive
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "emergency_lock_active",
      status:
        503,
      message:
        maintenance.ro,
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  if (
    options.capability &&
    !capabilityEnabled(
      options.capability,
      settings
    )
  ) {
    return deny({
      supabase,
      userId:
        user.id,
      profileId:
        profile.id,
      role,
      code:
        "capability_disabled",
      status:
        403,
      message:
        "Această funcție a asistentului vocal nu este activată.",
      maintenanceMessageRo:
        maintenance.ro,
      maintenanceMessageEn:
        maintenance.en,
    });
  }

  return {
    allowed:
      true,
    response:
      null,
    supabase,
    userId:
      user.id,
    profileId:
      profile.id,
    role,
    operationalState,
    allowedRoles,
    settings,
    featureUpdatedAt:
      feature.updated_at,
  };
}

export function
getVoiceAssistantAllowedRoleValues() {
  return [
    ...VOICE_ASSISTANT_ALLOWED_ROLES,
  ];
}
