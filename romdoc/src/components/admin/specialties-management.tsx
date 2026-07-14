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
  meta_title: string | null;
  meta_description: string | null;
};

type Specialty = {
  id: string;
  slug: string;
  icon: string | null;
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
  nameDe: string;
  slug: string;
  icon: string;
  metaTitleRo: string;
  metaTitleEn: string;
  metaTitleDe: string;
  metaDescriptionRo: string;
  metaDescriptionEn: string;
  metaDescriptionDe: string;
  isActive: boolean;
};

const emptyForm: SpecialtyFormState = {
  specialtyId: "",
  nameRo: "",
  nameEn: "",
  nameDe: "",
  slug: "",
  icon: "",
  metaTitleRo: "",
  metaTitleEn: "",
  metaTitleDe: "",
  metaDescriptionRo: "",
  metaDescriptionEn: "",
  metaDescriptionDe: "",
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
          translation.locale === locale
      ) ?? null
  );
}

export default function
SpecialtiesManagement() {
  const [
    specialties,
    setSpecialties,
  ] = useState<Specialty[]>([]);

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
              "Specialitățile nu au putut fi încărcate."
          );
        }

        setSpecialties(
          result.specialties ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Specialitățile nu au putut fi încărcate."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadSpecialties();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [loadSpecialties]);

  const filteredSpecialties =
    useMemo(() => {
      const normalized =
        search.trim().toLowerCase();

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

          const de =
            getTranslation(
              specialty,
              "de"
            );

          return [
            specialty.slug,
            ro?.name,
            en?.name,
            de?.name,
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(normalized)
            );
        }
      );
    }, [search, specialties]);

  function updateForm<
    Key extends keyof SpecialtyFormState,
  >(
    key: Key,
    value: SpecialtyFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
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

    const de =
      getTranslation(
        specialty,
        "de"
      );

    setForm({
      specialtyId: specialty.id,
      nameRo: ro?.name ?? "",
      nameEn: en?.name ?? "",
      nameDe: de?.name ?? "",
      slug: specialty.slug,
      icon: specialty.icon ?? "",
      metaTitleRo:
        ro?.meta_title ?? "",
      metaTitleEn:
        en?.meta_title ?? "",
      metaTitleDe:
        de?.meta_title ?? "",
      metaDescriptionRo:
        ro?.meta_description ?? "",
      metaDescriptionEn:
        en?.meta_description ?? "",
      metaDescriptionDe:
        de?.meta_description ?? "",
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

  async function submitForm(
    payload: SpecialtyFormState,
    method: "POST" | "PATCH"
  ) {
    const response =
      await fetch(
        "/api/admin/specialties",
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(payload),
        }
      );

    const result =
      (await response.json()) as
        ApiResponse;

    if (!response.ok) {
      throw new Error(
        result.error ??
          "Specialitatea nu a putut fi salvată."
      );
    }

    return result;
  }

  async function saveSpecialty(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      form.nameRo.trim().length < 2
    ) {
      setError(
        "Introdu numele în limba română."
      );
      return;
    }

    if (
      form.nameEn.trim().length < 2
    ) {
      setError(
        "Introdu numele în limba engleză."
      );
      return;
    }

    setIsSaving(true);

    try {
      const result =
        await submitForm(
          form,
          isEditing
            ? "PATCH"
            : "POST"
        );

      setSuccess(
        result.message ??
          "Specialitatea a fost salvată."
      );

      setForm(emptyForm);
      await loadSpecialties();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Specialitatea nu a putut fi salvată."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSpecialty(
    specialty: Specialty
  ) {
    const nextActive =
      !specialty.is_active;

    if (
      !nextActive &&
      specialty.doctor_count > 0
    ) {
      setError(
        "Specialitatea este asociată unor medici și nu poate fi dezactivată."
      );
      return;
    }

    const confirmed =
      window.confirm(
        nextActive
          ? "Reactivezi această specialitate?"
          : "Dezactivezi această specialitate?"
      );

    if (!confirmed) {
      return;
    }

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

    const de =
      getTranslation(
        specialty,
        "de"
      );

    setError(null);
    setSuccess(null);

    try {
      const result =
        await submitForm(
          {
            specialtyId:
              specialty.id,
            slug:
              specialty.slug,
            icon:
              specialty.icon ?? "",
            nameRo:
              ro?.name ?? "",
            nameEn:
              en?.name ?? "",
            nameDe:
              de?.name ?? "",
            metaTitleRo:
              ro?.meta_title ?? "",
            metaTitleEn:
              en?.meta_title ?? "",
            metaTitleDe:
              de?.meta_title ?? "",
            metaDescriptionRo:
              ro?.meta_description ??
              "",
            metaDescriptionEn:
              en?.meta_description ??
              "",
            metaDescriptionDe:
              de?.meta_description ??
              "",
            isActive:
              nextActive,
          },
          "PATCH"
        );

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
                : "Specialitate nouă"}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {isEditing
                ? "Editează specialitatea"
                : "Adaugă o specialitate"}
            </h2>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Anulează editarea
            </button>
          )}
        </div>

        <form
          onSubmit={saveSpecialty}
          className="mt-8 space-y-6"
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <LanguageNameField
              label="Nume în română"
              required
              value={form.nameRo}
              disabled={isSaving}
              onChange={(name) => {
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
            />

            <LanguageNameField
              label="Nume în engleză"
              required
              value={form.nameEn}
              disabled={isSaving}
              onChange={(value) =>
                updateForm(
                  "nameEn",
                  value
                )
              }
            />

            <LanguageNameField
              label="Nume în germană"
              optional
              value={form.nameDe}
              disabled={isSaving}
              onChange={(value) =>
                updateForm(
                  "nameDe",
                  value
                )
              }
            />
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
                Opțional
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
              Câmpuri SEO
            </summary>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Câmpurile germane sunt opționale. Completează-le
              manual când traducerea este disponibilă.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <SeoLanguageFields
                language="română"
                title={form.metaTitleRo}
                description={
                  form.metaDescriptionRo
                }
                disabled={isSaving}
                onTitleChange={(value) =>
                  updateForm(
                    "metaTitleRo",
                    value
                  )
                }
                onDescriptionChange={(
                  value
                ) =>
                  updateForm(
                    "metaDescriptionRo",
                    value
                  )
                }
              />

              <SeoLanguageFields
                language="engleză"
                title={form.metaTitleEn}
                description={
                  form.metaDescriptionEn
                }
                disabled={isSaving}
                onTitleChange={(value) =>
                  updateForm(
                    "metaTitleEn",
                    value
                  )
                }
                onDescriptionChange={(
                  value
                ) =>
                  updateForm(
                    "metaDescriptionEn",
                    value
                  )
                }
              />

              <SeoLanguageFields
                language="germană"
                title={form.metaTitleDe}
                description={
                  form.metaDescriptionDe
                }
                disabled={isSaving}
                onTitleChange={(value) =>
                  updateForm(
                    "metaTitleDe",
                    value
                  )
                }
                onDescriptionChange={(
                  value
                ) =>
                  updateForm(
                    "metaDescriptionDe",
                    value
                  )
                }
              />
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
              ? "Se salvează..."
              : isEditing
                ? "Salvează modificările"
                : "Adaugă specialitatea"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Lista specialităților
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {specialties.length} specialități înregistrate.
            </p>
          </div>

          <label className="w-full sm:w-80">
            <span className="sr-only">
              Caută specialitate
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Caută după nume sau slug..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-gray-600">
            Se încarcă specialitățile...
          </p>
        ) : filteredSpecialties.length ===
          0 ? (
          <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
            Nu există specialități care corespund căutării.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-4 py-3 font-semibold">
                    Română
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Engleză
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Germană
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
                    Acțiuni
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

                    const de =
                      getTranslation(
                        specialty,
                        "de"
                      );

                    return (
                      <tr
                        key={specialty.id}
                        className="align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">
                            {ro?.name ?? "—"}
                          </p>

                          {specialty.icon && (
                            <p className="mt-1 text-xs text-gray-500">
                              Icon:{" "}
                              {specialty.icon}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {en?.name ?? "—"}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {de?.name ? (
                            de.name
                          ) : (
                            <span className="text-gray-400">
                              Netadusă
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-gray-600">
                          {specialty.slug}
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
                              ? "Activă"
                              : "Inactivă"}
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
                              Editează
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
                                ? "Dezactivează"
                                : "Activează"}
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

function LanguageNameField({
  label,
  value,
  disabled,
  required = false,
  optional = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  required?: boolean;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      {optional && (
        <span className="ml-2 text-xs text-gray-500">
          Opțional
        </span>
      )}

      <input
        required={required}
        type="text"
        maxLength={200}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
      />
    </label>
  );
}

function SeoLanguageFields({
  language,
  title,
  description,
  disabled,
  onTitleChange,
  onDescriptionChange,
}: {
  language: string;
  title: string;
  description: string;
  disabled: boolean;
  onTitleChange:
    (value: string) => void;
  onDescriptionChange:
    (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Titlu SEO {language}
        </span>

        <input
          type="text"
          maxLength={250}
          value={title}
          disabled={disabled}
          onChange={(event) =>
            onTitleChange(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          Descriere SEO {language}
        </span>

        <textarea
          rows={4}
          maxLength={500}
          value={description}
          disabled={disabled}
          onChange={(event) =>
            onDescriptionChange(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
        />
      </label>
    </div>
  );
}
