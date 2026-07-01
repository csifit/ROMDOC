import {
  redirect,
} from "next/navigation";

import AiFeatureStatus, {
  type AiFeatureAuditItem,
} from "@/components/admin/ai-feature-status";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import {
  VOICE_ASSISTANT_FEATURE_KEY,
  normalizeAllowedRoles,
  normalizeOperationalState,
  normalizeVoiceAssistantSettings,
} from "@/lib/ai/voice-assistant-settings";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type FeatureSettingRow = {
  id: string;
  feature_key: string;
  display_name: string;
  description:
    | string
    | null;
  is_enabled: boolean;
  operational_state: string;
  allowed_roles: unknown;
  settings: unknown;
  maintenance_message_ro:
    string;
  maintenance_message_en:
    string;
  updated_by_profile_id:
    | string
    | null;
  last_change_reason:
    | string
    | null;
  created_at: string;
  updated_at: string;
};

type FeatureAuditRow = {
  id: string;
  event_type: string;
  changed_fields:
    | string[]
    | null;
  actor_type:
    | "system"
    | "administrator";
  actor_profile_id:
    | string
    | null;
  reason:
    | string
    | null;
  created_at: string;
};

type ActorProfileRow = {
  id: string;
  first_name:
    | string
    | null;
  last_name:
    | string
    | null;
};

function actorName(
  profile:
    | ActorProfileRow
    | undefined,
  actorType:
    | "system"
    | "administrator"
) {
  if (
    actorType ===
    "system"
  ) {
    return "Sistem RomDoc";
  }

  if (!profile) {
    return "Administrator RomDoc";
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName ||
    "Administrator RomDoc";
}

export default async function AdminAiSettingsPage() {
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
    redirect(
      "/login?next=/admin/settings/ai"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/admin");
  }

  const trustedIp =
    await isTrustedAdminMfaIp();

  if (!trustedIp) {
    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin/settings/ai",
      });

    if (mfaRedirect) {
      redirect(
        mfaRedirect
      );
    }
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
        display_name,
        description,
        is_enabled,
        operational_state,
        allowed_roles,
        settings,
        maintenance_message_ro,
        maintenance_message_en,
        updated_by_profile_id,
        last_change_reason,
        created_at,
        updated_at
      `)
      .eq(
        "feature_key",
        VOICE_ASSISTANT_FEATURE_KEY
      )
      .maybeSingle();

  const feature =
    featureData as
      | FeatureSettingRow
      | null;

  if (
    featureError ||
    !feature
  ) {
    console.error(
      "Admin AI feature query failed:",
      featureError
    );

    return (
      <main className="space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
            Administrare
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            Asistent AI
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Verifică starea infrastructurii pregătite
            pentru viitorul asistent vocal RomDoc.
          </p>
        </header>

        <AiFeatureStatus
          databaseReady={
            false
          }
          featureName="Voice Appointment Assistant"
          description={
            null
          }
          enabled={
            false
          }
          operationalState="standby"
          allowedRoles={[
            "patient",
          ]}
          settings={
            normalizeVoiceAssistantSettings(
              null
            )
          }
          maintenanceMessageRo=""
          maintenanceMessageEn=""
          updatedAt={
            null
          }
          updatedByLabel={
            null
          }
          lastChangeReason={
            null
          }
          providerConfigured={
            false
          }
          emergencyLockActive
          publicAvailable={
            false
          }
          auditEvents={[]}
        />
      </main>
    );
  }

  const {
    data: auditData,
    error: auditError,
  } =
    await admin
      .from(
        "platform_feature_setting_audit_events"
      )
      .select(`
        id,
        event_type,
        changed_fields,
        actor_type,
        actor_profile_id,
        reason,
        created_at
      `)
      .eq(
        "feature_setting_id",
        feature.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(10);

  if (auditError) {
    console.error(
      "Admin AI audit query failed:",
      auditError
    );
  }

  const auditRows =
    (auditData ??
      []) as
      FeatureAuditRow[];

  const actorIds =
    Array.from(
      new Set(
        [
          feature
            .updated_by_profile_id,
          ...auditRows.map(
            (event) =>
              event
                .actor_profile_id
          ),
        ].filter(
          (
            value
          ): value is string =>
            typeof value ===
              "string" &&
            value.length > 0
        )
      )
    );

  let actorProfiles:
    ActorProfileRow[] = [];

  if (actorIds.length > 0) {
    const {
      data: profileData,
      error:
        actorProfileError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name
        `)
        .in(
          "id",
          actorIds
        );

    if (actorProfileError) {
      console.error(
        "Admin AI actor query failed:",
        actorProfileError
      );
    } else {
      actorProfiles =
        (profileData ??
          []) as
          ActorProfileRow[];
    }
  }

  const profileMap =
    new Map(
      actorProfiles.map(
        (actor) => [
          actor.id,
          actor,
        ]
      )
    );

  const settings =
    normalizeVoiceAssistantSettings(
      feature.settings
    );

  const operationalState =
    normalizeOperationalState(
      feature
        .operational_state
    );

  const allowedRoles =
    normalizeAllowedRoles(
      feature.allowed_roles
    );

  const providerConfigured =
    Boolean(
      process.env.OPENAI_API_KEY
        ?.trim()
    );

  const emergencyValue =
    process.env
      .VOICE_ASSISTANT_EMERGENCY_DISABLED
      ?.trim()
      .toLowerCase();

  const emergencyLockActive =
    emergencyValue !==
    "false";

  const publicAvailable =
    feature.is_enabled &&
    operationalState !==
      "standby" &&
    providerConfigured &&
    !emergencyLockActive;

  const auditEvents:
    AiFeatureAuditItem[] =
    auditRows.map(
      (event) => ({
        id:
          event.id,
        eventType:
          event.event_type,
        changedFields:
          event.changed_fields ??
          [],
        actorLabel:
          actorName(
            event.actor_profile_id
              ? profileMap.get(
                  event
                    .actor_profile_id
                )
              : undefined,
            event.actor_type
          ),
        actorType:
          event.actor_type,
        reason:
          event.reason,
        createdAt:
          event.created_at,
      })
    );

  const updatedByLabel =
    feature
      .updated_by_profile_id
      ? actorName(
          profileMap.get(
            feature
              .updated_by_profile_id
          ),
          "administrator"
        )
      : "Sistem RomDoc";

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
          Asistent AI
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Verifică starea serviciului, protecțiile de
          cost, rolurile permise și istoricul modificărilor.
          Asistentul rămâne în așteptare și nu efectuează
          solicitări către OpenAI.
        </p>
      </header>

      <AiFeatureStatus
        databaseReady
        featureName={
          feature.display_name
        }
        description={
          feature.description
        }
        enabled={
          feature.is_enabled
        }
        operationalState={
          operationalState
        }
        allowedRoles={
          allowedRoles
        }
        settings={
          settings
        }
        maintenanceMessageRo={
          feature
            .maintenance_message_ro
        }
        maintenanceMessageEn={
          feature
            .maintenance_message_en
        }
        updatedAt={
          feature.updated_at
        }
        updatedByLabel={
          updatedByLabel
        }
        lastChangeReason={
          feature
            .last_change_reason
        }
        providerConfigured={
          providerConfigured
        }
        emergencyLockActive={
          emergencyLockActive
        }
        publicAvailable={
          publicAvailable
        }
        auditEvents={
          auditEvents
        }
      />
    </main>
  );
}
