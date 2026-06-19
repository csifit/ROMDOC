"use client";

import {
  useEffect,
  useState,
} from "react";

type AvailableSlot = {
  time: string;
  durationMinutes: number;
};

type AvailableSlotSelectorProps = {
  doctorId: string;
  clinicId: string;
  date: string;
  selectedTime: string;
  onTimeChange: (
    time: string,
    durationMinutes: number
  ) => void;
  disabled?: boolean;
};

type SlotsApiResponse = {
  slots?: AvailableSlot[];
  error?: string;
};

export default function AvailableSlotSelector({
  doctorId,
  clinicId,
  date,
  selectedTime,
  onTimeChange,
  disabled = false,
}: AvailableSlotSelectorProps) {
  const [slots, setSlots] =
    useState<AvailableSlot[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const abortController =
      new AbortController();

    async function loadSlots() {
      setSlots([]);
      setError(null);

      if (
        !doctorId ||
        !clinicId ||
        !date
      ) {
        return;
      }

      setIsLoading(true);

      try {
        const searchParams =
          new URLSearchParams({
            doctorId,
            clinicId,
            date,
          });

        const response = await fetch(
          `/api/availability/slots?${searchParams.toString()}`,
          {
            method: "GET",
            signal:
              abortController.signal,
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as SlotsApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Intervalele disponibile nu au putut fi încărcate."
          );
        }

        const availableSlots =
          result.slots ?? [];

        setSlots(availableSlots);

        const selectedSlotStillExists =
          availableSlots.some(
            (slot) =>
              slot.time ===
              selectedTime
          );

        if (
          selectedTime &&
          !selectedSlotStillExists
        ) {
          onTimeChange("", 0);
        }
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Intervalele disponibile nu au putut fi încărcate."
        );
      } finally {
        if (
          !abortController.signal
            .aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadSlots();

    return () => {
      abortController.abort();
    };
  }, [
    doctorId,
    clinicId,
    date,
    selectedTime,
    onTimeChange,
  ]);

  if (!clinicId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Selectează mai întâi clinica.
      </div>
    );
  }

  if (!date) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Selectează data programării.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Se încarcă orele disponibile...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        {error}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Nu există intervale disponibile pentru această zi.
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">
        Ora disponibilă
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {slots.map(
          (slot: AvailableSlot) => {
            const isSelected =
              selectedTime ===
              slot.time;

            return (
              <button
                key={`${slot.time}-${slot.durationMinutes}`}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onTimeChange(
                    slot.time,
                    slot.durationMinutes
                  )
                }
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-[#D97757] bg-[#D97757] text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:border-[#D97757] hover:bg-[#F0EEE9]"
                }`}
              >
                {slot.time}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}