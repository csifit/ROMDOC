"use client";

import { type FormEvent, useCallback, useState, useTransition } from "react";

import GooglePlaceAutocomplete from "@/components/clinic/google-place-autocomplete";
import Button from "@/components/ui/button";
import type { GoogleClinicAddress } from "@/lib/locations/google-address";

type CreateClinicResponse = {
  message?: string;
  error?: string;
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
  const [isSubmitting, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<GoogleClinicAddress | null>(null);
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
      setError("Introdu numele clinicii.");
      return;
    }

    if (!selectedAddress) {
      setError("Selectează adresa clinicii din lista Google.");
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
          throw new Error(result.error ?? "Clinica nu a putut fi creată.");
        }

        setSuccess(result.message ?? "Clinica a fost creată și aprobată.");
        setCreatedClinicSlug(result.clinic?.slug ?? null);
        resetForm();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Clinica nu a putut fi creată."
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold text-[#9A4F35]">Creare directă</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Adaugă o clinică</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Clinica creată de administrator este aprobată imediat și devine disponibilă ca entitate comună RomDoc. Nu este asociată automat unui medic.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-name" className="text-sm font-medium text-gray-900">
            Numele clinicii
          </label>
          <input
            id="admin-clinic-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder="Exemplu: Clinica Medicală Central"
          />
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-gray-900">Adresa verificată prin Google</p>
          <div className="mt-2">
            <GooglePlaceAutocomplete
              onAddressSelected={handleAddressSelected}
              disabled={isSubmitting}
            />
          </div>
          {selectedAddress ? (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">Adresă selectată</p>
              <p className="mt-1">{selectedAddress.formattedAddress}</p>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-address-line-2" className="text-sm font-medium text-gray-900">
            Detalii suplimentare adresă
          </label>
          <input
            id="admin-clinic-address-line-2"
            type="text"
            maxLength={300}
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder="Etaj, cabinet, corp de clădire"
          />
        </div>

        <div>
          <label htmlFor="admin-clinic-phone" className="text-sm font-medium text-gray-900">Telefon</label>
          <input
            id="admin-clinic-phone"
            type="tel"
            maxLength={50}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </div>

        <div>
          <label htmlFor="admin-clinic-email" className="text-sm font-medium text-gray-900">E-mail</label>
          <input
            id="admin-clinic-email"
            type="email"
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-website" className="text-sm font-medium text-gray-900">Website</label>
          <input
            id="admin-clinic-website"
            type="url"
            maxLength={500}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
            placeholder="https://"
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="admin-clinic-description" className="text-sm font-medium text-gray-900">Descriere</label>
          <textarea
            id="admin-clinic-description"
            rows={5}
            maxLength={3000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
          />
        </div>

        {error ? (
          <p role="alert" className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <div role="status" className="lg:col-span-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">{success}</p>
            {createdClinicSlug ? (
              <p className="mt-1">Slug: <code>{createdClinicSlug}</code></p>
            ) : null}
            <p className="mt-2">Clinica apare în fila „Aprobate” din lista de mai jos.</p>
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Se creează..." : "Creează și aprobă clinica"}
          </Button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Golește formularul
          </button>
        </div>
      </form>
    </section>
  );
}
