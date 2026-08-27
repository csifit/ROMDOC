"use client";

import Link from "next/link";
import {
  useLocale,
} from "next-intl";
import {
  useMemo,
  useState,
} from "react";

import {
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

export type StaffPatientHistoryItem = {
  id: string;
  date: string;
  time: string | null;
  status: string;
};

export type StaffPatientDatabaseRow = {
  id: string;
  doctorId: string;
  doctorName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  patientProfileId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  country: string | null;
  lastAppointment: {
    date: string;
    time: string | null;
  } | null;
  nextAppointment: {
    date: string;
    time: string | null;
  } | null;
  medicalAppointmentId: string | null;
  history: StaffPatientHistoryItem[];
};

type Props = {
  patients: StaffPatientDatabaseRow[];
  loadError?: boolean;
};

const COPY = {
  ro: {
    eyebrow:
      "Personal medical",
    title:
      "Pacienți",
    description:
      "Vizualizare compactă a pacienților medicilor la care ești asignat. Datele de contact și adresa sunt doar pentru vizualizare aici.",
    patientCount:
      "pacienți",
    search:
      "Caută după pacient, medic, e-mail sau telefon...",
    patient:
      "Pacient",
    doctor:
      "Medic",
    contact:
      "Contact",
    email:
      "E-mail",
    phone:
      "Telefon",
    last:
      "Ultima programare",
    next:
      "Următoarea programare",
    account:
      "Cont",
    romdoc:
      "Cont RomDoc",
    noAccount:
      "Fără cont RomDoc",
    details:
      "Detalii pacient",
    address:
      "Adresă",
    notCompleted:
      "Necompletat",
    history:
      "Istoric programări",
    noHistory:
      "Nu există programări pentru acest pacient.",
    medical:
      "Vizualizează dosarul medical",
    medicalUnavailable:
      "Dosarul medical este disponibil numai dacă pacientul are cont RomDoc și o programare eligibilă.",
    createAppointment:
      "Creează programare",
    createHelp:
      "Deschide pagina de programări pentru a crea o programare nouă.",
    empty:
      "Nu există încă pacienți pentru medicii asignați.",
    noMatches:
      "Niciun pacient nu corespunde căutării.",
    loadError:
      "Baza de pacienți nu a putut fi încărcată.",
    noDate:
      "—",
  },
  en: {
    eyebrow:
      "Medical staff",
    title:
      "Patients",
    description:
      "A compact view of patients belonging to your assigned doctors. Contact and address information is read-only here.",
    patientCount:
      "patients",
    search:
      "Search by patient, doctor, email or phone...",
    patient:
      "Patient",
    doctor:
      "Doctor",
    contact:
      "Contact",
    email:
      "Email",
    phone:
      "Phone",
    last:
      "Last appointment",
    next:
      "Next appointment",
    account:
      "Account",
    romdoc:
      "RomDoc account",
    noAccount:
      "No RomDoc account",
    details:
      "Patient details",
    address:
      "Address",
    notCompleted:
      "Not completed",
    history:
      "Appointment history",
    noHistory:
      "There are no appointments for this patient.",
    medical:
      "View medical record",
    medicalUnavailable:
      "The medical record is available only when the patient has a RomDoc account and an eligible appointment.",
    createAppointment:
      "Create appointment",
    createHelp:
      "Open the appointments page to create a new appointment.",
    empty:
      "There are no patients yet for your assigned doctors.",
    noMatches:
      "No patients match your search.",
    loadError:
      "The patient database could not be loaded.",
    noDate:
      "—",
  },
  de: {
    eyebrow:
      "Praxispersonal",
    title:
      "Patienten",
    description:
      "Kompakte Ansicht der Patienten Ihrer zugewiesenen Ärzte. Kontakt- und Adressdaten sind hier schreibgeschützt.",
    patientCount:
      "Patienten",
    search:
      "Nach Patient, Arzt, E-Mail oder Telefon suchen...",
    patient:
      "Patient",
    doctor:
      "Arzt",
    contact:
      "Kontakt",
    email:
      "E-Mail",
    phone:
      "Telefon",
    last:
      "Letzter Termin",
    next:
      "Nächster Termin",
    account:
      "Konto",
    romdoc:
      "RomDoc-Konto",
    noAccount:
      "Kein RomDoc-Konto",
    details:
      "Patientendetails",
    address:
      "Adresse",
    notCompleted:
      "Nicht ausgefüllt",
    history:
      "Terminverlauf",
    noHistory:
      "Für diesen Patienten gibt es keine Termine.",
    medical:
      "Medizinische Akte anzeigen",
    medicalUnavailable:
      "Die medizinische Akte ist nur verfügbar, wenn der Patient ein RomDoc-Konto und einen geeigneten Termin hat.",
    createAppointment:
      "Termin erstellen",
    createHelp:
      "Öffnet die Terminseite, um einen neuen Termin zu erstellen.",
    empty:
      "Für die zugewiesenen Ärzte sind noch keine Patienten vorhanden.",
    noMatches:
      "Keine Patienten entsprechen der Suche.",
    loadError:
      "Die Patientendatenbank konnte nicht geladen werden.",
    noDate:
      "—",
  },
} as const;

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function formatAppointment(
  value:
    | {
        date: string;
        time: string | null;
      }
    | null,
  locale:
    AppLocale,
  fallback:
    string
) {
  if (!value) {
    return fallback;
  }

  const date =
    new Intl.DateTimeFormat(
      DATE_LOCALE[
        locale
      ],
      {
        day:
          "2-digit",
        month:
          "short",
        year:
          "numeric",
      }
    ).format(
      new Date(
        `${value.date}T12:00:00`
      )
    );

  return value.time
    ? `${date}, ${value.time.slice(0, 5)}`
    : date;
}

export default function StaffPatientsTable({
  patients,
  loadError = false,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const copy =
    COPY[locale];

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    expandedPatientId,
    setExpandedPatientId,
  ] =
    useState<
      string | null
    >(null);

  const filteredPatients =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLocaleLowerCase(
              DATE_LOCALE[
                locale
              ]
            );

        if (!term) {
          return patients;
        }

        const digits =
          term.replace(
            /\D/g,
            ""
          );

        return patients.filter(
          (
            patient
          ) => {
            const text =
              [
                patient.displayName,
                patient.doctorName,
                patient.email ??
                  "",
                patient.phone ??
                  "",
              ]
                .join(
                  " "
                )
                .toLocaleLowerCase(
                  DATE_LOCALE[
                    locale
                  ]
                );

            if (
              text.includes(
                term
              )
            ) {
              return true;
            }

            if (
              digits
            ) {
              return (
                patient.phone ??
                ""
              )
                .replace(
                  /\D/g,
                  ""
                )
                .includes(
                  digits
                );
            }

            return false;
          }
        );
      },
      [
        locale,
        patients,
        search,
      ]
    );

  if (
    loadError
  ) {
    return (
      <div className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm text-red-800">
        {
          copy.loadError
        }
      </div>
    );
  }

  return (
    <div className="space-y-[21px]">
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          {
            copy.eyebrow
          }
        </p>

        <h1 className="mt-[5px] text-3xl font-bold text-gray-900">
          {
            copy.title
          }
        </h1>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {
            copy.description
          }
        </p>
      </section>

      <section className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-[13px] border-b border-gray-200 p-[17px] sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-gray-700">
            {
              patients.length
            }{" "}
            {
              copy.patientCount
            }
          </div>

          <input
            type="search"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder={
              copy.search
            }
            className="romdoc-input w-full sm:max-w-md"
          />
        </div>

        {patients.length ===
        0 ? (
          <div className="p-[34px] text-center text-sm text-gray-600">
            {
              copy.empty
            }
          </div>
        ) : filteredPatients.length ===
          0 ? (
          <div className="p-[34px] text-center text-sm text-gray-600">
            {
              copy.noMatches
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <div className="hidden grid-cols-[minmax(170px,1.2fr)_minmax(170px,1.15fr)_minmax(180px,1.2fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_105px_36px] gap-[13px] bg-gray-50 px-[17px] py-[8px] text-xs font-bold uppercase tracking-wide text-gray-500 xl:grid">
              <div>
                {
                  copy.patient
                }
              </div>
              <div>
                {
                  copy.doctor
                }
              </div>
              <div>
                {
                  copy.contact
                }
              </div>
              <div>
                {
                  copy.last
                }
              </div>
              <div>
                {
                  copy.next
                }
              </div>
              <div>
                {
                  copy.account
                }
              </div>
              <div />
            </div>

            {filteredPatients.map(
              (
                patient
              ) => {
                const expanded =
                  expandedPatientId ===
                  patient.id;

                const address =
                  [
                    patient.addressLine1,
                    patient.addressLine2,
                    [
                      patient.postalCode,
                      patient.city,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " "
                      ),
                    patient.county,
                    patient.country,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    );

                return (
                  <article
                    key={
                      patient.id
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPatientId(
                          expanded
                            ? null
                            : patient.id
                        )
                      }
                      aria-expanded={
                        expanded
                      }
                      className="romdoc-focus-ring grid w-full gap-[8px] px-[17px] py-[13px] text-left hover:bg-gray-50 xl:grid-cols-[minmax(170px,1.2fr)_minmax(170px,1.15fr)_minmax(180px,1.2fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_105px_36px] xl:items-center xl:gap-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {
                            patient.displayName
                          }
                        </p>
                      </div>

                      <div className="min-w-0 text-sm text-gray-700">
                        <span className="mr-[5px] text-xs font-semibold uppercase text-gray-400 xl:hidden">
                          {
                            copy.doctor
                          }
                          :
                        </span>

                        <span className="font-medium">
                          {
                            patient.doctorName
                          }
                        </span>
                      </div>

                      <div className="min-w-0 text-sm text-gray-600">
                        <p className="truncate">
                          {patient.email ??
                            copy.noDate}
                        </p>

                        {patient.phone && (
                          <p className="mt-[2px] truncate text-xs text-gray-500">
                            {
                              patient.phone
                            }
                          </p>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="mr-[5px] text-xs font-semibold uppercase text-gray-400 xl:hidden">
                          {
                            copy.last
                          }
                          :
                        </span>

                        {formatAppointment(
                          patient.lastAppointment,
                          locale,
                          copy.noDate
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="mr-[5px] text-xs font-semibold uppercase text-gray-400 xl:hidden">
                          {
                            copy.next
                          }
                          :
                        </span>

                        {formatAppointment(
                          patient.nextAppointment,
                          locale,
                          copy.noDate
                        )}
                      </div>

                      <div>
                        <span
                          className={
                            patient.patientProfileId
                              ? "inline-flex rounded-full bg-emerald-50 px-[8px] py-[3px] text-xs font-semibold text-emerald-800"
                              : "inline-flex rounded-full bg-amber-50 px-[8px] py-[3px] text-xs font-semibold text-amber-800"
                          }
                        >
                          {patient.patientProfileId
                            ? copy.romdoc
                            : copy.noAccount}
                        </span>
                      </div>

                      <div className="flex justify-end text-xl text-gray-500">
                        {expanded
                          ? "−"
                          : "+"}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-100 bg-[#F0EEE9]/45 px-[17px] py-[17px]">
                        <div className="grid gap-[21px] lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                          <div className="space-y-[17px]">
                            <div className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                {
                                  copy.details
                                }
                              </p>

                              <div className="mt-[8px] grid gap-[6px] text-sm text-gray-700 sm:grid-cols-2">
                                <p>
                                  <strong>
                                    {copy.email}:
                                  </strong>{" "}
                                  {patient.email ??
                                    copy.notCompleted}
                                </p>

                                <p>
                                  <strong>
                                    {copy.phone}:
                                  </strong>{" "}
                                  {patient.phone ??
                                    copy.notCompleted}
                                </p>

                                <p className="sm:col-span-2">
                                  <strong>
                                    {
                                      copy.address
                                    }
                                    :
                                  </strong>{" "}
                                  {address ||
                                    copy.notCompleted}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-[8px]">
                              <Link
                                href="/staff-dashboard"
                                title={
                                  copy.createHelp
                                }
                                className="romdoc-button romdoc-button-primary romdoc-button-sm"
                              >
                                {
                                  copy.createAppointment
                                }
                              </Link>

                              {patient.medicalAppointmentId ? (
                                <Link
                                  href={`/medical-folder/${patient.medicalAppointmentId}?locale=${locale}`}
                                  className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                >
                                  {
                                    copy.medical
                                  }
                                </Link>
                              ) : (
                                <span
                                  title={
                                    copy.medicalUnavailable
                                  }
                                  className="inline-flex min-h-[34px] cursor-not-allowed items-center rounded-[13px] border border-gray-200 bg-gray-100 px-[13px] py-[8px] text-sm font-semibold text-gray-400"
                                >
                                  {
                                    copy.medical
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              {
                                copy.history
                              }
                            </p>

                            {patient.history.length ===
                            0 ? (
                              <p className="mt-[8px] text-sm text-gray-600">
                                {
                                  copy.noHistory
                                }
                              </p>
                            ) : (
                              <div className="mt-[8px] max-h-[320px] overflow-y-auto rounded-[13px] border border-gray-200 bg-white">
                                {patient.history.map(
                                  (
                                    appointment
                                  ) => (
                                    <div
                                      key={
                                        appointment.id
                                      }
                                      className="border-b border-gray-100 px-[13px] py-[8px] last:border-b-0"
                                    >
                                      <p className="text-sm font-semibold text-gray-900">
                                        {formatAppointment(
                                          {
                                            date:
                                              appointment.date,
                                            time:
                                              appointment.time,
                                          },
                                          locale,
                                          copy.noDate
                                        )}
                                      </p>

                                      <p className="mt-[2px] text-xs text-gray-500">
                                        {getAppointmentStatusLabel(
                                          appointment.status as AppointmentStatus,
                                          locale
                                        )}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
