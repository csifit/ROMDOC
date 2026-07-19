"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import PublicAvailabilityCalendar from "@/components/appointments/public-availability-calendar";
import Button from "@/components/ui/button";
import {
  saveBookingDraft,
} from "@/lib/appointments/booking-draft";

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

export default function PreAuthAppointmentRequest({
  doctorId,
  doctorName,
  doctorSlug,
  clinics,
}: Props) {
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

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

  const returnPath =
    `/doctor/${doctorSlug}#programare`;

  const loginPath =
    `/login?next=${encodeURIComponent(
      returnPath
    )}`;

  const registerPath =
    `/register?type=patient&role=patient&next=${encodeURIComponent(
      returnPath
    )}`;

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
        duration: number
      ) => {
        setRequestedTime(
          time
        );
        setDurationMinutes(
          duration > 0
            ? duration
            : 30
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
    setError(
      null
    );
  }

  function continueTo(
    destination:
      | "login"
      | "register"
  ) {
    if (
      !selectedClinic
    ) {
      setError(
        "Selectează clinica."
      );
      return;
    }

    if (
      !requestedDate ||
      !requestedTime
    ) {
      setError(
        "Selectează data și ora programării."
      );
      return;
    }

    saveBookingDraft({
      doctorId,
      doctorSlug,
      clinicId:
        selectedClinic.id,
      requestedDate,
      requestedTime,
      durationMinutes,
    });

    window.location.href =
      destination ===
      "login"
        ? loginPath
        : registerPath;
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
          Alege clinica, data și ora
        </h2>

        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          Poți selecta intervalul înainte de autentificare. RomDoc îl păstrează temporar în acest browser cât timp te autentifici sau îți confirmi contul.
        </p>
      </header>

      <div className="space-y-[21px] p-[21px]">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            1. Clinica
          </h3>

          <div className="mt-[13px] space-y-[8px]">
            {clinics.map(
              (
                clinic
              ) => {
                const selected =
                  clinic.id ===
                  clinicId;

                return (
                  <button
                    key={
                      clinic.id
                    }
                    type="button"
                    onClick={() =>
                      chooseClinic(
                        clinic.id
                      )
                    }
                    className={[
                      "romdoc-focus-ring w-full rounded-[13px] border p-[13px] text-left transition",
                      selected
                        ? "border-[#036661] bg-[#036661]/5 ring-2 ring-[#036661]/15"
                        : "border-gray-200 bg-white hover:border-[#036661]/50",
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
        </div>

        {selectedClinic && (
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              2. Data și ora
            </h3>

            <div className="mt-[13px]">
              <PublicAvailabilityCalendar
                doctorId={
                  doctorId
                }
                clinicId={
                  selectedClinic.id
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
                  false
                }
                onDateChange={
                  handleDateChange
                }
                onTimeChange={
                  handleTimeChange
                }
              />
            </div>
          </div>
        )}

        {requestedDate &&
          requestedTime && (
          <div className="romdoc-notice romdoc-notice-success">
            Intervalul ales pentru{" "}
            <strong>
              {
                doctorName
              }
            </strong>
            :{" "}
            {
              requestedDate
            }
            , ora{" "}
            {
              requestedTime
            }
            .
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="romdoc-notice romdoc-notice-danger"
          >
            {
              error
            }
          </div>
        )}

        <div className="rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm leading-6 text-blue-900">
          Pentru trimiterea cererii ai nevoie de un cont Patient cu adresa de e-mail confirmată.
        </div>

        <div className="grid gap-[8px] sm:grid-cols-2">
          <Button
            type="button"
            fullWidth
            onClick={() =>
              continueTo(
                "login"
              )
            }
          >
            Autentificare și continuare
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() =>
              continueTo(
                "register"
              )
            }
          >
            Creează cont Patient
          </Button>
        </div>

        <p className="text-xs leading-5 text-gray-500">
          Se păstrează temporar doar medicul, clinica, data, ora și durata. Nu se păstrează numele, telefonul, e-mailul, mesajele sau informațiile medicale.
        </p>
      </div>
    </section>
  );
}
