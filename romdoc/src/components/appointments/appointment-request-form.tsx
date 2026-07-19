"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import PublicAvailabilityCalendar from "@/components/appointments/public-availability-calendar";
import Button from "@/components/ui/button";
import {
  clearBookingDraft,
  readBookingDraft,
} from "@/lib/appointments/booking-draft";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type AppointmentRequestFormProps = {
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  clinics: ClinicOption[];
  initialPatientName: string;
  authenticatedEmail: string;
};

type AppointmentApiResponse = {
  success?: boolean;
  appointmentId?: string;
  emailSent?: boolean;
  error?: string;
};

type BookingStep =
  | "clinic"
  | "availability"
  | "patient"
  | "review";

const STEPS: Array<{
  id: BookingStep;
  label: string;
}> = [
  {
    id: "clinic",
    label: "Clinică",
  },
  {
    id: "availability",
    label: "Data și ora",
  },
  {
    id: "patient",
    label: "Date Patient",
  },
  {
    id: "review",
    label: "Verificare",
  },
];

const ROMANIAN_DATE_FORMATTER =
  new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );

function getLocalDateString(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(
        Number
      );

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return ROMANIAN_DATE_FORMATTER.format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )
  );
}

function getStepIndex(
  step: BookingStep
) {
  return STEPS.findIndex(
    (
      item
    ) =>
      item.id ===
      step
  );
}

export default function AppointmentRequestForm({
  doctorId,
  doctorName,
  doctorSlug,
  clinics,
  initialPatientName,
  authenticatedEmail,
}: AppointmentRequestFormProps) {
  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    currentStep,
    setCurrentStep,
  ] =
    useState<BookingStep>(
      "clinic"
    );

  const [
    clinicId,
    setClinicId,
  ] =
    useState(
      clinics.length ===
        1
        ? clinics[0].id
        : ""
    );

  const [
    patientName,
    setPatientName,
  ] =
    useState(
      initialPatientName
    );

  const [
    patientPhone,
    setPatientPhone,
  ] =
    useState("");

  const [
    requestedDate,
    setRequestedDate,
  ] =
    useState("");

  const [
    requestedTime,
    setRequestedTime,
  ] =
    useState("");

  const [
    durationMinutes,
    setDurationMinutes,
  ] =
    useState(30);

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    restoredDraft,
    setRestoredDraft,
  ] =
    useState(false);

  const today =
    useMemo(
      () =>
        getLocalDateString(
          new Date()
        ),
      []
    );

  const maximumDate =
    useMemo(() => {
      const date =
        new Date();

      date.setDate(
        date.getDate() +
          90
      );

      return getLocalDateString(
        date
      );
    }, []);

  const selectedClinic =
    clinics.find(
      (
        clinic
      ) =>
        clinic.id ===
        clinicId
    ) ??
    null;

  const currentStepIndex =
    getStepIndex(
      currentStep
    );

  useEffect(() => {
    const draft =
      readBookingDraft(
        doctorId,
        doctorSlug
      );

    if (!draft) {
      return;
    }

    const clinicExists =
      clinics.some(
        (
          clinic
        ) =>
          clinic.id ===
          draft.clinicId
      );

    const dateIsValid =
      draft.requestedDate >=
        today &&
      draft.requestedDate <=
        maximumDate;

    if (
      !clinicExists ||
      !dateIsValid
    ) {
      clearBookingDraft();
      return;
    }

    setClinicId(
      draft.clinicId
    );
    setRequestedDate(
      draft.requestedDate
    );
    setRequestedTime(
      draft.requestedTime
    );
    setDurationMinutes(
      draft.durationMinutes
    );
    setCurrentStep(
      "patient"
    );
    setRestoredDraft(
      true
    );

    window.requestAnimationFrame(
      () => {
        document
          .getElementById(
            "programare"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      }
    );
  }, [
    clinics,
    doctorId,
    doctorSlug,
    maximumDate,
    today,
  ]);

  const handleDateChange =
    useCallback(
      (
        date: string
      ) => {
        setRequestedDate(
          date
        );
        setRequestedTime(
          ""
        );
        setDurationMinutes(
          30
        );
        setRestoredDraft(
          false
        );
        setError(
          null
        );
      },
      []
    );

  const handleTimeChange =
    useCallback(
      (
        time: string,
        selectedDuration: number
      ) => {
        setRequestedTime(
          time
        );

        if (
          selectedDuration >
          0
        ) {
          setDurationMinutes(
            selectedDuration
          );
        }

        setRestoredDraft(
          false
        );
        setError(
          null
        );
      },
      []
    );

  function chooseClinic(
    nextClinicId: string
  ) {
    setClinicId(
      nextClinicId
    );
    setRequestedDate(
      ""
    );
    setRequestedTime(
      ""
    );
    setDurationMinutes(
      30
    );
    setRestoredDraft(
      false
    );
    setError(
      null
    );
  }

  function validateClinicStep() {
    if (
      !clinicId ||
      !selectedClinic
    ) {
      setError(
        "Selectează o clinică validă."
      );
      return false;
    }

    return true;
  }

  function validateAvailabilityStep() {
    if (
      !requestedDate
    ) {
      setError(
        "Selectează data programării."
      );
      return false;
    }

    if (
      requestedDate <
        today ||
      requestedDate >
        maximumDate
    ) {
      setError(
        "Selectează o dată validă pentru programare."
      );
      return false;
    }

    if (
      !requestedTime
    ) {
      setError(
        "Selectează una dintre orele disponibile."
      );
      return false;
    }

    return true;
  }

  function validatePatientStep() {
    if (
      patientName
        .trim()
        .length <
      2
    ) {
      setError(
        "Introdu un nume valid."
      );
      return false;
    }

    if (
      patientPhone
        .trim()
        .length <
      7
    ) {
      setError(
        "Introdu un număr de telefon valid."
      );
      return false;
    }

    return true;
  }

  function goToStep(
    step: BookingStep
  ) {
    setError(
      null
    );
    setCurrentStep(
      step
    );
  }

  function continueFromClinic() {
    setError(
      null
    );

    if (
      !validateClinicStep()
    ) {
      return;
    }

    setCurrentStep(
      "availability"
    );
  }

  function continueFromAvailability() {
    setError(
      null
    );

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep()
    ) {
      return;
    }

    setCurrentStep(
      "patient"
    );
  }

  function continueFromPatient() {
    setError(
      null
    );

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep() ||
      !validatePatientStep()
    ) {
      return;
    }

    setCurrentStep(
      "review"
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep() ||
      !validatePatientStep() ||
      !selectedClinic
    ) {
      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/appointments",
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
                    doctorName,

                    clinicId,
                    clinicName:
                      selectedClinic.name,

                    patientName:
                      patientName.trim(),

                    patientPhone:
                      patientPhone.trim(),

                    requestedDate,
                    requestedTime,
                    durationMinutes,

                    notes:
                      notes.trim() ||
                      null,
                  }),
              }
            );

          const result =
            (await response.json()) as
              AppointmentApiResponse;

          if (
            response.status ===
            401
          ) {
            window.location.href =
              `/login?next=${encodeURIComponent(
                `/doctor/${doctorSlug}#programare`
              )}`;
            return;
          }

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ??
                "Cererea de programare nu a putut fi trimisă."
            );
          }

          if (
            !result.appointmentId
          ) {
            throw new Error(
              "Cererea a fost salvată, dar pagina de confirmare nu a putut fi deschisă."
            );
          }

          clearBookingDraft();

          window.location.href =
            `/appointments/${result.appointmentId}/request-received?emailSent=${result.emailSent === false ? "0" : "1"}`;
        } catch (
          submitError
        ) {
          setError(
            submitError instanceof
              Error
              ? submitError.message
              : "Cererea de programare nu a putut fi trimisă."
          );
        }
      }
    );
  }

  if (
    clinics.length ===
    0
  ) {
    return (
      <div className="romdoc-notice romdoc-notice-warning">
        Programările online nu sunt încă disponibile pentru acest medic.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 p-[21px]">
        <p className="text-sm font-semibold text-[#036661]">
          Programare online
        </p>

        <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
          Solicită o programare
        </h2>

        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          Completează pașii pentru a solicita o consultație la{" "}
          <strong>
            {
              doctorName
            }
          </strong>
          .
        </p>

        <ol
          aria-label="Pașii programării"
          className="mt-[21px] grid grid-cols-4 gap-[8px]"
        >
          {STEPS.map(
            (
              step,
              index
            ) => {
              const isCurrent =
                step.id ===
                currentStep;

              const isCompleted =
                index <
                currentStepIndex;

              return (
                <li
                  key={
                    step.id
                  }
                  className="min-w-0"
                >
                  <div className="flex items-center">
                    <div
                      aria-current={
                        isCurrent
                          ? "step"
                          : undefined
                      }
                      className={[
                        "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isCurrent
                          ? "bg-[#036661] text-white"
                          : isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-500",
                      ].join(
                        " "
                      )}
                    >
                      {isCompleted
                        ? "✓"
                        : index +
                          1}
                    </div>

                    {index <
                      STEPS.length -
                        1 && (
                      <div
                        className={[
                          "mx-[8px] h-0.5 flex-1",
                          isCompleted
                            ? "bg-emerald-300"
                            : "bg-gray-200",
                        ].join(
                          " "
                        )}
                      />
                    )}
                  </div>

                  <p
                    className={[
                      "mt-[8px] truncate text-xs font-medium",
                      isCurrent
                        ? "text-[#036661]"
                        : isCompleted
                          ? "text-emerald-700"
                          : "text-gray-500",
                    ].join(
                      " "
                    )}
                  >
                    {
                      step.label
                    }
                  </p>
                </li>
              );
            }
          )}
        </ol>
      </header>

      <form
        onSubmit={
          handleSubmit
        }
        className="p-[21px]"
      >
        {restoredDraft && (
          <div className="romdoc-notice romdoc-notice-success mb-[21px]">
            Clinica, data și ora selectate înainte de autentificare au fost restaurate. Verifică intervalul și completează datele Patientului.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="romdoc-notice romdoc-notice-danger mb-[21px]"
          >
            {
              error
            }
          </div>
        )}

        {currentStep ===
          "clinic" && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Alege clinica
            </h3>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              Selectează locul în care dorești să aibă loc consultația.
            </p>

            <div className="mt-[21px] space-y-[8px]">
              {clinics.map(
                (
                  clinic
                ) => {
                  const isSelected =
                    clinic.id ===
                    clinicId;

                  return (
                    <button
                      key={
                        clinic.id
                      }
                      type="button"
                      disabled={
                        isPending
                      }
                      onClick={() =>
                        chooseClinic(
                          clinic.id
                        )
                      }
                      className={[
                        "romdoc-focus-ring w-full rounded-[13px] border p-[13px] text-left transition",
                        isSelected
                          ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
                          : "border-gray-200 bg-white hover:border-[#036661]/50 hover:bg-gray-50",
                      ].join(
                        " "
                      )}
                    >
                      <span className="block font-semibold text-gray-900">
                        {
                          clinic.name
                        }
                      </span>

                      {clinic.address && (
                        <span className="mt-[5px] block text-sm leading-6 text-gray-600">
                          {
                            clinic.address
                          }
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-[21px]">
              <Button
                type="button"
                fullWidth
                size="lg"
                disabled={
                  !clinicId
                }
                onClick={
                  continueFromClinic
                }
              >
                Continuă la data și ora
              </Button>
            </div>
          </div>
        )}

        {currentStep ===
          "availability" && (
          <div>
            <div className="romdoc-panel-muted mb-[21px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Clinica selectată
              </p>

              <p className="mt-[5px] font-semibold text-gray-900">
                {
                  selectedClinic?.name
                }
              </p>

              {selectedClinic?.address && (
                <p className="mt-[5px] text-sm text-gray-600">
                  {
                    selectedClinic.address
                  }
                </p>
              )}
            </div>

            <PublicAvailabilityCalendar
              doctorId={
                doctorId
              }
              clinicId={
                clinicId
              }
              minimumDate={
                today
              }
              maximumDate={
                maximumDate
              }
              selectedDate={
                requestedDate
              }
              selectedTime={
                requestedTime
              }
              disabled={
                isPending
              }
              onDateChange={
                handleDateChange
              }
              onTimeChange={
                handleTimeChange
              }
            />

            {requestedTime && (
              <div className="romdoc-notice romdoc-notice-success mt-[13px]">
                <strong>
                  Interval selectat:
                </strong>{" "}
                {formatDisplayDate(
                  requestedDate
                )}
                ,{" "}
                {
                  requestedTime
                }
                {" · "}
                {
                  durationMinutes
                }{" "}
                minute
              </div>
            )}

            <div className="mt-[21px] flex flex-col-reverse gap-[8px] sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() =>
                  goToStep(
                    "clinic"
                  )
                }
              >
                Înapoi
              </Button>

              <Button
                type="button"
                fullWidth
                disabled={
                  !requestedDate ||
                  !requestedTime
                }
                onClick={
                  continueFromAvailability
                }
              >
                Continuă la datele tale
              </Button>
            </div>
          </div>
        )}

        {currentStep ===
          "patient" && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Datele Patientului
            </h3>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              Aceste informații sunt folosite pentru identificarea și contactarea Patientului.
            </p>

            <div className="mt-[21px] grid gap-[13px] sm:grid-cols-2">
              <label className="block">
                <span className="romdoc-label">
                  Nume complet
                </span>

                <input
                  type="text"
                  required
                  minLength={
                    2
                  }
                  value={
                    patientName
                  }
                  disabled={
                    isPending
                  }
                  autoComplete="name"
                  onChange={(
                    event
                  ) =>
                    setPatientName(
                      event.target.value
                    )
                  }
                  className="romdoc-input mt-[8px]"
                />
              </label>

              <label className="block">
                <span className="romdoc-label">
                  Telefon
                </span>

                <input
                  type="tel"
                  required
                  minLength={
                    7
                  }
                  value={
                    patientPhone
                  }
                  disabled={
                    isPending
                  }
                  autoComplete="tel"
                  onChange={(
                    event
                  ) =>
                    setPatientPhone(
                      event.target.value
                    )
                  }
                  placeholder="+40 700 000 000"
                  className="romdoc-input mt-[8px]"
                />
              </label>
            </div>

            <label className="mt-[13px] block">
              <span className="romdoc-label">
                E-mail verificat
              </span>

              <input
                type="email"
                value={
                  authenticatedEmail
                }
                readOnly
                className="romdoc-input mt-[8px] cursor-not-allowed bg-gray-100"
              />

              <span className="romdoc-help-text">
                Programarea va fi asociată acestui cont.
              </span>
            </label>

            <label className="mt-[13px] block">
              <span className="romdoc-label">
                Mesaj pentru medic{" "}
                <span className="font-normal text-gray-500">
                  (opțional)
                </span>
              </span>

              <textarea
                value={
                  notes
                }
                disabled={
                  isPending
                }
                rows={
                  5
                }
                maxLength={
                  2000
                }
                onChange={(
                  event
                ) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Descrie pe scurt motivul consultației."
                className="romdoc-textarea mt-[8px]"
              />

              <span className="romdoc-help-text block text-right">
                {
                  notes.length
                }{" "}
                / 2000
              </span>
            </label>

            <div className="mt-[21px] flex flex-col-reverse gap-[8px] sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() =>
                  goToStep(
                    "availability"
                  )
                }
              >
                Înapoi
              </Button>

              <Button
                type="button"
                fullWidth
                disabled={
                  patientName
                    .trim()
                    .length <
                    2 ||
                  patientPhone
                    .trim()
                    .length <
                    7
                }
                onClick={
                  continueFromPatient
                }
              >
                Verifică programarea
              </Button>
            </div>
          </div>
        )}

        {currentStep ===
          "review" && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Verifică detaliile
            </h3>

            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              Confirmă că informațiile sunt corecte înainte de trimiterea cererii.
            </p>

            <dl className="mt-[21px] divide-y divide-gray-200 rounded-[13px] border border-gray-200">
              <div className="p-[13px]">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Medic și clinică
                </dt>

                <dd className="mt-[5px] font-semibold text-gray-900">
                  {
                    doctorName
                  }
                </dd>

                <dd className="mt-[5px] text-sm text-gray-700">
                  {
                    selectedClinic?.name
                  }
                </dd>
              </div>

              <div className="p-[13px]">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Data și ora
                </dt>

                <dd className="mt-[5px] font-semibold text-gray-900">
                  {formatDisplayDate(
                    requestedDate
                  )}
                </dd>

                <dd className="mt-[5px] text-sm text-gray-700">
                  {
                    requestedTime
                  }
                  {" · "}
                  {
                    durationMinutes
                  }{" "}
                  minute
                </dd>
              </div>

              <div className="p-[13px]">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Patient
                </dt>

                <dd className="mt-[5px] font-semibold text-gray-900">
                  {
                    patientName.trim()
                  }
                </dd>

                <dd className="mt-[5px] text-sm text-gray-700">
                  {
                    patientPhone.trim()
                  }
                </dd>

                <dd className="mt-[5px] text-sm text-gray-500">
                  {
                    authenticatedEmail
                  }
                </dd>
              </div>

              {notes.trim() && (
                <div className="p-[13px]">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mesaj pentru medic
                  </dt>

                  <dd className="mt-[8px] whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {
                      notes.trim()
                    }
                  </dd>
                </div>
              )}
            </dl>

            <div className="romdoc-notice romdoc-notice-info mt-[13px]">
              Aceasta este o cerere de programare. Medicul sau clinica trebuie să o confirme.
            </div>

            <div className="mt-[21px] flex flex-col-reverse gap-[8px] sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={
                  isPending
                }
                onClick={() =>
                  goToStep(
                    "patient"
                  )
                }
              >
                Înapoi
              </Button>

              <Button
                type="submit"
                fullWidth
                isLoading={
                  isPending
                }
                loadingText="Se trimite..."
              >
                Trimite cererea
              </Button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
