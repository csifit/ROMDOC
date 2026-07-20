"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type DashboardNotification = {
  id: string;
  appointment_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type ApiResponse = {
  notifications?:
    DashboardNotification[];
  error?: string;
};

export type DashboardNotificationsCopy = {
  eyebrow: string;
  title: string;
  unreadSingular: string;
  unreadPlural: string;
  markAll: string;
  loading: string;
  loadFailed: string;
  empty: string;
  markRead: string;
};

export type DashboardNotificationContent = {
  title: string;
  body: string;
};

type DashboardNotificationsProps = {
  locale?: AppLocale;
  copy?: DashboardNotificationsCopy;
  notificationContent?: Record<
    string,
    DashboardNotificationContent
  >;
};

const DEFAULT_COPY:
  DashboardNotificationsCopy = {
    eyebrow:
      "Notificări",
    title:
      "Actualizări programări",
    unreadSingular:
      "necitită",
    unreadPlural:
      "necitite",
    markAll:
      "Marchează toate ca citite",
    loading:
      "Se încarcă notificările...",
    loadFailed:
      "Notificările nu au putut fi încărcate.",
    empty:
      "Nu există notificări.",
    markRead:
      "Citită",
  };

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function formatDateTime(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
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

function withLocaleQuery(
  href: string,
  locale: AppLocale
) {
  if (
    !href.startsWith(
      "/appointments/"
    )
  ) {
    return href;
  }

  const separator =
    href.includes("?")
      ? "&"
      : "?";

  return `${href}${separator}locale=${locale}`;
}

export default function DashboardNotifications({
  locale = "ro",
  copy = DEFAULT_COPY,
  notificationContent,
}: DashboardNotificationsProps = {}) {
  const [
    notifications,
    setNotifications,
  ] =
    useState<
      DashboardNotification[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/dashboard-notifications",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const payload =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          payload.error
            ? payload.error
            : copy.loadFailed
        );
      }

      setNotifications(
        payload.notifications ??
          []
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : copy.loadFailed
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markRead(
    notificationId: string
  ) {
    const response =
      await fetch(
        "/api/dashboard-notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              notificationId,
            }),
        }
      );

    if (response.ok) {
      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notificationId
                ? {
                    ...item,
                    read_at:
                      new Date()
                        .toISOString(),
                  }
                : item
          )
      );
    }
  }

  async function markAllRead() {
    const response =
      await fetch(
        "/api/dashboard-notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              markAll: true,
            }),
        }
      );

    if (response.ok) {
      const now =
        new Date()
          .toISOString();

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              read_at:
                item.read_at ??
                now,
            })
          )
      );
    }
  }

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read_at
    ).length;

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div className="flex flex-col gap-[13px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {copy.eyebrow}
          </p>

          <h2 className="mt-[5px] text-xl font-semibold text-gray-900">
            {copy.title}
          </h2>

          <p className="mt-[5px] text-sm text-gray-500">
            {unreadCount}{" "}
            {unreadCount === 1
              ? copy.unreadSingular
              : copy.unreadPlural}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() =>
              void markAllRead()
            }
            className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 hover:border-[#036661] hover:text-[#036661]"
          >
            {copy.markAll}
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-[21px] text-sm text-gray-600">
          {copy.loading}
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      ) : notifications.length ===
        0 ? (
        <p className="mt-[21px] text-sm text-gray-600">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-[21px] space-y-[8px]">
          {notifications.map(
            (notification) => {
              const localized =
                notificationContent?.[
                  notification
                    .notification_type
                ];

              const displayTitle =
                localized?.title ??
                notification.title;

              const displayBody =
                localized?.body ??
                notification.body;

              const content = (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-[8px]">
                    {!notification
                      .read_at && (
                      <span className="h-[8px] w-[8px] rounded-full bg-[#036661]" />
                    )}

                    <p className="font-semibold text-gray-900">
                      {displayTitle}
                    </p>
                  </div>

                  <p className="mt-[5px] text-sm leading-6 text-gray-600">
                    {displayBody}
                  </p>

                  <p className="mt-[5px] text-xs text-gray-500">
                    {formatDateTime(
                      notification
                        .created_at,
                      locale
                    )}
                  </p>
                </div>
              );

              return (
                <article
                  key={
                    notification.id
                  }
                  className={`rounded-[13px] border p-[13px] ${
                    notification
                      .read_at
                      ? "border-gray-200 bg-gray-50"
                      : "border-[#036661]/30 bg-[#036661]/5"
                  }`}
                >
                  <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
                    {notification
                      .href ? (
                      <Link
                        href={withLocaleQuery(
                          notification.href,
                          locale
                        )}
                        onClick={() =>
                          void markRead(
                            notification.id
                          )
                        }
                        className="romdoc-focus-ring min-w-0 flex-1 rounded-[8px]"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}

                    {!notification
                      .read_at && (
                      <button
                        type="button"
                        onClick={() =>
                          void markRead(
                            notification.id
                          )
                        }
                        className="romdoc-focus-ring inline-flex min-h-[34px] shrink-0 items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-xs font-semibold text-gray-700"
                      >
                        {copy.markRead}
                      </button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
