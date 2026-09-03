"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

export type CoveredClinicDoctorAccount = {
  doctorId: string;
  profileId: string | null;
  displayName: string;
  accountEmail: string | null;
  accountStatus: string;
  doctorStatus: string;
  coverageStatus: string;
  telehealthRestricted: boolean;
};

type Props = {
  locale: AppLocale;
  organizationId: string;
  organizationName: string;
  coveredDoctors: CoveredClinicDoctorAccount[];
};

type AccountStatus =
  | "active"
  | "suspended"
  | "blocked";

const COPY = {
  ro: {
    manage: "Gestionează medicii",
    title: "Conturi medici acoperiți",
    description:
      "Suspendă, blochează sau reactivează conturile medicilor facturați clinicii. Aceste acțiuni nu modifică relația de facturare a clinicii.",
    empty: "Nu există încă medici acceptați și facturați acestei organizații.",
    account: "Cont",
    accountStatus: "Stare cont",
    doctorStatus: "Stare profil medic",
    coverageStatus: "Acoperire clinică",
    active: "Activ",
    suspended: "Suspendat",
    blocked: "Blocat",
    unknown: "Necunoscut",
    coverageActive: "Activă",
    coverageInactive: "Inactivă",
    suspend: "Suspendă",
    block: "Blochează",
    reactivate: "Reactivează",
    processing: "Se actualizează...",
    close: "Închide",
    failed: "Contul medicului nu a putut fi actualizat.",
    accountMissing: "Cont de utilizator neasociat",
    confirmSuspend: "Suspendă contul medicului {name}?",
    confirmBlock: "Blochează contul medicului {name}?",
    confirmReactivate: "Reactivează contul medicului {name}?",
    telehealthAllowed: "Telehealth permis",
    telehealthRestricted: "Telehealth restricționat",
    restrictTelehealth: "Restricționează telehealth",
    allowTelehealth: "Permite telehealth",
  },
  en: {
    manage: "Manage doctors",
    title: "Covered Doctor accounts",
    description:
      "Suspend, block or reactivate Doctor accounts billed to this clinic. These actions do not change the clinic billing relationship.",
    empty: "There are no accepted Doctors billed to this organisation yet.",
    account: "Account",
    accountStatus: "Account status",
    doctorStatus: "Doctor profile status",
    coverageStatus: "Clinic coverage",
    active: "Active",
    suspended: "Suspended",
    blocked: "Blocked",
    unknown: "Unknown",
    coverageActive: "Active",
    coverageInactive: "Inactive",
    suspend: "Suspend",
    block: "Block",
    reactivate: "Reactivate",
    processing: "Updating...",
    close: "Close",
    failed: "The Doctor account could not be updated.",
    accountMissing: "No linked user account",
    confirmSuspend: "Suspend the Doctor account for {name}?",
    confirmBlock: "Block the Doctor account for {name}?",
    confirmReactivate: "Reactivate the Doctor account for {name}?",
    telehealthAllowed: "Telehealth allowed",
    telehealthRestricted: "Telehealth restricted",
    restrictTelehealth: "Restrict telehealth",
    allowTelehealth: "Allow telehealth",
  },
  de: {
    manage: "Ärzte verwalten",
    title: "Abgedeckte Arztkonten",
    description:
      "Arztkonten, die dieser Klinik berechnet werden, aussetzen, sperren oder reaktivieren. Diese Aktionen ändern die Abrechnungsbeziehung der Klinik nicht.",
    empty: "Für diese Organisation gibt es noch keine akzeptierten und berechneten Ärzte.",
    account: "Konto",
    accountStatus: "Kontostatus",
    doctorStatus: "Status Arztprofil",
    coverageStatus: "Klinikabdeckung",
    active: "Aktiv",
    suspended: "Ausgesetzt",
    blocked: "Gesperrt",
    unknown: "Unbekannt",
    coverageActive: "Aktiv",
    coverageInactive: "Inaktiv",
    suspend: "Aussetzen",
    block: "Sperren",
    reactivate: "Reaktivieren",
    processing: "Wird aktualisiert...",
    close: "Schließen",
    failed: "Das Arztkonto konnte nicht aktualisiert werden.",
    accountMissing: "Kein Benutzerkonto verknüpft",
    confirmSuspend: "Arztkonto von {name} aussetzen?",
    confirmBlock: "Arztkonto von {name} sperren?",
    confirmReactivate: "Arztkonto von {name} reaktivieren?",
    telehealthAllowed: "Telehealth erlaubt",
    telehealthRestricted: "Telehealth eingeschränkt",
    restrictTelehealth: "Telehealth einschränken",
    allowTelehealth: "Telehealth erlauben",
  },
} as const;

function interpolate(
  template: string,
  values: Record<string, string>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, value),
    template
  );
}

function accountStatusClasses(status: string) {
  if (status === "active") {
    return "bg-green-100 text-green-800";
  }

  if (status === "blocked") {
    return "bg-red-100 text-red-800";
  }

  if (status === "suspended") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-gray-200 text-gray-700";
}

function profileStatusClasses(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "suspended") {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-amber-100 text-amber-900";
}

export default function ClinicOrganizationDoctorsManager({
  locale,
  organizationId,
  organizationName,
  coveredDoctors,
}: Props) {
  const copy = COPY[locale];
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [changingDoctorId, setChangingDoctorId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [doctors, setDoctors] =
    useState<CoveredClinicDoctorAccount[]>(coveredDoctors);

  useEffect(() => {
    setDoctors(coveredDoctors);
  }, [coveredDoctors]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !changingDoctorId) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, changingDoctorId]);

  function openManager() {
    setError("");
    setIsOpen(true);
  }

  function getAccountStatusLabel(status: string) {
    if (status === "active") return copy.active;
    if (status === "suspended") return copy.suspended;
    if (status === "blocked") return copy.blocked;
    return copy.unknown;
  }

  function getDoctorStatusLabel(status: string) {
    if (status === "active") return copy.active;
    if (status === "suspended") return copy.suspended;
    return copy.unknown;
  }

  async function updateAccountStatus(
    doctor: CoveredClinicDoctorAccount,
    nextStatus: AccountStatus
  ) {
    if (!doctor.profileId) {
      setError(copy.accountMissing);
      return;
    }

    const confirmationTemplate =
      nextStatus === "blocked"
        ? copy.confirmBlock
        : nextStatus === "suspended"
          ? copy.confirmSuspend
          : copy.confirmReactivate;

    const confirmed = window.confirm(
      interpolate(confirmationTemplate, {
        name: doctor.displayName,
      })
    );

    if (!confirmed) return;

    setChangingDoctorId(doctor.doctorId);
    setError("");

    try {
      const response = await fetch("/api/admin/doctors", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: doctor.doctorId,
          action: "set_account_status",
          accountStatus: nextStatus,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? copy.failed);
      }

      setDoctors((current) =>
        current.map((item) =>
          item.doctorId === doctor.doctorId
            ? {
                ...item,
                accountStatus: nextStatus,
                doctorStatus:
                  nextStatus === "active" ? "active" : "suspended",
              }
            : item
        )
      );

      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : copy.failed
      );
    } finally {
      setChangingDoctorId(null);
    }
  }

  async function updateTelehealthRestriction(
    doctor: CoveredClinicDoctorAccount,
    restricted: boolean
  ) {
    setChangingDoctorId(doctor.doctorId);
    setError("");
    try {
      const response = await fetch("/api/admin/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.doctorId,
          action: "set_telehealth_restriction",
          telehealthRestricted: restricted,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? copy.failed);
      setDoctors((current) => current.map((item) => item.doctorId === doctor.doctorId ? { ...item, telehealthRestricted: restricted } : item));
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.failed);
    } finally {
      setChangingDoctorId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openManager}
        className="romdoc-focus-ring mt-[10px] inline-flex min-h-[34px] items-center rounded-[8px] border border-[#036661] bg-white px-[10px] py-[5px] text-xs font-semibold text-[#036661] transition hover:bg-[#036661] hover:text-white"
      >
        {copy.manage}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-[13px] sm:p-[21px]">
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => !changingDoctorId && setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`clinic-doctors-${organizationId}`}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
          >
            <div className="flex items-start justify-between gap-[13px]">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {organizationName}
                </p>
                <h2
                  id={`clinic-doctors-${organizationId}`}
                  className="mt-[5px] text-2xl font-bold text-gray-900"
                >
                  {copy.title}
                </h2>
                <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                  {copy.description}
                </p>
              </div>

              <button
                type="button"
                disabled={Boolean(changingDoctorId)}
                onClick={() => setIsOpen(false)}
                aria-label={copy.close}
                className="romdoc-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {doctors.length === 0 ? (
              <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
                {copy.empty}
              </div>
            ) : (
              <div className="mt-[21px] space-y-[13px]">
                {doctors.map((doctor) => {
                  const changing = changingDoctorId === doctor.doctorId;
                  const coverageActive = doctor.coverageStatus === "active";

                  return (
                    <article
                      key={doctor.doctorId}
                      className="rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] sm:p-[21px]"
                    >
                      <div className="flex flex-col gap-[13px] lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900">
                            {doctor.displayName}
                          </h3>
                          <p className="mt-[5px] break-all text-sm text-gray-600">
                            {doctor.accountEmail ?? copy.accountMissing}
                          </p>

                          <div className="mt-[13px] flex flex-wrap gap-[8px]">
                            <span
                              className={`rounded-full px-[10px] py-[5px] text-xs font-semibold ${accountStatusClasses(
                                doctor.accountStatus
                              )}`}
                            >
                              {copy.accountStatus}: {getAccountStatusLabel(
                                doctor.accountStatus
                              )}
                            </span>
                            <span className={`rounded-full px-[10px] py-[5px] text-xs font-semibold ${doctor.telehealthRestricted ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {doctor.telehealthRestricted ? copy.telehealthRestricted : copy.telehealthAllowed}
                            </span>

                            <span
                              className={`rounded-full px-[10px] py-[5px] text-xs font-semibold ${profileStatusClasses(
                                doctor.doctorStatus
                              )}`}
                            >
                              {copy.doctorStatus}: {getDoctorStatusLabel(
                                doctor.doctorStatus
                              )}
                            </span>

                            <span
                              className={`rounded-full px-[10px] py-[5px] text-xs font-semibold ${
                                coverageActive
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {copy.coverageStatus}: {coverageActive
                                ? copy.coverageActive
                                : copy.coverageInactive}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-[8px]">
                          <button type="button" disabled={changing} onClick={() => void updateTelehealthRestriction(doctor, !doctor.telehealthRestricted)} className="romdoc-button romdoc-button-secondary romdoc-button-sm">
                            {changing ? copy.processing : doctor.telehealthRestricted ? copy.allowTelehealth : copy.restrictTelehealth}
                          </button>
                          {doctor.accountStatus === "active" && (
                            <button
                              type="button"
                              disabled={changing || !doctor.profileId}
                              onClick={() =>
                                void updateAccountStatus(doctor, "suspended")
                              }
                              className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                            >
                              {changing ? copy.processing : copy.suspend}
                            </button>
                          )}

                          {doctor.accountStatus !== "blocked" && (
                            <button
                              type="button"
                              disabled={changing || !doctor.profileId}
                              onClick={() =>
                                void updateAccountStatus(doctor, "blocked")
                              }
                              className="romdoc-focus-ring inline-flex min-h-[34px] items-center justify-center rounded-[8px] border border-red-300 bg-white px-[13px] py-[8px] text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {changing ? copy.processing : copy.block}
                            </button>
                          )}

                          {(doctor.accountStatus === "suspended" ||
                            doctor.accountStatus === "blocked") && (
                            <button
                              type="button"
                              disabled={changing || !doctor.profileId}
                              onClick={() =>
                                void updateAccountStatus(doctor, "active")
                              }
                              className="romdoc-button romdoc-button-primary romdoc-button-sm"
                            >
                              {changing ? copy.processing : copy.reactivate}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
