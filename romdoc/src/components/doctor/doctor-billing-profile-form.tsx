"use client";

import {
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export type DoctorBillingProfileData = {
  id:
    | string
    | null;

  doctor_id: string;
  profile_id: string;
  entity_type: string;
  legal_name: string;

  cui:
    | string
    | null;

  trade_registry_number:
    | string
    | null;

  vat_payer: boolean;

  billing_address:
    | string
    | null;

  county:
    | string
    | null;

  city:
    | string
    | null;

  postal_code:
    | string
    | null;

  country: string;

  billing_email:
    | string
    | null;

  accounting_contact_name:
    | string
    | null;

  accounting_contact_phone:
    | string
    | null;

  invoice_notes:
    | string
    | null;
};

type DoctorBillingProfileFormProps = {
  doctorId: string;
  profileId: string;
  defaultBillingEmail: string;

  initialProfile:
    | DoctorBillingProfileData
    | null;
};

function emptyToNull(
  value:
    string
) {
  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : null;
}

export default function DoctorBillingProfileForm({
  doctorId,
  profileId,
  defaultBillingEmail,
  initialProfile,
}: DoctorBillingProfileFormProps) {
  const t =
    useTranslations(
      "DoctorConfiguration.billing"
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    entityType,
    setEntityType,
  ] =
    useState(
      initialProfile
        ?.entity_type ??
      "srl"
    );

  const [
    legalName,
    setLegalName,
  ] =
    useState(
      initialProfile
        ?.legal_name ??
      ""
    );

  const [
    cui,
    setCui,
  ] =
    useState(
      initialProfile
        ?.cui ??
      ""
    );

  const [
    tradeRegistryNumber,
    setTradeRegistryNumber,
  ] =
    useState(
      initialProfile
        ?.trade_registry_number ??
      ""
    );

  const [
    vatPayer,
    setVatPayer,
  ] =
    useState(
      initialProfile
        ?.vat_payer ??
      false
    );

  const [
    billingAddress,
    setBillingAddress,
  ] =
    useState(
      initialProfile
        ?.billing_address ??
      ""
    );

  const [
    county,
    setCounty,
  ] =
    useState(
      initialProfile
        ?.county ??
      ""
    );

  const [
    city,
    setCity,
  ] =
    useState(
      initialProfile
        ?.city ??
      ""
    );

  const [
    postalCode,
    setPostalCode,
  ] =
    useState(
      initialProfile
        ?.postal_code ??
      ""
    );

  const [
    country,
    setCountry,
  ] =
    useState(
      initialProfile
        ?.country ??
      "Romania"
    );

  const [
    billingEmail,
    setBillingEmail,
  ] =
    useState(
      initialProfile
        ?.billing_email ??
      defaultBillingEmail
    );

  const [
    accountingContactName,
    setAccountingContactName,
  ] =
    useState(
      initialProfile
        ?.accounting_contact_name ??
      ""
    );

  const [
    accountingContactPhone,
    setAccountingContactPhone,
  ] =
    useState(
      initialProfile
        ?.accounting_contact_phone ??
      ""
    );

  const [
    invoiceNotes,
    setInvoiceNotes,
  ] =
    useState(
      initialProfile
        ?.invoice_notes ??
      ""
    );

  function saveBillingProfile(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    setMessage(
      null
    );

    const cleanLegalName =
      legalName.trim();

    if (
      !cleanLegalName
    ) {
      setError(
        t(
          "legalNameRequired"
        )
      );

      return;
    }

    startTransition(
      async () => {
        const supabase =
          createClient();

        const {
          error:
            saveError,
        } =
          await supabase
            .from(
              "doctor_billing_profiles"
            )
            .upsert(
              {
                doctor_id:
                  doctorId,

                profile_id:
                  profileId,

                entity_type:
                  entityType,

                legal_name:
                  cleanLegalName,

                cui:
                  emptyToNull(
                    cui
                  ),

                trade_registry_number:
                  emptyToNull(
                    tradeRegistryNumber
                  ),

                vat_payer:
                  vatPayer,

                billing_address:
                  emptyToNull(
                    billingAddress
                  ),

                county:
                  emptyToNull(
                    county
                  ),

                city:
                  emptyToNull(
                    city
                  ),

                postal_code:
                  emptyToNull(
                    postalCode
                  ),

                country:
                  country.trim() ||
                  "Romania",

                billing_email:
                  emptyToNull(
                    billingEmail
                  ),

                accounting_contact_name:
                  emptyToNull(
                    accountingContactName
                  ),

                accounting_contact_phone:
                  emptyToNull(
                    accountingContactPhone
                  ),

                invoice_notes:
                  emptyToNull(
                    invoiceNotes
                  ),
              },
              {
                onConflict:
                  "doctor_id",
              }
            );

        if (
          saveError
        ) {
          console.error(
            "Doctor billing profile save failed:",
            saveError
          );

          setError(
            t(
              "saveError"
            )
          );

          return;
        }

        setMessage(
          t(
            "saved"
          )
        );
      }
    );
  }

  const entityTypes = [
    "srl",
    "pfa",
    "ii",
    "cabinet_medical",
    "individual",
    "other",
  ];

  return (
    <form
      onSubmit={
        saveBillingProfile
      }
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "entityType"
            )}
          </span>

          <select
            value={
              entityType
            }
            onChange={(
              event
            ) =>
              setEntityType(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          >
            {entityTypes.map(
              (
                type
              ) => (
                <option
                  key={
                    type
                  }
                  value={
                    type
                  }
                >
                  {t(
                    `entityTypes.${type}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "legalName"
            )}
          </span>

          <input
            required
            value={
              legalName
            }
            onChange={(
              event
            ) =>
              setLegalName(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder={t(
              "legalNamePlaceholder"
            )}
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "taxId"
            )}
          </span>

          <input
            value={
              cui
            }
            onChange={(
              event
            ) =>
              setCui(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder={t(
              "taxIdPlaceholder"
            )}
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "tradeRegistry"
            )}
          </span>

          <input
            value={
              tradeRegistryNumber
            }
            onChange={(
              event
            ) =>
              setTradeRegistryNumber(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder={t(
              "tradeRegistryPlaceholder"
            )}
          />
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
          <input
            type="checkbox"
            checked={
              vatPayer
            }
            onChange={(
              event
            ) =>
              setVatPayer(
                event.target
                  .checked
              )
            }
            className="mt-1 h-5 w-5"
          />

          <span>
            <span className="block text-sm font-semibold text-gray-900">
              {t(
                "vatPayer"
              )}
            </span>

            <span className="mt-1 block text-sm text-gray-600">
              {t(
                "vatDescription"
              )}
            </span>
          </span>
        </label>

        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "address"
            )}
          </span>

          <textarea
            value={
              billingAddress
            }
            onChange={(
              event
            ) =>
              setBillingAddress(
                event.target
                  .value
              )
            }
            rows={
              3
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder={t(
              "addressPlaceholder"
            )}
          />
        </label>

        {[
          [
            t(
              "region"
            ),
            county,
            setCounty,
          ],
          [
            t(
              "city"
            ),
            city,
            setCity,
          ],
          [
            t(
              "postalCode"
            ),
            postalCode,
            setPostalCode,
          ],
          [
            t(
              "country"
            ),
            country,
            setCountry,
          ],
        ].map(
          ([
            label,
            value,
            setter,
          ]) => (
            <label
              key={
                String(
                  label
                )
              }
            >
              <span className="text-sm font-semibold text-gray-800">
                {
                  label as
                    string
                }
              </span>

              <input
                value={
                  value as
                    string
                }
                onChange={(
                  event
                ) =>
                  (
                    setter as
                      (
                        value:
                          string
                      ) =>
                        void
                  )(
                    event.target
                      .value
                  )
                }
                className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
              />
            </label>
          )
        )}

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "billingEmail"
            )}
          </span>

          <input
            type="email"
            value={
              billingEmail
            }
            onChange={(
              event
            ) =>
              setBillingEmail(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "accountingName"
            )}
          </span>

          <input
            value={
              accountingContactName
            }
            onChange={(
              event
            ) =>
              setAccountingContactName(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "accountingPhone"
            )}
          </span>

          <input
            value={
              accountingContactPhone
            }
            onChange={(
              event
            ) =>
              setAccountingContactPhone(
                event.target
                  .value
              )
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </label>

        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-gray-800">
            {t(
              "notes"
            )}
          </span>

          <textarea
            value={
              invoiceNotes
            }
            onChange={(
              event
            ) =>
              setInvoiceNotes(
                event.target
                  .value
              )
            }
            rows={
              3
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder={t(
              "notesPlaceholder"
            )}
          />
        </label>
      </div>

      {message && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={
            isPending
          }
          className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? t(
                "saving"
              )
            : t(
                "save"
              )}
        </button>
      </div>
    </form>
  );
}
