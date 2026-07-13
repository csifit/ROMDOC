"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createSpecialtySlug,
} from "@/lib/specialties/create-specialty-slug";

type SpecialtyTranslation = {
  id: string;
  locale: string;
  name: string;
  meta_title:
    | string
    | null;
  meta_description:
    | string
    | null;
};

type Specialty = {
  id: string;
  slug: string;
  icon:
    | string
    | null;
  is_active: boolean;
  doctor_count: number;
  created_at: string;
  updated_at: string;

  specialty_translations:
    | SpecialtyTranslation[]
    | null;
};

type ApiResponse = {
  specialties?: Specialty[];
  message?: string;
  error?: string;
};

type SpecialtyFormState = {
  specialtyId: string;
  nameRo: string;
  nameEn: string;
  slug: string;
  icon: string;
  metaTitleRo: string;
  metaTitleEn: string;
  metaDescriptionRo: string;
  metaDescriptionEn: string;
  isActive: boolean;
};

const emptyForm: SpecialtyFormState = {
  specialtyId: "",
  nameRo: "",
  nameEn: "",
  slug: "",
  icon: "",
  metaTitleRo: "",
  metaTitleEn: "",
  metaDescriptionRo: "",
  metaDescriptionEn: "",
  isActive: true,
};

function getTranslation(
  specialty: Specialty,
  locale: string
) {
  return (
    specialty.specialty_translations
      ?.find(
        (translation) =>
          translation.locale ===
          locale
      ) ?? null
  );
}

export default function SpecialtiesManagement() {
  const [
    specialties,
    setSpecialties,
  ] = useState<Specialty[]>(
    []
  );

  const [form, setForm] =
    useState<SpecialtyFormState>(
      emptyForm
    );

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const isEditing =
    Boolean(form.specialtyId);

  const loadSpecialties =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/specialties",
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
              "SpecialitÄƒÈ›ile nu au putut fi Ã®ncÄƒrcate."
          );
        }

        setSpecialties(
          result.specialties ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "SpecialitÄƒÈ›ile nu au putut fi Ã®ncÄƒrcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSpecialties();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadSpecialties]);

  const filteredSpecialties =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return specialties;
      }

      return specialties.filter(
        (specialty) => {
          const ro =
            getTranslation(
              specialty,
              "ro"
            );

          const en =
            getTranslation(
              specialty,
              "en"
            );

          return [
            specialty.slug,
            ro?.name,
            en?.name,
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(
                  normalized
                )
            );
        }
      );
    }, [
      search,
      specialties,
    ]);

  function updateForm<
    Key extends keyof SpecialtyFormState,
  >(
    key: Key,
    value:
      SpecialtyFormState[Key]
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
    specialty: Specialty
  ) {
    const ro =
      getTranslation(
        specialty,
        "ro"
      );

    const en =
      getTranslation(
        specialty,
        "en"
      );

    setForm({
      specialtyId:
        specialty.id,

      nameRo:
        ro?.name ?? "",

      nameEn:
        en?.name ?? "",

      slug:
        specialty.slug,

      icon:
        specialty.icon ?? "",

      metaTitleRo:
        ro?.meta_title ?? "",

      metaTitleEn:
        en?.meta_title ?? "",

      metaDescriptionRo:
        ro?.meta_description ??
        "",

      metaDescriptionEn:
        en?.meta_description ??
        "",

      isActive:
        specialty.is_active,
    });

    setError(null);
    setSuccess(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSpecialty(
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
        "Introdu numele Ã®n limba romÃ¢nÄƒ."
      );

      return;
    }

    if (
      form.nameEn
        .trim()
        .length < 2
    ) {
      setError(
        "Introdu numele Ã®n limba englezÄƒ."
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/specialties",
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
              JSON.stringify(
                form
              ),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Specialitatea nu a putut fi salvatÄƒ."
        );
      }

      setSuccess(
        result.message ??
          "Specialitatea a fost salvatÄƒ."
      );

      setForm(emptyForm);

      await loadSpecialties();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Specialitatea nu a putut fi salvatÄƒ."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSpecialty(
    specialty: Specialty
  ) {
    const ro =
      getTranslation(
        specialty,
        "ro"
      );

    const en =
      getTranslation(
        specialty,
        "en"
      );

    const nextActive =
      !specialty.is_active;

    if (
      !nextActive &&
      specialty.doctor_count >
        0
    ) {
      setError(
        "Specialitatea este asociatÄƒ unor medici È™i nu poate fi dezactivatÄƒ."
      );

      return;
    }

    const confirmed =
      window.confirm(
        nextActive
          ? "Reactivezi aceastÄƒ specialitate?"
          : "Dezactivezi aceastÄƒ specialitate?"
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/admin/specialties",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                specialtyId:
                  specialty.id,

                slug:
                  specialty.slug,

                icon:
                  specialty.icon ??
                  "",

                nameRo:
                  ro?.name ?? "",

                nameEn:
                  en?.name ?? "",

                metaTitleRo:
                  ro?.meta_title ??
                  "",

                metaTitleEn:
                  en?.meta_title ??
                  "",

                metaDescriptionRo:
                  ro?.meta_description ??
                  "",

                metaDescriptionEn:
                  en?.meta_description ??
                  "",

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
            "Statutul nu a putut fi actualizat."
        );
      }

      setSuccess(
        result.message ??
          "Statutul a fost actualizat."
      );

      await loadSpecialties();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Statutul nu a putut fi actualizat."
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
                : "Specialitate nouÄƒ"}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {isEditing
                ? "EditeazÄƒ specialitatea"
                : "AdaugÄƒ o specialitate"}
            </h2>
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
          onSubmit={saveSpecialty}
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
                      createSpecialtySlug(
                        name
                      )
                    );
                  }
                }}
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
                    createSpecialtySlug(
                      event.target.value
                    )
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Icon
              </span>

              <span className="ml-2 text-xs text-gray-500">
                OpÈ›ional
              </span>

              <input
                type="text"
                maxLength={100}
                value={form.icon}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm(
                    "icon",
                    event.target.value
                  )
                }
                placeholder="Exemplu: heart"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

          <details className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <summary className="cursor-pointer font-semibold text-gray-900">
              CÃ¢mpuri SEO
            </summary>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Titlu SEO romÃ¢nÄƒ
                </span>

                <input
                  type="text"
                  maxLength={250}
                  value={
                    form.metaTitleRo
                  }
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm(
                      "metaTitleRo",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Titlu SEO englezÄƒ
                </span>

                <input
                  type="text"
                  maxLength={250}
                  value={
                    form.metaTitleEn
                  }
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm(
                      "metaTitleEn",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Descriere SEO romÃ¢nÄƒ
                </span>

                <textarea
                  rows={3}
                  maxLength={500}
                  value={
                    form.metaDescriptionRo
                  }
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm(
                      "metaDescriptionRo",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Descriere SEO englezÄƒ
                </span>

                <textarea
                  rows={3}
                  maxLength={500}
                  value={
                    form.metaDescriptionEn
                  }
                  disabled={isSaving}
                  onChange={(event) =>
                    updateForm(
                      "metaDescriptionEn",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                />
              </label>
            </div>
          </details>

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
                : "AdaugÄƒ specialitatea"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Lista specialitÄƒÈ›ilor
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {specialties.length} specialitÄƒÈ›i Ã®nregistrate.
            </p>
          </div>

          <label className="w-full sm:w-80">
            <span className="sr-only">
              CautÄƒ specialitate
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="CautÄƒ dupÄƒ nume sau slug..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-600">
            Se Ã®ncarcÄƒ specialitÄƒÈ›ile...
          </p>
        ) : filteredSpecialties.length ===
          0 ? (
          <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
            Nu existÄƒ specialitÄƒÈ›i care corespund cÄƒutÄƒrii.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-4 py-3 font-semibold">
                    Specialitate
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    EnglezÄƒ
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Slug
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Medici
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
                {filteredSpecialties.map(
                  (specialty) => {
                    const ro =
                      getTranslation(
                        specialty,
                        "ro"
                      );

                    const en =
                      getTranslation(
                        specialty,
                        "en"
                      );

                    return (
                      <tr
                        key={
                          specialty.id
                        }
                        className="align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">
                            {ro?.name ??
                              "â€”"}
                          </p>

                          {specialty.icon && (
                            <p className="mt-1 text-xs text-gray-500">
                              Icon:{" "}
                              {
                                specialty.icon
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {en?.name ??
                            "â€”"}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-gray-600">
                          {
                            specialty.slug
                          }
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {
                            specialty.doctor_count
                          }
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              specialty.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {specialty.is_active
                              ? "ActivÄƒ"
                              : "InactivÄƒ"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                beginEditing(
                                  specialty
                                )
                              }
                              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              EditeazÄƒ
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleSpecialty(
                                  specialty
                                )
                              }
                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                                specialty.is_active
                                  ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                  : "bg-[#036661] text-white hover:bg-[#ff2800]"
                              }`}
                            >
                              {specialty.is_active
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
