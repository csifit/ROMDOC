"use client";

import { FormEvent, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import GooglePlaceAutocomplete from "@/components/clinic/google-place-autocomplete";
import type { GoogleClinicAddress } from "@/lib/locations/google-address";

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type ClinicLocationRequestFormProps = {
  organizations: ClinicOrganizationOption[];
};

type LocationResponse = {
  message?: string;
  error?: string;
};

export default function ClinicLocationRequestForm({
  organizations,
}: ClinicLocationRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeOrganizations = organizations.filter(
    (organization) => organization.status === "active"
  );

  const [organizationId, setOrganizationId] = useState(
    activeOrganizations[0]?.id ?? ""
  );
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

    if (!organizationId) {
      setError("Selectează organizația clinicii.");
      return;
    }

    if (name.trim().length < 2) {
      setError("Introdu numele locației.");
      return;
    }

    if (!selectedAddress) {
      setError("Selectează adresa locației din lista Google.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/clinic-manager/locations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId,
            name: name.trim(),
            placeId: selectedAddress.placeId,
            addressLine2: addressLine2.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            description: description.trim(),
          }),
        });

        const result = (await response.json()) as LocationResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Locația nu a putut fi trimisă.");
        }

        setSuccess(result.message ?? "Locația a fost trimisă.");
        resetForm();
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Locația nu a putut fi trimisă."
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Locații clinică
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">
          Solicită un punct de lucru
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Adaugă locațiile reale ale organizației. RomDoc verifică locația și
          asocierea cu organizația înainte ca medicii clinicii să poată fi
          repartizați acolo.
        </p>
      </div>

      {activeOrganizations.length === 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Nu există o organizație activă pentru acest cont. Locațiile pot fi
          solicitate doar după activarea organizației de către RomDoc.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Organizație clinică
            </span>
            <select
              required
              value={organizationId}
              disabled={isPending}
              onChange={(event) => setOrganizationId(event.target.value)}
              className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900"
            >
              {activeOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Numele locației / punctului de lucru
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={name}
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exemplu: Clinica Floare - Arad Centru"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <GooglePlaceAutocomplete
            disabled={isPending}
            onAddressSelected={handleAddressSelected}
          />

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Detalii suplimentare ale adresei
            </span>
            <span className="ml-2 text-xs text-gray-500">Opțional</span>
            <input
              type="text"
              maxLength={300}
              value={addressLine2}
              disabled={isPending}
              onChange={(event) => setAddressLine2(event.target.value)}
              placeholder="Etaj, cabinet, corp de clădire"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Telefon locație
              </span>
              <span className="ml-2 text-xs text-gray-500">Opțional</span>
              <input
                type="tel"
                maxLength={50}
                value={phone}
                disabled={isPending}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                E-mail locație
              </span>
              <span className="ml-2 text-xs text-gray-500">Opțional</span>
              <input
                type="email"
                maxLength={320}
                value={email}
                disabled={isPending}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Website locație
            </span>
            <span className="ml-2 text-xs text-gray-500">Opțional</span>
            <input
              type="url"
              maxLength={500}
              value={website}
              disabled={isPending}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Descriere
            </span>
            <span className="ml-2 text-xs text-gray-500">Opțional</span>
            <textarea
              rows={4}
              maxLength={3000}
              value={description}
              disabled={isPending}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Se trimite..." : "Trimite locația spre verificare"}
          </button>
        </form>
      )}
    </section>
  );
}
