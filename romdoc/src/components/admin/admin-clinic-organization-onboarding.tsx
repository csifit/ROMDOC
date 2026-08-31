"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type Props = {
  locale: AppLocale;
};

type FormState = {
  organizationName: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  managerFirstName: string;
  managerLastName: string;
  managerEmail: string;
  managerPhone: string;
  invitationLocale:
    "ro" | "en" | "de";
  trialMonths: number;
  personalMessage: string;
};

type ApiResponse = {
  error?: string;
  warning?: string;
  message?: string;
  organizationCreated?: boolean;
  invitationSent?: boolean;
  organization?: {
    id: string;
    name: string;
  };
};

const COPY = {
  ro: {
    eyebrow:
      "Onboarding asistat",
    cardTitle:
      "Adaugă organizație clinică",
    cardDescription:
      "Creează organizația și trimite invitația inițială managerului. Facturarea și locațiile se configurează în pasul următor.",
    cardAction:
      "Adaugă organizație",
    modalTitle:
      "Creează organizație clinică",
    modalDescription:
      "Administratorul pregătește contul organizației, iar managerul își stabilește singur parola prin invitația securizată.",
    organizationSection:
      "Organizație",
    organizationName:
      "Nume organizație",
    website:
      "Website",
    contactSection:
      "Contact organizație",
    contactNote:
      "Câmpurile sunt opționale. Dacă rămân necompletate, RomDoc folosește datele managerului inițial.",
    contactName:
      "Persoană de contact",
    contactEmail:
      "E-mail contact",
    contactPhone:
      "Telefon contact",
    managerSection:
      "Manager Clinică inițial",
    managerFirstName:
      "Prenume",
    managerLastName:
      "Nume",
    managerEmail:
      "E-mail cont",
    managerPhone:
      "Telefon",
    invitationSection:
      "Invitație și perioadă de test",
    language:
      "Limba invitației",
    trial:
      "Perioada de test",
    month1:
      "1 lună",
    month2:
      "2 luni",
    month3:
      "3 luni",
    trialNote:
      "Perioada de test începe numai când managerul acceptă invitația.",
    message:
      "Mesaj personalizat",
    messagePlaceholder:
      "Opțional: un scurt mesaj pentru organizație.",
    nextStep:
      "Datele de facturare și locațiile nu sunt create în acest pas. Acestea urmează în Step 113D.",
    cancel:
      "Anulează",
    create:
      "Creează organizația și invită managerul",
    creating:
      "Se creează...",
    close:
      "Închide",
    required:
      "Completează câmpurile obligatorii.",
    failed:
      "Organizația nu a putut fi creată.",
    success:
      "Organizația a fost creată și invitația managerului a fost trimisă.",
    partial:
      "Organizația a fost creată, dar fluxul invitației managerului nu a fost finalizat.",
  },
  en: {
    eyebrow:
      "Assisted onboarding",
    cardTitle:
      "Add clinic organisation",
    cardDescription:
      "Create the organisation and send the first manager invitation. Billing and locations are configured in the next step.",
    cardAction:
      "Add organisation",
    modalTitle:
      "Create clinic organisation",
    modalDescription:
      "The Administrator prepares the organisation account, while the manager sets their own password through the secure invitation.",
    organizationSection:
      "Organisation",
    organizationName:
      "Organisation name",
    website:
      "Website",
    contactSection:
      "Organisation contact",
    contactNote:
      "These fields are optional. If left empty, RomDoc uses the initial manager's details.",
    contactName:
      "Contact person",
    contactEmail:
      "Contact email",
    contactPhone:
      "Contact phone",
    managerSection:
      "Initial Clinic Manager",
    managerFirstName:
      "First name",
    managerLastName:
      "Last name",
    managerEmail:
      "Account email",
    managerPhone:
      "Phone",
    invitationSection:
      "Invitation and trial",
    language:
      "Invitation language",
    trial:
      "Trial period",
    month1:
      "1 month",
    month2:
      "2 months",
    month3:
      "3 months",
    trialNote:
      "The trial starts only when the manager accepts the invitation.",
    message:
      "Personal message",
    messagePlaceholder:
      "Optional: a short message for the organisation.",
    nextStep:
      "Billing details and locations are not created in this step. They follow in Step 113D.",
    cancel:
      "Cancel",
    create:
      "Create organisation and invite manager",
    creating:
      "Creating...",
    close:
      "Close",
    required:
      "Complete the required fields.",
    failed:
      "The organisation could not be created.",
    success:
      "The organisation was created and the manager invitation was sent.",
    partial:
      "The organisation was created, but the manager invitation workflow was not completed.",
  },
  de: {
    eyebrow:
      "Unterstütztes Onboarding",
    cardTitle:
      "Klinikorganisation hinzufügen",
    cardDescription:
      "Organisation erstellen und die erste Manager-Einladung senden. Rechnungsdaten und Standorte folgen im nächsten Schritt.",
    cardAction:
      "Organisation hinzufügen",
    modalTitle:
      "Klinikorganisation erstellen",
    modalDescription:
      "Der Administrator bereitet das Organisationskonto vor. Der Manager legt sein Passwort selbst über die sichere Einladung fest.",
    organizationSection:
      "Organisation",
    organizationName:
      "Name der Organisation",
    website:
      "Website",
    contactSection:
      "Organisationskontakt",
    contactNote:
      "Diese Felder sind optional. Wenn sie leer bleiben, verwendet RomDoc die Daten des ersten Managers.",
    contactName:
      "Kontaktperson",
    contactEmail:
      "Kontakt-E-Mail",
    contactPhone:
      "Kontakttelefon",
    managerSection:
      "Erster Klinikmanager",
    managerFirstName:
      "Vorname",
    managerLastName:
      "Nachname",
    managerEmail:
      "Konto-E-Mail",
    managerPhone:
      "Telefon",
    invitationSection:
      "Einladung und Testphase",
    language:
      "Sprache der Einladung",
    trial:
      "Testphase",
    month1:
      "1 Monat",
    month2:
      "2 Monate",
    month3:
      "3 Monate",
    trialNote:
      "Die Testphase beginnt erst, wenn der Manager die Einladung annimmt.",
    message:
      "Persönliche Nachricht",
    messagePlaceholder:
      "Optional: eine kurze Nachricht für die Organisation.",
    nextStep:
      "Rechnungsdaten und Standorte werden in diesem Schritt noch nicht erstellt. Sie folgen in Step 113D.",
    cancel:
      "Abbrechen",
    create:
      "Organisation erstellen und Manager einladen",
    creating:
      "Wird erstellt...",
    close:
      "Schließen",
    required:
      "Bitte die Pflichtfelder ausfüllen.",
    failed:
      "Die Organisation konnte nicht erstellt werden.",
    success:
      "Die Organisation wurde erstellt und die Manager-Einladung wurde gesendet.",
    partial:
      "Die Organisation wurde erstellt, aber der Einladungsprozess für den Manager wurde nicht abgeschlossen.",
  },
} as const;

function initialForm(
  locale: AppLocale
): FormState {
  return {
    organizationName:
      "",
    website:
      "",
    contactName:
      "",
    contactEmail:
      "",
    contactPhone:
      "",
    managerFirstName:
      "",
    managerLastName:
      "",
    managerEmail:
      "",
    managerPhone:
      "",
    invitationLocale:
      locale,
    trialMonths:
      3,
    personalMessage:
      "",
  };
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "tel" | "url";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">
        {label}
        {required
          ? " *"
          : ""}
      </span>

      <input
        type={
          type
        }
        required={
          required
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        onChange={(
          event:
            ChangeEvent<HTMLInputElement>
        ) =>
          onChange(
            event
              .target
              .value
          )
        }
        className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
      />
    </label>
  );
}

export default function AdminClinicOrganizationOnboarding({
  locale,
}: Props) {
  const copy =
    COPY[
      locale
    ];

  const router =
    useRouter();

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      () =>
        initialForm(
          locale
        )
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState<{
      type:
        | "success"
        | "warning";
      text: string;
    } | null>(
      null
    );

  useEffect(() => {
    if (
      !isOpen
    ) {
      return;
    }

    function handleKeyDown(
      event:
        KeyboardEvent
    ) {
      if (
        event.key ===
          "Escape" &&
        !isSaving
      ) {
        setIsOpen(
          false
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [
    isOpen,
    isSaving,
  ]);

  function update<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K]
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        [key]:
          value,
      })
    );
  }

  function openDialog() {
    setForm(
      initialForm(
        locale
      )
    );
    setError("");
    setNotice(
      null
    );
    setIsOpen(
      true
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (
      !form
        .organizationName
        .trim() ||
      !form
        .managerFirstName
        .trim() ||
      !form
        .managerLastName
        .trim() ||
      !form
        .managerEmail
        .trim()
    ) {
      setError(
        copy.required
      );
      return;
    }

    setIsSaving(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/clinic-organizations/onboarding",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                form
              ),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            copy.failed
        );
      }

      const invitationSent =
        result.invitationSent ===
        true;

      setNotice({
        type:
          invitationSent
            ? "success"
            : "warning",
        text:
          invitationSent
            ? result.message ??
              copy.success
            : result.warning ??
              copy.partial,
      });

      setIsOpen(
        false
      );

      router.refresh();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : copy.failed
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  return (
    <>
      <section className="rounded-[21px] border border-[#036661]/20 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="flex flex-col gap-[21px] md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#036661]">
              {
                copy.eyebrow
              }
            </p>

            <h2 className="mt-[8px] text-xl font-bold text-gray-950">
              {
                copy.cardTitle
              }
            </h2>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {
                copy.cardDescription
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              openDialog
            }
            className="romdoc-focus-ring shrink-0 rounded-[13px] bg-[#036661] px-[21px] py-[13px] font-semibold text-white transition-colors hover:bg-[#ff2800]"
          >
            {
              copy.cardAction
            }
          </button>
        </div>
      </section>

      {notice ? (
        <div
          role="status"
          className={`rounded-[13px] border p-[13px] text-sm ${
            notice.type ===
            "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {
            notice.text
          }
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[13px] sm:p-[21px]">
          <button
            type="button"
            aria-label={
              copy.close
            }
            onClick={() =>
              !isSaving &&
              setIsOpen(
                false
              )
            }
            className="absolute inset-0 bg-black/60"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-clinic-organization-onboarding-title"
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
          >
            <div className="flex items-start justify-between gap-[13px]">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {
                    copy.eyebrow
                  }
                </p>

                <h2
                  id="admin-clinic-organization-onboarding-title"
                  className="mt-[5px] text-2xl font-bold text-gray-950"
                >
                  {
                    copy.modalTitle
                  }
                </h2>

                <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                  {
                    copy.modalDescription
                  }
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isSaving
                }
                onClick={() =>
                  setIsOpen(
                    false
                  )
                }
                aria-label={
                  copy.close
                }
                className="romdoc-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-[21px] space-y-[21px]"
            >
              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {
                    copy.organizationSection
                  }
                </legend>

                <div className="grid gap-[13px] md:grid-cols-2">
                  <Field
                    label={
                      copy.organizationName
                    }
                    required
                    value={
                      form.organizationName
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "organizationName",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.website
                    }
                    value={
                      form.website
                    }
                    placeholder="https://"
                    onChange={(
                      value
                    ) =>
                      update(
                        "website",
                        value
                      )
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {
                    copy.contactSection
                  }
                </legend>

                <p className="mb-[13px] text-xs leading-5 text-gray-500">
                  {
                    copy.contactNote
                  }
                </p>

                <div className="grid gap-[13px] md:grid-cols-3">
                  <Field
                    label={
                      copy.contactName
                    }
                    value={
                      form.contactName
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "contactName",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.contactEmail
                    }
                    type="email"
                    value={
                      form.contactEmail
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "contactEmail",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.contactPhone
                    }
                    type="tel"
                    value={
                      form.contactPhone
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "contactPhone",
                        value
                      )
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {
                    copy.managerSection
                  }
                </legend>

                <div className="grid gap-[13px] md:grid-cols-2">
                  <Field
                    label={
                      copy.managerFirstName
                    }
                    required
                    value={
                      form.managerFirstName
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "managerFirstName",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.managerLastName
                    }
                    required
                    value={
                      form.managerLastName
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "managerLastName",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.managerEmail
                    }
                    required
                    type="email"
                    value={
                      form.managerEmail
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "managerEmail",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.managerPhone
                    }
                    type="tel"
                    value={
                      form.managerPhone
                    }
                    onChange={(
                      value
                    ) =>
                      update(
                        "managerPhone",
                        value
                      )
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {
                    copy.invitationSection
                  }
                </legend>

                <div className="grid gap-[13px] md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">
                      {
                        copy.language
                      }
                    </span>

                    <select
                      value={
                        form.invitationLocale
                      }
                      onChange={(
                        event:
                          ChangeEvent<HTMLSelectElement>
                      ) =>
                        update(
                          "invitationLocale",
                          event
                            .target
                            .value as
                            | "ro"
                            | "en"
                            | "de"
                        )
                      }
                      className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
                    >
                      <option value="ro">
                        Română
                      </option>
                      <option value="en">
                        English
                      </option>
                      <option value="de">
                        Deutsch
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">
                      {
                        copy.trial
                      }
                    </span>

                    <select
                      value={
                        form.trialMonths
                      }
                      onChange={(
                        event:
                          ChangeEvent<HTMLSelectElement>
                      ) =>
                        update(
                          "trialMonths",
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                      className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
                    >
                      <option value={1}>
                        {
                          copy.month1
                        }
                      </option>
                      <option value={2}>
                        {
                          copy.month2
                        }
                      </option>
                      <option value={3}>
                        {
                          copy.month3
                        }
                      </option>
                    </select>

                    <span className="mt-[5px] block text-xs leading-5 text-gray-500">
                      {
                        copy.trialNote
                      }
                    </span>
                  </label>
                </div>

                <label className="mt-[13px] block">
                  <span className="flex items-center justify-between gap-[13px] text-sm font-semibold text-gray-700">
                    <span>
                      {
                        copy.message
                      }
                    </span>
                    <span className="text-xs font-normal text-gray-500">
                      {
                        form.personalMessage.length
                      }
                      /1000
                    </span>
                  </span>

                  <textarea
                    rows={5}
                    maxLength={
                      1000
                    }
                    value={
                      form.personalMessage
                    }
                    placeholder={
                      copy.messagePlaceholder
                    }
                    onChange={(
                      event:
                        ChangeEvent<HTMLTextAreaElement>
                    ) =>
                      update(
                        "personalMessage",
                        event
                          .target
                          .value
                      )
                    }
                    className="romdoc-focus-ring mt-[5px] w-full rounded-[10px] border border-gray-300 bg-white px-[13px] py-[13px] text-gray-900"
                  />
                </label>
              </fieldset>

              <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-900">
                {
                  copy.nextStep
                }
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
                >
                  {
                    error
                  }
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-[8px] sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsOpen(
                      false
                    )
                  }
                  className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                >
                  {
                    copy.cancel
                  }
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="romdoc-button romdoc-button-primary romdoc-button-sm"
                >
                  {isSaving
                    ? copy.creating
                    : copy.create}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
