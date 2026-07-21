"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import Button from "@/components/ui/button";
import type { PlatformOperatorDirectoryApiPayload } from "@/lib/api/platform-operator-directory-codes";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformDirectoryApiMessage,
  getPlatformOperatorDirectory,
  interpolatePlatformDirectoryCopy,
} from "@/lib/i18n/platform-operator-directory";
import { createSpecialtySlug } from "@/lib/specialties/create-specialty-slug";

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
  specialty_translations: SpecialtyTranslation[] | null;
};

type SpecialtyCapabilities = {
  canCreateSpecialties: boolean;
  canUpdateSpecialties: boolean;
};

type ApiResponse = PlatformOperatorDirectoryApiPayload & {
  specialties?: Specialty[];
  capabilities?: Partial<SpecialtyCapabilities>;
};

type StatusFilter = "all" | "active" | "inactive";

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

const EMPTY_FORM: SpecialtyFormState = {
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

function getTranslation(specialty: Specialty, locale: string) {
  return (
    specialty.specialty_translations?.find(
      (translation) => translation.locale === locale
    ) ?? null
  );
}

function metricCard(label: string, value: number) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-[13px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-[5px] text-2xl font-bold text-gray-900">{value}</p>
    </article>
  );
}

export default function SpecialtiesManagement() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorDirectory(locale);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [form, setForm] = useState<SpecialtyFormState>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changingSpecialtyId, setChangingSpecialtyId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<SpecialtyCapabilities>({
    canCreateSpecialties: true,
    canUpdateSpecialties: true,
  });

  const isEditing = Boolean(form.specialtyId);

  const loadSpecialties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/specialties", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformDirectoryApiMessage(
            locale,
            result.code,
            result.error ?? copy.specialties.states.loadFailed
          )
        );
      }

      setSpecialties(result.specialties ?? []);
      setCapabilities((current) => ({
        ...current,
        ...result.capabilities,
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.specialties.states.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.specialties.states.loadFailed, locale]);

  useEffect(() => {
    void loadSpecialties();
  }, [loadSpecialties]);

  const metrics = useMemo(() => {
    const active = specialties.filter((specialty) => specialty.is_active).length;
    const missingGerman = specialties.filter(
      (specialty) => !getTranslation(specialty, "de")?.name
    ).length;

    return {
      total: specialties.length,
      active,
      inactive: specialties.length - active,
      missingGerman,
    };
  }, [specialties]);

  const filteredSpecialties = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase(locale);

    return specialties.filter((specialty) => {
      if (statusFilter === "active" && !specialty.is_active) return false;
      if (statusFilter === "inactive" && specialty.is_active) return false;
      if (!normalized) return true;

      const values = [
        specialty.slug,
        getTranslation(specialty, "ro")?.name,
        getTranslation(specialty, "en")?.name,
        getTranslation(specialty, "de")?.name,
      ];

      return values
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase(locale).includes(normalized));
    });
  }, [locale, search, specialties, statusFilter]);

  function updateForm<Key extends keyof SpecialtyFormState>(
    key: Key,
    value: SpecialtyFormState[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
  }

  function beginEditing(specialty: Specialty) {
    const ro = getTranslation(specialty, "ro");
    const en = getTranslation(specialty, "en");
    const de = getTranslation(specialty, "de");

    setForm({
      specialtyId: specialty.id,
      nameRo: ro?.name ?? "",
      nameEn: en?.name ?? "",
      nameDe: de?.name ?? "",
      slug: specialty.slug,
      icon: specialty.icon ?? "",
      metaTitleRo: ro?.meta_title ?? "",
      metaTitleEn: en?.meta_title ?? "",
      metaTitleDe: de?.meta_title ?? "",
      metaDescriptionRo: ro?.meta_description ?? "",
      metaDescriptionEn: en?.meta_description ?? "",
      metaDescriptionDe: de?.meta_description ?? "",
      isActive: specialty.is_active,
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm(
    payload: SpecialtyFormState,
    method: "POST" | "PATCH"
  ) {
    const response = await fetch("/api/admin/specialties", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.error ?? copy.specialties.states.saveFailed
        )
      );
    }

    return result;
  }

  async function saveSpecialty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.nameRo.trim().length < 2) {
      setError(copy.specialties.form.nameRoRequired);
      return;
    }

    if (form.nameEn.trim().length < 2) {
      setError(copy.specialties.form.nameEnRequired);
      return;
    }

    setIsSaving(true);

    try {
      const result = await submitForm(form, isEditing ? "PATCH" : "POST");
      setSuccess(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.message ??
            (isEditing
              ? copy.specialties.states.updated
              : copy.specialties.states.created)
        )
      );
      setForm(EMPTY_FORM);
      await loadSpecialties();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : copy.specialties.states.saveFailed
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSpecialty(specialty: Specialty) {
    const nextActive = !specialty.is_active;

    if (!nextActive && specialty.doctor_count > 0) {
      setError(copy.specialties.list.inUse);
      return;
    }

    const confirmed = window.confirm(
      nextActive
        ? copy.specialties.list.confirmActivate
        : copy.specialties.list.confirmDeactivate
    );
    if (!confirmed) return;

    const ro = getTranslation(specialty, "ro");
    const en = getTranslation(specialty, "en");
    const de = getTranslation(specialty, "de");

    setError(null);
    setSuccess(null);
    setChangingSpecialtyId(specialty.id);

    try {
      const result = await submitForm(
        {
          specialtyId: specialty.id,
          slug: specialty.slug,
          icon: specialty.icon ?? "",
          nameRo: ro?.name ?? "",
          nameEn: en?.name ?? "",
          nameDe: de?.name ?? "",
          metaTitleRo: ro?.meta_title ?? "",
          metaTitleEn: en?.meta_title ?? "",
          metaTitleDe: de?.meta_title ?? "",
          metaDescriptionRo: ro?.meta_description ?? "",
          metaDescriptionEn: en?.meta_description ?? "",
          metaDescriptionDe: de?.meta_description ?? "",
          isActive: nextActive,
        },
        "PATCH"
      );

      setSuccess(
        getPlatformDirectoryApiMessage(
          locale,
          result.code,
          result.message ??
            (nextActive
              ? copy.specialties.states.updated
              : copy.specialties.states.deactivated)
        )
      );
      await loadSpecialties();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : copy.specialties.states.statusFailed
      );
    } finally {
      setChangingSpecialtyId(null);
    }
  }

  return (
    <div className="space-y-[34px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {metricCard(copy.specialties.metrics.total, metrics.total)}
        {metricCard(copy.specialties.metrics.active, metrics.active)}
        {metricCard(copy.specialties.metrics.inactive, metrics.inactive)}
        {metricCard(copy.specialties.metrics.missingGerman, metrics.missingGerman)}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="flex flex-wrap items-start justify-between gap-[13px]">
          <div>
            <p className="text-sm font-semibold text-[#036661]">
              {isEditing
                ? copy.specialties.form.editEyebrow
                : copy.specialties.form.newEyebrow}
            </p>
            <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
              {isEditing
                ? copy.specialties.form.editTitle
                : copy.specialties.form.newTitle}
            </h2>
            <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
              {copy.specialties.form.description}
            </p>
          </div>

          {isEditing && (
            <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
              {copy.specialties.form.cancelEdit}
            </Button>
          )}
        </div>

        <form onSubmit={saveSpecialty} className="mt-[21px] space-y-[21px]">
          <div className="grid gap-[13px] lg:grid-cols-3">
            <LanguageNameField
              label={copy.specialties.form.nameRo}
              required
              value={form.nameRo}
              disabled={isSaving}
              optionalLabel={copy.common.optional}
              onChange={(name) => {
                updateForm("nameRo", name);
                if (!isEditing || !form.slug) {
                  updateForm("slug", createSpecialtySlug(name));
                }
              }}
            />
            <LanguageNameField
              label={copy.specialties.form.nameEn}
              required
              value={form.nameEn}
              disabled={isSaving}
              optionalLabel={copy.common.optional}
              onChange={(value) => updateForm("nameEn", value)}
            />
            <LanguageNameField
              label={copy.specialties.form.nameDe}
              optional
              value={form.nameDe}
              disabled={isSaving}
              optionalLabel={copy.common.optional}
              onChange={(value) => updateForm("nameDe", value)}
            />
          </div>

          <div className="grid gap-[13px] md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {copy.common.slug}
              </span>
              <input
                required
                type="text"
                maxLength={200}
                value={form.slug}
                disabled={isSaving}
                onChange={(event) =>
                  updateForm("slug", createSpecialtySlug(event.target.value))
                }
                className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] font-mono text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {copy.common.icon}
              </span>
              <span className="ml-[8px] text-xs text-gray-500">
                {copy.common.optional}
              </span>
              <input
                type="text"
                maxLength={100}
                value={form.icon}
                disabled={isSaving}
                onChange={(event) => updateForm("icon", event.target.value)}
                placeholder={copy.specialties.form.iconPlaceholder}
                className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
          </div>

          <details className="rounded-xl border border-gray-200 bg-gray-50 p-[21px]">
            <summary className="cursor-pointer font-semibold text-gray-900">
              {copy.specialties.form.seoSummary}
            </summary>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.specialties.form.seoHelp}
            </p>

            <div className="mt-[21px] grid gap-[21px] lg:grid-cols-3">
              <SeoLanguageFields
                language={copy.common.romanian}
                title={form.metaTitleRo}
                description={form.metaDescriptionRo}
                disabled={isSaving}
                titleLabel={copy.specialties.form.metaTitle}
                descriptionLabel={copy.specialties.form.metaDescription}
                onTitleChange={(value) => updateForm("metaTitleRo", value)}
                onDescriptionChange={(value) =>
                  updateForm("metaDescriptionRo", value)
                }
              />
              <SeoLanguageFields
                language={copy.common.english}
                title={form.metaTitleEn}
                description={form.metaDescriptionEn}
                disabled={isSaving}
                titleLabel={copy.specialties.form.metaTitle}
                descriptionLabel={copy.specialties.form.metaDescription}
                onTitleChange={(value) => updateForm("metaTitleEn", value)}
                onDescriptionChange={(value) =>
                  updateForm("metaDescriptionEn", value)
                }
              />
              <SeoLanguageFields
                language={copy.common.german}
                title={form.metaTitleDe}
                description={form.metaDescriptionDe}
                disabled={isSaving}
                titleLabel={copy.specialties.form.metaTitle}
                descriptionLabel={copy.specialties.form.metaDescription}
                onTitleChange={(value) => updateForm("metaTitleDe", value)}
                onDescriptionChange={(value) =>
                  updateForm("metaDescriptionDe", value)
                }
              />
            </div>
          </details>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-[13px] text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-[13px] text-sm text-green-800">
              {success}
            </div>
          )}

          <Button
            type="submit"
            isLoading={isSaving}
            loadingText={copy.specialties.form.saving}
            disabled={!capabilities.canCreateSpecialties && !isEditing}
          >
            {isEditing
              ? copy.specialties.form.save
              : copy.specialties.form.create}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <div className="flex flex-wrap items-end justify-between gap-[13px]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {copy.specialties.list.title}
            </h2>
            <p className="mt-[8px] text-sm text-gray-600">
              {interpolatePlatformDirectoryCopy(copy.specialties.list.count, {
                count: specialties.length,
              })}
            </p>
          </div>

          <div className="flex w-full flex-col gap-[8px] sm:w-auto sm:flex-row">
            <label className="w-full sm:w-52">
              <span className="sr-only">{copy.specialties.list.statusLabel}</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px]"
              >
                <option value="all">{copy.specialties.list.allStatuses}</option>
                <option value="active">{copy.specialties.list.active}</option>
                <option value="inactive">{copy.specialties.list.inactive}</option>
              </select>
            </label>

            <label className="w-full sm:w-80">
              <span className="sr-only">{copy.specialties.list.searchLabel}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.specialties.list.searchPlaceholder}
                className="romdoc-focus-ring w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-[21px] text-sm text-gray-600">
            {copy.specialties.list.loading}
          </p>
        ) : filteredSpecialties.length === 0 ? (
          <p className="mt-[21px] rounded-xl bg-gray-50 p-[21px] text-sm text-gray-600">
            {copy.specialties.list.empty}
          </p>
        ) : (
          <div className="mt-[21px] overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-[13px] py-[13px] font-semibold">{copy.specialties.list.romanian}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.specialties.list.english}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.specialties.list.german}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.common.slug}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.specialties.list.doctors}</th>
                  <th className="px-[13px] py-[13px] font-semibold">{copy.common.status}</th>
                  <th className="px-[13px] py-[13px] text-right font-semibold">{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSpecialties.map((specialty) => {
                  const ro = getTranslation(specialty, "ro");
                  const en = getTranslation(specialty, "en");
                  const de = getTranslation(specialty, "de");
                  const isChanging = changingSpecialtyId === specialty.id;

                  return (
                    <tr key={specialty.id} className="align-top">
                      <td className="px-[13px] py-[13px]">
                        <p className="font-semibold text-gray-900">{ro?.name ?? copy.common.none}</p>
                        {specialty.icon && (
                          <p className="mt-[5px] text-xs text-gray-500">
                            {copy.common.icon}: {specialty.icon}
                          </p>
                        )}
                      </td>
                      <td className="px-[13px] py-[13px] text-gray-700">{en?.name ?? copy.common.none}</td>
                      <td className="px-[13px] py-[13px] text-gray-700">
                        {de?.name ?? (
                          <span className="text-gray-400">{copy.specialties.list.notTranslated}</span>
                        )}
                      </td>
                      <td className="px-[13px] py-[13px] font-mono text-xs text-gray-600">{specialty.slug}</td>
                      <td className="px-[13px] py-[13px] text-gray-700">{specialty.doctor_count}</td>
                      <td className="px-[13px] py-[13px]">
                        <span className={`rounded-full px-[13px] py-[5px] text-xs font-semibold ${
                          specialty.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}>
                          {specialty.is_active ? copy.common.active : copy.common.inactive}
                        </span>
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <div className="flex justify-end gap-[8px]">
                          <Button type="button" size="sm" variant="secondary" onClick={() => beginEditing(specialty)}>
                            {copy.specialties.list.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={specialty.is_active ? "secondary" : "primary"}
                            isLoading={isChanging}
                            loadingText={copy.specialties.list.updating}
                            disabled={!capabilities.canUpdateSpecialties}
                            onClick={() => void toggleSpecialty(specialty)}
                          >
                            {specialty.is_active
                              ? copy.specialties.list.deactivate
                              : copy.specialties.list.activate}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
  optionalLabel,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  required?: boolean;
  optional?: boolean;
  optionalLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {optional && (
        <span className="ml-[8px] text-xs text-gray-500">{optionalLabel}</span>
      )}
      <input
        required={required}
        type="text"
        maxLength={200}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px]"
      />
    </label>
  );
}

function SeoLanguageFields({
  language,
  title,
  description,
  disabled,
  titleLabel,
  descriptionLabel,
  onTitleChange,
  onDescriptionChange,
}: {
  language: string;
  title: string;
  description: string;
  disabled: boolean;
  titleLabel: string;
  descriptionLabel: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="space-y-[13px]">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          {interpolatePlatformDirectoryCopy(titleLabel, { language })}
        </span>
        <input
          type="text"
          maxLength={250}
          value={title}
          disabled={disabled}
          onChange={(event) => onTitleChange(event.target.value)}
          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px]"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          {interpolatePlatformDirectoryCopy(descriptionLabel, { language })}
        </span>
        <textarea
          rows={4}
          maxLength={500}
          value={description}
          disabled={disabled}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="romdoc-focus-ring mt-[8px] w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px]"
        />
      </label>
    </div>
  );
}
