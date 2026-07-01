import {
  getOperationalStateLabel,
  getRoleLabel,
  type VoiceAssistantAllowedRole,
  type VoiceAssistantOperationalState,
  type VoiceAssistantSettings,
} from "@/lib/ai/voice-assistant-settings";

export type AiFeatureAuditItem = {
  id: string;
  eventType: string;
  changedFields: string[];
  actorLabel: string;
  actorType:
    | "system"
    | "administrator";
  reason:
    | string
    | null;
  createdAt: string;
};

type AiFeatureStatusProps = {
  databaseReady: boolean;
  featureName: string;
  description:
    | string
    | null;
  enabled: boolean;
  operationalState:
    VoiceAssistantOperationalState;
  allowedRoles:
    VoiceAssistantAllowedRole[];
  settings:
    VoiceAssistantSettings;
  maintenanceMessageRo: string;
  maintenanceMessageEn: string;
  updatedAt:
    | string
    | null;
  updatedByLabel:
    | string
    | null;
  lastChangeReason:
    | string
    | null;
  providerConfigured: boolean;
  emergencyLockActive: boolean;
  publicAvailable: boolean;
  auditEvents:
    AiFeatureAuditItem[];
};

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Necunoscut";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Necunoscut";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(date);
}

function statusBadge(
  active: boolean,
  positiveLabel: string,
  negativeLabel: string
) {
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
          : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
      }
    >
      {active
        ? positiveLabel
        : negativeLabel}
    </span>
  );
}

function capabilityLabel(
  value: boolean
) {
  return value
    ? "Activată"
    : "Dezactivată";
}

function eventLabel(
  value: string
) {
  switch (value) {
    case "created":
      return "Configurare creată";

    case "enabled":
      return "Serviciu activat";

    case "disabled":
      return "Serviciu dezactivat";

    case "rollout_changed":
      return "Stare de lansare modificată";

    case "configuration_changed":
      return "Configurare modificată";

    default:
      return value;
  }
}

function changedFieldLabel(
  value: string
) {
  const labels:
    Record<
      string,
      string
    > = {
      feature_created:
        "Configurare inițială",
      display_name:
        "Denumire",
      description:
        "Descriere",
      is_enabled:
        "Comutator principal",
      operational_state:
        "Stare operațională",
      allowed_roles:
        "Roluri permise",
      settings:
        "Limite și capabilități",
      maintenance_message_ro:
        "Mesaj mentenanță RO",
      maintenance_message_en:
        "Mesaj mentenanță EN",
    };

  return labels[value] ??
    value;
}

function SummaryCard({
  title,
  value,
  detail,
  tone =
    "neutral",
}: {
  title: string;
  value: string;
  detail: string;
  tone?:
    | "neutral"
    | "positive"
    | "warning";
}) {
  const toneClasses = {
    neutral:
      "border-gray-200 bg-white",
    positive:
      "border-green-200 bg-green-50",
    warning:
      "border-amber-200 bg-amber-50",
  };

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        toneClasses[tone]
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {detail}
      </p>
    </article>
  );
}

export default function AiFeatureStatus({
  databaseReady,
  featureName,
  description,
  enabled,
  operationalState,
  allowedRoles,
  settings,
  maintenanceMessageRo,
  maintenanceMessageEn,
  updatedAt,
  updatedByLabel,
  lastChangeReason,
  providerConfigured,
  emergencyLockActive,
  publicAvailable,
  auditEvents,
}: AiFeatureStatusProps) {
  if (!databaseReady) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-800 shadow-sm"
      >
        Configurarea AI nu a putut fi încărcată.
        Verifică dacă migrarea
        <code className="mx-1 rounded bg-red-100 px-1.5 py-0.5">
          57-platform-feature-settings.sql
        </code>
        a fost aplicată și reîncarcă pagina.
      </div>
    );
  }

  const serviceBlocked =
    !enabled ||
    operationalState ===
      "standby" ||
    !providerConfigured ||
    emergencyLockActive;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Comutator principal"
          value={
            enabled
              ? "Pornit"
              : "Oprit"
          }
          detail={
            enabled
              ? "Baza de date permite inițierea serviciului, sub rezerva celorlalte protecții."
              : "Serviciul este blocat din baza de date."
          }
          tone={
            enabled
              ? "positive"
              : "warning"
          }
        />

        <SummaryCard
          title="Stare operațională"
          value={
            getOperationalStateLabel(
              operationalState
            )
          }
          detail="Controlează dacă funcția este în așteptare, testare, lansare limitată sau activă."
        />

        <SummaryCard
          title="Conexiune furnizor"
          value={
            providerConfigured
              ? "Configurată"
              : "Neconfigurată"
          }
          detail={
            providerConfigured
              ? "Cheia furnizorului există pe server. Valoarea ei nu este afișată."
              : "OPENAI_API_KEY nu este configurată în mediul serverului."
          }
          tone={
            providerConfigured
              ? "positive"
              : "warning"
          }
        />

        <SummaryCard
          title="Disponibilitate publică"
          value={
            publicAvailable
              ? "Disponibilă"
              : "Blocată"
          }
          detail={
            publicAvailable
              ? "Condițiile tehnice pentru afișarea funcției sunt îndeplinite."
              : "Microfonul public trebuie să rămână ascuns, iar sesiunile noi trebuie respinse."
          }
          tone={
            publicAvailable
              ? "positive"
              : "warning"
          }
        />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              Configurare curentă
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {featureName}
            </h2>

            {description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusBadge(
              enabled,
              "Comutator activ",
              "Comutator oprit"
            )}

            {statusBadge(
              !serviceBlocked,
              "Serviciu disponibil",
              "Serviciu blocat"
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-lg font-bold text-gray-900">
              Roluri permise
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              {allowedRoles.map(
                (role) => (
                  <span
                    key={role}
                    className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-sm font-semibold text-[#036661]"
                  >
                    {getRoleLabel(
                      role
                    )}
                  </span>
                )
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Rolurile sunt numai o condiție de acces.
              Autentificarea, starea contului și limitele
              de utilizare vor fi verificate separat.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-lg font-bold text-gray-900">
              Blocare de urgență
            </h3>

            <div className="mt-4">
              {statusBadge(
                emergencyLockActive,
                "Activă",
                "Inactivă"
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Protecția este eliberată numai când variabila
              <code className="mx-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">
                VOICE_ASSISTANT_EMERGENCY_DISABLED
              </code>
              are valoarea exactă
              <code className="mx-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">
                false
              </code>
              . O valoare absentă, invalidă sau
              <code className="mx-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">
                true
              </code>
              menține toate rutele vocale blocate.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Capabilități și limite
        </h2>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Furnizor configurat
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {settings.provider}
              </dd>
            </div>

            <div className="grid gap-2 bg-gray-50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Căutare vocală
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {capabilityLabel(
                  settings
                    .voiceSearchEnabled
                )}
              </dd>
            </div>

            <div className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Pregătirea programării
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {capabilityLabel(
                  settings
                    .appointmentDraftEnabled
                )}
              </dd>
            </div>

            <div className="grid gap-2 bg-gray-50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Confirmarea programării prin voce
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {capabilityLabel(
                  settings
                    .appointmentConfirmationEnabled
                )}
              </dd>
            </div>

            <div className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Durată maximă sesiune
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {
                  settings
                    .maximumSessionMinutes
                }{" "}
                minute
              </dd>
            </div>

            <div className="grid gap-2 bg-gray-50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Sesiuni maxime per utilizator și zi
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {
                  settings
                    .maximumSessionsPerUserPerDay
                }
              </dd>
            </div>

            <div className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Minute maxime pe platformă și zi
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {
                  settings
                    .maximumPlatformMinutesPerDay
                }
              </dd>
            </div>

            <div className="grid gap-2 bg-gray-50 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <dt className="text-sm font-medium text-gray-700">
                Oprire automată la limita zilnică
              </dt>
              <dd className="text-sm font-semibold text-gray-900">
                {
                  settings
                    .automaticPauseAfterDailyLimit
                    ? "Activată"
                    : "Dezactivată"
                }
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Mesaj de indisponibilitate — Română
          </h2>

          <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
            {maintenanceMessageRo}
          </p>
        </article>

        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Maintenance message — English
          </h2>

          <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
            {maintenanceMessageEn}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Ultima modificare
        </h2>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Data
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {formatDate(
                updatedAt
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Autor
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {updatedByLabel ??
                "Sistem"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Motiv
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {lastChangeReason ??
                "Nespecificat"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Audit
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Modificări recente
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Evenimentele sunt create automat de baza de date
            și nu pot fi modificate sau șterse prin aplicație.
          </p>
        </div>

        {auditEvents.length ===
        0 ? (
          <p className="mt-6 rounded-2xl bg-gray-50 p-5 text-sm text-gray-600">
            Nu există evenimente de audit disponibile.
          </p>
        ) : (
          <ol className="mt-6 space-y-4">
            {auditEvents.map(
              (event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {eventLabel(
                          event.eventType
                        )}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {event.actorLabel}
                        {" · "}
                        {formatDate(
                          event.createdAt
                        )}
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {event.actorType ===
                      "administrator"
                        ? "Administrator"
                        : "Sistem"}
                    </span>
                  </div>

                  {event.changedFields
                    .length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.changedFields.map(
                        (field) => (
                          <span
                            key={field}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                          >
                            {changedFieldLabel(
                              field
                            )}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {event.reason && (
                    <p className="mt-4 text-sm leading-6 text-gray-600">
                      Motiv:{" "}
                      {event.reason}
                    </p>
                  )}
                </li>
              )
            )}
          </ol>
        )}
      </section>

      <section className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm leading-6 text-gray-600">
        Această pagină este numai pentru vizualizare.
        Comutatorul principal, rolurile, capabilitățile și
        limitele vor deveni editabile în
        <strong className="mx-1 text-gray-900">
          Step 71A-3
        </strong>
        printr-un API administrativ protejat.
      </section>
    </div>
  );
}
