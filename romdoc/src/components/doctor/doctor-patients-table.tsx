"use client";

import Link from "next/link";
import {
  useLocale,
} from "next-intl";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  getAppointmentStatusLabel,
  type AppointmentStatus,
} from "@/lib/appointments/appointment-status";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";

export type DoctorPatientHistoryItem = {
  id: string;
  date: string;
  time: string | null;
  status: string;
};

export type DoctorPatientDatabaseRow = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  patientProfileId: string | null;
  source: string;
  createdAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  country: string | null;
  contactUpdatedAt: string | null;
  inviteLastSentAt: string | null;
  inviteCount: number;
  lastAppointment: {
    date: string;
    time: string | null;
  } | null;
  nextAppointment: {
    date: string;
    time: string | null;
  } | null;
  medicalAppointmentId: string | null;
  messageAppointmentId: string | null;
  history: DoctorPatientHistoryItem[];
};

type Props = {
  patients: DoctorPatientDatabaseRow[];
  loadError?: boolean;
};

type ContactDraft = {
  displayName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
};

const TEXT = {
  ro: {
    eyebrow: "Cabinet medical",
    title: "Pacienți",
    description:
      "Listă compactă a pacienților tăi, cu programări, date de contact și adresă.",
    add: "Adaugă pacient",
    addTitle: "Adaugă pacient manual",
    addDescription:
      "Pacientul poate fi adăugat înainte să aibă cont RomDoc. Este necesar e-mailul și/sau telefonul.",
    name: "Nume pacient",
    email: "E-mail",
    phone: "Telefon",
    optional: "opțional",
    save: "Salvează pacient",
    saving: "Se salvează...",
    cancel: "Anulează",
    search: "Caută după nume, e-mail sau telefon...",
    patient: "Pacient",
    contact: "Contact",
    last: "Ultima programare",
    next: "Următoarea programare",
    account: "Cont",
    romdocAccount: "Cont RomDoc",
    contactOnly: "Fără cont RomDoc",
    quickActions: "Acțiuni rapide",
    medical: "Profil medical / Rezumat de urgență",
    folder: "Dosar medical",
    message: "Mesaj pacient",
    createAppointment: "Creează programare",
    contactAddress: "Contact / adresă",
    editContactAddress: "Editează contact / adresă",
    hideContactAddress: "Închide contact / adresă",
    invite: "Invită în RomDoc",
    inviting: "Se trimite...",
    invited: "Invitația a fost trimisă.",
    inviteNeedsEmail:
      "Adaugă o adresă de e-mail înainte de a trimite invitația.",
    alreadyLinked:
      "Pacientul are deja cont RomDoc asociat.",
    inviteHistory:
      "Ultima invitație",
    history: "Istoric programări",
    noHistory: "Nu există încă programări pentru acest pacient.",
    noDate: "—",
    noPatients: "Nu există încă pacienți.",
    noPatientsDescription:
      "Adaugă primul pacient manual sau creează o programare. Pacienții din programări sunt adăugați automat.",
    noMatches: "Niciun pacient nu corespunde căutării.",
    loadError: "Baza de pacienți nu a putut fi încărcată.",
    addError: "Pacientul nu a putut fi adăugat.",
    added: "Pacientul a fost adăugat.",
    contactRequired: "Introdu cel puțin e-mailul sau telefonul.",
    accountRequired:
      "Pentru mesaje și informații medicale pacientul trebuie să aibă un cont RomDoc asociat.",
    medicalRequired:
      "Accesul medical devine disponibil printr-o programare confirmată, reprogramată sau finalizată.",
    open: "Deschide",
    patientCount: "pacienți",
    addressLine1: "Adresă",
    addressLine2: "Adresă suplimentară",
    city: "Localitate",
    county: "Județ / Sector",
    postalCode: "Cod poștal",
    country: "Țară",
    saveContact: "Salvează datele",
    contactSaving: "Se salvează...",
    contactSaved: "Datele de contact și adresa au fost actualizate.",
    contactSaveError: "Datele nu au putut fi actualizate.",
    contactUpdated: "Ultima actualizare",
    notCompleted: "Necompletat",
  },
  en: {
    eyebrow: "Medical practice",
    title: "Patients",
    description:
      "A compact list of your patients with appointments, contact details and address.",
    add: "Add patient",
    addTitle: "Add patient manually",
    addDescription:
      "A patient can be added before they have a RomDoc account. Email and/or phone is required.",
    name: "Patient name",
    email: "Email",
    phone: "Phone",
    optional: "optional",
    save: "Save patient",
    saving: "Saving...",
    cancel: "Cancel",
    search: "Search by name, email or phone...",
    patient: "Patient",
    contact: "Contact",
    last: "Last appointment",
    next: "Next appointment",
    account: "Account",
    romdocAccount: "RomDoc account",
    contactOnly: "No RomDoc account",
    quickActions: "Quick actions",
    medical: "Medical profile / Emergency summary",
    folder: "Medical folder",
    message: "Message patient",
    createAppointment: "Create appointment",
    contactAddress: "Contact / address",
    editContactAddress: "Edit contact / address",
    hideContactAddress: "Close contact / address",
    invite: "Invite to RomDoc",
    inviting: "Sending...",
    invited: "Invitation sent.",
    inviteNeedsEmail:
      "Add an email address before sending an invitation.",
    alreadyLinked:
      "The patient already has a linked RomDoc account.",
    inviteHistory: "Last invitation",
    history: "Appointment history",
    noHistory: "There are no appointments for this patient yet.",
    noDate: "—",
    noPatients: "There are no patients yet.",
    noPatientsDescription:
      "Add your first patient manually or create an appointment. Patients from appointments are added automatically.",
    noMatches: "No patients match your search.",
    loadError: "The patient database could not be loaded.",
    addError: "The patient could not be added.",
    added: "Patient added.",
    contactRequired: "Enter at least an email address or phone number.",
    accountRequired:
      "For messages and medical information, the patient must have a linked RomDoc account.",
    medicalRequired:
      "Medical access becomes available through a confirmed, rescheduled or completed appointment.",
    open: "Open",
    patientCount: "patients",
    addressLine1: "Address",
    addressLine2: "Address line 2",
    city: "City",
    county: "County / District",
    postalCode: "Postal code",
    country: "Country",
    saveContact: "Save details",
    contactSaving: "Saving...",
    contactSaved: "Contact and address details updated.",
    contactSaveError: "The details could not be updated.",
    contactUpdated: "Last updated",
    notCompleted: "Not completed",
  },
  de: {
    eyebrow: "Arztpraxis",
    title: "Patienten",
    description:
      "Eine kompakte Patientenliste mit Terminen, Kontaktdaten und Adresse.",
    add: "Patient hinzufügen",
    addTitle: "Patient manuell hinzufügen",
    addDescription:
      "Ein Patient kann vor der Erstellung eines RomDoc-Kontos hinzugefügt werden. E-Mail und/oder Telefon ist erforderlich.",
    name: "Patientenname",
    email: "E-Mail",
    phone: "Telefon",
    optional: "optional",
    save: "Patient speichern",
    saving: "Wird gespeichert...",
    cancel: "Abbrechen",
    search: "Nach Name, E-Mail oder Telefon suchen...",
    patient: "Patient",
    contact: "Kontakt",
    last: "Letzter Termin",
    next: "Nächster Termin",
    account: "Konto",
    romdocAccount: "RomDoc-Konto",
    contactOnly: "Kein RomDoc-Konto",
    quickActions: "Schnellaktionen",
    medical: "Medizinisches Profil / Notfallübersicht",
    folder: "Medizinische Akte",
    message: "Patientennachricht",
    createAppointment: "Termin erstellen",
    contactAddress: "Kontakt / Adresse",
    editContactAddress: "Kontakt / Adresse bearbeiten",
    hideContactAddress: "Kontakt / Adresse schließen",
    invite: "Zu RomDoc einladen",
    inviting: "Wird gesendet...",
    invited: "Einladung wurde gesendet.",
    inviteNeedsEmail:
      "Fügen Sie vor dem Versand eine E-Mail-Adresse hinzu.",
    alreadyLinked:
      "Der Patient hat bereits ein verknüpftes RomDoc-Konto.",
    inviteHistory: "Letzte Einladung",
    history: "Terminverlauf",
    noHistory: "Für diesen Patienten gibt es noch keine Termine.",
    noDate: "—",
    noPatients: "Noch keine Patienten vorhanden.",
    noPatientsDescription:
      "Fügen Sie den ersten Patienten manuell hinzu oder erstellen Sie einen Termin. Patienten aus Terminen werden automatisch hinzugefügt.",
    noMatches: "Keine Patienten entsprechen der Suche.",
    loadError: "Die Patientendatenbank konnte nicht geladen werden.",
    addError: "Der Patient konnte nicht hinzugefügt werden.",
    added: "Patient wurde hinzugefügt.",
    contactRequired:
      "Geben Sie mindestens eine E-Mail-Adresse oder Telefonnummer ein.",
    accountRequired:
      "Für Nachrichten und medizinische Informationen benötigt der Patient ein verknüpftes RomDoc-Konto.",
    medicalRequired:
      "Medizinischer Zugriff wird über einen bestätigten, verschobenen oder abgeschlossenen Termin verfügbar.",
    open: "Öffnen",
    patientCount: "Patienten",
    addressLine1: "Adresse",
    addressLine2: "Adresszusatz",
    city: "Ort",
    county: "Kreis / Bezirk",
    postalCode: "Postleitzahl",
    country: "Land",
    saveContact: "Daten speichern",
    contactSaving: "Wird gespeichert...",
    contactSaved: "Kontakt- und Adressdaten wurden aktualisiert.",
    contactSaveError: "Die Daten konnten nicht aktualisiert werden.",
    contactUpdated: "Zuletzt aktualisiert",
    notCompleted: "Nicht ausgefüllt",
  },
} as const;

const INTL_LOCALE: Record<AppLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
};

function formatAppointment(
  value: {
    date: string;
    time: string | null;
  } | null,
  locale: AppLocale,
  fallback: string
) {
  if (!value) {
    return fallback;
  }

  const date =
    new Intl.DateTimeFormat(
      INTL_LOCALE[locale],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
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

function formatDateTime(
  value: string | null,
  locale: AppLocale,
  fallback: string
) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function createAppointmentHref(
  patient: DoctorPatientDatabaseRow
) {
  const parameters =
    new URLSearchParams({
      createPatient:
        "1",
      patientName:
        patient.displayName,
    });

  if (patient.email) {
    parameters.set(
      "patientEmail",
      patient.email
    );
  }

  if (patient.phone) {
    parameters.set(
      "patientPhone",
      patient.phone
    );
  }

  return `/doctor-dashboard/appointments?${parameters.toString()}`;
}

function createDraft(
  patient:
    DoctorPatientDatabaseRow
): ContactDraft {
  return {
    displayName:
      patient.displayName,
    email:
      patient.email ??
      "",
    phone:
      patient.phone ??
      "",
    addressLine1:
      patient.addressLine1 ??
      "",
    addressLine2:
      patient.addressLine2 ??
      "",
    city:
      patient.city ??
      "",
    county:
      patient.county ??
      "",
    postalCode:
      patient.postalCode ??
      "",
    country:
      patient.country ??
      "",
  };
}

export default function DoctorPatientsTable({
  patients,
  loadError = false,
}: Props) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const text =
    TEXT[locale];

  const router =
    useRouter();

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    expandedPatientId,
    setExpandedPatientId,
  ] =
    useState<string | null>(
      null
    );

  const [
    editingPatientId,
    setEditingPatientId,
  ] =
    useState<string | null>(
      null
    );

  const [
    contactDraft,
    setContactDraft,
  ] =
    useState<ContactDraft | null>(
      null
    );

  const [
    addOpen,
    setAddOpen,
  ] =
    useState(false);

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    contactSavingId,
    setContactSavingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    invitingPatientId,
    setInvitingPatientId,
  ] =
    useState<string | null>(
      null
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    rowMessage,
    setRowMessage,
  ] =
    useState<{
      patientId: string;
      kind: "success" | "error";
      text: string;
    } | null>(
      null
    );

  const filteredPatients =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        if (!normalized) {
          return patients;
        }

        const digits =
          normalized.replace(
            /\D/g,
            ""
          );

        return patients.filter(
          (
            patient
          ) => {
            const nameMatch =
              patient.displayName
                .toLowerCase()
                .includes(
                  normalized
                );

            const emailMatch =
              patient.email
                ?.toLowerCase()
                .includes(
                  normalized
                ) ??
              false;

            const phoneMatch =
              digits.length >
                0 &&
              (
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

            return (
              nameMatch ||
              emailMatch ||
              phoneMatch
            );
          }
        );
      },
      [
        patients,
        query,
      ]
    );

  async function handleAddPatient(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !email.trim() &&
      !phone.trim()
    ) {
      setErrorMessage(
        text.contactRequired
      );
      return;
    }

    setIsSaving(true);

    try {
      const response =
        await fetch(
          "/api/doctor/patients",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                displayName,
                email,
                phone,
              }),
          }
        );

      const result =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        setErrorMessage(
          result.error ??
            text.addError
        );
        return;
      }

      setDisplayName("");
      setEmail("");
      setPhone("");
      setAddOpen(false);
      setSuccessMessage(
        text.added
      );

      router.refresh();
    } catch {
      setErrorMessage(
        text.addError
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openContactEditor(
    patient:
      DoctorPatientDatabaseRow
  ) {
    if (
      editingPatientId ===
      patient.id
    ) {
      setEditingPatientId(
        null
      );
      setContactDraft(
        null
      );
      return;
    }

    setEditingPatientId(
      patient.id
    );
    setContactDraft(
      createDraft(
        patient
      )
    );
    setRowMessage(
      null
    );
  }

  function updateDraft(
    key: keyof ContactDraft,
    value: string
  ) {
    setContactDraft(
      (
        current
      ) =>
        current
          ? {
              ...current,
              [key]:
                value,
            }
          : current
    );
  }

  async function saveContact(
    patientId: string
  ) {
    if (
      !contactDraft
    ) {
      return;
    }

    if (
      !contactDraft.email
        .trim() &&
      !contactDraft.phone
        .trim()
    ) {
      setRowMessage({
        patientId,
        kind:
          "error",
        text:
          text.contactRequired,
      });
      return;
    }

    setContactSavingId(
      patientId
    );
    setRowMessage(
      null
    );

    try {
      const response =
        await fetch(
          "/api/doctor/patients",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                patientId,
                ...contactDraft,
              }),
          }
        );

      const result =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        setRowMessage({
          patientId,
          kind:
            "error",
          text:
            result.error ??
            text.contactSaveError,
        });
        return;
      }

      setRowMessage({
        patientId,
        kind:
          "success",
        text:
          text.contactSaved,
      });

      setEditingPatientId(
        null
      );
      setContactDraft(
        null
      );

      router.refresh();
    } catch {
      setRowMessage({
        patientId,
        kind:
          "error",
        text:
          text.contactSaveError,
      });
    } finally {
      setContactSavingId(
        null
      );
    }
  }

  async function sendInvite(
    patient:
      DoctorPatientDatabaseRow
  ) {
    if (
      patient.patientProfileId
    ) {
      setRowMessage({
        patientId:
          patient.id,
        kind:
          "error",
        text:
          text.alreadyLinked,
      });
      return;
    }

    if (
      !patient.email
    ) {
      setRowMessage({
        patientId:
          patient.id,
        kind:
          "error",
        text:
          text.inviteNeedsEmail,
      });
      return;
    }

    setInvitingPatientId(
      patient.id
    );
    setRowMessage(
      null
    );

    try {
      const response =
        await fetch(
          "/api/doctor/patients/invite",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                patientId:
                  patient.id,
                locale,
              }),
          }
        );

      const result =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        setRowMessage({
          patientId:
            patient.id,
          kind:
            "error",
          text:
            result.error ??
            text.addError,
        });
        return;
      }

      setRowMessage({
        patientId:
          patient.id,
        kind:
          "success",
        text:
          text.invited,
      });

      router.refresh();
    } catch {
      setRowMessage({
        patientId:
          patient.id,
        kind:
          "error",
        text:
          text.addError,
      });
    } finally {
      setInvitingPatientId(
        null
      );
    }
  }

  return (
    <div className="space-y-[21px]">
      <header className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="flex flex-col gap-[13px] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {text.eyebrow}
            </p>

            <h1 className="mt-[5px] text-3xl font-bold text-gray-900">
              {text.title}
            </h1>

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {text.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddOpen(
                (current) =>
                  !current
              );
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className="romdoc-button romdoc-button-primary w-fit"
          >
            + {text.add}
          </button>
        </div>

        {addOpen && (
          <form
            onSubmit={
              handleAddPatient
            }
            className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50 p-[17px]"
          >
            <h2 className="font-bold text-gray-900">
              {text.addTitle}
            </h2>

            <p className="mt-[5px] text-sm leading-6 text-gray-600">
              {text.addDescription}
            </p>

            <div className="mt-[13px] grid gap-[13px] md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {text.name}
                </span>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={200}
                  value={
                    displayName
                  }
                  onChange={(
                    event
                  ) =>
                    setDisplayName(
                      event.target
                        .value
                    )
                  }
                  className="romdoc-input mt-[5px]"
                  disabled={
                    isSaving
                  }
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {text.email}{" "}
                  <span className="font-normal text-gray-500">
                    ({text.optional})
                  </span>
                </span>

                <input
                  type="email"
                  maxLength={320}
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  className="romdoc-input mt-[5px]"
                  disabled={
                    isSaving
                  }
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {text.phone}{" "}
                  <span className="font-normal text-gray-500">
                    ({text.optional})
                  </span>
                </span>

                <input
                  type="tel"
                  maxLength={50}
                  value={phone}
                  onChange={(
                    event
                  ) =>
                    setPhone(
                      event.target
                        .value
                    )
                  }
                  className="romdoc-input mt-[5px]"
                  disabled={
                    isSaving
                  }
                />
              </label>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="romdoc-notice romdoc-notice-error mt-[13px]"
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-[13px] flex flex-wrap gap-[8px]">
              <button
                type="submit"
                disabled={
                  isSaving
                }
                className="romdoc-button romdoc-button-primary romdoc-button-sm"
              >
                {isSaving
                  ? text.saving
                  : text.save}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAddOpen(
                    false
                  )
                }
                disabled={
                  isSaving
                }
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {text.cancel}
              </button>
            </div>
          </form>
        )}

        {successMessage && (
          <div
            role="status"
            className="romdoc-notice romdoc-notice-success mt-[13px]"
          >
            {successMessage}
          </div>
        )}
      </header>

      {loadError ? (
        <div className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm text-red-800">
          {text.loadError}
        </div>
      ) : (
        <section className="rounded-[21px] border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-[13px] border-b border-gray-200 p-[17px] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-gray-700">
              {patients.length}{" "}
              {text.patientCount}
            </div>

            <input
              type="search"
              value={query}
              onChange={(
                event
              ) =>
                setQuery(
                  event.target
                    .value
                )
              }
              placeholder={
                text.search
              }
              className="romdoc-input w-full sm:max-w-md"
            />
          </div>

          {patients.length ===
          0 ? (
            <div className="p-[34px] text-center">
              <h2 className="font-bold text-gray-900">
                {text.noPatients}
              </h2>

              <p className="mx-auto mt-[8px] max-w-xl text-sm leading-6 text-gray-600">
                {
                  text.noPatientsDescription
                }
              </p>
            </div>
          ) : filteredPatients.length ===
            0 ? (
            <div className="p-[34px] text-center text-sm text-gray-600">
              {text.noMatches}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(180px,1.2fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_110px_40px] gap-[13px] bg-gray-50 px-[17px] py-[8px] text-xs font-bold uppercase tracking-wide text-gray-500 lg:grid">
                <div>{text.patient}</div>
                <div>{text.contact}</div>
                <div>{text.last}</div>
                <div>{text.next}</div>
                <div>{text.account}</div>
                <div />
              </div>

              {filteredPatients.map(
                (patient) => {
                  const expanded =
                    expandedPatientId ===
                    patient.id;

                  const editing =
                    editingPatientId ===
                    patient.id;

                  const medicalHref =
                    patient.medicalAppointmentId
                      ? `/medical-folder/${patient.medicalAppointmentId}?locale=${locale}`
                      : null;

                  const messageHref =
                    patient.messageAppointmentId
                      ? `/appointments/${patient.messageAppointmentId}/messages?locale=${locale}`
                      : null;

                  const addressSummary =
                    [
                      patient.addressLine1,
                      patient.addressLine2,
                      [
                        patient.postalCode,
                        patient.city,
                      ]
                        .filter(Boolean)
                        .join(" "),
                      patient.county,
                      patient.country,
                    ]
                      .filter(Boolean)
                      .join(", ");

                  return (
                    <div
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
                        className="romdoc-focus-ring grid w-full gap-[8px] px-[17px] py-[13px] text-left hover:bg-gray-50 lg:grid-cols-[minmax(180px,1.4fr)_minmax(180px,1.2fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_110px_40px] lg:items-center lg:gap-[13px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {
                              patient.displayName
                            }
                          </p>
                        </div>

                        <div className="min-w-0 text-sm text-gray-600">
                          <p className="truncate">
                            {patient.email ??
                              text.noDate}
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
                          {formatAppointment(
                            patient.lastAppointment,
                            locale,
                            text.noDate
                          )}
                        </div>

                        <div className="text-sm text-gray-600">
                          {formatAppointment(
                            patient.nextAppointment,
                            locale,
                            text.noDate
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
                              ? text.romdocAccount
                              : text.contactOnly}
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
                          <div className="grid gap-[21px] xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                            <div className="space-y-[17px]">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                  {text.quickActions}
                                </p>

                                <div className="mt-[8px] flex flex-wrap gap-[8px]">
                                  {medicalHref ? (
                                    <>
                                      <Link
                                        href={
                                          medicalHref
                                        }
                                        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                      >
                                        {text.medical}
                                      </Link>

                                      <Link
                                        href={
                                          medicalHref
                                        }
                                        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                      >
                                        {text.folder}
                                      </Link>
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        title={
                                          text.medicalRequired
                                        }
                                        className="inline-flex min-h-[34px] cursor-not-allowed items-center rounded-[13px] border border-gray-200 bg-gray-100 px-[13px] py-[8px] text-sm font-semibold text-gray-400"
                                      >
                                        {text.medical}
                                      </span>

                                      <span
                                        title={
                                          text.medicalRequired
                                        }
                                        className="inline-flex min-h-[34px] cursor-not-allowed items-center rounded-[13px] border border-gray-200 bg-gray-100 px-[13px] py-[8px] text-sm font-semibold text-gray-400"
                                      >
                                        {text.folder}
                                      </span>
                                    </>
                                  )}

                                  {messageHref ? (
                                    <Link
                                      href={
                                        messageHref
                                      }
                                      className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                    >
                                      {text.message}
                                    </Link>
                                  ) : (
                                    <span
                                      title={
                                        text.accountRequired
                                      }
                                      className="inline-flex min-h-[34px] cursor-not-allowed items-center rounded-[13px] border border-gray-200 bg-gray-100 px-[13px] py-[8px] text-sm font-semibold text-gray-400"
                                    >
                                      {text.message}
                                    </span>
                                  )}

                                  <Link
                                    href={createAppointmentHref(
                                      patient
                                    )}
                                    className="romdoc-button romdoc-button-primary romdoc-button-sm"
                                  >
                                    {text.createAppointment}
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openContactEditor(
                                        patient
                                      )
                                    }
                                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                  >
                                    {editing
                                      ? text.hideContactAddress
                                      : text.editContactAddress}
                                  </button>

                                  {!patient.patientProfileId && (
                                    <button
                                      type="button"
                                      disabled={
                                        invitingPatientId ===
                                          patient.id ||
                                        !patient.email
                                      }
                                      onClick={() =>
                                        void sendInvite(
                                          patient
                                        )
                                      }
                                      title={
                                        !patient.email
                                          ? text.inviteNeedsEmail
                                          : undefined
                                      }
                                      className="romdoc-button romdoc-button-secondary romdoc-button-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {invitingPatientId ===
                                      patient.id
                                        ? text.inviting
                                        : text.invite}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[13px] border border-gray-200 bg-white p-[13px]">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                  {text.contactAddress}
                                </p>

                                <div className="mt-[8px] grid gap-[5px] text-sm text-gray-700 sm:grid-cols-2">
                                  <p>
                                    <strong>{text.email}:</strong>{" "}
                                    {patient.email ??
                                      text.notCompleted}
                                  </p>

                                  <p>
                                    <strong>{text.phone}:</strong>{" "}
                                    {patient.phone ??
                                      text.notCompleted}
                                  </p>

                                  <p className="sm:col-span-2">
                                    <strong>{text.addressLine1}:</strong>{" "}
                                    {addressSummary ||
                                      text.notCompleted}
                                  </p>
                                </div>

                                {patient.contactUpdatedAt && (
                                  <p className="mt-[8px] text-xs text-gray-500">
                                    {text.contactUpdated}:{" "}
                                    {formatDateTime(
                                      patient.contactUpdatedAt,
                                      locale,
                                      text.noDate
                                    )}
                                  </p>
                                )}

                                {patient.inviteLastSentAt &&
                                  !patient.patientProfileId && (
                                  <p className="mt-[5px] text-xs text-gray-500">
                                    {text.inviteHistory}:{" "}
                                    {formatDateTime(
                                      patient.inviteLastSentAt,
                                      locale,
                                      text.noDate
                                    )}
                                    {patient.inviteCount > 1
                                      ? ` · ${patient.inviteCount}`
                                      : ""}
                                  </p>
                                )}
                              </div>

                              {editing &&
                                contactDraft && (
                                <div className="rounded-[13px] border border-[#036661]/20 bg-white p-[17px]">
                                  <div className="grid gap-[13px] md:grid-cols-2">
                                    <label className="block md:col-span-2">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.name}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.displayName
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "displayName",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.email}
                                      </span>
                                      <input
                                        type="email"
                                        value={
                                          contactDraft.email
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "email",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.phone}
                                      </span>
                                      <input
                                        type="tel"
                                        value={
                                          contactDraft.phone
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "phone",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block md:col-span-2">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.addressLine1}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.addressLine1
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "addressLine1",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block md:col-span-2">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.addressLine2}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.addressLine2
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "addressLine2",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.city}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.city
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "city",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.county}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.county
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "county",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.postalCode}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.postalCode
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "postalCode",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="text-sm font-semibold text-gray-700">
                                        {text.country}
                                      </span>
                                      <input
                                        type="text"
                                        value={
                                          contactDraft.country
                                        }
                                        onChange={(event) =>
                                          updateDraft(
                                            "country",
                                            event.target.value
                                          )
                                        }
                                        className="romdoc-input mt-[5px]"
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-[13px] flex flex-wrap gap-[8px]">
                                    <button
                                      type="button"
                                      disabled={
                                        contactSavingId ===
                                        patient.id
                                      }
                                      onClick={() =>
                                        void saveContact(
                                          patient.id
                                        )
                                      }
                                      className="romdoc-button romdoc-button-primary romdoc-button-sm"
                                    >
                                      {contactSavingId ===
                                      patient.id
                                        ? text.contactSaving
                                        : text.saveContact}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        contactSavingId ===
                                        patient.id
                                      }
                                      onClick={() => {
                                        setEditingPatientId(
                                          null
                                        );
                                        setContactDraft(
                                          null
                                        );
                                      }}
                                      className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                                    >
                                      {text.cancel}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {rowMessage?.patientId ===
                                patient.id && (
                                <div
                                  role={
                                    rowMessage.kind ===
                                    "error"
                                      ? "alert"
                                      : "status"
                                  }
                                  className={
                                    rowMessage.kind ===
                                    "error"
                                      ? "romdoc-notice romdoc-notice-error"
                                      : "romdoc-notice romdoc-notice-success"
                                  }
                                >
                                  {rowMessage.text}
                                </div>
                              )}

                              {!patient.patientProfileId && (
                                <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-900">
                                  {text.accountRequired}{" "}
                                  {text.medicalRequired}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                {text.history}
                              </p>

                              {patient.history.length ===
                              0 ? (
                                <p className="mt-[8px] text-sm text-gray-600">
                                  {text.noHistory}
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
                                        className="flex flex-wrap items-center justify-between gap-[8px] border-b border-gray-100 px-[13px] py-[8px] last:border-b-0"
                                      >
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">
                                            {formatAppointment(
                                              {
                                                date:
                                                  appointment.date,
                                                time:
                                                  appointment.time,
                                              },
                                              locale,
                                              text.noDate
                                            )}
                                          </p>

                                          <p className="mt-[2px] text-xs text-gray-500">
                                            {getAppointmentStatusLabel(
                                              appointment.status as AppointmentStatus,
                                              locale
                                            )}
                                          </p>
                                        </div>

                                        {patient.patientProfileId ? (
                                          <Link
                                            href={`/appointments/${appointment.id}/messages?locale=${locale}`}
                                            className="text-xs font-semibold text-[#036661] hover:underline"
                                          >
                                            {text.open}
                                          </Link>
                                        ) : null}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
