"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type ClinicOption = {
  id: string;
  name: string;
};

type AppointmentSource =
  | "phone"
  | "walk_in"
  | "email"
  | "other";

type CreateAppointmentFormProps = {
  doctorId: string;
  clinics: ClinicOption[];
};

type CreateAppointmentResponse = {
  success?: boolean;
  emailSent?: boolean;
  error?: string;
};

type AvailableSlot = {
  time: string;
  durationMinutes: number;
};

type AvailableSlotsResponse = {
  slots?: AvailableSlot[];
  error?: string;
};

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CreateAppointmentForm({
  doctorId,
  clinics,
}: CreateAppointmentFormProps) {
  const locale = normalizeAppLocale(
    useLocale()
  );
  const t = useTranslations(
    "DoctorAppointmentOperations.appointments.create"
  );
  const commonT = useTranslations(
    "DoctorAppointmentOperations.common"
  );
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);
  const [clinicId, setClinicId] =
    useState(clinics[0]?.id ?? "");
  const [patientName, setPatientName] =
    useState("");
  const [patientEmail, setPatientEmail] =
    useState("");
  const [patientPhone, setPatientPhone] =
    useState("");
  const [scheduledDate, setScheduledDate] =
    useState("");
  const [scheduledTime, setScheduledTime] =
    useState("");
  const [selectedDurationMinutes, setSelectedDurationMinutes] =
    useState<number | null>(null);
  const [availableSlots, setAvailableSlots] =
    useState<AvailableSlot[]>([]);
  const [slotsAreLoading, setSlotsAreLoading] =
    useState(false);
  const [slotsError, setSlotsError] =
    useState("");
  const [source, setSource] =
    useState<AppointmentSource>("phone");
  const [notes, setNotes] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [successMessage, setSuccessMessage] =
    useState("");
  const [warningMessage, setWarningMessage] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const today = getLocalDateString();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setClinicId((currentClinicId) => {
        if (
          clinics.some(
            (clinic) =>
              clinic.id === currentClinicId
          )
        ) {
          return currentClinicId;
        }

        return clinics[0]?.id ?? "";
      });
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [clinics]);

  useEffect(() => {
    const resetTimerId = window.setTimeout(() => {
      setScheduledTime("");
      setSelectedDurationMinutes(null);
      setAvailableSlots([]);
      setSlotsError("");
    }, 0);

    if (
      !doctorId ||
      !clinicId ||
      !scheduledDate
    ) {
      const loadingTimerId = window.setTimeout(() => {
        setSlotsAreLoading(false);
      }, 0);

      return () => {
        window.clearTimeout(resetTimerId);
        window.clearTimeout(loadingTimerId);
      };
    }

    const controller = new AbortController();

    async function loadSlots() {
      setSlotsAreLoading(true);
      setSlotsError("");

      try {
        const params = new URLSearchParams({
          doctorId,
          clinicId,
          date: scheduledDate,
        });

        const response = await fetch(
          `/api/availability/slots?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result =
          (await response.json()) as AvailableSlotsResponse;

        if (!response.ok) {
          throw new Error(
            locale === "ro" && result.error
              ? result.error
              : t("slotsLoadError")
          );
        }

        setAvailableSlots(
          result.slots ?? []
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setSlotsError(
          error instanceof Error
            ? error.message
            : t("slotsLoadError")
        );
      } finally {
        if (!controller.signal.aborted) {
          setSlotsAreLoading(false);
        }
      }
    }

    void loadSlots();

    return () => {
      window.clearTimeout(resetTimerId);
      controller.abort();
    };
  }, [
    clinicId,
    doctorId,
    locale,
    scheduledDate,
    t,
  ]);

  function resetForm() {
    setClinicId(clinics[0]?.id ?? "");
    setPatientName("");
    setPatientEmail("");
    setPatientPhone("");
    setScheduledDate("");
    setScheduledTime("");
    setSelectedDurationMinutes(null);
    setAvailableSlots([]);
    setSlotsError("");
    setSource("phone");
    setNotes("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSuccessMessage("");
    setWarningMessage("");
    setErrorMessage("");

    if (!clinicId) {
      setErrorMessage(t("selectClinicError"));
      return;
    }

    if (patientName.trim().length < 2) {
      setErrorMessage(t("patientNameError"));
      return;
    }

    if (!patientEmail.trim()) {
      setErrorMessage(t("patientEmailError"));
      return;
    }

    if (patientPhone.trim().length < 7) {
      setErrorMessage(t("patientPhoneError"));
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setErrorMessage(t("selectSlotError"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/doctor/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clinicId,
            patientName: patientName.trim(),
            patientEmail: patientEmail
              .trim()
              .toLowerCase(),
            patientPhone: patientPhone.trim(),
            scheduledDate,
            scheduledTime,
            source,
            notes: notes.trim() || null,
          }),
        }
      );

      const result =
        (await response.json()) as CreateAppointmentResponse;

      if (!response.ok) {
        setErrorMessage(
          locale === "ro" && result.error
            ? result.error
            : t("createError")
        );
        return;
      }

      setSuccessMessage(t("created"));

      if (result.emailSent === false) {
        setWarningMessage(t("emailWarning"));
      }

      resetForm();
      router.refresh();
    } catch (error) {
      console.error(
        "Doctor appointment form request failed:",
        error
      );
      setErrorMessage(t("serverError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (clinics.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">
          {t("noClinicsTitle")}
        </h2>
        <p className="mt-2 leading-7 text-amber-800">
          {t("noClinicsDescription")}
        </p>
      </section>
    );
  }

  const sourceOptions: Array<{
    value: AppointmentSource;
    label: string;
  }> = [
    {value: "phone", label: commonT("sourcePhone")},
    {value: "walk_in", label: commonT("sourceWalkIn")},
    {value: "email", label: commonT("sourceEmail")},
    {value: "other", label: commonT("sourceOther")},
  ];

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
          setSuccessMessage("");
          setWarningMessage("");
          setErrorMessage("");
        }}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("description")}
          </p>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EEE9] text-xl font-medium text-gray-800"
          aria-hidden="true"
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-6 py-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">
                  {t("clinic")}
                </span>
                <select
                  value={clinicId}
                  onChange={(event) =>
                    setClinicId(event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  className="romdoc-select mt-2"
                >
                  {clinics.map((clinic) => (
                    <option
                      key={clinic.id}
                      value={clinic.id}
                    >
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">
                  {t("source")}
                </span>
                <select
                  value={source}
                  onChange={(event) =>
                    setSource(
                      event.target.value as AppointmentSource
                    )
                  }
                  required
                  disabled={isSubmitting}
                  className="romdoc-select mt-2"
                >
                  {sourceOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">
                  {t("patientName")}
                </span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(event) =>
                    setPatientName(event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  autoComplete="name"
                  placeholder={t("patientNamePlaceholder")}
                  className="romdoc-input mt-2"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">
                  {t("phone")}
                </span>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(event) =>
                    setPatientPhone(event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  autoComplete="tel"
                  placeholder={t("phonePlaceholder")}
                  className="romdoc-input mt-2"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">
                {t("email")}
              </span>
              <input
                type="email"
                value={patientEmail}
                onChange={(event) =>
                  setPatientEmail(event.target.value)
                }
                required
                disabled={isSubmitting}
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className="romdoc-input mt-2"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">
                  {t("date")}
                </span>
                <input
                  type="date"
                  min={today}
                  value={scheduledDate}
                  onChange={(event) =>
                    setScheduledDate(event.target.value)
                  }
                  required
                  disabled={isSubmitting}
                  className="romdoc-input mt-2"
                />
              </label>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">
                  {t("time")}
                </p>

                {!scheduledDate ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t("selectDateFirst")}
                  </p>
                ) : slotsAreLoading ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t("loadingSlots")}
                  </p>
                ) : slotsError ? (
                  <p className="mt-2 text-sm text-red-700">
                    {slotsError}
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t("noSlots")}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={`${slot.time}-${slot.durationMinutes}`}
                        type="button"
                        onClick={() => {
                          setScheduledTime(slot.time);
                          setSelectedDurationMinutes(
                            slot.durationMinutes
                          );
                        }}
                        disabled={isSubmitting}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                          scheduledTime === slot.time
                            ? "border-[#036661] bg-[#036661] text-white"
                            : "border-gray-300 bg-white text-gray-800 hover:border-[#036661]"
                        }`}
                      >
                        {slot.time}
                        <span className="ml-2 text-xs opacity-80">
                          {commonT("minutes", {
                            count: slot.durationMinutes,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {scheduledTime && (
                  <p className="mt-3 text-xs text-gray-600">
                    {t("selectedSlot", {
                      time: scheduledTime,
                    })}
                    {selectedDurationMinutes
                      ? ` · ${commonT("minutes", {
                          count: selectedDurationMinutes,
                        })}`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">
                {t("notes")}
              </span>
              <textarea
                rows={4}
                maxLength={5000}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                disabled={isSubmitting}
                placeholder={t("notesPlaceholder")}
                className="romdoc-textarea mt-2"
              />
              <span className="mt-1 block text-right text-xs text-gray-500">
                {notes.length}/5000
              </span>
            </label>

            {errorMessage && (
              <div role="alert" className="romdoc-notice romdoc-notice-error">
                {errorMessage}
              </div>
            )}
            {warningMessage && (
              <div role="alert" className="romdoc-notice romdoc-notice-warning">
                {warningMessage}
              </div>
            )}
            {successMessage && (
              <div role="status" className="romdoc-notice romdoc-notice-success">
                {successMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || slotsAreLoading}
              >
                {isSubmitting
                  ? t("creating")
                  : t("create")}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  resetForm();
                  setErrorMessage("");
                  setWarningMessage("");
                  setSuccessMessage("");
                }}
                variant="secondary"
              >
                {t("reset")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
