"use client";

import { type FormEvent, useCallback, useState, useTransition } from "react";
import { useLocale } from "next-intl";

import GooglePlaceAutocomplete, {
  type GooglePlaceAutocompleteCopy,
} from "@/components/clinic/google-place-autocomplete";
import Button from "@/components/ui/button";
import type { PlatformOperatorClinicApiPayload } from "@/lib/api/platform-operator-clinic-codes";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformClinicApiMessage,
  getPlatformOperatorClinics,
} from "@/lib/i18n/platform-operator-clinics";
import type { GoogleClinicAddress } from "@/lib/locations/google-address";

type CreateClinicResponse = PlatformOperatorClinicApiPayload & {
  clinic?: {
    id: string;
    slug: string;
    status: string;
    name: string;
    formattedAddress: string | null;
    cityId: string;
  };
};

export default function AdminClinicCreationForm() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorClinics(locale);
  const googleCopy = copy.google as GooglePlaceAutocompleteCopy;

  const [isSubmitting, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [selectedAddress, setSelectedAddress] =
    useState<GoogleClinicAddress | null>(null);
  const [addressLine2, setAddressLine2] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdClinicSlug, setCreatedClinicSlug] = useState<string | null>(null);

  const handleAddressSelected = useCallback((address: GoogleClinicAddress) => {
    setSelectedAddress(address);
    setError(null);
  }, []);

  function resetForm() {
    setName("");
    setSelectedAddress(null);
    setAddressLine2("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setDescription("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedClinicSlug(null);

    if (name.trim().length < 2) {
      setError(copy.creation.messages.nameRequired);
      return;
    }

    if (!selectedAddress) {
      setError(copy.creation.messages.addressRequired);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/clinics/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            placeId: selectedAddress.placeId,
            addressLine2: addressLine2.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            description: description.trim(),
          }),
        });
        const result = (await response.json()) as CreateClinicResponse;

        if (!response.ok) {
          throw new Error(
            getPlatformClinicApiMessage(
              locale,
              result.code,
              result.error ?? copy.creation.messages.failed
            )
          );
        }

        setSuccess(
          getPlatformClinicApiMessage(
            locale,
            result.code,
            result.message ?? copy.creation.messages.success
          )
        );
        setCreatedClinicSlug(result.clinic?.slug ?? null);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : copy.creation.messages.failed
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <div>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.creation.eyebrow}
        </p>
        <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
          {copy.creation.title}
        </h2>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.creation.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-[21px] grid gap-[21px] lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-name" className="text-sm font-medium text-gray-900">
            {copy.creation.fields.name}
          </label>
          <input
            id="admin-clinic-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.creation.placeholders.name}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-gray-900">
            {copy.creation.fields.address}
          </p>
          <div className="mt-[8px]">
            <GooglePlaceAutocomplete
              onAddressSelected={handleAddressSelected}
              disabled={isSubmitting}
              locale={locale}
              copy={googleCopy}
            />
          </div>
          {selectedAddress ? (
            <div className="mt-[13px] rounded-xl border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800">
              <p className="font-semibold">{copy.common.selectedAddress}</p>
              <p className="mt-[5px]">{selectedAddress.formattedAddress}</p>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="admin-clinic-address-line-2"
            className="text-sm font-medium text-gray-900"
          >
            {copy.creation.fields.addressLine2}
          </label>
          <input
            id="admin-clinic-address-line-2"
            type="text"
            maxLength={300}
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            placeholder={copy.creation.placeholders.addressLine2}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div>
          <label htmlFor="admin-clinic-phone" className="text-sm font-medium text-gray-900">
            {copy.creation.fields.phone}
          </label>
          <input
            id="admin-clinic-phone"
            type="tel"
            maxLength={50}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div>
          <label htmlFor="admin-clinic-email" className="text-sm font-medium text-gray-900">
            {copy.creation.fields.email}
          </label>
          <input
            id="admin-clinic-email"
            type="email"
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-website" className="text-sm font-medium text-gray-900">
            {copy.creation.fields.website}
          </label>
          <input
            id="admin-clinic-website"
            type="url"
            maxLength={500}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder={copy.creation.placeholders.website}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        <div className="lg:col-span-2">
          <label
            htmlFor="admin-clinic-description"
            className="text-sm font-medium text-gray-900"
          >
            {copy.creation.fields.description}
          </label>
          <textarea
            id="admin-clinic-description"
            rows={5}
            maxLength={3000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] text-gray-950"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <div
            role="status"
            className="lg:col-span-2 rounded-xl border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800"
          >
            <p className="font-semibold">{success}</p>
            {createdClinicSlug ? (
              <p className="mt-[5px]">
                Slug: <code>{createdClinicSlug}</code>
              </p>
            ) : null}
            <p className="mt-[8px]">{copy.creation.messages.successDetail}</p>
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-wrap gap-[13px]">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? copy.creation.actions.creating
              : copy.creation.actions.create}
          </Button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-[21px] py-[13px] text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.creation.actions.clear}
          </button>
        </div>
      </form>
    </section>
  );
}
