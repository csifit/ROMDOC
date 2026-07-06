"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  attachments: AppointmentMessageAttachment[];
};

type MessagesApiResponse = {
  messages?: AppointmentMessage[];
  error?: string;
};

type AppointmentMessagesProps = {
  appointmentId: string;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateFiles(files: File[]) {
  if (files.length > MAX_FILES) {
    return `Poți atașa maximum ${MAX_FILES} fișiere la un mesaj.`;
  }

  for (const file of files) {
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return "Poți atașa doar PDF, JPG, PNG sau WEBP.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "Fiecare fișier poate avea maximum 10 MB.";
    }
  }

  return null;
}

export default function AppointmentMessages({
  appointmentId,
}: AppointmentMessagesProps) {
  const [messages, setMessages] =
    useState<AppointmentMessage[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] =
    useState<File[]>([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const endpoint = useMemo(
    () =>
      `/api/appointments/${appointmentId}/messages`,
    [appointmentId]
  );

  async function loadMessages() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });

      const result =
        (await response.json()) as MessagesApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Mesajele nu au putut fi încărcate."
        );
      }

      setMessages(result.messages ?? []);
    } catch (error) {
      setMessages([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Mesajele nu au putut fi încărcate."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    const validationError =
      validateFiles(selectedFiles);

    if (validationError) {
      setErrorMessage(validationError);
      setFiles([]);
      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setFiles(selectedFiles);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (
      trimmedBody.length === 0 &&
      files.length === 0
    ) {
      setErrorMessage(
        "Scrie un mesaj sau atașează cel puțin un fișier."
      );
      return;
    }

    const validationError = validateFiles(files);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("body", trimmedBody);

      files.forEach((file) => {
        formData.append(
          "attachments",
          file
        );
      });

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result =
        (await response.json()) as MessagesApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Mesajul nu a putut fi trimis."
        );
      }

      setMessages(result.messages ?? []);
      setBody("");
      setFiles([]);
      setSuccessMessage(
        "Mesajul a fost trimis."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Mesajul nu a putut fi trimis."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold text-[#036661]">
          Mesaje programare
        </p>

        <h2 className="mt-1 text-2xl font-bold text-gray-900">
          Discuție legată de această programare
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Folosește acest spațiu doar pentru informații legate de programarea selectată. Nu este un chat medical deschis.
        </p>
      </div>

      <div
        aria-live="polite"
        className="mt-5"
      >
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Se încarcă mesajele...
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() =>
                void loadMessages()
              }
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
            >
              Reîncarcă mesajele
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            Nu există încă mesaje pentru această programare.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {message.senderName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {message.senderRoleLabel} · {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                </div>

                {message.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {message.body}
                  </p>
                )}

                {message.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {message.attachments.map(
                      (attachment) => (
                        <div
                          key={attachment.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {attachment.fileName}
                            </p>

                            <p className="text-xs text-gray-500">
                              {formatFileSize(
                                attachment.fileSizeBytes
                              )}
                            </p>
                          </div>

                          {attachment.signedUrl ? (
                            <a
                              href={attachment.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661]"
                            >
                              Deschide
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Link indisponibil
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 border-t border-gray-200 pt-5"
      >
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Mesaj
          </span>

          <textarea
            rows={4}
            maxLength={4000}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setSuccessMessage("");
            }}
            placeholder="Scrie un mesaj legat de această programare..."
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-gray-700">
            Atașamente opționale
          </span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
          />
        </label>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Poți atașa maximum 5 fișiere: PDF, JPG, PNG sau WEBP. Fiecare fișier poate avea maximum 10 MB.
        </p>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name} · {formatFileSize(file.size)}
              </li>
            ))}
          </ul>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {successMessage}
          </div>
        )}

        {!isLoading && errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024f4b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Se trimite..."
              : "Trimite mesaj"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void loadMessages()
            }
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#036661] hover:text-[#036661] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reîncarcă
          </button>
        </div>
      </form>
    </section>
  );
}
