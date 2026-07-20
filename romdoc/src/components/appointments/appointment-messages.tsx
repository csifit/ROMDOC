"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type AppointmentMessageAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  signedUrl: string | null;
  createdAt: string;
};

type AppointmentMessage = {
  id: string;
  appointmentId: string;
  senderProfileId: string;
  senderName: string;
  senderRole: string | null;
  senderRoleLabel: string;
  body: string | null;
  createdAt: string;
  attachments:
    AppointmentMessageAttachment[];
};

type MessagesApiResponse = {
  viewerProfileId?: string;
  appointmentStatus?: string;
  canSend?: boolean;
  messages?: AppointmentMessage[];
  error?: string;
};

type AppointmentMessagesProps = {
  appointmentId: string;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024 * 1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes / 1024
      )
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function getRoleKey(
  role: string | null
) {
  switch (role) {
    case "patient":
    case "doctor":
    case "staff":
    case "admin":
    case "manager":
    case "clinic_manager":
    case "system":
      return role;
    default:
      return null;
  }
}

export default function AppointmentMessages({
  appointmentId,
}: AppointmentMessagesProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.messages.thread"
    );

  const [
    messages,
    setMessages,
  ] = useState<
    AppointmentMessage[]
  >([]);

  const [
    viewerProfileId,
    setViewerProfileId,
  ] = useState("");

  const [
    canSend,
    setCanSend,
  ] = useState(true);

  const [body, setBody] =
    useState("");

  const [files, setFiles] =
    useState<File[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const conversationEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const endpoint =
    useMemo(
      () =>
        `/api/appointments/${appointmentId}/messages`,
      [appointmentId]
    );

  function validateFiles(
    selectedFiles: File[]
  ) {
    if (
      selectedFiles.length >
      MAX_FILES
    ) {
      return t(
        "maxFiles",
        {
          count:
            MAX_FILES,
        }
      );
    }

    for (
      const file of
        selectedFiles
    ) {
      if (
        !ALLOWED_FILE_TYPES.has(
          file.type
        )
      ) {
        return t(
          "allowedTypes"
        );
      }

      if (
        file.size >
        MAX_FILE_SIZE_BYTES
      ) {
        return t(
          "maxFileSize"
        );
      }
    }

    return null;
  }

  async function loadMessages({
    showLoader = true,
  }: {
    showLoader?: boolean;
  } = {}) {
    if (showLoader) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const response =
        await fetch(
          endpoint,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const result =
        (await response.json()) as
          MessagesApiResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          result.error
            ? result.error
            : t(
                "loadError"
              )
        );
      }

      setMessages(
        result.messages ??
          []
      );

      setViewerProfileId(
        result.viewerProfileId ??
          ""
      );

      setCanSend(
        result.canSend ??
          false
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(
              "loadError"
            )
      );
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    conversationEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [messages.length]);

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ??
          []
      );

    const validationError =
      validateFiles(
        selectedFiles
      );

    if (validationError) {
      setErrorMessage(
        validationError
      );
      setFiles([]);
      event.target.value =
        "";
      return;
    }

    setErrorMessage("");
    setFiles(
      selectedFiles
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canSend) {
      setErrorMessage(
        t(
          "unavailable"
        )
      );
      return;
    }

    const trimmedBody =
      body.trim();

    if (
      trimmedBody.length ===
        0 &&
      files.length === 0
    ) {
      setErrorMessage(
        t(
          "messageOrFileRequired"
        )
      );
      return;
    }

    const validationError =
      validateFiles(files);

    if (validationError) {
      setErrorMessage(
        validationError
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "body",
        trimmedBody
      );

      files.forEach(
        (file) => {
          formData.append(
            "attachments",
            file
          );
        }
      );

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        (await response.json()) as
          MessagesApiResponse;

      if (!response.ok) {
        throw new Error(
          locale === "ro" &&
          result.error
            ? result.error
            : t(
                "sendError"
              )
        );
      }

      setMessages(
        result.messages ??
          []
      );

      setViewerProfileId(
        result.viewerProfileId ??
          viewerProfileId
      );

      setCanSend(
        result.canSend ??
          canSend
      );

      setBody("");
      setFiles([]);
      setSuccessMessage(
        t(
          "sent"
        )
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(
              "sendError"
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <div className="flex flex-col gap-[13px] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "eyebrow"
            )}
          </p>

          <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
            {t(
              "title"
            )}
          </h2>

          <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
            {t(
              "description"
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadMessages({
              showLoader:
                false,
            })
          }
          disabled={
            isSubmitting
          }
          className="romdoc-focus-ring inline-flex min-h-[34px] w-fit items-center rounded-[13px] border border-gray-300 bg-white px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661] disabled:opacity-60"
        >
          {t(
            "reload"
          )}
        </button>
      </div>

      <div className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 px-[13px] py-[8px] text-xs leading-5 text-amber-900">
        {t(
          "emergency"
        )}
      </div>

      <div
        aria-live="polite"
        className="mt-[21px] max-h-[610px] overflow-y-auto rounded-[13px] bg-gray-50 p-[13px]"
      >
        {isLoading ? (
          <p className="text-sm text-gray-600">
            {t(
              "loading"
            )}
          </p>
        ) : messages.length ===
          0 ? (
          <p className="text-sm text-gray-600">
            {t(
              "empty"
            )}
          </p>
        ) : (
          <div className="space-y-[13px]">
            {messages.map(
              (message) => {
                const isOwn =
                  message.senderProfileId ===
                  viewerProfileId;

                const roleKey =
                  getRoleKey(
                    message.senderRole
                  );

                const roleLabel =
                  roleKey
                    ? t(
                        `roles.${roleKey}`
                      )
                    : message.senderRoleLabel;

                return (
                  <article
                    key={
                      message.id
                    }
                    className={`max-w-[89%] rounded-[21px] border p-[13px] shadow-sm ${
                      isOwn
                        ? "ml-auto border-[#036661]/20 bg-[#036661]/5"
                        : "mr-auto border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[8px]">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {isOwn
                            ? t(
                                "you"
                              )
                            : message.senderName}
                        </p>

                        <p className="mt-[3px] text-xs text-gray-500">
                          {roleLabel}{" "}
                          ·{" "}
                          {formatDateTime(
                            message.createdAt,
                            locale
                          )}
                        </p>
                      </div>
                    </div>

                    {message.body && (
                      <p className="mt-[8px] whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {
                          message.body
                        }
                      </p>
                    )}

                    {message.attachments.length >
                      0 && (
                      <div className="mt-[13px] space-y-[8px]">
                        {message.attachments.map(
                          (attachment) => (
                            <div
                              key={
                                attachment.id
                              }
                              className="flex flex-wrap items-center justify-between gap-[8px] rounded-[13px] border border-gray-200 bg-white px-[13px] py-[8px] text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {
                                    attachment.fileName
                                  }
                                </p>

                                <p className="mt-[3px] text-xs text-gray-500">
                                  {formatFileSize(
                                    attachment.fileSizeBytes
                                  )}
                                </p>
                              </div>

                              {attachment.signedUrl ? (
                                <a
                                  href={
                                    attachment.signedUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="romdoc-focus-ring inline-flex min-h-[34px] items-center rounded-[13px] border border-gray-300 px-[13px] py-[5px] text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
                                >
                                  {t(
                                    "open"
                                  )}
                                </a>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {t(
                                    "linkUnavailable"
                                  )}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}

            <div
              ref={
                conversationEndRef
              }
            />
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      {canSend ? (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-[21px] border-t border-gray-200 pt-[21px]"
        >
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "message"
              )}
            </span>

            <textarea
              rows={5}
              maxLength={4000}
              value={body}
              onChange={(event) => {
                setBody(
                  event.target.value
                );
                setSuccessMessage("");
              }}
              placeholder={t(
                "placeholder"
              )}
              className="romdoc-focus-ring mt-[8px] w-full resize-y rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-gray-900"
            />
          </label>

          <label className="mt-[13px] block">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "optionalAttachments"
              )}
            </span>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={
                handleFileChange
              }
              className="romdoc-focus-ring mt-[8px] block w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-700"
            />
          </label>

          <p className="mt-[8px] text-xs leading-5 text-gray-500">
            {t(
              "attachmentHelp"
            )}
          </p>

          {files.length > 0 && (
            <ul className="mt-[8px] space-y-[5px] text-sm text-gray-600">
              {files.map(
                (file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                  >
                    {file.name}{" "}
                    ·{" "}
                    {formatFileSize(
                      file.size
                    )}
                  </li>
                )
              )}
            </ul>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="romdoc-focus-ring mt-[21px] inline-flex min-h-[55px] items-center justify-center rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t(
                  "sending"
                )
              : t(
                  "send"
                )}
          </button>
        </form>
      ) : (
        <div className="mt-[21px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] text-sm text-gray-600">
          {t(
            "readOnly"
          )}
        </div>
      )}
    </section>
  );
}
