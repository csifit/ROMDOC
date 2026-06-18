"use client";

import { FormEvent, useState } from "react";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type AppointmentRequestFormProps = {
  doctorId: string;
  doctorName: string;
  clinics: ClinicOption[];
};

type FormState = {
  clinicId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  requestedDate: string;
  requestedTime: string;
  notes: string;
};

const initialFormState: FormState = {
  clinicId: "",
  patientName: "",
  patientEmail: "",
  patientPhone: "",
  requestedDate: "",
  requestedTime: "",
  notes: "",
};

export default function AppointmentRequestForm({
  doctorId,
  doctorName,
  clinics,
}: AppointmentRequestFormProps) {
  const [form, setForm] = useState<FormState>({
    ...initialFormState,
    clinicId: clinics.length === 1 ? clinics[0].id : "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!form.clinicId) {
      setErrorMessage("Selectează clinica pentru programare.");
      return;
    }

    if (form.patientName.trim().length < 2) {
      setErrorMessage("Introdu un nume valid.");
      return;
    }

    if (!form.patientEmail.includes("@")) {
      setErrorMessage("Introdu o adresă de e-mail validă.");
      return;
    }

    if (form.patientPhone.trim().length < 7) {
      setErrorMessage("Introdu un număr de telefon valid.");
      return;
    }

    if (!form.requestedDate) {
      setErrorMessage("Selectează data dorită.");
      return;
    }

    const selectedClinic = clinics.find(
      (clinic: ClinicOption) => clinic.id === form.clinicId
    );

    if (!selectedClinic) {
      setErrorMessage("Clinica selectată nu este validă.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId,
          clinicId: form.clinicId,
          doctorName,
          clinicName: selectedClinic.name,
          patientName: form.patientName,
          patientEmail: form.patientEmail,
          patientPhone: form.patientPhone,
          requestedDate: form.requestedDate,
          requestedTime: form.requestedTime,
          notes: form.notes,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        emailSent?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error ??
            "Cererea nu a putut fi trimisă. Încearcă din nou."
        );
        return;
      }

      if (result.emailSent) {
        setSuccessMessage(
          `Cererea pentru ${doctorName} a fost trimisă. Am trimis și un e-mail de confirmare. Clinica te va contacta pentru confirmarea programării.`
        );
      } else {
        setSuccessMessage(
          `Cererea pentru ${doctorName} a fost salvată. Clinica te va contacta pentru confirmarea programării.`
        );
      }

      setForm({
        ...initialFormState,
        clinicId: clinics.length === 1 ? clinics[0].id : "",
      });
    } catch (error) {
      console.error("Appointment request failed:", error);

      setErrorMessage(
        "Cererea nu a putut fi trimisă. Verifică conexiunea și încearcă din nou."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (clinics.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
        Programările online nu sunt încă disponibile pentru acest medic.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-2xl font-semibold text-gray-900">
        Solicită o programare
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Trimite cererea, iar clinica te va contacta pentru confirmarea
        programării.
      </p>

      <div className="mt-6 grid gap-5">
        <div>
          <label
            htmlFor="clinic"
            className="block text-sm font-medium text-gray-800"
          >
            Clinica
          </label>

          <select
            id="clinic"
            value={form.clinicId}
            onChange={(event) =>
              updateField("clinicId", event.target.value)
            }
            required
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
          >
            <option value="">Selectează clinica</option>

            {clinics.map((clinic: ClinicOption) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
                {clinic.address ? ` — ${clinic.address}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="patientName"
              className="block text-sm font-medium text-gray-800"
            >
              Nume complet
            </label>

            <input
              id="patientName"
              type="text"
              value={form.patientName}
              onChange={(event) =>
                updateField("patientName", event.target.value)
              }
              required
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="patientEmail"
              className="block text-sm font-medium text-gray-800"
            >
              E-mail
            </label>

            <input
              id="patientEmail"
              type="email"
              value={form.patientEmail}
              onChange={(event) =>
                updateField("patientEmail", event.target.value)
              }
              required
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="patientPhone"
            className="block text-sm font-medium text-gray-800"
          >
            Telefon
          </label>

          <input
            id="patientPhone"
            type="tel"
            value={form.patientPhone}
            onChange={(event) =>
              updateField("patientPhone", event.target.value)
            }
            required
            minLength={7}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+40 7..."
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
          />

          <p className="mt-2 text-xs text-gray-500">
            Numărul va fi folosit pentru confirmarea și notificarea
            programării.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="requestedDate"
              className="block text-sm font-medium text-gray-800"
            >
              Data dorită
            </label>

            <input
              id="requestedDate"
              type="date"
              min={today}
              value={form.requestedDate}
              onChange={(event) =>
                updateField("requestedDate", event.target.value)
              }
              required
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="requestedTime"
              className="block text-sm font-medium text-gray-800"
            >
              Ora preferată
            </label>

            <input
              id="requestedTime"
              type="time"
              value={form.requestedTime}
              onChange={(event) =>
                updateField("requestedTime", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-800"
          >
            Mesaj opțional
          </label>

          <textarea
            id="notes"
            rows={4}
            value={form.notes}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            placeholder="Poți adăuga informații utile pentru clinică."
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-500"
          />
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-xl bg-[#D97757] px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Se trimite..." : "Trimite cererea"}
      </button>
    </form>
  );
}