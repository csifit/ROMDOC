"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type AdminClinicBillingSettingsFormProps = {
  initialDoctorPriceRon: number;
  initialVatPercent: number;
  updatedAt: string | null;
};

type SaveResponse = {
  settings?: {
    clinic_doctor_monthly_price_ron: number;
    vat_rate: number;
    updated_at: string;
  };
  error?: string;
  message?: string;
};

function formatInputNumber(value: number) {
  return Number(value).toString();
}

export default function AdminClinicBillingSettingsForm({
  initialDoctorPriceRon,
  initialVatPercent,
  updatedAt,
}: AdminClinicBillingSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [doctorPrice, setDoctorPrice] = useState(
    formatInputNumber(initialDoctorPriceRon)
  );
  const [vatPercent, setVatPercent] = useState(
    formatInputNumber(initialVatPercent)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedDoctorPrice = Number(doctorPrice);
    const parsedVatPercent = Number(vatPercent);

    if (!Number.isFinite(parsedDoctorPrice) || parsedDoctorPrice < 0) {
      setError(
        "Prețul abonamentului trebuie să fie un număr pozitiv sau zero."
      );
      return;
    }

    if (
      !Number.isFinite(parsedVatPercent) ||
      parsedVatPercent < 0 ||
      parsedVatPercent > 100
    ) {
      setError("TVA trebuie să fie între 0% și 100%.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/admin/clinic-billing-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clinicDoctorMonthlyPriceRon: parsedDoctorPrice,
              vatPercent: parsedVatPercent,
            }),
          }
        );

        const result = (await response.json()) as SaveResponse;

        if (!response.ok) {
          setError(
            result.error ?? "Tarifele nu au putut fi salvate."
          );
          return;
        }

        if (result.settings) {
          setDoctorPrice(
            formatInputNumber(
              result.settings.clinic_doctor_monthly_price_ron
            )
          );
          setVatPercent(
            formatInputNumber(result.settings.vat_rate * 100)
          );
        }

        setSuccess(result.message ?? "Tarifele au fost salvate.");
        router.refresh();
      } catch (saveError) {
        console.error(
          "Clinic billing settings save failed:",
          saveError
        );
        setError("Tarifele nu au putut fi salvate.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Aceste valori configurează tariful abonamentului/pachetului și TVA.
        SMS-urile sunt incluse și nu au tarif separat.
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">
            Abonament / pachet medic invitat
          </span>
          <span className="mt-1 block text-xs leading-5 text-gray-500">
            Preț lunar fără TVA.
          </span>
          <div className="mt-2 flex overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-[#036661] focus-within:ring-2 focus-within:ring-[#036661]/20">
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={doctorPrice}
              disabled={isPending}
              onChange={(event) => setDoctorPrice(event.target.value)}
              className="min-w-0 flex-1 px-4 py-3 outline-none"
            />
            <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-600">
              /lună
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-800">
            TVA
          </span>
          <span className="mt-1 block text-xs leading-5 text-gray-500">
            Procent utilizat în estimarea totalului.
          </span>
          <div className="mt-2 flex overflow-hidden rounded-xl border border-gray-300 bg-white focus-within:border-[#036661] focus-within:ring-2 focus-within:ring-[#036661]/20">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              value={vatPercent}
              disabled={isPending}
              onChange={(event) => setVatPercent(event.target.value)}
              className="min-w-0 flex-1 px-4 py-3 outline-none"
            />
            <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-600">
              %
            </span>
          </div>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-5">
        <p className="text-xs text-gray-500">
          Ultima actualizare:{" "}
          {updatedAt
            ? new Intl.DateTimeFormat("ro-RO", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(updatedAt))
            : "—"}
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Se salvează..." : "Salvează tarifele"}
        </button>
      </div>
    </form>
  );
}
