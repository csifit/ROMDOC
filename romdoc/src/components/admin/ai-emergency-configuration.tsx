import {
  VOICE_ASSISTANT_EMERGENCY_ENV_NAME,
  type VoiceAssistantDeploymentEnvironment,
  type VoiceAssistantEmergencyLockState,
  type VoiceAssistantEnvironmentStatus,
} from "@/lib/ai/voice-assistant-environment";

type AiEmergencyConfigurationProps = {
  status:
    VoiceAssistantEnvironmentStatus;
};

function environmentLabel(
  value:
    VoiceAssistantDeploymentEnvironment
) {
  switch (value) {
    case "production":
      return "Production";

    case "preview":
      return "Preview";

    case "development":
      return "Development";

    case "test":
      return "Test";

    case "unknown":
      return "Necunoscut";
  }
}

function statePresentation(
  state:
    VoiceAssistantEmergencyLockState
) {
  switch (state) {
    case "engaged":
      return {
        title:
          "Blocare activă explicit",
        description:
          "Variabila este setată la true. Toate rutele vocale rămân blocate.",
        badge:
          "Protecție activă",
        classes:
          "border-green-200 bg-green-50 text-green-950",
        badgeClasses:
          "bg-green-100 text-green-800",
      };

    case "released":
      return {
        title:
          "Blocare eliberată",
        description:
          "Variabila este setată la false. Accesul depinde în continuare de comutatorul bazei de date și de toate celelalte verificări.",
        badge:
          "Atenție",
        classes:
          "border-red-200 bg-red-50 text-red-950",
        badgeClasses:
          "bg-red-100 text-red-800",
      };

    case "missing":
      return {
        title:
          "Variabilă absentă — blocare fail-closed",
        description:
          "Variabila nu este configurată. RomDoc blochează automat toate rutele vocale, dar este recomandat să setezi explicit valoarea true.",
        badge:
          "Blocat automat",
        classes:
          "border-amber-200 bg-amber-50 text-amber-950",
        badgeClasses:
          "bg-amber-100 text-amber-800",
      };

    case "invalid":
      return {
        title:
          "Valoare invalidă — blocare fail-closed",
        description:
          "Valoarea nu este true sau false. RomDoc blochează automat toate rutele vocale până la corectarea configurației.",
        badge:
          "Configurație invalidă",
        classes:
          "border-red-200 bg-red-50 text-red-950",
        badgeClasses:
          "bg-red-100 text-red-800",
      };
  }
}

export default function
AiEmergencyConfiguration({
  status,
}: AiEmergencyConfigurationProps) {
  const presentation =
    statePresentation(
      status.emergencyLockState
    );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Oprire de urgență
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Protecție independentă de baza de date
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Această protecție este citită numai pe server și
            blochează toate rutele vocale înaintea oricărei
            conexiuni la furnizor.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {
            environmentLabel(
              status
                .deploymentEnvironment
            )
          }
        </span>
      </div>

      <div
        className={`mt-6 rounded-2xl border p-5 ${
          presentation.classes
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {
                presentation.title
              }
            </h3>

            <p className="mt-2 text-sm leading-6">
              {
                presentation
                  .description
              }
            </p>
          </div>

          <span
            className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              presentation
                .badgeClasses
            }`}
          >
            {
              presentation.badge
            }
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-lg font-bold text-gray-900">
            Valoare sigură pentru standby
          </h3>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-950 p-4 text-sm text-white">
            <code>
              {
                `${VOICE_ASSISTANT_EMERGENCY_ENV_NAME}=true`
              }
            </code>
          </pre>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            Folosește această valoare în mediul local și în
            Vercel cât timp funcția nu trebuie să poată porni.
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-lg font-bold text-gray-900">
            Eliberare controlată în viitor
          </h3>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-950 p-4 text-sm text-white">
            <code>
              {
                `${VOICE_ASSISTANT_EMERGENCY_ENV_NAME}=false`
              }
            </code>
          </pre>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            Această valoare nu activează singură serviciul.
            Comutatorul bazei de date, starea de lansare,
            rolurile, furnizorul și limitele trebuie să fie
            valide separat.
          </p>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
        <h3 className="font-bold">
          Două niveluri de oprire
        </h3>

        <ol className="mt-3 space-y-2 text-sm leading-6">
          <li>
            <strong>
              1. Oprire imediată:
            </strong>{" "}
            dezactivează comutatorul principal din pagina
            Asistent AI. Modificarea este auditată și nu necesită
            redeploy.
          </li>

          <li>
            <strong>
              2. Blocare infrastructură:
            </strong>{" "}
            setează{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">
              {
                `${VOICE_ASSISTANT_EMERGENCY_ENV_NAME}=true`
              }
            </code>{" "}
            și repornește aplicația locală sau redeployează în
            Vercel.
          </li>
        </ol>
      </div>

      <p className="mt-5 text-xs leading-5 text-gray-500">
        RomDoc acceptă numai valorile exacte
        <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5">
          true
        </code>
        și
        <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5">
          false
        </code>
        , fără diferență între majuscule și minuscule. O valoare
        absentă sau invalidă menține blocarea activă.
      </p>
    </section>
  );
}
