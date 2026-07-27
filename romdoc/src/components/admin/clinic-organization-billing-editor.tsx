"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import type { AppLocale } from "@/lib/i18n/app-locale";

type BillingProfile = {
  company_name: string;
  tax_id: string;
  trade_register_number: string | null;
  billing_address: string;
  billing_city: string;
  billing_county: string;
  billing_country: string;
  billing_email: string;
  is_vat_payer: boolean;
  vat_number: string | null;
} | null;

type Props = {
  locale: AppLocale;
  organizationId: string;
  organizationName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingProfile: BillingProfile;
};

type FormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
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

const COPY = {
  ro: {
    edit: "Editează detalii",
    title: "Date administrative și de facturare",
    description:
      "Actualizează identitatea juridică, adresa de facturare și persoana principală de contact.",
    contactSection: "Contact organizație",
    billingSection: "Date facturare",
    contactName: "Nume persoană de contact",
    contactEmail: "E-mail contact",
    contactPhone: "Telefon contact",
    companyName: "Denumire juridică",
    taxId: "Cod fiscal / CUI",
    tradeRegisterNumber: "Număr Registrul Comerțului",
    billingAddress: "Adresă de facturare",
    billingCity: "Localitate",
    billingCounty: "Județ / regiune",
    billingCountry: "Țară",
    billingEmail: "E-mail facturare",
    vatPayer: "Plătitor de TVA",
    vatNumber: "Cod TVA",
    save: "Salvează",
    saving: "Se salvează...",
    cancel: "Anulează",
    close: "Închide",
    required: "Completează câmpurile obligatorii.",
    failed: "Datele nu au putut fi salvate.",
  },
  en: {
    edit: "Edit details",
    title: "Administrative and billing details",
    description:
      "Update the legal identity, invoicing address and main organisation contact.",
    contactSection: "Organisation contact",
    billingSection: "Billing details",
    contactName: "Contact person",
    contactEmail: "Contact email",
    contactPhone: "Contact phone",
    companyName: "Legal company name",
    taxId: "Tax identification number",
    tradeRegisterNumber: "Trade-register number",
    billingAddress: "Invoicing address",
    billingCity: "City",
    billingCounty: "County / region",
    billingCountry: "Country",
    billingEmail: "Billing email",
    vatPayer: "VAT payer",
    vatNumber: "VAT number",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    required: "Complete the required fields.",
    failed: "The details could not be saved.",
  },
  de: {
    edit: "Daten bearbeiten",
    title: "Verwaltungs- und Rechnungsdaten",
    description:
      "Rechtliche Identität, Rechnungsadresse und Hauptkontakt der Organisation aktualisieren.",
    contactSection: "Organisationskontakt",
    billingSection: "Rechnungsdaten",
    contactName: "Kontaktperson",
    contactEmail: "Kontakt-E-Mail",
    contactPhone: "Kontakttelefon",
    companyName: "Rechtlicher Firmenname",
    taxId: "Steuernummer",
    tradeRegisterNumber: "Handelsregisternummer",
    billingAddress: "Rechnungsadresse",
    billingCity: "Ort",
    billingCounty: "Kreis / Region",
    billingCountry: "Land",
    billingEmail: "Rechnungs-E-Mail",
    vatPayer: "Umsatzsteuerpflichtig",
    vatNumber: "USt-IdNr.",
    save: "Speichern",
    saving: "Wird gespeichert...",
    cancel: "Abbrechen",
    close: "Schließen",
    required: "Bitte die Pflichtfelder ausfüllen.",
    failed: "Die Daten konnten nicht gespeichert werden.",
  },
} as const;

function initialForm(props: Props): FormState {
  return {
    contactName: props.contactName ?? "",
    contactEmail: props.contactEmail ?? "",
    contactPhone: props.contactPhone ?? "",
    companyName:
      props.billingProfile?.company_name ?? props.organizationName,
    taxId: props.billingProfile?.tax_id ?? "",
    tradeRegisterNumber:
      props.billingProfile?.trade_register_number ?? "",
    billingAddress: props.billingProfile?.billing_address ?? "",
    billingCity: props.billingProfile?.billing_city ?? "",
    billingCounty: props.billingProfile?.billing_county ?? "",
    billingCountry: props.billingProfile?.billing_country ?? "România",
    billingEmail:
      props.billingProfile?.billing_email ?? props.contactEmail ?? "",
    isVatPayer: props.billingProfile?.is_vat_payer ?? false,
    vatNumber: props.billingProfile?.vat_number ?? "",
  };
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "tel";
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
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        className="romdoc-focus-ring mt-[5px] min-h-11 w-full rounded-[10px] border border-gray-300 bg-white px-[13px] text-gray-900"
      />
    </label>
  );
}

export default function ClinicOrganizationBillingEditor(props: Props) {
  const copy = COPY[props.locale];
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(() => initialForm(props));

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving]);

  function openEditor() {
    setForm(initialForm(props));
    setError("");
    setIsOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (
      !form.companyName.trim() ||
      !form.taxId.trim() ||
      !form.billingAddress.trim() ||
      !form.billingCity.trim() ||
      !form.billingCounty.trim() ||
      !form.billingCountry.trim() ||
      !form.billingEmail.trim() ||
      (form.isVatPayer && !form.vatNumber.trim())
    ) {
      setError(copy.required);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/admin/clinic-organizations/${encodeURIComponent(
          props.organizationId
        )}/billing-profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            locale: props.locale,
          }),
        }
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? copy.failed);
      }

      setIsOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : copy.failed
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="romdoc-focus-ring mt-[10px] inline-flex min-h-[34px] items-center rounded-[8px] border border-[#036661] bg-white px-[10px] py-[5px] text-xs font-semibold text-[#036661] transition hover:bg-[#036661] hover:text-white"
      >
        {copy.edit}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-[13px] sm:p-[21px]">
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => !isSaving && setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`billing-editor-${props.organizationId}`}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-2xl sm:p-[34px]"
          >
            <div className="flex items-start justify-between gap-[13px]">
              <div>
                <p className="text-sm font-semibold text-[#036661]">
                  {props.organizationName}
                </p>
                <h2
                  id={`billing-editor-${props.organizationId}`}
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
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
                aria-label={copy.close}
                className="romdoc-focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-[21px] space-y-[21px]">
              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {copy.contactSection}
                </legend>
                <div className="grid gap-[13px] md:grid-cols-3">
                  <Field
                    label={copy.contactName}
                    value={form.contactName}
                    onChange={(value) => update("contactName", value)}
                  />
                  <Field
                    label={copy.contactEmail}
                    type="email"
                    value={form.contactEmail}
                    onChange={(value) => update("contactEmail", value)}
                  />
                  <Field
                    label={copy.contactPhone}
                    type="tel"
                    value={form.contactPhone}
                    onChange={(value) => update("contactPhone", value)}
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-[13px] border border-gray-200 p-[13px] sm:p-[21px]">
                <legend className="px-[5px] text-sm font-bold text-gray-900">
                  {copy.billingSection}
                </legend>
                <div className="grid gap-[13px] md:grid-cols-2">
                  <Field
                    label={copy.companyName}
                    required
                    value={form.companyName}
                    onChange={(value) => update("companyName", value)}
                  />
                  <Field
                    label={copy.taxId}
                    required
                    value={form.taxId}
                    onChange={(value) => update("taxId", value)}
                  />
                  <Field
                    label={copy.tradeRegisterNumber}
                    value={form.tradeRegisterNumber}
                    onChange={(value) =>
                      update("tradeRegisterNumber", value)
                    }
                  />
                  <Field
                    label={copy.billingEmail}
                    type="email"
                    required
                    value={form.billingEmail}
                    onChange={(value) => update("billingEmail", value)}
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={copy.billingAddress}
                      required
                      value={form.billingAddress}
                      onChange={(value) => update("billingAddress", value)}
                    />
                  </div>
                  <Field
                    label={copy.billingCity}
                    required
                    value={form.billingCity}
                    onChange={(value) => update("billingCity", value)}
                  />
                  <Field
                    label={copy.billingCounty}
                    required
                    value={form.billingCounty}
                    onChange={(value) => update("billingCounty", value)}
                  />
                  <Field
                    label={copy.billingCountry}
                    required
                    value={form.billingCountry}
                    onChange={(value) => update("billingCountry", value)}
                  />
                  <Field
                    label={copy.vatNumber}
                    required={form.isVatPayer}
                    value={form.vatNumber}
                    onChange={(value) => update("vatNumber", value)}
                  />
                </div>

                <label className="mt-[13px] flex items-center gap-[8px] text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isVatPayer}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      update("isVatPayer", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  {copy.vatPayer}
                </label>
              </fieldset>

              {error && (
                <div
                  role="alert"
                  className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
                >
                  {error}
                </div>
              )}

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
      )}
    </>
  );
}
