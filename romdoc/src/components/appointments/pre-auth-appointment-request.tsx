"use client";

import {useLocale} from "next-intl";
import {useCallback, useMemo, useState} from "react";

import PublicAvailabilityCalendar from "@/components/appointments/public-availability-calendar";
import Button from "@/components/ui/button";
import {
  BOOKING_COPY,
  interpolateBookingCopy,
} from "@/lib/appointments/booking-copy";
import {saveBookingDraft} from "@/lib/appointments/booking-draft";
import {normalizeAppLocale} from "@/lib/i18n/app-locale";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type Props = {
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  clinics: ClinicOption[];
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDoctorProfilePath(
  locale: "ro" | "en" | "de",
  doctorSlug: string
) {
  return locale === "de"
    ? `/de/arzt/${doctorSlug}`
    : `/${locale}/doctor/${doctorSlug}`;
}

export default function PreAuthAppointmentRequest({
  doctorId,
  doctorName,
  doctorSlug,
  clinics,
}: Props) {
  const locale = normalizeAppLocale(useLocale());
  const copy = BOOKING_COPY[locale].preAuth;

  const [clinicId, setClinicId] = useState(
    clinics.length === 1 ? clinics[0].id : ""
  );
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(
    () => getLocalDateString(new Date()),
    []
  );

  const maximumDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return getLocalDateString(date);
  }, []);

  const selectedClinic =
    clinics.find((clinic) => clinic.id === clinicId) ?? null;

  const returnPath =
    `${getDoctorProfilePath(locale, doctorSlug)}#programare`;

  const loginPath =
    `/${locale}/login?next=${encodeURIComponent(returnPath)}`;

  const registerPath =
    `/${locale}/register?type=patient&role=patient&next=${encodeURIComponent(returnPath)}`;

  const handleDateChange = useCallback((date: string) => {
    setRequestedDate(date);
    setRequestedTime("");
    setDurationMinutes(30);
    setError(null);
  }, []);

  const handleTimeChange = useCallback(
    (time: string, duration: number) => {
      setRequestedTime(time);
      setDurationMinutes(duration > 0 ? duration : 30);
      setError(null);
    },
    []
  );

  function chooseClinic(nextClinicId: string) {
    setClinicId(nextClinicId);
    setRequestedDate("");
    setRequestedTime("");
    setDurationMinutes(30);
    setError(null);
  }

  function continueTo(destination: "login" | "register") {
    if (!selectedClinic) {
      setError(copy.selectClinicError);
      return;
    }

    if (!requestedDate || !requestedTime) {
      setError(copy.selectDateTimeError);
      return;
    }

    saveBookingDraft({
      doctorId,
      doctorSlug,
      clinicId: selectedClinic.id,
      requestedDate,
      requestedTime,
      durationMinutes,
    });

    window.location.href =
      destination === "login" ? loginPath : registerPath;
  }

  if (clinics.length === 0) {
    return (
      <div className="romdoc-notice romdoc-notice-warning">
        {copy.unavailable}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 p-[21px]">
        <p className="text-sm font-semibold text-[#036661]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
          {copy.title}
        </h2>
        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </header>

      <div className="space-y-[21px] p-[21px]">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {copy.clinicStep}
          </h3>
          <div className="mt-[13px] space-y-[8px]">
            {clinics.map((clinic) => {
              const selected = clinic.id === clinicId;
              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => chooseClinic(clinic.id)}
                  className={[
                    "romdoc-focus-ring w-full rounded-[13px] border p-[13px] text-left transition",
                    selected
                      ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
                      : "border-gray-200 bg-white hover:border-[#036661]/50",
                  ].join(" ")}
                >
                  <span className="block font-semibold text-gray-900">
                    {clinic.name}
                  </span>
                  {clinic.address && (
                    <span className="mt-[5px] block text-sm leading-6 text-gray-600">
                      {clinic.address}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedClinic && (
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {copy.dateTimeStep}
            </h3>
            <div className="mt-[13px]">
              <PublicAvailabilityCalendar
                doctorId={doctorId}
                clinicId={selectedClinic.id}
                minimumDate={today}
                maximumDate={maximumDate}
                selectedDate={requestedDate}
                selectedTime={requestedTime}
                disabled={false}
                onDateChange={handleDateChange}
                onTimeChange={handleTimeChange}
              />
            </div>
          </div>
        )}

        {requestedDate && requestedTime && (
          <div className="romdoc-notice romdoc-notice-success">
            {interpolateBookingCopy(copy.selectedSlot, {
              doctorName,
              date: requestedDate,
              time: requestedTime,
            })}
          </div>
        )}

        {error && (
          <div role="alert" className="romdoc-notice romdoc-notice-danger">
            {error}
          </div>
        )}

        <div className="rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-900">
          {copy.accountNotice}
        </div>

        <div className="grid gap-[8px] sm:grid-cols-2">
          <Button type="button" fullWidth onClick={() => continueTo("login")}>
            {copy.signIn}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => continueTo("register")}
          >
            {copy.createAccount}
          </Button>
        </div>

        <p className="text-xs leading-5 text-gray-500">
          {copy.privacy}
        </p>
      </div>
    </section>
  );
}
