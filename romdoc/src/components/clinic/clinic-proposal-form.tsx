"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import GooglePlaceAutocomplete from "@/components/clinic/google-place-autocomplete";
import Button from "@/components/ui/button";
import type {
  GoogleClinicAddress,
} from "@/lib/locations/google-address";

type ClinicTranslation = {
  locale: string;
  name: string;
  description:
    | string
    | null;
};

type ClinicItem = {
  id: string;
  slug: string;
  status: string;

  formatted_address:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  website:
    | string
    | null;

  google_maps_uri:
    | string
    | null;

  rejection_reason?:
    | string
    | null;

  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type ClinicsResponse = {
  linkedClinics?: ClinicItem[];
  proposals?: ClinicItem[];
  error?: string;
};

type ProposalResponse = {
  message?: string;
  error?: string;
  clinicId?: string;
  status?: string;
  linkedExisting?: boolean;
};

function getClinicName(
  clinic: ClinicItem
) {
  return (
    clinic.clinic_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic.clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "approved":
      return "Aprobată";

    case "pending":
      return "În așteptare";

    case "rejected":
      return "Respinsă";

    default:
      return status;
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";

    case "rejected":
      return "bg-red-100 text-red-800";

    default:
      return "bg-amber-100 text-amber-900";
  }
}

export default function ClinicProposalForm() {
  const [
    isSubmitting,
    startTransition,
  ] = useTransition();

  const [isLoading, setIsLoading] =
    useState(true);

  const [name, setName] =
    useState("");

  const [
    selectedAddress,
    setSelectedAddress,
  ] =
    useState<GoogleClinicAddress | null>(
      null
    );

  const [
    addressLine2,
    setAddressLine2,
  ] = useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [
    linkedClinics,
    setLinkedClinics,
  ] = useState<ClinicItem[]>([]);

  const [
    proposals,
    setProposals,
  ] = useState<ClinicItem[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadClinics =
    useCallback(async () => {
      try {
        setIsLoading(true);

        const response =
          await fetch(
            "/api/doctor/clinics",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ClinicsResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Clinicile nu au putut fi încărcate."
          );
        }

        setLinkedClinics(
          result.linkedClinics ??
            []
        );

        setProposals(
          result.proposals ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Clinicile nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  const handleAddressSelected =
    useCallback(
      (
        address:
          GoogleClinicAddress
      ) => {
        setSelectedAddress(
          address
        );

        setError(null);
      },
      []
    );

  function resetForm() {
    setName("");
    setSelectedAddress(null);
    setAddressLine2("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setDescription("");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (name.trim().length < 2) {
      setError(
        "Introdu numele clinicii."
      );

      return;
    }

    if (!selectedAddress) {
      setError(
        "Selectează adresa clinicii din lista Google."
      );

      return;
    }

    startTransition(async () => {
      try {
        const response =
          await fetch(
            "/api/doctor/clinics",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  name:
                    name.trim(),

                  placeId:
                    selectedAddress
                      .placeId,

                  addressLine2:
                    addressLine2.trim(),

                  phone:
                    phone.trim(),

                  email:
                    email.trim(),

                  website:
                    website.trim(),

                  description:
                    description.trim(),
                }),
            }
          );

        const result =
          (await response.json()) as
            ProposalResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Clinica nu a putut fi trimisă."
          );
        }

        setSuccess(
          result.message ??
            "Clinica a fost salvată."
        );

        resetForm();

        await loadClinics();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Clinica nu a putut fi trimisă."
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Clinici
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Propune o clinică
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Caută mai întâi adresa exactă prin
            Google. Clinicile noi vor fi
            verificate și aprobate de un
            administrator RomDoc.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Numele clinicii
            </span>

            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={name}
              disabled={isSubmitting}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Exemplu: Clinica Medicală Centrală"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <GooglePlaceAutocomplete
            disabled={isSubmitting}
            onAddressSelected={
              handleAddressSelected
            }
          />

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Detalii suplimentare ale adresei
            </span>

            <span className="ml-2 text-xs text-gray-500">
              Opțional
            </span>

            <input
              type="text"
              maxLength={300}
              value={addressLine2}
              disabled={isSubmitting}
              onChange={(event) =>
                setAddressLine2(
                  event.target.value
                )
              }
              placeholder="Etaj, cabinet, corp de clădire"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Telefon
              </span>

              <span className="ml-2 text-xs text-gray-500">
                Opțional
              </span>

              <input
                type="tel"
                maxLength={50}
                value={phone}
                disabled={isSubmitting}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                E-mail
              </span>

              <span className="ml-2 text-xs text-gray-500">
                Opțional
              </span>

              <input
                type="email"
                maxLength={320}
                value={email}
                disabled={isSubmitting}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Website
            </span>

            <span className="ml-2 text-xs text-gray-500">
              Opțional
            </span>

            <input
              type="url"
              maxLength={500}
              value={website}
              disabled={isSubmitting}
              onChange={(event) =>
                setWebsite(
                  event.target.value
                )
              }
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Descriere
            </span>

            <span className="ml-2 text-xs text-gray-500">
              Opțional
            </span>

            <textarea
              rows={4}
              maxLength={3000}
              value={description}
              disabled={isSubmitting}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="O scurtă descriere a clinicii"
              className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {success}
            </div>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText="Se trimite..."
            disabled={!selectedAddress}
          >
            Trimite clinica spre aprobare
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          Clinicile mele
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-500">
            Se încarcă clinicile...
          </p>
        ) : linkedClinics.length ===
          0 ? (
          <p className="mt-4 text-sm text-gray-600">
            Nu ai încă nicio clinică aprobată
            asociată profilului tău.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {linkedClinics.map(
              (clinic) => (
                <article
                  key={clinic.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getClinicName(
                          clinic
                        )}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {clinic.formatted_address ??
                          "Adresă indisponibilă"}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Aprobată
                    </span>
                  </div>

                  {clinic.google_maps_uri && (
                    <a
                      href={
                        clinic.google_maps_uri
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="romdoc-link mt-3 inline-block text-sm hover:underline"
                    >
                      Vezi pe Google Maps
                    </a>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          Propunerile mele
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-500">
            Se încarcă propunerile...
          </p>
        ) : proposals.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            Nu ai propuneri de clinici.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {proposals.map(
              (clinic) => (
                <article
                  key={clinic.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getClinicName(
                          clinic
                        )}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {clinic.formatted_address ??
                          "Adresă indisponibilă"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        clinic.status
                      )}`}
                    >
                      {getStatusLabel(
                        clinic.status
                      )}
                    </span>
                  </div>

                  {clinic.status ===
                    "rejected" &&
                    clinic.rejection_reason && (
                      <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                        {
                          clinic.rejection_reason
                        }
                      </div>
                    )}
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}