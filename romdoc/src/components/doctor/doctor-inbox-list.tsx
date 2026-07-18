"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import DoctorAppointmentDetailPanel, {
  type DoctorAppointmentDetail,
} from "@/components/doctor/doctor-appointment-detail-panel";

export type DoctorInboxItem = {
  id: string;
  type:
    | "request"
    | "message"
    | "operational";
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
  appointment:
    DoctorAppointmentDetail;
};

type Filter =
  | "all"
  | "request"
  | "message"
  | "operational";

type Props = {
  items:
    DoctorInboxItem[];
};

const filterOptions: Array<{
  value: Filter;
  label: string;
}> = [
  {
    value: "all",
    label: "Toate",
  },
  {
    value: "request",
    label: "Cereri noi",
  },
  {
    value: "message",
    label: "Mesaje",
  },
  {
    value: "operational",
    label:
      "Actualizări",
  },
];

function formatCreatedAt(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function typeLabel(
  type:
    DoctorInboxItem["type"]
) {
  if (
    type === "request"
  ) {
    return "Cerere";
  }

  if (
    type === "message"
  ) {
    return "Mesaj";
  }

  return "Actualizare";
}

function typeClasses(
  type:
    DoctorInboxItem["type"]
) {
  if (
    type === "request"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    type === "message"
  ) {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-gray-100 text-gray-700";
}

export default function DoctorInboxList({
  items,
}: Props) {
  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      "all"
    );

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] =
    useState<DoctorAppointmentDetail | null>(
      null
    );

  const filteredItems =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return items;
      }

      return items.filter(
        (item) =>
          item.type ===
          filter
      );
    }, [
      filter,
      items,
    ]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(
          (option) => {
            const active =
              filter ===
              option.value;

            const count =
              option.value ===
              "all"
                ? items.length
                : items.filter(
                    (item) =>
                      item.type ===
                      option.value
                  ).length;

            return (
              <button
                key={
                  option.value
                }
                type="button"
                onClick={() =>
                  setFilter(
                    option.value
                  )
                }
                className={`romdoc-focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[#036661] bg-[#036661] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-[#036661] hover:text-[#036661]"
                }`}
              >
                {
                  option.label
                }{" "}
                ({count})
              </button>
            );
          }
        )}
      </div>

      {filteredItems.length >
      0 ? (
        <div className="mt-5 space-y-3">
          {filteredItems.map(
            (item) => (
              <article
                key={
                  item.id
                }
                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                  item.unread
                    ? "border-[#036661]/40"
                    : "border-gray-200"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClasses(
                          item.type
                        )}`}
                      >
                        {typeLabel(
                          item.type
                        )}
                      </span>

                      {item.unread && (
                        <span className="rounded-full bg-[#036661] px-2.5 py-1 text-xs font-semibold text-white">
                          Nou
                        </span>
                      )}

                      <span className="text-xs text-gray-500">
                        {formatCreatedAt(
                          item.createdAt
                        )}
                      </span>
                    </div>

                    <h2 className="mt-3 text-base font-bold text-gray-900">
                      {
                        item.title
                      }
                    </h2>

                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">
                      {
                        item.description
                      }
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {
                        item
                          .appointment
                          .clinicName
                      }
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAppointment(
                          item.appointment
                        )
                      }
                      className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                    >
                      Detalii
                    </button>

                    {item.type ===
                      "message" && (
                      <Link
                        href={`/appointments/${item.appointment.id}/messages`}
                        className="romdoc-button romdoc-button-primary romdoc-button-sm"
                      >
                        Răspunde
                      </Link>
                    )}

                    {item.type ===
                      "request" && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAppointment(
                            item.appointment
                          )
                        }
                        className="romdoc-button romdoc-button-primary romdoc-button-sm"
                      >
                        Gestionează
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          Nu există elemente în această categorie.
        </div>
      )}

      {selectedAppointment && (
        <DoctorAppointmentDetailPanel
          appointment={
            selectedAppointment
          }
          variant="dialog"
          onClose={() =>
            setSelectedAppointment(
              null
            )
          }
        />
      )}
    </>
  );
}
