"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/button";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

export type StaffClinicOption = {
  id: string;
  name: string;
};

export type StaffDoctorOption = {
  id: string;
  name: string;

  clinics:
    StaffClinicOption[];
};

type AppointmentSource =
  | "phone"
  | "walk_in"
  | "email"
  | "other";

type StaffCreateAppointmentFormProps = {
  doctors:
    StaffDoctorOption[];

  onCreated:
    () =>
      void |
      Promise<void>;
};

type CreateAppointmentResponse = {
  success?: boolean;
  emailSent?: boolean;
  error?: string;

  appointment?: {
    id: string;
  };
};

type AvailableSlot = {
  time: string;
  durationMinutes: number;
};

type AvailableSlotsResponse = {
  slots?:
    AvailableSlot[];

  error?: string;
};

function getLocalDateString() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

export default function StaffCreateAppointmentForm({
  doctors,
  onCreated,
}: StaffCreateAppointmentFormProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "StaffOperationalDashboard.create"
    );

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false
    );

  const [
    doctorId,
    setDoctorId,
  ] =
    useState(
      doctors[0]?.id ??
      ""
    );

  const selectedDoctor =
    useMemo(
      () =>
        doctors.find(
          (
            doctor
          ) =>
            doctor.id ===
            doctorId
        ) ??
        doctors[0] ??
        null,
      [
        doctorId,
        doctors,
      ]
    );

  const clinics =
    selectedDoctor
      ?.clinics ??
    [];

  const [
    clinicId,
    setClinicId,
  ] =
    useState(
      doctors[0]
        ?.clinics[0]
        ?.id ??
      ""
    );

  const [
    patientName,
    setPatientName,
  ] =
    useState(
      ""
    );

  const [
    patientEmail,
    setPatientEmail,
  ] =
    useState(
      ""
    );

  const [
    patientPhone,
    setPatientPhone,
  ] =
    useState(
      ""
    );

  const [
    scheduledDate,
    setScheduledDate,
  ] =
    useState(
      ""
    );

  const [
    scheduledTime,
    setScheduledTime,
  ] =
    useState(
      ""
    );

  const [
    selectedDurationMinutes,
    setSelectedDurationMinutes,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    availableSlots,
    setAvailableSlots,
  ] =
    useState<
      AvailableSlot[]
    >(
      []
    );

  const [
    slotsAreLoading,
    setSlotsAreLoading,
  ] =
    useState(
      false
    );

  const [
    slotsError,
    setSlotsError,
  ] =
    useState(
      ""
    );

  const [
    source,
    setSource,
  ] =
    useState<AppointmentSource>(
      "phone"
    );

  const [
    notes,
    setNotes,
  ] =
    useState(
      ""
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );

  const [
    warningMessage,
    setWarningMessage,
  ] =
    useState(
      ""
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );

  const today =
    getLocalDateString();

  useEffect(() => {
    if (
      doctors.length ===
      0
    ) {
      setDoctorId(
        ""
      );

      setClinicId(
        ""
      );

      return;
    }

    setDoctorId(
      (
        currentDoctorId
      ) =>
        doctors.some(
          (
            doctor
          ) =>
            doctor.id ===
            currentDoctorId
        )
          ? currentDoctorId
          : doctors[0]
              ?.id ??
            ""
    );
  }, [
    doctors,
  ]);

  useEffect(() => {
    setClinicId(
      (
        currentClinicId
      ) =>
        clinics.some(
          (
            clinic
          ) =>
            clinic.id ===
            currentClinicId
        )
          ? currentClinicId
          : clinics[0]
              ?.id ??
            ""
    );
  }, [
    clinics,
  ]);

  useEffect(() => {
    setScheduledTime(
      ""
    );

    setSelectedDurationMinutes(
      null
    );

    setAvailableSlots(
      []
    );

    setSlotsError(
      ""
    );

    if (
      !doctorId ||
      !clinicId ||
      !scheduledDate
    ) {
      setSlotsAreLoading(
        false
      );

      return;
    }

    const controller =
      new AbortController();

    async function loadSlots() {
      setSlotsAreLoading(
        true
      );

      setSlotsError(
        ""
      );

      try {
        const parameters =
          new URLSearchParams({
            doctorId,
            clinicId,
            date:
              scheduledDate,
          });

        const response =
          await fetch(
            `/api/availability/slots?${parameters.toString()}`,
            {
              method:
                "GET",

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        const result =
          (await response.json()) as
            AvailableSlotsResponse;

        if (
          !response.ok
        ) {
          throw new Error(
            locale ===
              "ro" &&
            result.error
              ? result.error
              : t(
                  "slotsLoadError"
                )
          );
        }

        setAvailableSlots(
          result.slots ??
          []
        );
      } catch (
        loadError
      ) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setSlotsError(
          loadError instanceof
            Error
            ? loadError.message
            : t(
                "slotsLoadError"
              )
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setSlotsAreLoading(
            false
          );
        }
      }
    }

    void loadSlots();

    return () => {
      controller.abort();
    };
  }, [
    clinicId,
    doctorId,
    locale,
    scheduledDate,
    t,
  ]);

  function handleDoctorChange(
    nextDoctorId:
      string
  ) {
    const nextDoctor =
      doctors.find(
        (
          doctor
        ) =>
          doctor.id ===
          nextDoctorId
      );

    setDoctorId(
      nextDoctorId
    );

    setClinicId(
      nextDoctor
        ?.clinics[0]
        ?.id ??
      ""
    );

    setScheduledDate(
      ""
    );

    setScheduledTime(
      ""
    );

    setSelectedDurationMinutes(
      null
    );

    setAvailableSlots(
      []
    );

    setSlotsError(
      ""
    );
  }

  function resetPatientFields() {
    setPatientName(
      ""
    );

    setPatientEmail(
      ""
    );

    setPatientPhone(
      ""
    );

    setScheduledDate(
      ""
    );

    setScheduledTime(
      ""
    );

    setSelectedDurationMinutes(
      null
    );

    setAvailableSlots(
      []
    );

    setSlotsError(
      ""
    );

    setSource(
      "phone"
    );

    setNotes(
      ""
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSuccessMessage(
      ""
    );

    setWarningMessage(
      ""
    );

    setErrorMessage(
      ""
    );

    if (
      !doctorId
    ) {
      setErrorMessage(
        t(
          "doctorRequired"
        )
      );

      return;
    }

    if (
      !clinicId
    ) {
      setErrorMessage(
        t(
          "clinicRequired"
        )
      );

      return;
    }

    if (
      patientName
        .trim()
        .length < 2
    ) {
      setErrorMessage(
        t(
          "patientNameRequired"
        )
      );

      return;
    }

    if (
      !patientEmail.trim()
    ) {
      setErrorMessage(
        t(
          "patientEmailRequired"
        )
      );

      return;
    }

    if (
      patientPhone
        .trim()
        .length < 7
    ) {
      setErrorMessage(
        t(
          "patientPhoneRequired"
        )
      );

      return;
    }

    if (
      !scheduledDate ||
      !scheduledTime
    ) {
      setErrorMessage(
        t(
          "slotRequired"
        )
      );

      return;
    }

    setIsSubmitting(
      true
    );

    try {
      const response =
        await fetch(
          "/api/staff/appointments",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                doctorId,
                clinicId,

                patientName:
                  patientName
                    .trim(),

                patientEmail:
                  patientEmail
                    .trim()
                    .toLowerCase(),

                patientPhone:
                  patientPhone
                    .trim(),

                scheduledDate,
                scheduledTime,
                source,

                notes:
                  notes.trim() ||
                  null,
              }),
          }
        );

      const result =
        (await response.json()) as
          CreateAppointmentResponse;

      if (
        !response.ok
      ) {
        setErrorMessage(
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "createError"
              )
        );

        return;
      }

      setSuccessMessage(
        t(
          "created"
        )
      );

      if (
        result.emailSent ===
        false
      ) {
        setWarningMessage(
          t(
            "emailWarning"
          )
        );
      }

      resetPatientFields();

      await onCreated();
    } catch (
      requestError
    ) {
      console.error(
        "Staff appointment form request failed:",
        requestError
      );

      setErrorMessage(
        t(
          "networkError"
        )
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  if (
    doctors.length ===
    0
  ) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-950">
          {t(
            "noDoctorsTitle"
          )}
        </h2>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          {t(
            "noDoctorsDescription"
          )}
        </p>
      </section>
    );
  }

  const sourceOptions:
    AppointmentSource[] =
    [
      "phone",
      "walk_in",
      "email",
      "other",
    ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => {
          setIsOpen(
            (
              current
            ) =>
              !current
          );

          setSuccessMessage(
            ""
          );

          setWarningMessage(
            ""
          );

          setErrorMessage(
            ""
          );
        }}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={
          isOpen
        }
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t(
              "title"
            )}
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {t(
              "description"
            )}
          </p>
        </div>

        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EEE9] text-xl font-medium text-gray-800"
          aria-hidden="true"
        >
          {isOpen
            ? "−"
            : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-6 py-6">
          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "doctor"
                  )}
                </span>

                <select
                  value={
                    doctorId
                  }
                  onChange={(
                    event
                  ) =>
                    handleDoctorChange(
                      event.target
                        .value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                >
                  {doctors.map(
                    (
                      doctor
                    ) => (
                      <option
                        key={
                          doctor.id
                        }
                        value={
                          doctor.id
                        }
                      >
                        {
                          doctor.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "clinic"
                  )}
                </span>

                <select
                  value={
                    clinicId
                  }
                  onChange={(
                    event
                  ) => {
                    setClinicId(
                      event.target
                        .value
                    );

                    setScheduledDate(
                      ""
                    );
                  }}
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                >
                  {clinics.map(
                    (
                      clinic
                    ) => (
                      <option
                        key={
                          clinic.id
                        }
                        value={
                          clinic.id
                        }
                      >
                        {
                          clinic.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "source"
                  )}
                </span>

                <select
                  value={
                    source
                  }
                  onChange={(
                    event
                  ) =>
                    setSource(
                      event.target
                        .value as
                        AppointmentSource
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                >
                  {sourceOptions.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option
                        }
                        value={
                          option
                        }
                      >
                        {t(
                          `sources.${option}`
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "patientName"
                  )}
                </span>

                <input
                  type="text"
                  value={
                    patientName
                  }
                  onChange={(
                    event
                  ) =>
                    setPatientName(
                      event.target
                        .value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="name"
                  placeholder={t(
                    "patientNamePlaceholder"
                  )}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "phone"
                  )}
                </span>

                <input
                  type="tel"
                  value={
                    patientPhone
                  }
                  onChange={(
                    event
                  ) =>
                    setPatientPhone(
                      event.target
                        .value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="tel"
                  placeholder={t(
                    "phonePlaceholder"
                  )}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "email"
                  )}
                </span>

                <input
                  type="email"
                  value={
                    patientEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setPatientEmail(
                      event.target
                        .value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="email"
                  placeholder={t(
                    "emailPlaceholder"
                  )}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "date"
                  )}
                </span>

                <input
                  type="date"
                  min={
                    today
                  }
                  value={
                    scheduledDate
                  }
                  onChange={(
                    event
                  ) =>
                    setScheduledDate(
                      event.target
                        .value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                />
              </label>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">
                  {t(
                    "time"
                  )}
                </p>

                {!scheduledDate ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t(
                      "selectDateFirst"
                    )}
                  </p>
                ) : slotsAreLoading ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t(
                      "loadingSlots"
                    )}
                  </p>
                ) : slotsError ? (
                  <p className="mt-2 text-sm text-red-700">
                    {
                      slotsError
                    }
                  </p>
                ) : availableSlots
                    .length ===
                  0 ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {t(
                      "noSlots"
                    )}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableSlots.map(
                      (
                        slot
                      ) => (
                        <button
                          key={`${slot.time}-${slot.durationMinutes}`}
                          type="button"
                          onClick={() => {
                            setScheduledTime(
                              slot.time
                            );

                            setSelectedDurationMinutes(
                              slot.durationMinutes
                            );
                          }}
                          disabled={
                            isSubmitting
                          }
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                            scheduledTime ===
                            slot.time
                              ? "border-[#036661] bg-[#036661] text-white"
                              : "border-gray-300 bg-white text-gray-800"
                          }`}
                        >
                          {
                            slot.time
                          }

                          <span className="ml-2 text-xs opacity-80">
                            {
                              slot.durationMinutes
                            }{" "}
                            min
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {scheduledTime && (
                  <p className="mt-3 text-xs text-gray-600">
                    {t(
                      "selectedSlot",
                      {
                        time:
                          scheduledTime,

                        duration:
                          selectedDurationMinutes
                            ? t(
                                "durationSuffix",
                                {
                                  duration:
                                    selectedDurationMinutes,
                                }
                              )
                            : "",
                      }
                    )}
                  </p>
                )}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "notes"
                )}
              </span>

              <textarea
                rows={
                  4
                }
                maxLength={
                  5000
                }
                value={
                  notes
                }
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target
                      .value
                  )
                }
                disabled={
                  isSubmitting
                }
                placeholder={t(
                  "notesPlaceholder"
                )}
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
              />

              <span className="mt-1 block text-right text-xs text-gray-500">
                {
                  notes.length
                }
                /5000
              </span>
            </label>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {
                  errorMessage
                }
              </div>
            )}

            {warningMessage && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
              >
                {
                  warningMessage
                }
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
              >
                {
                  successMessage
                }
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  slotsAreLoading
                }
              >
                {isSubmitting
                  ? t(
                      "creating"
                    )
                  : t(
                      "create"
                    )}
              </Button>

              <Button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  resetPatientFields();

                  setErrorMessage(
                    ""
                  );

                  setWarningMessage(
                    ""
                  );

                  setSuccessMessage(
                    ""
                  );
                }}
                variant="secondary"
              >
                {t(
                  "clear"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
