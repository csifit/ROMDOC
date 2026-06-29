"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/button";

export type StaffClinicOption = {
  id: string;
  name: string;
};

export type StaffDoctorOption = {
  id: string;
  name: string;
  clinics: StaffClinicOption[];
};

type AppointmentSource =
  | "phone"
  | "walk_in"
  | "email"
  | "other";

type StaffCreateAppointmentFormProps = {
  doctors: StaffDoctorOption[];
  onCreated:
    () => void | Promise<void>;
};

type CreateAppointmentResponse = {
  success?: boolean;
  emailSent?: boolean;
  error?: string;
  appointment?: {
    id: string;
  };
};

function getLocalDateString() {
  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function StaffCreateAppointmentForm({
  doctors,
  onCreated,
}: StaffCreateAppointmentFormProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    doctorId,
    setDoctorId,
  ] = useState(
    doctors[0]?.id ?? ""
  );

  const selectedDoctor =
    useMemo(
      () =>
        doctors.find(
          (doctor) =>
            doctor.id === doctorId
        ) ??
        doctors[0] ??
        null,
      [doctorId, doctors]
    );

  const clinics =
    selectedDoctor?.clinics ?? [];

  const [
    clinicId,
    setClinicId,
  ] = useState(
    doctors[0]?.clinics[0]?.id ??
      ""
  );

  const [
    patientName,
    setPatientName,
  ] = useState("");

  const [
    patientEmail,
    setPatientEmail,
  ] = useState("");

  const [
    patientPhone,
    setPatientPhone,
  ] = useState("");

  const [
    scheduledDate,
    setScheduledDate,
  ] = useState("");

  const [
    scheduledTime,
    setScheduledTime,
  ] = useState("");

  const [source, setSource] =
    useState<AppointmentSource>(
      "phone"
    );

  const [notes, setNotes] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    warningMessage,
    setWarningMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const today =
    getLocalDateString();

  function handleDoctorChange(
    nextDoctorId: string
  ) {
    const nextDoctor =
      doctors.find(
        (doctor) =>
          doctor.id ===
          nextDoctorId
      );

    setDoctorId(
      nextDoctorId
    );

    setClinicId(
      nextDoctor?.clinics[0]?.id ??
        ""
    );
  }

  function resetPatientFields() {
    setPatientName("");
    setPatientEmail("");
    setPatientPhone("");
    setScheduledDate("");
    setScheduledTime("");
    setSource("phone");
    setNotes("");
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setWarningMessage("");
    setErrorMessage("");

    if (!doctorId) {
      setErrorMessage(
        "Selectează medicul."
      );
      return;
    }

    if (!clinicId) {
      setErrorMessage(
        "Selectează clinica programării."
      );
      return;
    }

    if (
      patientName.trim().length <
      2
    ) {
      setErrorMessage(
        "Introdu numele pacientului."
      );
      return;
    }

    if (
      !patientEmail.trim()
    ) {
      setErrorMessage(
        "Introdu adresa de e-mail a pacientului."
      );
      return;
    }

    if (
      patientPhone.trim().length <
      7
    ) {
      setErrorMessage(
        "Introdu un număr de telefon valid."
      );
      return;
    }

    if (
      !scheduledDate ||
      !scheduledTime
    ) {
      setErrorMessage(
        "Selectează data și ora programării."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/staff/appointments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              doctorId,
              clinicId,
              patientName:
                patientName.trim(),
              patientEmail:
                patientEmail
                  .trim()
                  .toLowerCase(),
              patientPhone:
                patientPhone.trim(),
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

      if (!response.ok) {
        setErrorMessage(
          result.error ??
            "Programarea nu a putut fi creată."
        );
        return;
      }

      setSuccessMessage(
        "Programarea a fost creată și confirmată."
      );

      if (
        result.emailSent === false
      ) {
        setWarningMessage(
          "Programarea a fost salvată, dar e-mailul de confirmare nu a putut fi trimis."
        );
      }

      resetPatientFields();
      await onCreated();
    } catch (requestError) {
      console.error(
        "Staff appointment form request failed:",
        requestError
      );

      setErrorMessage(
        "Nu s-a putut comunica cu serverul. Încearcă din nou."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    doctors.length === 0
  ) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-950">
          Nu există medici disponibili
        </h2>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          Poți adăuga programări după ce ai o atribuire activă pentru un medic care are cel puțin o clinică aprobată.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => {
          setIsOpen(
            (currentValue) =>
              !currentValue
          );
          setSuccessMessage("");
          setWarningMessage("");
          setErrorMessage("");
        }}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Adaugă o programare
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Creează o programare confirmată pentru unul dintre medicii pe care îi gestionezi.
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
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-appointment-doctor"
                  className="block text-sm font-medium text-gray-700"
                >
                  Medic
                </label>

                <select
                  id="staff-appointment-doctor"
                  value={doctorId}
                  onChange={(event) =>
                    handleDoctorChange(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {doctors.map(
                    (doctor) => (
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
              </div>

              <div>
                <label
                  htmlFor="staff-appointment-clinic"
                  className="block text-sm font-medium text-gray-700"
                >
                  Clinică
                </label>

                <select
                  id="staff-appointment-clinic"
                  value={clinicId}
                  onChange={(event) =>
                    setClinicId(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clinics.map(
                    (clinic) => (
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
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-appointment-source"
                  className="block text-sm font-medium text-gray-700"
                >
                  Sursa programării
                </label>

                <select
                  id="staff-appointment-source"
                  value={source}
                  onChange={(event) =>
                    setSource(
                      event.target
                        .value as AppointmentSource
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="phone">
                    Telefon
                  </option>

                  <option value="walk_in">
                    Direct la clinică
                  </option>

                  <option value="email">
                    E-mail
                  </option>

                  <option value="other">
                    Altă sursă
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="staff-appointment-patient-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Numele pacientului
                </label>

                <input
                  id="staff-appointment-patient-name"
                  type="text"
                  value={
                    patientName
                  }
                  onChange={(event) =>
                    setPatientName(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="name"
                  placeholder="Exemplu: Maria Ionescu"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-appointment-patient-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Telefon
                </label>

                <input
                  id="staff-appointment-patient-phone"
                  type="tel"
                  value={
                    patientPhone
                  }
                  onChange={(event) =>
                    setPatientPhone(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="tel"
                  placeholder="Exemplu: 0712 345 678"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-appointment-patient-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  E-mail
                </label>

                <input
                  id="staff-appointment-patient-email"
                  type="email"
                  value={
                    patientEmail
                  }
                  onChange={(event) =>
                    setPatientEmail(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  autoComplete="email"
                  placeholder="Exemplu: maria@example.com"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-appointment-date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Data programării
                </label>

                <input
                  id="staff-appointment-date"
                  type="date"
                  min={today}
                  value={
                    scheduledDate
                  }
                  onChange={(event) =>
                    setScheduledDate(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-appointment-time"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ora programării
                </label>

                <input
                  id="staff-appointment-time"
                  type="time"
                  value={
                    scheduledTime
                  }
                  onChange={(event) =>
                    setScheduledTime(
                      event.target.value
                    )
                  }
                  required
                  disabled={
                    isSubmitting
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="staff-appointment-notes"
                className="block text-sm font-medium text-gray-700"
              >
                Observații
              </label>

              <textarea
                id="staff-appointment-notes"
                rows={4}
                maxLength={5000}
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                disabled={
                  isSubmitting
                }
                placeholder="Detalii opționale despre programare."
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <p className="mt-1 text-right text-xs text-gray-500">
                {notes.length}/5000
              </p>
            </div>

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
                  isSubmitting
                }
              >
                {isSubmitting
                  ? "Se creează..."
                  : "Creează programarea"}
              </Button>

              <Button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  resetPatientFields();
                  setErrorMessage("");
                  setWarningMessage("");
                  setSuccessMessage("");
                }}
                variant="secondary"
              >
                Golește formularul
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
