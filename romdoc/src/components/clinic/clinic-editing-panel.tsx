"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import GooglePlaceAutocomplete from "@/components/clinic/google-place-autocomplete";
import type { GoogleClinicAddress } from "@/lib/locations/google-address";

type ClinicTranslation = {
  locale: string;
  name: string;
  description: string | null;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type CityRelation = {
  id: string;
  slug: string;
  city_translations: CityTranslation[] | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  formatted_address: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  county_name: string | null;
  country_code: string | null;
  google_maps_uri: string | null;
  updated_at: string;
  clinic_translations: ClinicTranslation[] | null;
  cities: CityRelation | CityRelation[] | null;
};

type EditableClinicsResponse = {
  clinics?: Clinic[];
  clinic?: Clinic;
  message?: string;
  error?: string;
};

type Draft = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  addressLine2: string;
};

type ClinicEditingPanelProps = {
  title: string;
  description: string;
  emptyMessage: string;
};

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
) {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function getRomanianTranslation(clinic: Clinic) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
    ) ??
    clinic.clinic_translations?.[0] ??
    null
  );
}

function getClinicName(clinic: Clinic) {
  return getRomanianTranslation(clinic)?.name ?? clinic.slug;
}

function getClinicDescription(clinic: Clinic) {
  return getRomanianTranslation(clinic)?.description ?? "";
}

function getCityName(clinic: Clinic) {
  const city = getFirstRelation(clinic.cities);

  return (
    city?.city_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    city?.city_translations?.[0]?.name ??
    city?.slug ??
    "OraÈ™ necunoscut"
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "AprobatÄƒ";

    case "pending":
      return "ÃŽn aÈ™teptare";

    case "rejected":
      return "RespinsÄƒ";

    case "blocked":
      return "BlocatÄƒ";

    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";

    case "pending":
      return "bg-amber-100 text-amber-900";

    case "rejected":
      return "bg-red-100 text-red-800";

    case "blocked":
      return "bg-slate-200 text-slate-900";

    default:
      return "bg-gray-100 text-gray-800";
  }
}

function createDraft(clinic: Clinic): Draft {
  return {
    name: getClinicName(clinic),
    description: getClinicDescription(clinic),
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    website: clinic.website ?? "",
    addressLine2: clinic.address_line_2 ?? "",
  };
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export default function ClinicEditingPanel({
  title,
  description,
  emptyMessage,
}: ClinicEditingPanelProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedAddress, setSelectedAddress] =
    useState<GoogleClinicAddress | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadClinics = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/clinics/editable", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as EditableClinicsResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Clinicile nu au putut fi Ã®ncÄƒrcate."
        );
      }

      setClinics(result.clinics ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Clinicile nu au putut fi Ã®ncÄƒrcate."
      );
      setClinics([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadClinics();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadClinics]);

  const visibleClinics = useMemo(() => {
    const normalizedSearch = normalizeForSearch(search);

    if (!normalizedSearch) {
      return clinics;
    }

    return clinics.filter((clinic) => {
      const haystack = [
        getClinicName(clinic),
        getCityName(clinic),
        clinic.formatted_address ?? "",
        clinic.phone ?? "",
        clinic.email ?? "",
      ]
        .map(normalizeForSearch)
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [clinics, search]);

  function startEditing(clinic: Clinic) {
    setEditingClinicId(clinic.id);
    setDraft(createDraft(clinic));
    setSelectedAddress(null);
    setError("");
    setSuccess("");
  }

  function stopEditing() {
    setEditingClinicId(null);
    setDraft(null);
    setSelectedAddress(null);
  }

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        [field]: value,
      };
    });
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClinicId || !draft) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/clinics/editable", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicId: editingClinicId,
          name: draft.name,
          description: draft.description,
          phone: draft.phone,
          email: draft.email,
          website: draft.website,
          addressLine2: draft.addressLine2,
          placeId: selectedAddress?.placeId ?? null,
        }),
      });

      const result = (await response.json()) as EditableClinicsResponse;

      if (!response.ok || !result.clinic) {
        throw new Error(result.error ?? "Clinica nu a putut fi salvatÄƒ.");
      }

      setClinics((currentClinics) =>
        currentClinics.map((clinic) =>
          clinic.id === result.clinic?.id ? result.clinic : clinic
        )
      );

      setSuccess(result.message ?? "Clinica a fost actualizatÄƒ.");
      stopEditing();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Clinica nu a putut fi salvatÄƒ."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Editare clinici
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {title}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadClinics()}
          disabled={isLoading || isSaving}
          className="romdoc-focus-ring w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ReÃ®ncarcÄƒ
        </button>
      </div>

      <div className="mt-6">
        <label
          htmlFor="clinic-editor-search"
          className="text-sm font-medium text-gray-900"
        >
          CautÄƒ clinicÄƒ
        </label>

        <input
          id="clinic-editor-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nume, oraÈ™, adresÄƒ, telefon sau e-mail"
          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
          Se Ã®ncarcÄƒ clinicile...
        </div>
      ) : visibleClinics.length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {clinics.length === 0
            ? emptyMessage
            : "Nu existÄƒ clinici care corespund cÄƒutÄƒrii."}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleClinics.map((clinic) => {
            const isEditing = editingClinicId === clinic.id;

            return (
              <article
                key={clinic.id}
                className="overflow-hidden rounded-2xl border border-gray-200"
              >
                <div className="flex flex-col justify-between gap-4 bg-gray-50 px-5 py-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {getClinicName(clinic)}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          clinic.status
                        )}`}
                      >
                        {getStatusLabel(clinic.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {getCityName(clinic)}
                      {clinic.formatted_address
                        ? ` â€” ${clinic.formatted_address}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? stopEditing() : startEditing(clinic)
                    }
                    disabled={isSaving}
                    className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02534f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditing ? "ÃŽnchide" : "EditeazÄƒ"}
                  </button>
                </div>

                <div className="grid gap-4 px-5 py-4 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Telefon
                    </p>
                    <p className="mt-1">{clinic.phone || "â€”"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      E-mail
                    </p>
                    <p className="mt-1 break-all">{clinic.email || "â€”"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Website
                    </p>
                    <p className="mt-1 break-all">{clinic.website || "â€”"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Detalii adresÄƒ
                    </p>
                    <p className="mt-1">{clinic.address_line_2 || "â€”"}</p>
                  </div>
                </div>

                {isEditing && draft ? (
                  <form
                    onSubmit={submitEdit}
                    className="border-t border-gray-200 bg-white px-5 py-5"
                  >
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`clinic-name-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Numele clinicii
                        </label>
                        <input
                          id={`clinic-name-${clinic.id}`}
                          type="text"
                          required
                          maxLength={200}
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft("name", event.target.value)
                          }
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`clinic-phone-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Telefon
                        </label>
                        <input
                          id={`clinic-phone-${clinic.id}`}
                          type="tel"
                          maxLength={50}
                          value={draft.phone}
                          onChange={(event) =>
                            updateDraft("phone", event.target.value)
                          }
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`clinic-email-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          E-mail
                        </label>
                        <input
                          id={`clinic-email-${clinic.id}`}
                          type="email"
                          maxLength={320}
                          value={draft.email}
                          onChange={(event) =>
                            updateDraft("email", event.target.value)
                          }
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`clinic-website-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Website
                        </label>
                        <input
                          id={`clinic-website-${clinic.id}`}
                          type="url"
                          maxLength={500}
                          value={draft.website}
                          onChange={(event) =>
                            updateDraft("website", event.target.value)
                          }
                          placeholder="https://"
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`clinic-address-line-2-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Detalii suplimentare adresÄƒ
                        </label>
                        <input
                          id={`clinic-address-line-2-${clinic.id}`}
                          type="text"
                          maxLength={300}
                          value={draft.addressLine2}
                          onChange={(event) =>
                            updateDraft("addressLine2", event.target.value)
                          }
                          placeholder="Etaj, cabinet, corp de clÄƒdire"
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <p className="text-sm font-medium text-gray-900">
                          SchimbÄƒ adresa verificatÄƒ prin Google â€” opÈ›ional
                        </p>
                        <div className="mt-2">
                          <GooglePlaceAutocomplete
                            onAddressSelected={(address) =>
                              setSelectedAddress(address)
                            }
                            disabled={isSaving}
                          />
                        </div>

                        {selectedAddress ? (
                          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                            <p className="font-semibold">AdresÄƒ nouÄƒ selectatÄƒ</p>
                            <p className="mt-1">
                              {selectedAddress.formattedAddress}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-gray-500">
                            LasÄƒ acest cÃ¢mp gol dacÄƒ adresa principalÄƒ rÄƒmÃ¢ne neschimbatÄƒ.
                          </p>
                        )}
                      </div>

                      <div className="lg:col-span-2">
                        <label
                          htmlFor={`clinic-description-${clinic.id}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Descriere
                        </label>
                        <textarea
                          id={`clinic-description-${clinic.id}`}
                          rows={5}
                          maxLength={3000}
                          value={draft.description}
                          onChange={(event) =>
                            updateDraft("description", event.target.value)
                          }
                          disabled={isSaving}
                          className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white hover:bg-[#02534f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "Se salveazÄƒ..." : "SalveazÄƒ clinica"}
                      </button>

                      <button
                        type="button"
                        onClick={stopEditing}
                        disabled={isSaving}
                        className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        AnuleazÄƒ
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

