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
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
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
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" d="M12 7.5v5l3 2" />
    </svg>
  );
}

function verificationLabel(status: string) {
  switch (status) {
    case "verified":
      return "Verificat";
    case "pending":
      return "În verificare";
    case "rejected":
      return "Respins";
    case "expired":
      return "Expirat";
    default:
      return "Netrimis";
  }
}

function verificationClasses(status: string) {
  switch (status) {
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "rejected":
    case "expired":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default function DoctorOnboardingChecklist({
  completion,
}: DoctorOnboardingChecklistProps) {
  const nextIncompleteItem = completion.items.find(
    (item) => !item.completed
  );

  return (
    <section
      aria-labelledby="doctor-profile-checklist-title"
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#036661]">
              Profil medic
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                completion.isReadyForPatients
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {completion.isReadyForPatients
                ? "Pregătit pentru programări"
                : "Configurare în curs"}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              id="doctor-profile-checklist-title"
              className="text-lg font-bold text-gray-900"
            >
              Checklist configurare
            </h2>

            <p className="text-sm text-gray-500">
              {completion.completedItems} din {completion.totalItems} pași
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-[#F0EEE9] px-3 py-2">
            <span className="text-lg font-bold text-[#036661]">
              {completion.percentage}%
            </span>

            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-300"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion.percentage}
              aria-label={`Profil completat ${completion.percentage}%`}
            >
              <div
                className="h-full rounded-full bg-[#036661] transition-all"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
          </div>

          <Link
            href={`/doctor/${completion.doctorSlug}`}
            target="_blank"
            rel="noreferrer"
            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
          >
            Profil public
          </Link>

          {nextIncompleteItem && (
            <Link
              href={nextIncompleteItem.href}
              className="romdoc-button romdoc-button-primary romdoc-button-sm"
            >
              Continuă
            </Link>
          )}
        </div>
      </div>

      {completion.doctorStatus !== "active" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Profilul are starea <strong>{completion.doctorStatus}</strong>.
          Vizibilitatea publică poate fi limitată.
        </div>
      )}

      <div className="relative mt-4 min-h-[230px] pt-4">
        <div className="overflow-x-auto overflow-y-hidden px-2 pb-8 pt-3">
          <div className="flex min-w-max items-start">
            {completion.items.map((item, index) => (
              <article
                key={item.key}
                className={`group relative z-10 h-[178px] w-44 shrink-0 overflow-hidden rounded-2xl border p-3 shadow-sm transition-all duration-200 ease-out hover:!z-50 hover:h-auto hover:min-h-[210px] hover:-translate-y-3 hover:scale-[1.08] hover:overflow-visible hover:shadow-2xl focus-within:!z-50 focus-within:h-auto focus-within:min-h-[210px] focus-within:-translate-y-3 focus-within:scale-[1.08] focus-within:overflow-visible focus-within:shadow-2xl ${
                 index === 0 ? "" : "-ml-8"
                } ${
                 item.completed
                 ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-white"
                }`}
              >
                
              <div className="flex items-start gap-2">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    item.completed
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.completed ? <CheckIcon /> : <PendingIcon />}
                </span>

                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                    {item.title}
                  </h3>

                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.completed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.completed ? "Complet" : "De completat"}
                  </span>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600 transition-all group-hover:line-clamp-none group-focus-within:line-clamp-none">
                {item.description}
              </p>

              {!item.completed && (
                <Link
                  href={item.href}
                  className="romdoc-focus-ring mt-2 inline-flex rounded-md text-xs font-semibold text-[#036661] underline-offset-4 hover:underline"
                >
                  {item.actionLabel}
                </Link>
              )}
            </article>
          ))}

          <article
            className={`group relative -ml-8 w-44 shrink-0 rounded-2xl border p-3 shadow-sm transition-all duration-200 ease-out hover:z-30 hover:-translate-y-2 hover:scale-[1.06] hover:shadow-xl focus-within:z-30 focus-within:-translate-y-2 focus-within:scale-[1.06] focus-within:shadow-xl ${verificationClasses(
              completion.verificationStatus
            )}`}
          >
            <div className="flex items-start gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80">
                {completion.verificationStatus === "verified" ? (
                  <CheckIcon />
                ) : (
                  <PendingIcon />
                )}
              </span>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-5">
                  Verificare profesională
                </h3>

                <span className="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
                  {verificationLabel(completion.verificationStatus)}
                </span>
              </div>
            </div>

            <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80 transition-all group-hover:line-clamp-none group-focus-within:line-clamp-none">
              Semnal suplimentar de încredere. Nu influențează procentul profilului.
            </p>

            <Link
              href="/doctor-dashboard/verification"
              className="romdoc-focus-ring mt-2 inline-flex rounded-md text-xs font-semibold underline-offset-4 hover:underline"
            >
              Gestionează
            </Link>
            </article>
          </div>
        </div>
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Pe desktop, mută cursorul peste un card pentru a-l aduce în față.
        Pe mobil, glisează orizontal.
      </p>
    </section>
  );
}
