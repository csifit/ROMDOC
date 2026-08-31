"use client";

import { useCallback, useEffect, useState } from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type Lead = {
  id: string;
  preferred_solution: string;
  priorities: string[];
  organization_type: string;
  doctor_count_range: string;
  desired_next_step: string;
  organization_name: string;
  contact_name: string | null;
  email: string;
  phone: string;
  notes: string | null;
  locale: string;
  status: string;
  notification_status: string;
  created_at: string;
  updated_at: string;
  status_updated_at: string | null;
};

type Props = {
  locale: AppLocale;
};

const COPY = {
  ro: {
    loading: "Se încarcă solicitările…",
    empty: "Nu există încă solicitări de la organizații medicale.",
    error: "Solicitările nu au putut fi încărcate.",
    retry: "Reîncarcă",
    solution: "Soluție preferată",
    priorities: "Priorități",
    type: "Tip organizație",
    doctors: "Medici",
    nextStep: "Următorul pas dorit",
    contact: "Contact",
    notes: "Observații",
    submitted: "Trimis",
    formLanguage: "Limbă formular",
    emailNotice: "Notificare e-mail",
    status: "Status lead",
    updating: "Se actualizează…",
    integrated: "Soluție integrată",
    romdoc: "Platforma RomDoc",
  },
  en: {
    loading: "Loading enquiries…",
    empty: "There are no healthcare organisation enquiries yet.",
    error: "The enquiries could not be loaded.",
    retry: "Reload",
    solution: "Preferred solution",
    priorities: "Priorities",
    type: "Organisation type",
    doctors: "Doctors",
    nextStep: "Preferred next step",
    contact: "Contact",
    notes: "Notes",
    submitted: "Submitted",
    formLanguage: "Form language",
    emailNotice: "Email notification",
    status: "Lead status",
    updating: "Updating…",
    integrated: "Integrated solution",
    romdoc: "RomDoc platform",
  },
  de: {
    loading: "Anfragen werden geladen…",
    empty: "Es gibt noch keine Anfragen von medizinischen Organisationen.",
    error: "Die Anfragen konnten nicht geladen werden.",
    retry: "Neu laden",
    solution: "Bevorzugte Lösung",
    priorities: "Prioritäten",
    type: "Organisationstyp",
    doctors: "Ärzte",
    nextStep: "Gewünschter nächster Schritt",
    contact: "Kontakt",
    notes: "Notizen",
    submitted: "Gesendet",
    formLanguage: "Formularsprache",
    emailNotice: "E-Mail-Benachrichtigung",
    status: "Lead-Status",
    updating: "Wird aktualisiert…",
    integrated: "Integrierte Lösung",
    romdoc: "RomDoc-Plattform",
  },
} as const;

const STATUS_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    new: "Nou",
    contacted: "Contactat",
    meeting_scheduled: "Întâlnire programată",
    proposal: "Ofertă",
    won: "Câștigat",
    closed: "Închis",
  },
  en: {
    new: "New",
    contacted: "Contacted",
    meeting_scheduled: "Meeting scheduled",
    proposal: "Proposal",
    won: "Won",
    closed: "Closed",
  },
  de: {
    new: "Neu",
    contacted: "Kontaktiert",
    meeting_scheduled: "Termin vereinbart",
    proposal: "Angebot",
    won: "Gewonnen",
    closed: "Geschlossen",
  },
};

const PRIORITY_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    online_booking: "Programări online",
    reduce_phone_calls: "Mai puține apeluri / administrare manuală",
    multi_location_management: "Gestionare medici / locații",
    existing_system_integration: "Integrare sisteme existente",
    patient_acquisition: "Vizibilitate și pacienți noi",
    sms_services: "SMS confirmări / mementouri",
    patient_communication: "Comunicare cu pacienții",
    other: "Altă prioritate",
  },
  en: {
    online_booking: "Online booking",
    reduce_phone_calls: "Reduce calls / manual admin",
    multi_location_management: "Doctor / location management",
    existing_system_integration: "Existing system integration",
    patient_acquisition: "Visibility and new patients",
    sms_services: "SMS confirmations / reminders",
    patient_communication: "Patient communication",
    other: "Other priority",
  },
  de: {
    online_booking: "Online-Termine",
    reduce_phone_calls: "Weniger Anrufe / manuelle Verwaltung",
    multi_location_management: "Ärzte / Standorte verwalten",
    existing_system_integration: "Integration bestehender Systeme",
    patient_acquisition: "Sichtbarkeit und neue Patienten",
    sms_services: "SMS-Bestätigungen / Erinnerungen",
    patient_communication: "Patientenkommunikation",
    other: "Andere Priorität",
  },
};

const ORGANISATION_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    independent_clinic: "Clinică independentă",
    multi_location_clinic: "Clinică cu mai multe locații",
    medical_centre: "Centru medical / policlinică",
    private_hospital: "Spital privat / grup",
    diagnostic_imaging: "Diagnostic / imagistică",
    laboratory: "Laborator",
    other: "Alt tip",
  },
  en: {
    independent_clinic: "Independent clinic",
    multi_location_clinic: "Multi-location clinic",
    medical_centre: "Medical centre / polyclinic",
    private_hospital: "Private hospital / group",
    diagnostic_imaging: "Diagnostic / imaging centre",
    laboratory: "Laboratory",
    other: "Other",
  },
  de: {
    independent_clinic: "Unabhängige Klinik",
    multi_location_clinic: "Klinik mit mehreren Standorten",
    medical_centre: "Medizinisches Zentrum / Poliklinik",
    private_hospital: "Privatkrankenhaus / Gruppe",
    diagnostic_imaging: "Diagnostik / Bildgebung",
    laboratory: "Labor",
    other: "Andere",
  },
};

const NEXT_STEP_LABELS: Record<AppLocale, Record<string, string>> = {
  ro: {
    intro_meeting: "Întâlnire introductivă",
    demo: "Demonstrație RomDoc",
    integration_discussion: "Discuție integrare",
    email_information: "Informații prin e-mail",
    custom_solution: "Soluție personalizată",
  },
  en: {
    intro_meeting: "Introductory meeting",
    demo: "RomDoc demo",
    integration_discussion: "Integration discussion",
    email_information: "Information by email",
    custom_solution: "Custom solution",
  },
  de: {
    intro_meeting: "Einführungsgespräch",
    demo: "RomDoc-Demo",
    integration_discussion: "Integrationsgespräch",
    email_information: "Informationen per E-Mail",
    custom_solution: "Individuelle Lösung",
  },
};

const DOCTOR_COUNTS: Record<string, string> = {
  "1_5": "1–5",
  "6_20": "6–20",
  "21_50": "21–50",
  "51_100": "51–100",
  "100_plus": "100+",
};

const STATUS_VALUES = [
  "new",
  "contacted",
  "meeting_scheduled",
  "proposal",
  "won",
  "closed",
] as const;

function localeTag(locale: AppLocale) {
  return locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-US";
}

function statusClasses(status: string) {
  if (status === "won") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "closed") return "bg-gray-100 text-gray-700 border-gray-200";
  if (status === "proposal") return "bg-blue-50 text-blue-800 border-blue-200";
  if (status === "meeting_scheduled") return "bg-violet-50 text-violet-800 border-violet-200";
  if (status === "contacted") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-[#036661]/7 text-[#036661] border-[#036661]/20";
}

export default function ClinicOrganisationLeadsPanel({ locale }: Props) {
  const t = COPY[locale];
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/clinic-organisation-leads", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("LOAD_FAILED");

      const payload = (await response.json()) as { leads?: Lead[] };
      setLeads(payload.leads ?? []);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  async function updateStatus(leadId: string, status: string) {
    setSavingId(leadId);
    setError(null);

    try {
      const response = await fetch("/api/admin/clinic-organisation-leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, status }),
      });

      if (!response.ok) throw new Error("UPDATE_FAILED");

      const payload = (await response.json()) as {
        lead?: {
          id: string;
          status: string;
          status_updated_at: string | null;
          updated_at: string;
        };
      };

      if (!payload.lead) throw new Error("UPDATE_FAILED");

      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                status: payload.lead?.status ?? status,
                status_updated_at: payload.lead?.status_updated_at ?? lead.status_updated_at,
                updated_at: payload.lead?.updated_at ?? lead.updated_at,
              }
            : lead
        )
      );
    } catch {
      setError(t.error);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">{t.loading}</p>;
  }

  if (error && leads.length === 0) {
    return (
      <div className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void loadLeads()}
          className="romdoc-button romdoc-button-secondary romdoc-button-sm mt-[13px]"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="space-y-[13px]">
      {error ? (
        <div className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {leads.map((lead) => (
        <details
          key={lead.id}
          className="group overflow-hidden rounded-[21px] border border-gray-200 bg-white"
        >
          <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] px-[21px] py-[13px] hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-[8px]">
                <h3 className="truncate font-bold text-gray-950">{lead.organization_name}</h3>
                <span
                  className={`rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                    lead.status
                  )}`}
                >
                  {STATUS_LABELS[locale][lead.status] ?? lead.status}
                </span>
              </div>
              <p className="mt-[5px] text-xs text-gray-500">
                {lead.contact_name ? `${lead.contact_name} · ` : ""}
                {lead.email} · {lead.phone}
              </p>
            </div>
            <span className="text-xl text-gray-500 transition-transform group-open:rotate-180">⌄</span>
          </summary>

          <div className="border-t border-gray-200 p-[21px]">
            <div className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[13px] bg-[#F0EEE9] p-[13px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.solution}</p>
                <p className="mt-[5px] text-sm font-medium text-gray-900">
                  {lead.preferred_solution === "integrated" ? t.integrated : t.romdoc}
                </p>
              </div>

              <div className="rounded-[13px] bg-[#F0EEE9] p-[13px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.type}</p>
                <p className="mt-[5px] text-sm text-gray-900">
                  {ORGANISATION_LABELS[locale][lead.organization_type] ?? lead.organization_type}
                </p>
              </div>

              <div className="rounded-[13px] bg-[#F0EEE9] p-[13px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.doctors}</p>
                <p className="mt-[5px] text-sm text-gray-900">
                  {DOCTOR_COUNTS[lead.doctor_count_range] ?? lead.doctor_count_range}
                </p>
              </div>

              <div className="rounded-[13px] bg-[#F0EEE9] p-[13px] md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.priorities}</p>
                <div className="mt-[8px] flex flex-wrap gap-[8px]">
                  {lead.priorities.map((priority) => (
                    <span
                      key={priority}
                      className="rounded-full border border-[#036661]/15 bg-white px-[8px] py-[5px] text-xs text-gray-700"
                    >
                      {PRIORITY_LABELS[locale][priority] ?? priority}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[13px] bg-[#F0EEE9] p-[13px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.nextStep}</p>
                <p className="mt-[5px] text-sm text-gray-900">
                  {NEXT_STEP_LABELS[locale][lead.desired_next_step] ?? lead.desired_next_step}
                </p>
              </div>
            </div>

            <div className="mt-[13px] grid gap-[13px] lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[13px] border border-gray-200 bg-white p-[13px] text-sm text-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.contact}</p>
                <p className="mt-[8px]">
                  <a className="font-semibold text-[#036661] hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                  {" · "}
                  <a className="font-semibold text-[#036661] hover:underline" href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                </p>
                {lead.notes ? (
                  <div className="mt-[13px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.notes}</p>
                    <p className="mt-[5px] whitespace-pre-wrap leading-6">{lead.notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[13px] border border-gray-200 bg-gray-50 p-[13px]">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.status}</span>
                  <select
                    value={lead.status}
                    disabled={savingId === lead.id}
                    onChange={(event) => void updateStatus(lead.id, event.target.value)}
                    className="romdoc-focus-ring mt-[8px] min-h-[44px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] text-sm text-gray-900 disabled:opacity-60"
                  >
                    {STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[locale][status]}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="mt-[13px] text-xs leading-5 text-gray-500">
                  {t.submitted}: {new Intl.DateTimeFormat(localeTag(locale), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(lead.created_at))}
                </p>
                <p className="mt-[5px] text-xs leading-5 text-gray-500">
                  {t.formLanguage}: {lead.locale.toUpperCase()}
                </p>
                <p className="mt-[5px] text-xs leading-5 text-gray-500">
                  {t.emailNotice}: {lead.notification_status}
                </p>
                {savingId === lead.id ? (
                  <p className="mt-[8px] text-xs font-semibold text-[#036661]">{t.updating}</p>
                ) : null}
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
