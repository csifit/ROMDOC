"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createLocationSlug,
} from "@/lib/locations/create-location-slug";

type CityTranslation = {
  id: string;
  locale: string;
  name: string;
};

type City = {
  id: string;
  slug: string;
  country_code: string;

  latitude:
    | number
    | string
    | null;

  longitude:
    | number
    | string
    | null;

  is_active: boolean;
  clinic_count: number;
  created_at: string;
  updated_at: string;

  city_translations:
    | CityTranslation[]
    | null;
};

type ApiResponse = {
  cities?: City[];
  message?: string;
  error?: string;
};

type StatusFilter =
  | "all"
  | "active"
  | "inactive";

type CityFormState = {
  cityId: string;
  nameRo: string;
  nameEn: string;
  slug: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
};

const emptyForm: CityFormState = {
  cityId: "",
  nameRo: "",
  nameEn: "",
  slug: "",
  countryCode: "RO",
  latitude: "",
  longitude: "",
  isActive: true,
};

function getTranslation(
  city: City,
  locale: string
) {
  return (
    city.city_translations
      ?.find(
        (translation) =>
          translation.locale ===
          locale
      ) ?? null
  );
}

function coordinateToString(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

export default function CitiesManagement() {
  const [cities, setCities] =
    useState<City[]>([]);

  const [form, setForm] =
    useState<CityFormState>(
      emptyForm
    );

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all"
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    changingCityId,
    setChangingCityId,
  ] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const isEditing =
    Boolean(form.cityId);

  const loadCities =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/cities",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "OraÈ™ele nu au putut fi Ã®ncÄƒrcate."
          );
        }

        setCities(
          result.cities ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "OraÈ™ele nu au putut fi Ã®ncÄƒrcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadCities();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadCities]);

  const filteredCities =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return cities.filter(
        (city) => {
          if (
            statusFilter ===
              "active" &&
            !city.is_active
          ) {
            return false;
          }

          if (
            statusFilter ===
              "inactive" &&
            city.is_active
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const ro =
            getTranslation(
              city,
              "ro"
            );

          const en =
            getTranslation(
              city,
              "en"
            );

          return [
            city.slug,
            city.country_code,
            ro?.name,
            en?.name,
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      cities,
      search,
      statusFilter,
    ]);

  function updateForm<
    Key extends keyof CityFormState,
  >(
    key: Key,
    value:
      CityFormState[Key]
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setError(null);
  }

  function beginEditing(
    city: City
  ) {
    const ro =
      getTranslation(
        city,
        "ro"
      );

    const en =
      getTranslation(
        city,
        "en"
      );

    setForm({
      cityId:
        city.id,

      nameRo:
        ro?.name ?? "",

      nameEn:
        en?.name ?? "",

      slug:
        city.slug,

      countryCode:
        city.country_code,

      latitude:
        coordinateToString(
          city.latitude
        ),

      longitude:
        coordinateToString(
          city.longitude
        ),

      isActive:
        city.is_active,
    });

    setError(null);
    setSuccess(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCity(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (
      form.nameRo
        .trim()
        .length < 2
    ) {
      setError(
        "Introdu numele oraÈ™ului Ã®n limba romÃ¢nÄƒ."
      );

      return;
    }

    if (
      form.nameEn
        .trim()
        .length < 2
    ) {
      setError(
        "Introdu numele oraÈ™ului Ã®n limba englezÄƒ."
      );

      return;
    }

    if (
      !/^[A-Za-z]{2}$/.test(
        form.countryCode.trim()
      )
    ) {
      setError(
        "Codul È›Äƒrii trebuie sÄƒ conÈ›inÄƒ exact douÄƒ litere."
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/cities",
          {
            method:
              isEditing
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...form,

                countryCode:
                  form.countryCode
                    .trim()
                    .toUpperCase(),

                latitude:
                  form.latitude.trim(),

                longitude:
                  form.longitude.trim(),
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "OraÈ™ul nu a putut fi salvat."
        );
      }

      setSuccess(
        result.message ??
          "OraÈ™ul a fost salvat."
      );

      setForm(emptyForm);

      await loadCities();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "OraÈ™ul nu a putut fi salvat."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleCity(
    city: City
  ) {
    const ro =
      getTranslation(
        city,
        "ro"
      );

    const en =
      getTranslation(
        city,
        "en"
      );

    const nextActive =
      !city.is_active;

    if (
      !nextActive &&
      city.clinic_count > 0
    ) {
      setError(
        "OraÈ™ul este asociat unor clinici È™i nu poate fi dezactivat."
      );

      return;
    }

    const confirmed =
      window.confirm(
        nextActive
          ? "Reactivezi acest oraÈ™?"
          : "Dezactivezi acest oraÈ™?"
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setChangingCityId(
      city.id
    );

    try {
      const response =
        await fetch(
          "/api/admin/cities",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                cityId:
                  city.id,

                nameRo:
                  ro?.name ?? "",

                nameEn:
                  en?.name ?? "",

                slug:
                  city.slug,

                countryCode:
                  city.country_code,

                latitude:
                  coordinateToString(
                    city.latitude
                  ),

                longitude:
                  coordinateToString(
                    city.longitude
                  ),

                isActive:
                  nextActive,
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Statutul oraÈ™ului nu a putut fi actualizat."
        );
      }

      setSuccess(
        result.message ??
          "Statutul oraÈ™ului a fost actualizat."
      );

      await loadCities();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Statutul oraÈ™ului nu a putut fi actualizat."
      );
    } finally {
      setChangingCityId(
        null
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {isEditing
                ? "Editare"
                : "OraÈ™ nou"}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {isEditing
                ? "EditeazÄƒ oraÈ™ul"
                : "AdaugÄƒ un oraÈ™"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              OraÈ™ele sunt utilizate Ã®n directoarele SEO, Ã®n filtre È™i
              pentru asocierea clinicilor cu o localitate internÄƒ RomDoc.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              AnuleazÄƒ editarea
            </button>
          )}
        </div>

        <form
          onSubmit={saveCity}
          className="mt-8 space-y-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Nume Ã®n romÃ¢nÄƒ
              </span>

              <input
                required
                type="text"
                maxLength={200}
                value={form.nameRo}
                disabled={isSaving}
                onChange={(event) => {
                  const name =
                    event.target.value;

                  updateForm(
                    "nameRo",
                    name
                  );

                  if (
                    !isEditing ||
                    !form.slug
                  ) {
                    updateForm(
                      "slug",
                      createLocationSlug(
                        name
                      )
                    );
                  }
                }}
                placeholder="Exemplu: TimiÈ™oara"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Nume Ã®n englezÄƒ
              </span>

              <input
                required
                type="text"
                maxLength={200}
                value={form.nameEn}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "nameEn",
                    event.target.value
                  )
                }
                placeholder="Exemplu: Timisoara"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Slug
              </span>

              <input
                required
                type="text"
                maxLength={200}
                value={form.slug}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "slug",
                    createLocationSlug(
                      event.target.value
                    )
                  )
                }
                placeholder="timisoara"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Cod È›arÄƒ
              </span>

              <input
                required
                type="text"
                minLength={2}
                maxLength={2}
                value={
                  form.countryCode
                }
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "countryCode",
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z]/g,
                        ""
                      )
                      .slice(0, 2)
                  )
                }
                placeholder="RO"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 uppercase outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />

              <p className="mt-2 text-xs text-gray-500">
                Cod ISO din douÄƒ litere. Pentru RomÃ¢nia foloseÈ™te RO.
              </p>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Latitudine
              </span>

              <span className="ml-2 text-xs text-gray-500">
                OpÈ›ional
              </span>

              <input
                type="number"
                step="0.0000001"
                min="-90"
                max="90"
                value={form.latitude}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "latitude",
                    event.target.value
                  )
                }
                placeholder="45.7488716"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Longitudine
              </span>

              <span className="ml-2 text-xs text-gray-500">
                OpÈ›ional
              </span>

              <input
                type="number"
                step="0.0000001"
                min="-180"
                max="180"
                value={form.longitude}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "longitude",
                    event.target.value
                  )
                }
                placeholder="21.2086793"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

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

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[#036661] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Se salveazÄƒ..."
              : isEditing
                ? "SalveazÄƒ modificÄƒrile"
                : "AdaugÄƒ oraÈ™ul"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Lista oraÈ™elor
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {cities.length} oraÈ™e Ã®nregistrate.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="w-full sm:w-52">
              <span className="sr-only">
                FiltreazÄƒ dupÄƒ status
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as StatusFilter
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              >
                <option value="all">
                  Toate oraÈ™ele
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </label>

            <label className="w-full sm:w-80">
              <span className="sr-only">
                CautÄƒ oraÈ™
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="CautÄƒ dupÄƒ nume, slug sau È›arÄƒ..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-600">
            Se Ã®ncarcÄƒ oraÈ™ele...
          </p>
        ) : filteredCities.length ===
          0 ? (
          <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
            Nu existÄƒ oraÈ™e care corespund filtrelor selectate.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-4 py-3 font-semibold">
                    OraÈ™
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    EnglezÄƒ
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Slug
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    ÈšarÄƒ
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Coordonate
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Clinici
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">
                    AcÈ›iuni
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCities.map(
                  (city) => {
                    const ro =
                      getTranslation(
                        city,
                        "ro"
                      );

                    const en =
                      getTranslation(
                        city,
                        "en"
                      );

                    const isChanging =
                      changingCityId ===
                      city.id;

                    return (
                      <tr
                        key={city.id}
                        className="align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">
                            {ro?.name ??
                              "â€”"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {en?.name ??
                            "â€”"}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-gray-600">
                          {city.slug}
                        </td>

                        <td className="px-4 py-4 font-semibold text-gray-700">
                          {
                            city.country_code
                          }
                        </td>

                        <td className="px-4 py-4 text-xs text-gray-600">
                          {city.latitude !==
                            null &&
                          city.longitude !==
                            null ? (
                            <>
                              <span className="block">
                                Lat:{" "}
                                {
                                  city.latitude
                                }
                              </span>

                              <span className="mt-1 block">
                                Lng:{" "}
                                {
                                  city.longitude
                                }
                              </span>
                            </>
                          ) : (
                            "â€”"
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {
                            city.clinic_count
                          }
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              city.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {city.is_active
                              ? "Activ"
                              : "Inactiv"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                beginEditing(
                                  city
                                )
                              }
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              EditeazÄƒ
                            </button>

                            <button
                              type="button"
                              disabled={
                                isChanging
                              }
                              onClick={() =>
                                toggleCity(
                                  city
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                                city.is_active
                                  ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                  : "bg-[#036661] text-white hover:bg-[#ff2800]"
                              }`}
                            >
                              {isChanging
                                ? "Se actualizeazÄƒ..."
                                : city.is_active
                                  ? "DezactiveazÄƒ"
                                  : "ActiveazÄƒ"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
