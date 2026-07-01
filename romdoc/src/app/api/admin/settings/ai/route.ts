import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  getVoiceAssistantEnvironmentStatus,
} from "@/lib/ai/voice-assistant-environment";
import {
  VOICE_ASSISTANT_FEATURE_KEY,
  isVoiceAssistantAllowedRole,
  isVoiceAssistantOperationalState,
  normalizeAllowedRoles,
  type VoiceAssistantAllowedRole,
  type VoiceAssistantOperationalState,
} from "@/lib/ai/voice-assistant-settings";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type FeatureSettingRow = {
  id: string;
  is_enabled: boolean;
  operational_state: string;
  allowed_roles: unknown;
  updated_at: string;
};

type UpdateBody = {
  isEnabled?: unknown;
  operationalState?: unknown;
  allowedRoles?: unknown;
  changeReason?: unknown;
  expectedUpdatedAt?: unknown;
};

function noStoreJson(
  body:
    Record<
      string,
      unknown
    >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

function normalizeRoleArray(
  value: unknown
):
  | VoiceAssistantAllowedRole[]
  | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const roles =
    value.filter(
      isVoiceAssistantAllowedRole
    );

  if (
    roles.length !==
    value.length
  ) {
    return null;
  }

  return Array.from(
    new Set(roles)
  );
}

function sameRoles(
  first:
    VoiceAssistantAllowedRole[],
  second:
    VoiceAssistantAllowedRole[]
) {
  return JSON.stringify(
    [
      ...first,
    ].sort()
  ) ===
    JSON.stringify(
      [
        ...second,
      ].sort()
    );
}

async function authorizeAdministrator() {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (
    authorization.response
  ) {
    return {
      authorization,
      response:
        authorization.response,
    };
  }

  const capabilityResponse =
    requireAdministratorCapability(
      authorization.role,
      "Numai administratorii pot modifica setările AI."
    );

  return {
    authorization,
    response:
      capabilityResponse,
  };
}

export async function GET() {
  const {
    response,
  } =
    await authorizeAdministrator();

  if (response) {
    return response;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "platform_feature_settings"
      )
      .select(`
        id,
        is_enabled,
        operational_state,
        allowed_roles,
        updated_at
      `)
      .eq(
        "feature_key",
        VOICE_ASSISTANT_FEATURE_KEY
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    console.error(
      "AI settings GET failed:",
      error
    );

    return noStoreJson(
      {
        error:
          "Configurarea AI nu a putut fi încărcată.",
      },
      500
    );
  }

  const row =
    data as
      FeatureSettingRow;

  const state =
    isVoiceAssistantOperationalState(
      row.operational_state
    )
      ? row.operational_state
      : "standby";

  const roles =
    normalizeAllowedRoles(
      row.allowed_roles
    );

  const environment =
    getVoiceAssistantEnvironmentStatus();

  const hasProvider =
    environment
      .providerConfigured;

  const emergencyLocked =
    environment
      .emergencyLockActive;

  return noStoreJson({
    feature: {
      isEnabled:
        row.is_enabled,
      operationalState:
        state,
      allowedRoles:
        roles,
      updatedAt:
        row.updated_at,
    },
    providerConfigured:
      hasProvider,
    emergencyLockActive:
      emergencyLocked,
    emergencyLockState:
      environment
        .emergencyLockState,
    emergencyVariableConfigured:
      environment
        .emergencyVariableConfigured,
    deploymentEnvironment:
      environment
        .deploymentEnvironment,
    publicAvailable:
      row.is_enabled &&
      state !==
        "standby" &&
      hasProvider &&
      !emergencyLocked,
  });
}

export async function PATCH(
  request: NextRequest
) {
  const {
    authorization,
    response,
  } =
    await authorizeAdministrator();

  if (response) {
    return response;
  }

  if (
    !authorization.profileId ||
    authorization.role !==
      "admin"
  ) {
    return noStoreJson(
      {
        error:
          "Numai administratorii pot modifica setările AI.",
      },
      403
    );
  }

  let body:
    UpdateBody;

  try {
    body =
      (await request
        .json()) as
        UpdateBody;
  } catch {
    return noStoreJson(
      {
        error:
          "Corpul cererii nu este JSON valid.",
      },
      400
    );
  }

  if (
    typeof body.isEnabled !==
    "boolean"
  ) {
    return noStoreJson(
      {
        error:
          "Valoarea comutatorului principal este invalidă.",
      },
      400
    );
  }

  if (
    !isVoiceAssistantOperationalState(
      body.operationalState
    )
  ) {
    return noStoreJson(
      {
        error:
          "Starea operațională este invalidă.",
      },
      400
    );
  }

  const operationalState =
    body
      .operationalState as
      VoiceAssistantOperationalState;

  const allowedRoles =
    normalizeRoleArray(
      body.allowedRoles
    );

  if (
    !allowedRoles ||
    allowedRoles.length ===
      0
  ) {
    return noStoreJson(
      {
        error:
          "Selectează cel puțin un rol permis.",
      },
      400
    );
  }

  const changeReason =
    typeof body.changeReason ===
      "string"
      ? body.changeReason
          .trim()
          .slice(
            0,
            1000
          )
      : "";

  if (
    changeReason.length < 3
  ) {
    return noStoreJson(
      {
        error:
          "Introdu un motiv al modificării de cel puțin 3 caractere.",
      },
      400
    );
  }

  const expectedUpdatedAt =
    typeof body.expectedUpdatedAt ===
      "string"
      ? body.expectedUpdatedAt
          .trim()
      : "";

  if (!expectedUpdatedAt) {
    return noStoreJson(
      {
        error:
          "Versiunea configurației lipsește. Reîncarcă pagina.",
      },
      400
    );
  }

  if (
    operationalState ===
      "standby" &&
    body.isEnabled
  ) {
    return noStoreJson(
      {
        error:
          "Serviciul nu poate fi activat cât timp starea este „În așteptare”.",
        code:
          "standby_cannot_be_enabled",
      },
      409
    );
  }

  if (
    operationalState ===
      "admin_testing" &&
    !allowedRoles.includes(
      "admin"
    )
  ) {
    return noStoreJson(
      {
        error:
          "Modul de testare administrator trebuie să includă rolul Administrator.",
        code:
          "admin_role_required",
      },
      409
    );
  }

  const environment =
    getVoiceAssistantEnvironmentStatus();

  const hasProvider =
    environment
      .providerConfigured;

  const emergencyLocked =
    environment
      .emergencyLockActive;

  if (
    body.isEnabled &&
    !hasProvider
  ) {
    return noStoreJson(
      {
        error:
          "Serviciul nu poate fi activat deoarece OPENAI_API_KEY nu este configurată.",
        code:
          "provider_not_configured",
      },
      409
    );
  }

  if (
    body.isEnabled &&
    emergencyLocked
  ) {
    return noStoreJson(
      {
        error:
          "Serviciul nu poate fi activat cât timp blocarea de urgență este activă.",
        code:
          "emergency_lock_active",
      },
      409
    );
  }

  const admin =
    createAdminClient();

  const {
    data: currentData,
    error:
      currentError,
  } =
    await admin
      .from(
        "platform_feature_settings"
      )
      .select(`
        id,
        is_enabled,
        operational_state,
        allowed_roles,
        updated_at
      `)
      .eq(
        "feature_key",
        VOICE_ASSISTANT_FEATURE_KEY
      )
      .maybeSingle();

  if (
    currentError ||
    !currentData
  ) {
    console.error(
      "AI settings lookup failed:",
      currentError
    );

    return noStoreJson(
      {
        error:
          "Configurarea AI nu a putut fi găsită.",
      },
      500
    );
  }

  const current =
    currentData as
      FeatureSettingRow;

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return noStoreJson(
      {
        error:
          "Configurarea a fost modificată între timp. Reîncarcă pagina înainte de a salva din nou.",
        code:
          "configuration_conflict",
      },
      409
    );
  }

  const currentState =
    isVoiceAssistantOperationalState(
      current.operational_state
    )
      ? current.operational_state
      : "standby";

  const currentRoles =
    normalizeAllowedRoles(
      current.allowed_roles
    );

  const noChanges =
    current.is_enabled ===
      body.isEnabled &&
    currentState ===
      operationalState &&
    sameRoles(
      currentRoles,
      allowedRoles
    );

  if (noChanges) {
    return noStoreJson({
      message:
        "Configurarea este deja actualizată.",
      feature: {
        isEnabled:
          current.is_enabled,
        operationalState:
          currentState,
        allowedRoles:
          currentRoles,
        updatedAt:
          current.updated_at,
      },
    });
  }

  const {
    data: updatedData,
    error: updateError,
  } =
    await admin
      .from(
        "platform_feature_settings"
      )
      .update({
        is_enabled:
          body.isEnabled,
        operational_state:
          operationalState,
        allowed_roles:
          allowedRoles,
        change_source:
          "administrator",
        updated_by_profile_id:
          authorization
            .profileId,
        last_change_reason:
          changeReason,
      })
      .eq(
        "id",
        current.id
      )
      .eq(
        "updated_at",
        expectedUpdatedAt
      )
      .select(`
        is_enabled,
        operational_state,
        allowed_roles,
        updated_at
      `)
      .maybeSingle();

  if (
    updateError ||
    !updatedData
  ) {
    console.error(
      "AI settings update failed:",
      updateError
    );

    return noStoreJson(
      {
        error:
          "Configurarea nu a putut fi salvată. Este posibil să fi fost modificată între timp.",
        code:
          "update_failed",
      },
      409
    );
  }

  const updated =
    updatedData as
      FeatureSettingRow;

  const updatedState =
    isVoiceAssistantOperationalState(
      updated.operational_state
    )
      ? updated.operational_state
      : "standby";

  return noStoreJson({
    message:
      "Configurarea AI a fost salvată și înregistrată în audit.",
    feature: {
      isEnabled:
        updated.is_enabled,
      operationalState:
        updatedState,
      allowedRoles:
        normalizeAllowedRoles(
          updated.allowed_roles
        ),
      updatedAt:
        updated.updated_at,
    },
  });
}
