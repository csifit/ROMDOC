import Link from "next/link";

import type {
  DoctorProfileCompletion,
} from "@/lib/doctors/get-doctor-profile-completion";

type DoctorOnboardingChecklistProps = {
  completion: DoctorProfileCompletion;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 12 4 4 8-8"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path
        strokeLinecap="round"
        d="M12 7.5v5l3 2"
      />
    </svg>
  );
}

function verificationLabel(status: string) {
  switch (status) {
    case "verified":
      return "Medic verificat de RomDoc";
    case "pending":
      return "Verificare în curs";
    case "rejected":
      return "Verificare respinsă";
    case "expired":
      return "Verificare expirată";
    default:
      return "Verificare netrimisă";
  }
}

export default function DoctorOnboardingChecklist({
  completion,
}: DoctorOnboardingChecklistProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#036661]">
                Configurarea profilului
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                {completion.isReadyForPatients
                  ? "Profilul este pregătit pentru pacienți"
                  : completion.isComplete
                    ? "Profilul este complet, dar nu este încă pregătit"
                    : "Finalizează profilul pentru pacienți"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                {completion.readinessMessage}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-[#F0EEE9] px-6 py-4 text-center">
              <p className="text-3xl font-bold text-[#036661]">
                {completion.percentage}%
              </p>
              <p className="mt-1 text-xs font-medium text-gray-600">
                {completion.completedItems} din{" "}
                {completion.totalItems} pași
              </p>
            </div>
          </div>

          <div
            className="mt-6 h-3 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion.percentage}
            aria-label={`Profil completat ${completion.percentage}%`}
          >
            <div
              className="h-full rounded-full bg-[#036661] transition-all"
              style={{
                width: `${completion.percentage}%`,
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/doctor/${completion.doctorSlug}`}
              target="_blank"
              rel="noreferrer"
              className="romdoc-button romdoc-button-secondary"
            >
              Vezi profilul public
            </Link>

            {!completion.isComplete && (
              <Link
                href={
                  completion.items.find(
                    (item) => !item.completed
                  )?.href ?? "/doctor-dashboard/profile"
                }
                className="romdoc-button romdoc-button-primary"
              >
                Continuă configurarea
              </Link>
            )}
          </div>
        </div>

        {completion.doctorStatus !== "active" && (
          <div className="border-t border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 sm:px-8">
            Profilul medicului are momentan starea{" "}
            <strong>{completion.doctorStatus}</strong>. Poți continua
            configurarea, însă vizibilitatea publică poate fi limitată.
          </div>
        )}
      </section>

      <section
        className={`rounded-2xl border p-5 shadow-sm ${
          completion.isReadyForPatients
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              completion.isReadyForPatients
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {completion.isReadyForPatients ? (
              <CheckIcon />
            ) : (
              <PendingIcon />
            )}
          </span>

          <div>
            <h2 className="font-semibold text-gray-900">
              {completion.isReadyForPatients
                ? "Pregătit pentru programări"
                : "Configurare în curs"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-700">
              {completion.readinessMessage}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {completion.items.map((item) => (
          <article
            key={item.key}
            className={`rounded-2xl border p-5 shadow-sm ${
              item.completed
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  item.completed
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.completed ? (
                  <CheckIcon />
                ) : (
                  <PendingIcon />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {item.title}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.completed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.completed
                      ? "Complet"
                      : "De completat"}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {item.description}
                </p>

                {!item.completed && (
                  <Link
                    href={item.href}
                    className="romdoc-focus-ring mt-4 inline-flex rounded-md text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                  >
                    {item.actionLabel}
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Verificare profesională
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {verificationLabel(completion.verificationStatus)}
            </p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Verificarea profesională este un semnal suplimentar de
              încredere. Nu este inclusă în procentul de completare și
              nu controlează accesul la funcțiile plătite.
            </p>
          </div>

          <Link
            href="/doctor-dashboard/verification"
            className="romdoc-button romdoc-button-secondary"
          >
            Gestionează verificarea
          </Link>
        </div>
      </section>
    </div>
  );
}
