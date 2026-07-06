"use client";

import { useMemo, useState } from "react";

type SupportRequesterType =
  | "patient"
  | "doctor"
  | "clinic"
  | "visitor";

type SupportCategory =
  | "patient_support"
  | "doctor_support"
  | "profile_correction"
  | "booking_problem"
  | "privacy_request"
  | "technical_problem"
  | "other";

type SupportTicketFormProps = {
  initialRequesterType?: SupportRequesterType;
  initialCategory?: SupportCategory;
};

const REQUESTER_TYPE_OPTIONS: Array<{
  value: SupportRequesterType;
  label: string;
}> = [
  { value: "patient", label: "Pacient" },
  { value: "doctor", label: "Medic" },
  { value: "clinic", label: "Clinică / recepție" },
  { value: "visitor", label: "Vizitator" },
];

const CATEGORY_OPTIONS: Array<{
  value: SupportCategory;
  label: string;
  hint: string;
}> = [
  {
    value: "patient_support",
    label: "Suport pacient",
    hint: "Cont pacient, acces, dashboard, anulare programare.",
  },
  {
    value: "doctor_support",
    label: "Suport medic",
    hint: "Profil medic, abonament, clinici, disponibilitate, verificare.",
  },
  {
    value: "profile_correction",
    label: "Corectare profil sau informații publice",
    hint: "Date incorecte despre medic, clinică, adresă sau specialitate.",
  },
  {
    value: "booking_problem",
    label: "Problemă cu o programare",
    hint: "Nu apare programarea, confirmare lipsă, oră greșită sau anulare.",
  },
  {
    value: "privacy_request",
    label: "Confidențialitate / date personale",
    hint: "Acces, corectare, ștergere sau întrebări despre date personale.",
  },
  {
    value: "technical_problem",
    label: "Problemă tehnică",
    hint: "Eroare de pagină, formular care nu se trimite, problemă de autentificare.",
  },
  {
    value: "other",
    label: "Altă solicitare",
    hint: "Alt subiect legat de utilizarea platformei RomDoc.",
  },
];

function isValidRequesterType(
  value: string | undefined
): value is SupportRequesterType {
  return REQUESTER_TYPE_OPTIONS.some(
    (option) => option.value === value
  );
}

function isValidCategory(
  value: string | undefined
): value is SupportCategory {
  return CATEGORY_OPTIONS.some(
    (option) => option.value === value
  );
}

export default function SupportTicketForm({
  initialRequesterType = "patient",
  initialCategory = "patient_support",
}: SupportTicketFormProps) {
  const [requesterType, setRequesterType] =
    useState<SupportRequesterType>(
      isValidRequesterType(initialRequesterType)
        ? initialRequesterType
        : "patient"
    );

  const [category, setCategory] =
    useState<SupportCategory>(
      isValidCategory(initialCategory)
        ? initialCategory
        : "patient_support"
    );

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [relatedUrl, setRelatedUrl] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [website, setWebsite] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.value === category),
    [category]
  );

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setTicketId(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterType,
          category,
          requesterName,
          requesterEmail,
          requesterPhone,
          subject,
          message,
          relatedUrl,
          appointmentId,
          website,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        ticketId?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Solicitarea nu a putut fi trimisă.");
      }

      setTicketId(result.ticketId ?? null);
      setRequesterPhone("");
      setSubject("");
      setMessage("");
      setRelatedUrl("");
      setAppointmentId("");
      setWebsite("");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Solicitarea nu a putut fi trimisă."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitTicket}
      className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          Tichet suport RomDoc
        </p>

        <h2 className="mt-3 text-2xl font-bold text-gray-900">
          Trimite o solicitare către echipa RomDoc
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Folosește acest formular pentru probleme legate de platformă: cont,
          profil public, programări, confidențialitate sau erori tehnice.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Nu include date medicale sensibile, diagnostice, rezultate de analize
        sau urgențe medicale. Pentru urgențe, contactează serviciile medicale
        potrivite.
      </div>

      {ticketId && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
          Solicitarea a fost trimisă. ID tichet: <strong>{ticketId}</strong>.
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {submitError}
        </div>
      )}

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Cine trimite solicitarea?
          </span>
          <select
            value={requesterType}
            onChange={(event) =>
              setRequesterType(event.target.value as SupportRequesterType)
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            {REQUESTER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Categoria solicitării
          </span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as SupportCategory)
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <span className="mt-2 block text-xs leading-5 text-gray-500">
              {selectedCategory.hint}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Nume</span>
          <input
            type="text"
            value={requesterName}
            onChange={(event) => setRequesterName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">E-mail</span>
          <input
            type="email"
            value={requesterEmail}
            onChange={(event) => setRequesterEmail(event.target.value)}
            required
            maxLength={180}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Telefon <span className="font-normal text-gray-500">opțional</span>
          </span>
          <input
            type="tel"
            value={requesterPhone}
            onChange={(event) => setRequesterPhone(event.target.value)}
            maxLength={40}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            ID programare <span className="font-normal text-gray-500">opțional</span>
          </span>
          <input
            type="text"
            value={appointmentId}
            onChange={(event) => setAppointmentId(event.target.value)}
            placeholder="Doar dacă îl ai"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">Subiect</span>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
          minLength={4}
          maxLength={180}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">
          Link relevant <span className="font-normal text-gray-500">opțional</span>
        </span>
        <input
          type="url"
          value={relatedUrl}
          onChange={(event) => setRelatedUrl(event.target.value)}
          placeholder="Ex: link profil medic, pagină programare, pagină cu eroare"
          maxLength={600}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-gray-700">Mesaj</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={7}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
        />
        <span className="mt-2 block text-xs text-gray-500">
          Maximum 4000 de caractere. Pentru mesaje medicale despre o programare,
          folosește pagina programării, nu formularul de suport platformă.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="romdoc-button romdoc-button-primary mt-7 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Se trimite..." : "Trimite solicitarea"}
      </button>
    </form>
  );
}
