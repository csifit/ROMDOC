"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type FamilyDoctorOption = {
  doctorId: string;
  name: string;
  clinic: string;
  phone: string;
};

type CurrentFamilyDoctor = {
  doctorId: string | null;
  name: string;
  clinic: string;
  phone: string;
};

type ApiResponse = {
  current?: CurrentFamilyDoctor;
  options?: FamilyDoctorOption[];
  success?: boolean;
  error?: string;
};

type Props = {
  locale: string;
};

const COPY = {
  ro: {
    title: "Medic de familie",
    linked: "Legat la RomDoc",
    external: "Doar informație",
    none: "Nespecificat",
    change: "Modifică",
    close: "Închide",
    save: "Salvează",
    saving: "Se salvează...",
    loading: "Se încarcă...",
    romdocOption: "Medic RomDoc consultat",
    externalOption: "Medic extern / doar informație",
    noLinkOption: "Fără medic de familie",
    name: "Nume",
    clinic: "Clinică / cabinet",
    phone: "Telefon",
    helper:
      "Poți lega medicul de familie de un medic RomDoc pe care l-ai consultat. Un nume introdus manual nu acordă acces RomDoc.",
    externalHelper:
      "Medicul extern rămâne doar informație în Profilul medical.",
    noTreatingDoctors:
      "Nu există încă medici RomDoc eligibili pentru desemnare.",
    loadError:
      "Medicul de familie nu a putut fi încărcat.",
    saveError:
      "Medicul de familie nu a putut fi salvat.",
    saved:
      "Medicul de familie a fost actualizat.",
  },
  en: {
    title: "Family Doctor",
    linked: "Linked to RomDoc",
    external: "Information only",
    none: "Not specified",
    change: "Change",
    close: "Close",
    save: "Save",
    saving: "Saving...",
    loading: "Loading...",
    romdocOption: "RomDoc doctor you visited",
    externalOption: "External doctor / information only",
    noLinkOption: "No Family Doctor",
    name: "Name",
    clinic: "Clinic / practice",
    phone: "Phone",
    helper:
      "You can link your Family Doctor to a RomDoc doctor you have visited. A manually entered name never grants RomDoc access.",
    externalHelper:
      "An external doctor remains information only in the Medical Profile.",
    noTreatingDoctors:
      "There are no eligible RomDoc doctors to designate yet.",
    loadError:
      "The Family Doctor could not be loaded.",
    saveError:
      "The Family Doctor could not be saved.",
    saved:
      "Family Doctor updated.",
  },
  de: {
    title: "Hausarzt",
    linked: "Mit RomDoc verknüpft",
    external: "Nur Information",
    none: "Nicht angegeben",
    change: "Ändern",
    close: "Schließen",
    save: "Speichern",
    saving: "Wird gespeichert...",
    loading: "Wird geladen...",
    romdocOption: "Besuchter RomDoc-Arzt",
    externalOption: "Externer Arzt / nur Information",
    noLinkOption: "Kein Hausarzt",
    name: "Name",
    clinic: "Klinik / Praxis",
    phone: "Telefon",
    helper:
      "Sie können Ihren Hausarzt mit einem besuchten RomDoc-Arzt verknüpfen. Ein manuell eingetragener Name gewährt keinen RomDoc-Zugriff.",
    externalHelper:
      "Ein externer Arzt bleibt nur eine Information im medizinischen Profil.",
    noTreatingDoctors:
      "Es gibt noch keine geeigneten RomDoc-Ärzte zur Auswahl.",
    loadError:
      "Der Hausarzt konnte nicht geladen werden.",
    saveError:
      "Der Hausarzt konnte nicht gespeichert werden.",
    saved:
      "Hausarzt aktualisiert.",
  },
} as const;

function emptyCurrent(): CurrentFamilyDoctor {
  return {
    doctorId: null,
    name: "",
    clinic: "",
    phone: "",
  };
}

export default function PatientFamilyDoctorDesignation({
  locale: localeInput,
}: Props) {
  const locale =
    normalizeAppLocale(
      localeInput
    );

  const text =
    COPY[locale];

  const [
    current,
    setCurrent,
  ] = useState<CurrentFamilyDoctor>(
    emptyCurrent()
  );

  const [
    options,
    setOptions,
  ] = useState<FamilyDoctorOption[]>([]);

  const [
    selection,
    setSelection,
  ] = useState("none");

  const [
    externalName,
    setExternalName,
  ] = useState("");

  const [
    externalClinic,
    setExternalClinic,
  ] = useState("");

  const [
    externalPhone,
    setExternalPhone,
  ] = useState("");

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const selectedOption =
    useMemo(
      () =>
        options.find(
          (option) =>
            option.doctorId === selection
        ) ?? null,
      [options, selection]
    );

  function applyPayload(
    payload: ApiResponse
  ) {
    const nextCurrent =
      payload.current ??
      emptyCurrent();

    setCurrent(
      nextCurrent
    );

    setOptions(
      payload.options ?? []
    );

    setExternalName(
      nextCurrent.name
    );

    setExternalClinic(
      nextCurrent.clinic
    );

    setExternalPhone(
      nextCurrent.phone
    );

    if (nextCurrent.doctorId) {
      setSelection(
        nextCurrent.doctorId
      );
    } else if (
      nextCurrent.name ||
      nextCurrent.clinic ||
      nextCurrent.phone
    ) {
      setSelection("external");
    } else {
      setSelection("none");
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/patient/family-doctor?locale=${encodeURIComponent(locale)}`,
            {
              cache: "no-store",
            }
          );

        const payload =
          (await response.json()) as
            ApiResponse;

        if (!response.ok) {
          throw new Error(
            locale === "ro" &&
            payload.error
              ? payload.error
              : text.loadError
          );
        }

        if (active) {
          applyPayload(payload);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : text.loadError
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [locale, text.loadError]);

  function choose(
    value: string
  ) {
    setSelection(value);
    setError("");
    setMessage("");

    if (value === "external") {
      if (current.doctorId) {
        setExternalName("");
        setExternalClinic("");
        setExternalPhone("");
      }
      return;
    }

    if (value === "none") {
      return;
    }

    const option =
      options.find(
        (item) =>
          item.doctorId === value
      );

    if (option) {
      setExternalName(
        option.name
      );
      setExternalClinic(
        option.clinic
      );
      setExternalPhone(
        option.phone
      );
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const linkedDoctorId =
        selection !== "none" &&
        selection !== "external"
          ? selection
          : null;

      const response =
        await fetch(
          "/api/patient/family-doctor",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              doctorId:
                linkedDoctorId,
              name:
                selection === "none"
                  ? ""
                  : externalName,
              clinic:
                selection === "none"
                  ? ""
                  : externalClinic,
              phone:
                selection === "none"
                  ? ""
                  : externalPhone,
              locale,
            }),
          }
        );

      const payload =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : text.saveError
        );
      }

      if (payload.current) {
        applyPayload(payload);
      } else if (selectedOption) {
        setCurrent({
          doctorId:
            selectedOption.doctorId,
          name:
            selectedOption.name,
          clinic:
            selectedOption.clinic,
          phone:
            selectedOption.phone,
        });
      } else if (
        selection === "external"
      ) {
        setCurrent({
          doctorId: null,
          name: externalName,
          clinic: externalClinic,
          phone: externalPhone,
        });
      } else {
        setCurrent(
          emptyCurrent()
        );
      }

      setEditing(false);
      setMessage(
        text.saved
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : text.saveError
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-[21px] rounded-[13px] border border-[#036661]/20 bg-[#036661]/5 p-[13px]">
      <div className="flex flex-col gap-[8px] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">
            {text.title}
          </h2>

          {loading ? (
            <p className="mt-[5px] text-sm text-gray-600">
              {text.loading}
            </p>
          ) : current.name ? (
            <div className="mt-[5px] flex flex-wrap items-center gap-[6px]">
              <span className="text-sm font-semibold text-gray-900">
                {current.name}
              </span>

              <span
                className={
                  current.doctorId
                    ? "rounded-full bg-emerald-100 px-[8px] py-[3px] text-xs font-semibold text-emerald-800"
                    : "rounded-full bg-gray-100 px-[8px] py-[3px] text-xs font-semibold text-gray-700"
                }
              >
                {current.doctorId
                  ? text.linked
                  : text.external}
              </span>

              {(current.clinic ||
                current.phone) && (
                <span className="text-xs text-gray-500">
                  {[current.clinic, current.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-[5px] text-sm text-gray-600">
              {text.none}
            </p>
          )}
        </div>

        {!loading && (
          <button
            type="button"
            onClick={() => {
              setEditing(
                (value) => !value
              );
              setError("");
              setMessage("");
            }}
            className="romdoc-button romdoc-button-secondary romdoc-button-sm w-fit"
          >
            {editing
              ? text.close
              : text.change}
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-[13px] border-t border-[#036661]/15 pt-[13px]">
          <p className="text-xs leading-5 text-gray-600">
            {text.helper}
          </p>

          <label className="mt-[8px] block">
            <span className="text-sm font-semibold text-gray-700">
              {text.romdocOption}
            </span>

            <select
              value={selection}
              onChange={(event) =>
                choose(
                  event.target.value
                )
              }
              disabled={saving}
              className="romdoc-select mt-[5px]"
            >
              <option value="none">
                {text.noLinkOption}
              </option>

              {options.map(
                (option) => (
                  <option
                    key={
                      option.doctorId
                    }
                    value={
                      option.doctorId
                    }
                  >
                    {option.name}
                  </option>
                )
              )}

              <option value="external">
                {text.externalOption}
              </option>
            </select>
          </label>

          {options.length === 0 &&
            selection !== "external" && (
              <p className="mt-[5px] text-xs text-gray-500">
                {text.noTreatingDoctors}
              </p>
            )}

          {selection === "external" && (
            <>
              <p className="mt-[8px] text-xs text-gray-500">
                {text.externalHelper}
              </p>

              <div className="mt-[8px] grid gap-[8px] sm:grid-cols-3">
                <input
                  type="text"
                  maxLength={200}
                  value={externalName}
                  onChange={(event) =>
                    setExternalName(
                      event.target.value
                    )
                  }
                  placeholder={text.name}
                  disabled={saving}
                  className="romdoc-input"
                />

                <input
                  type="text"
                  maxLength={200}
                  value={externalClinic}
                  onChange={(event) =>
                    setExternalClinic(
                      event.target.value
                    )
                  }
                  placeholder={text.clinic}
                  disabled={saving}
                  className="romdoc-input"
                />

                <input
                  type="tel"
                  maxLength={50}
                  value={externalPhone}
                  onChange={(event) =>
                    setExternalPhone(
                      event.target.value
                    )
                  }
                  placeholder={text.phone}
                  disabled={saving}
                  className="romdoc-input"
                />
              </div>
            </>
          )}

          {selectedOption &&
            selection !== "external" &&
            selection !== "none" && (
              <p className="mt-[8px] text-xs text-emerald-900">
                {[selectedOption.clinic, selectedOption.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

          <button
            type="button"
            onClick={() =>
              void save()
            }
            disabled={saving}
            className="romdoc-button romdoc-button-primary romdoc-button-sm mt-[8px]"
          >
            {saving
              ? text.saving
              : text.save}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-[8px] rounded-[10px] border border-red-200 bg-red-50 p-[8px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-[8px] rounded-[10px] border border-green-200 bg-green-50 p-[8px] text-sm text-green-800"
        >
          {message}
        </div>
      )}
    </section>
  );
}
