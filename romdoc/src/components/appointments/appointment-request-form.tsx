"use client";

import {
  type FormEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import AvailableSlotSelector from "@/components/appointments/available-slot-selector";
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

export default function AppointmentRequestForm({
  doctorId,
  doctorName,
  clinics,
  initialPatientName,
  authenticatedEmail,
}: AppointmentRequestFormProps) {
  const [isPending, startTransition] =
    useTransition();

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

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const today = useMemo(
    () => getLocalDateString(new Date()),
    []
  );

  const maximumDate = useMemo(() => {
    const date = new Date();

    date.setDate(
      date.getDate() + 180
    );

    return getLocalDateString(date);
  }, []);

  const selectedClinic =
    clinics.find(
      (clinic) =>
        clinic.id === clinicId
    ) ?? null;

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
    },
    []
  );

  function resetForm() {
    setClinicId(
      clinics.length === 1
        ? clinics[0].id
        : ""
    );

    setPatientName(initialPatientName);
    setPatientPhone("");
    setRequestedDate("");
    setRequestedTime("");
    setDurationMinutes(30);
    setNotes("");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(null);
    setError(null);

    if (!clinicId || !selectedClinic) {
      setError(
        "Selectează o clinică validă."
      );

      return;
    }

    if (
      patientName.trim().length < 2
    ) {
      setError(
        "Introdu un nume valid."
      );

      return;
    }

    if (
      patientPhone.trim().length < 7
    ) {
      setError(
        "Introdu un număr de telefon valid."
      );

      return;
    }

    if (!requestedDate) {
      setError(
        "Selectează data programării."
      );

      return;
    }

    if (
      requestedDate < today ||
      requestedDate > maximumDate
    ) {
      setError(
        "Selectează o dată validă pentru programare."
      );

      return;
    }

    if (!requestedTime) {
      setError(
        "Selectează una dintre orele disponibile."
      );

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
          (await response.json()) as AppointmentApiResponse;

        if (response.status === 401) {
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

        if (
          result.emailSent === false
        ) {
          setMessage(
            "Cererea a fost înregistrată, dar e-mailul nu a putut fi trimis."
          );
        } else {
          setMessage(
            "Cererea de programare a fost trimisă. Vei primi un e-mail cu detaliile."
          );
        }

        resetForm();
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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header>
        <p className="text-sm font-medium text-gray-500">
          Programare online
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Solicită o programare
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Selectează clinica, data și una dintre
          orele disponibile pentru{" "}
          <strong>{doctorName}</strong>.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Clinica
          </span>

          <select
            required
            value={clinicId}
            disabled={
              isPending ||
              clinics.length === 1
            }
            onChange={(event) => {
              setClinicId(
                event.target.value
              );

              setRequestedTime("");
              setDurationMinutes(30);
              setMessage(null);
              setError(null);
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70"
          >
            <option value="">
              Selectează clinica
            </option>

            {clinics.map((clinic) => (
              <option
                key={clinic.id}
                value={clinic.id}
              >
                {clinic.name}
                {clinic.address
                  ? ` — ${clinic.address}`
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
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
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
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
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            E-mail verificat
          </span>

          <input
            type="email"
            value={authenticatedEmail}
            readOnly
            className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
          />

          <span className="mt-1 block text-xs text-gray-500">
            Programarea va fi asociată acestui cont.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Data programării
          </span>

          <input
            type="date"
            required
            min={today}
            max={maximumDate}
            value={requestedDate}
            disabled={isPending}
            onChange={(event) => {
              setRequestedDate(
                event.target.value
              );

              setRequestedTime("");
              setDurationMinutes(30);
              setMessage(null);
              setError(null);
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
          />
        </label>

        <AvailableSlotSelector
          doctorId={doctorId}
          clinicId={clinicId}
          date={requestedDate}
          selectedTime={requestedTime}
          disabled={isPending}
          onTimeChange={
            handleTimeChange
          }
        />

        {requestedTime && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <strong>
              Interval selectat:
            </strong>{" "}
            {requestedDate},{" "}
            {requestedTime}
            {" — "}
            {durationMinutes} minute
          </div>
        )}

        <label className="block">
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
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
          />

          <span className="mt-1 block text-right text-xs text-gray-500">
            {notes.length} / 2000
          </span>
        </label>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isPending}
          loadingText="Se trimite cererea..."
          disabled={
            !clinicId ||
            !requestedDate ||
            !requestedTime
          }
        >
          Trimite cererea de programare
        </Button>
      </form>
    </div>
  );
}