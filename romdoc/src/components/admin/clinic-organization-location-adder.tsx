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
  organizationId: string;
  organizationName: string;
};

type FormState = {
  name: string;
  placeId: string;
  formattedAddress: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  description: string;
};

type ApiResponse = {
  error?: string;
  message?: string;
};

const COPY = {
  ro: {
    button: "Adaugă locație",
    title: "Adaugă locație",
    description:
      "Adaugă o locație pentru această organizație activă. Locația creată de Administrator este aprobată și activată automat.",
    name: "Nume locație",
    addressLine2: "Etaj / cabinet / detalii adresă",
    phone: "Telefon",
    email: "E-mail",
    website: "Website",
    locationDescription: "Descriere",
    cancel: "Anulează",
    save: "Adaugă și activează locația",
    saving: "Se adaugă...",
    close: "Închide",
    required:
      "Introdu numele locației și selectează adresa din lista Google.",
    failed: "Locația nu a putut fi adăugată.",
    success: "Locația a fost adăugată și activată.",
  },
  en: {
    button: "Add location",
    title: "Add location",
    description:
      "Add a location for this active organisation. A location created by an Administrator is approved and activated automatically.",
    name: "Location name",
    addressLine2: "Floor / suite / address details",
    phone: "Phone",
    email: "Email",
    website: "Website",
    locationDescription: "Description",
    cancel: "Cancel",
    save: "Add and activate location",
    saving: "Adding...",
    close: "Close",
    required:
      "Enter the location name and select the address from Google.",
    failed: "The location could not be added.",
    success: "The location was added and activated.",
  },
  de: {
    button: "Standort hinzufügen",
    title: "Standort hinzufügen",
    description:
      "Fügen Sie dieser aktiven Organisation einen Standort hinzu. Ein vom Administrator erstellter Standort wird automatisch genehmigt und aktiviert.",
    name: "Name des Standorts",
    addressLine2: "Etage / Praxis / Adresszusatz",
    phone: "Telefon",
    email: "E-Mail",
    website: "Website",
    locationDescription: "Beschreibung",
    cancel: "Abbrechen",
    save: "Standort hinzufügen und aktivieren",
    saving: "Wird hinzugefügt...",
    close: "Schließen",
    required:
      "Geben Sie den Standortnamen ein und wählen Sie die Adresse aus Google.",
    failed: "Der Standort konnte nicht hinzugefügt werden.",
    success: "Der Standort wurde hinzugefügt und aktiviert.",
  },
} as const;

const GOOGLE_COPY: Record<
  AppLocale,
  GooglePlaceAutocompleteCopy
> = {
  ro: {
    placeholder: "Caută adresa locației",
    importUnavailable: "Google Maps nu este disponibil.",
    elementUnavailable:
      "Google Places nu a furnizat selectorul de adresă.",
    predictionMissing:
      "Google nu a returnat sugestia selectată.",
    placeIdMissing:
      "Google nu a returnat identificatorul adresei.",
    verifyError: "Adresa nu a putut fi verificată.",
    loadError: "Google Places nu a putut fi încărcat.",
    label: "Adresa locației",
    help: "Selectează o adresă din lista Google",
    loading: "Se încarcă Google Places...",
    verifying: "Adresa este verificată...",
    selected: "Adresă selectată",
    city: "Oraș",
    region: "Regiune",
    postalCode: "Cod poștal",
    country: "Țară",
  },
  en: {
    placeholder: "Search location address",
    importUnavailable: "Google Maps is unavailable.",
    elementUnavailable:
      "Google Places did not provide the address selector.",
    predictionMissing:
      "Google did not return the selected suggestion.",
    placeIdMissing:
      "Google did not return the address identifier.",
    verifyError: "The address could not be verified.",
    loadError: "Google Places could not be loaded.",
    label: "Location address",
    help: "Select an address from Google",
    loading: "Loading Google Places...",
    verifying: "Verifying address...",
    selected: "Selected address",
    city: "City",
    region: "Region",
    postalCode: "Postal code",
    country: "Country",
  },
  de: {
    placeholder: "Standortadresse suchen",
    importUnavailable: "Google Maps ist nicht verfügbar.",
    elementUnavailable:
      "Google Places hat die Adressauswahl nicht bereitgestellt.",
    predictionMissing:
      "Google hat den ausgewählten Vorschlag nicht zurückgegeben.",
    placeIdMissing:
      "Google hat keine Adress-ID zurückgegeben.",
    verifyError: "Die Adresse konnte nicht überprüft werden.",
    loadError: "Google Places konnte nicht geladen werden.",
    label: "Standortadresse",
    help: "Adresse aus Google auswählen",
    loading: "Google Places wird geladen...",
    verifying: "Adresse wird überprüft...",
    selected: "Ausgewählte Adresse",
    city: "Ort",
    region: "Region",
    postalCode: "Postleitzahl",
    country: "Land",
  },
};

function initialForm(): FormState {
  return {
    name: "",
    placeId: "",
    formattedAddress: "",
    addressLine2: "",
    phone: "",
    email: "",
    website: "",
    description: "",
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
  type?: "text" | "email" | "tel";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
      />
    </label>
  );
}

export default function ClinicOrganizationLocationAdder({
  locale,
  organizationId,
  organizationName,
}: Props) {
  const copy = COPY[locale];
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving]);

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openModal() {
    setForm(initialForm());
    setError("");
    setSuccess("");
    setIsOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.placeId.trim()) {
      setError(copy.required);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/admin/clinic-organizations/${encodeURIComponent(
          organizationId
        )}/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            name: form.name,
            placeId: form.placeId,
            addressLine2: form.addressLine2,
            phone: form.phone,
            email: form.email,
            website: form.website,
            description: form.description,
          }),
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(result.error ?? copy.failed);
      }

      setSuccess(result.message ?? copy.success);

      setTimeout(() => {
        setIsOpen(false);
        setSuccess("");
        router.refresh();
      }, 600);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : copy.failed
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="romdoc-focus-ring mt-[10px] inline-flex min-h-[34px] items-center rounded-[8px] border border-[#036661] bg-white px-[10px] py-[5px] text-xs font-semibold text-[#036661] transition hover:bg-[#036661] hover:text-white"
      >
        + {copy.button}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-[13px] sm:p-[21px]">
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => !isSaving && setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`clinic-location-adder-${organizationId}`}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
          >
            <div className="flex items-start justify-between gap-[13px]">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {organizationName}
                </p>

                <h2
                  id={`clinic-location-adder-${organizationId}`}
                  className="mt-[5px] text-2xl font-bold text-gray-950"
                >
                  {copy.title}
                </h2>

                <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
                  {copy.description}
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
                aria-label={copy.close}
                className="romdoc-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-[21px] space-y-[21px]"
            >
              <Field
                label={copy.name}
                required
                value={form.name}
                onChange={(value) => update("name", value)}
              />

              <div className="rounded-[13px] border border-gray-200 bg-[#F0EEE9] p-[13px]">
                <GooglePlaceAutocomplete
                  disabled={isSaving}
                  locale={locale}
                  copy={GOOGLE_COPY[locale]}
                  onAddressSelected={(address: GoogleClinicAddress) =>
                    setForm((current) => ({
                      ...current,
                      placeId: address.placeId,
                      formattedAddress: address.formattedAddress,
                    }))
                  }
                />
              </div>

              <Field
                label={copy.addressLine2}
                value={form.addressLine2}
                onChange={(value) => update("addressLine2", value)}
              />

              <div className="grid gap-[13px] md:grid-cols-3">
                <Field
                  label={copy.phone}
                  type="tel"
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                />

                <Field
                  label={copy.email}
                  type="email"
                  value={form.email}
                  onChange={(value) => update("email", value)}
                />

                <Field
                  label={copy.website}
                  value={form.website}
                  placeholder="https://"
                  onChange={(value) => update("website", value)}
                />
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">
                  {copy.locationDescription}
                </span>

                <textarea
                  rows={4}
                  maxLength={3000}
                  value={form.description}
                  onChange={(
                    event: ChangeEvent<HTMLTextAreaElement>
                  ) =>
                    update("description", event.target.value)
                  }
                  className="romdoc-focus-ring mt-[5px] w-full rounded-[10px] border border-gray-300 bg-white px-[13px] py-[13px] text-gray-900"
                />
              </label>

              {error ? (
                <div
                  role="alert"
                  className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
                >
                  {error}
                </div>
              ) : null}

              {success ? (
                <div
                  role="status"
                  className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
                >
                  {success}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-[8px]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsOpen(false)}
                  className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                >
                  {copy.cancel}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="romdoc-button romdoc-button-primary romdoc-button-sm"
                >
                  {isSaving ? copy.saving : copy.save}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
