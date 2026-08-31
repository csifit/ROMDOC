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

import GooglePlaceAutocomplete, {
  type GooglePlaceAutocompleteCopy,
} from "@/components/clinic/google-place-autocomplete";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type Props = {
  locale: AppLocale;
};

type BillingState = {
  companyName: string;
  taxId: string;
  tradeRegisterNumber: string;
  billingAddress: string;
  billingCity: string;
  billingCounty: string;
  billingCountry: string;
  billingEmail: string;
  isVatPayer: boolean;
  vatNumber: string;
};

type LocationState = {
  clientId: string;
  name: string;
  placeId: string;
  formattedAddress: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  description: string;
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
    | "ro"
    | "en"
    | "de";
  trialMonths: number;
  personalMessage: string;
  billing: BillingState;
  locations: LocationState[];
};

type ApiResponse = {
  error?: string;
  warning?: string;
  message?: string;
  organizationCreated?: boolean;
  billingCreated?: boolean;
  locationsCreated?: number;
  invitationSent?: boolean;
};

const COPY = {
  ro: {
    eyebrow:
      "Onboarding asistat",
    cardTitle:
      "Adaugă organizație clinică",
    cardDescription:
      "Creează organizația, facturarea și locațiile, apoi trimite invitația inițială managerului.",
    cardAction:
      "Adaugă organizație",
    modalTitle:
      "Creează organizație clinică",
    modalDescription:
      "Configurează contul organizației înainte ca managerul să își activeze accesul.",
    organizationSection:
      "Organizație",
    organizationName:
      "Nume organizație",
    website:
      "Website",
    contactSection:
      "Contact organizație",
    contactNote:
      "Dacă rămân necompletate, RomDoc folosește datele managerului inițial.",
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
    billingSection:
      "Date de facturare",
    companyName:
      "Denumire juridică",
    taxId:
      "Cod fiscal / CUI",
    tradeRegisterNumber:
      "Număr Registrul Comerțului",
    billingAddress:
      "Adresă de facturare",
    billingCity:
      "Localitate",
    billingCounty:
      "Județ / regiune",
    billingCountry:
      "Țară",
    billingEmail:
      "E-mail facturare",
    vatPayer:
      "Plătitor de TVA",
    vatNumber:
      "Cod TVA",
    locationsSection:
      "Locațiile organizației",
    locationsDescription:
      "Adaugă cel puțin o locație. Adresele sunt verificate prin Google Places și sunt aprobate direct deoarece sunt create de Administrator.",
    location:
      "Locație",
    locationName:
      "Nume locație",
    addressLine2:
      "Etaj / cabinet / detalii adresă",
    locationPhone:
      "Telefon locație",
    locationEmail:
      "E-mail locație",
    locationWebsite:
      "Website locație",
    locationDescription:
      "Descriere",
    addLocation:
      "Adaugă altă locație",
    removeLocation:
      "Elimină locația",
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
    cancel:
      "Anulează",
    create:
      "Finalizează onboardingul și invită managerul",
    creating:
      "Se creează...",
    close:
      "Închide",
    required:
      "Completează toate câmpurile obligatorii și selectează adresa Google pentru fiecare locație.",
    failed:
      "Onboardingul organizației nu a putut fi finalizat.",
    success:
      "Organizația, facturarea și locațiile au fost create, iar invitația managerului a fost trimisă.",
    partial:
      "O parte din onboarding a fost salvată, dar fluxul nu a fost finalizat.",
  },
  en: {
    eyebrow:
      "Assisted onboarding",
    cardTitle:
      "Add clinic organisation",
    cardDescription:
      "Create the organisation, billing and locations, then send the initial manager invitation.",
    cardAction:
      "Add organisation",
    modalTitle:
      "Create clinic organisation",
    modalDescription:
      "Configure the organisation account before the manager activates access.",
    organizationSection:
      "Organisation",
    organizationName:
      "Organisation name",
    website:
      "Website",
    contactSection:
      "Organisation contact",
    contactNote:
      "If left empty, RomDoc uses the initial manager's details.",
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
    billingSection:
      "Billing details",
    companyName:
      "Legal company name",
    taxId:
      "Tax ID",
    tradeRegisterNumber:
      "Trade-register number",
    billingAddress:
      "Billing address",
    billingCity:
      "City",
    billingCounty:
      "County / region",
    billingCountry:
      "Country",
    billingEmail:
      "Billing email",
    vatPayer:
      "VAT payer",
    vatNumber:
      "VAT number",
    locationsSection:
      "Organisation locations",
    locationsDescription:
      "Add at least one location. Addresses are verified through Google Places and approved directly because they are created by an Administrator.",
    location:
      "Location",
    locationName:
      "Location name",
    addressLine2:
      "Floor / suite / address details",
    locationPhone:
      "Location phone",
    locationEmail:
      "Location email",
    locationWebsite:
      "Location website",
    locationDescription:
      "Description",
    addLocation:
      "Add another location",
    removeLocation:
      "Remove location",
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
    cancel:
      "Cancel",
    create:
      "Complete onboarding and invite manager",
    creating:
      "Creating...",
    close:
      "Close",
    required:
      "Complete all required fields and select a Google address for every location.",
    failed:
      "The organisation onboarding could not be completed.",
    success:
      "The organisation, billing and locations were created and the manager invitation was sent.",
    partial:
      "Part of the onboarding was saved, but the workflow was not completed.",
  },
  de: {
    eyebrow:
      "Unterstütztes Onboarding",
    cardTitle:
      "Klinikorganisation hinzufügen",
    cardDescription:
      "Organisation, Rechnungsdaten und Standorte erstellen und danach den ersten Manager einladen.",
    cardAction:
      "Organisation hinzufügen",
    modalTitle:
      "Klinikorganisation erstellen",
    modalDescription:
      "Konfigurieren Sie das Organisationskonto, bevor der Manager seinen Zugang aktiviert.",
    organizationSection:
      "Organisation",
    organizationName:
      "Name der Organisation",
    website:
      "Website",
    contactSection:
      "Organisationskontakt",
    contactNote:
      "Wenn die Felder leer bleiben, verwendet RomDoc die Daten des ersten Managers.",
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
    billingSection:
      "Rechnungsdaten",
    companyName:
      "Rechtlicher Firmenname",
    taxId:
      "Steuernummer",
    tradeRegisterNumber:
      "Handelsregisternummer",
    billingAddress:
      "Rechnungsadresse",
    billingCity:
      "Ort",
    billingCounty:
      "Kreis / Region",
    billingCountry:
      "Land",
    billingEmail:
      "Rechnungs-E-Mail",
    vatPayer:
      "Umsatzsteuerpflichtig",
    vatNumber:
      "USt-IdNr.",
    locationsSection:
      "Standorte der Organisation",
    locationsDescription:
      "Fügen Sie mindestens einen Standort hinzu. Adressen werden über Google Places geprüft und direkt freigegeben, da sie von einem Administrator erstellt werden.",
    location:
      "Standort",
    locationName:
      "Name des Standorts",
    addressLine2:
      "Etage / Praxis / Adresszusatz",
    locationPhone:
      "Telefon des Standorts",
    locationEmail:
      "E-Mail des Standorts",
    locationWebsite:
      "Website des Standorts",
    locationDescription:
      "Beschreibung",
    addLocation:
      "Weiteren Standort hinzufügen",
    removeLocation:
      "Standort entfernen",
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
    cancel:
      "Abbrechen",
    create:
      "Onboarding abschließen und Manager einladen",
    creating:
      "Wird erstellt...",
    close:
      "Schließen",
    required:
      "Bitte alle Pflichtfelder ausfüllen und für jeden Standort eine Google-Adresse auswählen.",
    failed:
      "Das Onboarding der Organisation konnte nicht abgeschlossen werden.",
    success:
      "Organisation, Rechnungsdaten und Standorte wurden erstellt und die Manager-Einladung wurde gesendet.",
    partial:
      "Ein Teil des Onboardings wurde gespeichert, der Vorgang wurde jedoch nicht vollständig abgeschlossen.",
  },
} as const;

const GOOGLE_COPY:
  Record<
    AppLocale,
    GooglePlaceAutocompleteCopy
  > = {
    ro: {
      placeholder:
        "Caută adresa locației",
      importUnavailable:
        "Google Maps nu este disponibil.",
      elementUnavailable:
        "Google Places nu a furnizat selectorul de adresă.",
      predictionMissing:
        "Google nu a returnat sugestia selectată.",
      placeIdMissing:
        "Google nu a returnat identificatorul adresei.",
      verifyError:
        "Adresa nu a putut fi verificată.",
      loadError:
        "Google Places nu a putut fi încărcat.",
      label:
        "Adresa locației",
      help:
        "Selectează o adresă din lista Google",
      loading:
        "Se încarcă Google Places...",
      verifying:
        "Adresa este verificată...",
      selected:
        "Adresă selectată",
      city:
        "Oraș",
      region:
        "Regiune",
      postalCode:
        "Cod poștal",
      country:
        "Țară",
    },
    en: {
      placeholder:
        "Search location address",
      importUnavailable:
        "Google Maps is unavailable.",
      elementUnavailable:
        "Google Places did not provide the address selector.",
      predictionMissing:
        "Google did not return the selected suggestion.",
      placeIdMissing:
        "Google did not return the address identifier.",
      verifyError:
        "The address could not be verified.",
      loadError:
        "Google Places could not be loaded.",
      label:
        "Location address",
      help:
        "Select an address from Google",
      loading:
        "Loading Google Places...",
      verifying:
        "Verifying address...",
      selected:
        "Selected address",
      city:
        "City",
      region:
        "Region",
      postalCode:
        "Postal code",
      country:
        "Country",
    },
    de: {
      placeholder:
        "Standortadresse suchen",
      importUnavailable:
        "Google Maps ist nicht verfügbar.",
      elementUnavailable:
        "Google Places hat die Adressauswahl nicht bereitgestellt.",
      predictionMissing:
        "Google hat den ausgewählten Vorschlag nicht zurückgegeben.",
      placeIdMissing:
        "Google hat keine Adress-ID zurückgegeben.",
      verifyError:
        "Die Adresse konnte nicht überprüft werden.",
      loadError:
        "Google Places konnte nicht geladen werden.",
      label:
        "Standortadresse",
      help:
        "Adresse aus Google auswählen",
      loading:
        "Google Places wird geladen...",
      verifying:
        "Adresse wird überprüft...",
      selected:
        "Ausgewählte Adresse",
      city:
        "Ort",
      region:
        "Region",
      postalCode:
        "Postleitzahl",
      country:
        "Land",
    },
  };

function newLocation(
  clientId =
    crypto.randomUUID()
): LocationState {
  return {
    clientId,
    name:
      "",
    placeId:
      "",
    formattedAddress:
      "",
    addressLine2:
      "",
    phone:
      "",
    email:
      "",
    website:
      "",
    description:
      "",
  };
}

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
    billing: {
      companyName:
        "",
      taxId:
        "",
      tradeRegisterNumber:
        "",
      billingAddress:
        "",
      billingCity:
        "",
      billingCounty:
        "",
      billingCountry:
        "România",
      billingEmail:
        "",
      isVatPayer:
        false,
      vatNumber:
        "",
    },
    locations: [
      newLocation(
        "location-1"
      ),
    ],
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
  onChange:
    (value: string) =>
      void;
  required?: boolean;
  type?:
    | "text"
    | "email"
    | "tel";
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

  function updateBilling<
    K extends keyof BillingState,
  >(
    key: K,
    value: BillingState[K]
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        billing: {
          ...current.billing,
          [key]:
            value,
        },
      })
    );
  }

  function updateLocation(
    clientId: string,
    patch:
      Partial<LocationState>
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        locations:
          current.locations.map(
            (
              location
            ) =>
              location.clientId ===
              clientId
                ? {
                    ...location,
                    ...patch,
                  }
                : location
          ),
      })
    );
  }

  function addLocation() {
    setForm(
      (
        current
      ) => ({
        ...current,
        locations: [
          ...current.locations,
          newLocation(),
        ],
      })
    );
  }

  function removeLocation(
    clientId: string
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        locations:
          current.locations.length <=
          1
            ? current.locations
            : current.locations.filter(
                (
                  location
                ) =>
                  location.clientId !==
                  clientId
              ),
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

  function hasRequiredFields() {
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
      return false;
    }

    const billing =
      form.billing;

    if (
      !billing
        .companyName
        .trim() ||
      !billing
        .taxId
        .trim() ||
      !billing
        .billingAddress
        .trim() ||
      !billing
        .billingCity
        .trim() ||
      !billing
        .billingCounty
        .trim() ||
      !billing
        .billingCountry
        .trim() ||
      !billing
        .billingEmail
        .trim() ||
      (
        billing
          .isVatPayer &&
        !billing
          .vatNumber
          .trim()
      )
    ) {
      return false;
    }

    return form.locations.every(
      (
        location
      ) =>
        Boolean(
          location.name
            .trim()
        ) &&
        Boolean(
          location.placeId
            .trim()
        )
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (
      !hasRequiredFields()
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
      const payload = {
        ...form,
        locations:
          form.locations.map(
            ({
              clientId:
                _clientId,
              formattedAddress:
                _formattedAddress,
              ...location
            }) =>
              location
          ),
      };

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
                payload
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

      const completed =
        result.organizationCreated ===
          true &&
        result.billingCreated ===
          true &&
        (
          result.locationsCreated ??
          0
        ) ===
          form.locations.length &&
        result.invitationSent ===
          true;

      setNotice({
        type:
          completed
            ? "success"
            : "warning",
        text:
          completed
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
            className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
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

                <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
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
                    copy.billingSection
                  }
                </legend>

                <div className="grid gap-[13px] md:grid-cols-2">
                  <Field
                    label={
                      copy.companyName
                    }
                    required
                    value={
                      form.billing
                        .companyName
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "companyName",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.taxId
                    }
                    required
                    value={
                      form.billing
                        .taxId
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "taxId",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.tradeRegisterNumber
                    }
                    value={
                      form.billing
                        .tradeRegisterNumber
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "tradeRegisterNumber",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.billingEmail
                    }
                    required
                    type="email"
                    value={
                      form.billing
                        .billingEmail
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "billingEmail",
                        value
                      )
                    }
                  />

                  <div className="md:col-span-2">
                    <Field
                      label={
                        copy.billingAddress
                      }
                      required
                      value={
                        form.billing
                          .billingAddress
                      }
                      onChange={(
                        value
                      ) =>
                        updateBilling(
                          "billingAddress",
                          value
                        )
                      }
                    />
                  </div>

                  <Field
                    label={
                      copy.billingCity
                    }
                    required
                    value={
                      form.billing
                        .billingCity
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "billingCity",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.billingCounty
                    }
                    required
                    value={
                      form.billing
                        .billingCounty
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "billingCounty",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.billingCountry
                    }
                    required
                    value={
                      form.billing
                        .billingCountry
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "billingCountry",
                        value
                      )
                    }
                  />

                  <Field
                    label={
                      copy.vatNumber
                    }
                    required={
                      form.billing
                        .isVatPayer
                    }
                    value={
                      form.billing
                        .vatNumber
                    }
                    onChange={(
                      value
                    ) =>
                      updateBilling(
                        "vatNumber",
                        value
                      )
                    }
                  />
                </div>

                <label className="mt-[13px] flex items-center gap-[8px] text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={
                      form.billing
                        .isVatPayer
                    }
                    onChange={(
                      event:
                        ChangeEvent<HTMLInputElement>
                    ) =>
                      updateBilling(
                        "isVatPayer",
                        event
                          .target
                          .checked
                      )
                    }
                    className="h-4 w-4"
                  />

                  {
                    copy.vatPayer
                  }
                </label>
              </fieldset>

              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {
                    copy.locationsSection
                  }
                </legend>

                <p className="mb-[13px] text-xs leading-5 text-gray-500">
                  {
                    copy.locationsDescription
                  }
                </p>

                <div className="space-y-[21px]">
                  {form.locations.map(
                    (
                      location,
                      index
                    ) => (
                      <section
                        key={
                          location.clientId
                        }
                        className="rounded-[13px] border border-gray-200 bg-[#F0EEE9] p-[13px] sm:p-[21px]"
                      >
                        <div className="flex items-center justify-between gap-[13px]">
                          <h3 className="font-bold text-gray-900">
                            {
                              copy.location
                            }{" "}
                            {index +
                              1}
                          </h3>

                          {form
                            .locations
                            .length >
                          1 ? (
                            <button
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                removeLocation(
                                  location.clientId
                                )
                              }
                              className="romdoc-focus-ring rounded-[8px] border border-red-200 bg-white px-[10px] py-[5px] text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              {
                                copy.removeLocation
                              }
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-[13px] grid gap-[13px] md:grid-cols-2">
                          <Field
                            label={
                              copy.locationName
                            }
                            required
                            value={
                              location.name
                            }
                            onChange={(
                              value
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  name:
                                    value,
                                }
                              )
                            }
                          />

                          <Field
                            label={
                              copy.addressLine2
                            }
                            value={
                              location.addressLine2
                            }
                            onChange={(
                              value
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  addressLine2:
                                    value,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="mt-[13px] rounded-[13px] bg-white p-[13px]">
                          <GooglePlaceAutocomplete
                            disabled={
                              isSaving
                            }
                            locale={
                              locale
                            }
                            copy={
                              GOOGLE_COPY[
                                locale
                              ]
                            }
                            onAddressSelected={(
                              address:
                                GoogleClinicAddress
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  placeId:
                                    address.placeId,
                                  formattedAddress:
                                    address.formattedAddress,
                                }
                              )
                            }
                          />
                        </div>

                        <div className="mt-[13px] grid gap-[13px] md:grid-cols-3">
                          <Field
                            label={
                              copy.locationPhone
                            }
                            type="tel"
                            value={
                              location.phone
                            }
                            onChange={(
                              value
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  phone:
                                    value,
                                }
                              )
                            }
                          />

                          <Field
                            label={
                              copy.locationEmail
                            }
                            type="email"
                            value={
                              location.email
                            }
                            onChange={(
                              value
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  email:
                                    value,
                                }
                              )
                            }
                          />

                          <Field
                            label={
                              copy.locationWebsite
                            }
                            value={
                              location.website
                            }
                            placeholder="https://"
                            onChange={(
                              value
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  website:
                                    value,
                                }
                              )
                            }
                          />
                        </div>

                        <label className="mt-[13px] block">
                          <span className="text-sm font-semibold text-gray-700">
                            {
                              copy.locationDescription
                            }
                          </span>

                          <textarea
                            rows={3}
                            maxLength={
                              3000
                            }
                            value={
                              location.description
                            }
                            onChange={(
                              event:
                                ChangeEvent<HTMLTextAreaElement>
                            ) =>
                              updateLocation(
                                location.clientId,
                                {
                                  description:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            className="romdoc-focus-ring mt-[5px] w-full rounded-[10px] border border-gray-300 bg-white px-[13px] py-[13px] text-gray-900"
                          />
                        </label>
                      </section>
                    )
                  )}
                </div>

                {form
                  .locations
                  .length <
                10 ? (
                  <button
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={
                      addLocation
                    }
                    className="romdoc-focus-ring mt-[13px] rounded-[10px] border border-[#036661] bg-white px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:bg-[#036661] hover:text-white"
                  >
                    +{" "}
                    {
                      copy.addLocation
                    }
                  </button>
                ) : null}
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
