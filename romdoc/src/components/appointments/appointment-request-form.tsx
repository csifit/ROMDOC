"use client";

import {
  type FormEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import PublicAvailabilityCalendar from "@/components/appointments/public-availability-calendar";
import Button from "@/components/ui/button";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type AppointmentRequestFormProps = {
  doctorId: string;
  doctorName: string;
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
    label: "Date pacient",
  },
  {
    id: "review",
    label: "Verificare",
  },
];

const ROMANIAN_DATE_FORMATTER =
  new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

function getLocalDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
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

function getStepIndex(step: BookingStep) {
  return STEPS.findIndex(
    (item) => item.id === step
  );
}

export default function AppointmentRequestForm({
  doctorId,
  doctorName,
  clinics,
  initialPatientName,
  authenticatedEmail,
}: AppointmentRequestFormProps) {
  const [isPending, startTransition] =
    useTransition();

  const [currentStep, setCurrentStep] =
    useState<BookingStep>("clinic");

  const [clinicId, setClinicId] =
    useState(
      clinics.length === 1
        ? clinics[0].id
        : ""
    );

  const [patientName, setPatientName] =
    useState(initialPatientName);

  const [patientPhone, setPatientPhone] =
    useState("");

  const [requestedDate, setRequestedDate] =
    useState("");

  const [requestedTime, setRequestedTime] =
    useState("");

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(30);

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);


  const today = useMemo(
    () =>
      getLocalDateString(
        new Date()
      ),
    []
  );

  const maximumDate = useMemo(() => {
    const date = new Date();

    date.setDate(
      date.getDate() + 90
    );

    return getLocalDateString(date);
  }, []);

  const selectedClinic =
    clinics.find(
      (clinic) =>
        clinic.id === clinicId
    ) ?? null;

  const currentStepIndex =
    getStepIndex(currentStep);

  const handleDateChange = useCallback(
    (date: string) => {
      setRequestedDate(date);
      setRequestedTime("");
      setDurationMinutes(30);
      setError(null);
    },
    []
  );

  const handleTimeChange = useCallback(
    (
      time: string,
      selectedDuration: number
    ) => {
      setRequestedTime(time);

      if (selectedDuration > 0) {
        setDurationMinutes(
          selectedDuration
        );
      }

      setError(null);
    },
    []
  );

  function chooseClinic(
    nextClinicId: string
  ) {
    setClinicId(nextClinicId);
    setRequestedDate("");
    setRequestedTime("");
    setDurationMinutes(30);
    setError(null);
  }

  function validateClinicStep() {
    if (!clinicId || !selectedClinic) {
      setError(
        "Selectează o clinică validă."
      );
      return false;
    }

    return true;
  }

  function validateAvailabilityStep() {
    if (!requestedDate) {
      setError(
        "Selectează data programării."
      );
      return false;
    }

    if (
      requestedDate < today ||
      requestedDate > maximumDate
    ) {
      setError(
        "Selectează o dată validă pentru programare."
      );
      return false;
    }

    if (!requestedTime) {
      setError(
        "Selectează una dintre orele disponibile."
      );
      return false;
    }

    return true;
  }

  function validatePatientStep() {
    if (
      patientName.trim().length < 2
    ) {
      setError(
        "Introdu un nume valid."
      );
      return false;
    }

    if (
      patientPhone.trim().length < 7
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
    setError(null);
    setCurrentStep(step);
  }

  function continueFromClinic() {
    setError(null);

    if (!validateClinicStep()) {
      return;
    }

    setCurrentStep(
      "availability"
    );
  }

  function continueFromAvailability() {
    setError(null);

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep()
    ) {
      return;
    }

    setCurrentStep("patient");
  }

  function continueFromPatient() {
    setError(null);

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep() ||
      !validatePatientStep()
    ) {
      return;
    }

    setCurrentStep("review");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    if (
      !validateClinicStep() ||
      !validateAvailabilityStep() ||
      !validatePatientStep() ||
      !selectedClinic
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/appointments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
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
          response.status === 401
        ) {
          window.location.href =
            `/login?next=${encodeURIComponent(
              window.location.pathname
            )}`;

          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Cererea de programare nu a putut fi trimisă."
          );
        }

        if (!result.appointmentId) {
          throw new Error(
            "Cererea a fost salvată, dar pagina de confirmare nu a putut fi deschisă."
          );
        }

        window.location.href =
          `/appointments/${result.appointmentId}/request-received?emailSent=${result.emailSent === false ? "0" : "1"}`;
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Cererea de programare nu a putut fi trimisă."
        );
      }
    });
  }

  if (clinics.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Programările online nu sunt încă
        disponibile pentru acest medic.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-6 py-6 sm:px-8">
        <p className="text-sm font-medium text-gray-500">
          Programare online
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Solicită o programare
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Completează pașii pentru a
          solicita o consultație la{" "}
          <strong>{doctorName}</strong>.
        </p>

        <ol
          aria-label="Pașii programării"
          className="mt-6 grid grid-cols-4 gap-2"
        >
          {STEPS.map(
            (step, index) => {
              const isCurrent =
                step.id === currentStep;

              const isCompleted =
                index <
                currentStepIndex;

              return (
                <li
                  key={step.id}
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
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isCurrent
                          ? "bg-[#036661] text-white"
                          : isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-500",
                      ].join(" ")}
                    >
                      {isCompleted
                        ? "✓"
                        : index + 1}
                    </div>

                    {index <
                      STEPS.length -
                        1 && (
                      <div
                        className={[
                          "mx-2 h-0.5 flex-1",
                          isCompleted
                            ? "bg-emerald-300"
                            : "bg-gray-200",
                        ].join(" ")}
                      />
                    )}
                  </div>

                  <p
                    className={[
                      "mt-2 truncate text-xs font-medium",
                      isCurrent
                        ? "text-[#036661]"
                        : isCompleted
                          ? "text-emerald-700"
                          : "text-gray-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>
                </li>
              );
            }
          )}
        </ol>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-6 py-7 sm:px-8"
      >
        {currentStep ===
          "clinic" && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Alege clinica
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Selectează locul în care
              dorești să aibă loc
              consultația.
            </p>

            <div className="mt-6 space-y-3">
              {clinics.map(
                (clinic) => {
                  const isSelected =
                    clinic.id ===
                    clinicId;

                  return (
                    <button
                      key={clinic.id}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        chooseClinic(
                          clinic.id
                        )
                      }
                      className={[
                        "romdoc-focus-ring w-full rounded-xl border p-4 text-left transition",
                        isSelected
                          ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
                          : "border-gray-200 bg-white hover:border-[#036661]/50 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <span className="flex items-start gap-3">
                        <span
                          className={[
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-[#036661] bg-[#036661]"
                              : "border-gray-300 bg-white",
                          ].join(" ")}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </span>

                        <span>
                          <span className="block font-semibold text-gray-900">
                            {clinic.name}
                          </span>

                          {clinic.address && (
                            <span className="mt-1 block text-sm leading-6 text-gray-600">
                              {clinic.address}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-7">
              <Button
                type="button"
                fullWidth
                size="lg"
                disabled={!clinicId}
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
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Clinica selectată
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {selectedClinic?.name}
              </p>

              {selectedClinic?.address && (
                <p className="mt-1 text-sm text-gray-600">
                  {
                    selectedClinic.address
                  }
                </p>
              )}
            </div>

            <PublicAvailabilityCalendar
              doctorId={doctorId}
              clinicId={clinicId}
              minimumDate={today}
              maximumDate={maximumDate}
              selectedDate={
                requestedDate
              }
              selectedTime={
                requestedTime
              }
              disabled={isPending}
              onDateChange={
                handleDateChange
              }
              onTimeChange={
                handleTimeChange
              }
            />

            {requestedTime && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <strong>
                  Interval selectat:
                </strong>{" "}
                {formatDisplayDate(
                  requestedDate
                )}
                , {requestedTime}
                {" · "}
                {durationMinutes} minute
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() =>
                  goToStep("clinic")
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
              Datele pacientului
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Aceste informații sunt
              folosite pentru identificarea
              și contactarea pacientului.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Nume complet
                </span>

                <input
                  type="text"
                  required
                  minLength={2}
                  value={patientName}
                  disabled={isPending}
                  autoComplete="name"
                  onChange={(event) =>
                    setPatientName(
                      event.target.value
                    )
                  }
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Telefon
                </span>

                <input
                  type="tel"
                  required
                  minLength={7}
                  value={patientPhone}
                  disabled={isPending}
                  autoComplete="tel"
                  onChange={(event) =>
                    setPatientPhone(
                      event.target.value
                    )
                  }
                  placeholder="+40 700 000 000"
                  className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 disabled:opacity-60"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-gray-700">
                E-mail verificat
              </span>

              <input
                type="email"
                value={
                  authenticatedEmail
                }
                readOnly
                className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
              />

              <span className="mt-1 block text-xs text-gray-500">
                Programarea va fi
                asociată acestui cont.
              </span>
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-gray-700">
                Mesaj pentru medic
              </span>

              <span className="ml-2 text-xs text-gray-500">
                Opțional
              </span>

              <textarea
                value={notes}
                disabled={isPending}
                rows={5}
                maxLength={2000}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Descrie pe scurt motivul consultației."
                className="romdoc-focus-ring mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 disabled:opacity-60"
              />

              <span className="mt-1 block text-right text-xs text-gray-500">
                {notes.length} / 2000
              </span>
            </label>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
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
                    .length < 2 ||
                  patientPhone
                    .trim()
                    .length < 7
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

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Confirmă că informațiile sunt
              corecte înainte de trimiterea
              cererii.
            </p>

            <dl className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200">
              <div className="p-4 sm:flex sm:items-start sm:justify-between sm:gap-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Medic și clinică
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">
                    {doctorName}
                  </dd>
                  <dd className="mt-1 text-sm text-gray-700">
                    {selectedClinic?.name}
                  </dd>
                  {selectedClinic?.address && (
                    <dd className="mt-1 text-sm text-gray-500">
                      {
                        selectedClinic.address
                      }
                    </dd>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goToStep("clinic")
                  }
                  className="romdoc-focus-ring mt-3 text-sm font-semibold text-[#036661] hover:underline sm:mt-0"
                >
                  Modifică
                </button>
              </div>

              <div className="p-4 sm:flex sm:items-start sm:justify-between sm:gap-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Data și ora
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">
                    {formatDisplayDate(
                      requestedDate
                    )}
                  </dd>
                  <dd className="mt-1 text-sm text-gray-700">
                    {requestedTime}
                    {" · "}
                    {durationMinutes} minute
                  </dd>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goToStep(
                      "availability"
                    )
                  }
                  className="romdoc-focus-ring mt-3 text-sm font-semibold text-[#036661] hover:underline sm:mt-0"
                >
                  Modifică
                </button>
              </div>

              <div className="p-4 sm:flex sm:items-start sm:justify-between sm:gap-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Pacient
                  </dt>
                  <dd className="mt-1 font-semibold text-gray-900">
                    {patientName.trim()}
                  </dd>
                  <dd className="mt-1 text-sm text-gray-700">
                    {patientPhone.trim()}
                  </dd>
                  <dd className="mt-1 text-sm text-gray-500">
                    {authenticatedEmail}
                  </dd>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goToStep("patient")
                  }
                  className="romdoc-focus-ring mt-3 text-sm font-semibold text-[#036661] hover:underline sm:mt-0"
                >
                  Modifică
                </button>
              </div>

              {notes.trim() && (
                <div className="p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Mesaj pentru medic
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {notes.trim()}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
              Aceasta este o cerere de
              programare. Medicul sau
              clinica trebuie să o confirme.
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={isPending}
                onClick={() =>
                  goToStep("patient")
                }
              >
                Înapoi
              </Button>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isPending}
                loadingText="Se trimite cererea..."
              >
                Trimite cererea
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
      </form>
    </section>
  );
}
