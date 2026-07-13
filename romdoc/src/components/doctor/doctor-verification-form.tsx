"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired"
  | "withdrawn";

type VerificationSubmission = {
  id: string;
  status: SubmissionStatus;
  professional_registration_number:
    | string
    | null;
  issuing_authority: string | null;
  professional_title: string | null;
  registration_country: string;
  registration_expires_at:
    | string
    | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

type VerificationDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type VerificationResponse = {
  verificationStatus?: string;
  submission?: VerificationSubmission | null;
  documents?: VerificationDocument[];
  success?: boolean;
  message?: string;
  error?: string;
  partialSuccess?: boolean;
};

const documentTypeLabels: Record<
  string,
  string
> = {
  identity_document:
    "Document de identitate",
  professional_certificate:
    "Certificat profesional",
  membership_certificate:
    "Certificat de membru",
  practice_authorization:
    "AutorizaÈ›ie de liberÄƒ practicÄƒ",
  other: "Alt document",
};

const statusLabels: Record<
  SubmissionStatus,
  string
> = {
  draft: "CiornÄƒ",
  submitted: "TrimisÄƒ",
  under_review: "ÃŽn verificare",
  verified: "VerificatÄƒ",
  rejected: "RespinsÄƒ",
  expired: "ExpiratÄƒ",
  withdrawn: "RetrasÄƒ",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "â€”";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

export default function DoctorVerificationForm() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [isPending, startTransition] =
    useTransition();

  const [isLoading, setIsLoading] =
    useState(true);
  const [isUploading, setIsUploading] =
    useState(false);
  const [isDeletingId, setIsDeletingId] =
    useState<string | null>(null);

  const [verificationStatus, setVerificationStatus] =
    useState("not_submitted");
  const [submission, setSubmission] =
    useState<VerificationSubmission | null>(
      null
    );
  const [documents, setDocuments] =
    useState<VerificationDocument[]>([]);

  const [registrationNumber, setRegistrationNumber] =
    useState("");
  const [issuingAuthority, setIssuingAuthority] =
    useState("");
  const [professionalTitle, setProfessionalTitle] =
    useState("");
  const [registrationCountry, setRegistrationCountry] =
    useState("RO");
  const [registrationExpiresAt, setRegistrationExpiresAt] =
    useState("");
  const [documentType, setDocumentType] =
    useState("professional_certificate");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const isEditable =
    !submission || submission.status === "draft";

  function applyResponse(
    result: VerificationResponse
  ) {
    const nextSubmission =
      result.submission ?? null;

    setVerificationStatus(
      result.verificationStatus ??
        verificationStatus
    );
    setSubmission(nextSubmission);
    setDocuments(result.documents ?? []);

    if (nextSubmission) {
      setRegistrationNumber(
        nextSubmission.professional_registration_number ??
          ""
      );
      setIssuingAuthority(
        nextSubmission.issuing_authority ?? ""
      );
      setProfessionalTitle(
        nextSubmission.professional_title ?? ""
      );
      setRegistrationCountry(
        nextSubmission.registration_country ||
          "RO"
      );
      setRegistrationExpiresAt(
        nextSubmission.registration_expires_at ??
          ""
      );
    }
  }

  async function loadVerification() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/doctor/verification",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as VerificationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Verificarea nu a putut fi Ã®ncÄƒrcatÄƒ."
        );
      }

      applyResponse(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Verificarea nu a putut fi Ã®ncÄƒrcatÄƒ."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadVerification();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadVerification]);

  function saveSubmission(
    action: "save" | "submit"
  ) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/verification",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
              professionalRegistrationNumber:
                registrationNumber,
              issuingAuthority,
              professionalTitle,
              registrationCountry,
              registrationExpiresAt:
                registrationExpiresAt || null,
            }),
          }
        );

        const result =
          (await response.json()) as VerificationResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Cererea nu a putut fi salvatÄƒ."
          );
        }

        setMessage(
          result.message ??
            "Cererea a fost salvatÄƒ."
        );

        await loadVerification();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Cererea nu a putut fi salvatÄƒ."
        );
      }
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    saveSubmission("save");
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError(
        "SelecteazÄƒ un document pentru Ã®ncÄƒrcare."
      );
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append(
        "documentType",
        documentType
      );

      const response = await fetch(
        "/api/doctor/verification/documents",
        {
          method: "POST",
          body: formData,
        }
      );

      const result =
        (await response.json()) as VerificationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi Ã®ncÄƒrcat."
        );
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage(
        "Documentul a fost Ã®ncÄƒrcat."
      );
      await loadVerification();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Documentul nu a putut fi Ã®ncÄƒrcat."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(
    documentId: string
  ) {
    setIsDeletingId(documentId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/doctor/verification/documents",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            documentId,
          }),
        }
      );

      const result =
        (await response.json()) as VerificationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi È™ters."
        );
      }

      setMessage("Documentul a fost È™ters.");
      await loadVerification();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Documentul nu a putut fi È™ters."
      );
    } finally {
      setIsDeletingId(null);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setSelectedFile(
      event.target.files?.[0] ?? null
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Se Ã®ncarcÄƒ verificarea profesionalÄƒ...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Starea verificÄƒrii
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              {submission
                ? statusLabels[submission.status]
                : "NetrimisÄƒ"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Verificarea profesionalÄƒ este separatÄƒ de abonamentul RomDoc. Ea controleazÄƒ numai afiÈ™area insignei publice â€žMedic verificat de RomDocâ€.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-[#036661]/10 px-3 py-1 text-sm font-semibold text-[#036661]">
            {verificationStatus === "verified"
              ? "Medic verificat"
              : "FÄƒrÄƒ insignÄƒ publicÄƒ"}
          </span>
        </div>

        {submission?.submitted_at && (
          <p className="mt-4 text-sm text-gray-600">
            TrimisÄƒ la: {formatDate(submission.submitted_at)}
          </p>
        )}

        {submission?.rejection_reason && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Motivul respingerii:</strong>{" "}
            {submission.rejection_reason}
          </div>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            InformaÈ›ii profesionale
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            PoÈ›i salva o ciornÄƒ incompletÄƒ. NumÄƒrul de Ã®nregistrare È™i autoritatea emitentÄƒ devin obligatorii cÃ¢nd trimiÈ›i cererea.
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              NumÄƒr de Ã®nregistrare profesionalÄƒ
            </span>
            <input
              type="text"
              value={registrationNumber}
              onChange={(event) =>
                setRegistrationNumber(event.target.value)
              }
              disabled={!isEditable || isPending}
              maxLength={150}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Autoritate emitentÄƒ
            </span>
            <input
              type="text"
              value={issuingAuthority}
              onChange={(event) =>
                setIssuingAuthority(event.target.value)
              }
              disabled={!isEditable || isPending}
              maxLength={250}
              placeholder="Colegiul Medicilor din RomÃ¢nia"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Titlu profesional
            </span>
            <input
              type="text"
              value={professionalTitle}
              onChange={(event) =>
                setProfessionalTitle(event.target.value)
              }
              disabled={!isEditable || isPending}
              maxLength={250}
              placeholder="Medic specialist cardiologie"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Èšara Ã®nregistrÄƒrii
            </span>
            <input
              type="text"
              value={registrationCountry}
              onChange={(event) =>
                setRegistrationCountry(
                  event.target.value.toUpperCase()
                )
              }
              disabled={!isEditable || isPending}
              minLength={2}
              maxLength={2}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 uppercase text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              Data expirÄƒrii documentului profesional
            </span>
            <input
              type="date"
              value={registrationExpiresAt}
              onChange={(event) =>
                setRegistrationExpiresAt(event.target.value)
              }
              disabled={!isEditable || isPending}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100 disabled:opacity-70 sm:max-w-sm"
            />
          </label>
        </div>

        {isEditable && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl border border-[#036661] px-5 py-3 font-semibold text-[#036661] transition hover:bg-[#036661]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Se salveazÄƒ..."
                : "SalveazÄƒ ciorna"}
            </button>

            <button
              type="button"
              onClick={() => saveSubmission("submit")}
              disabled={isPending}
              className="rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Se trimite..."
                : "Trimite pentru verificare"}
            </button>
          </div>
        )}
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Documente justificative
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            FiÈ™ierele sunt private. Sunt acceptate PDF, JPEG, PNG È™i WebP, cu maximum 10 MB fiecare.
          </p>
        </div>

        {isEditable && (
          <div className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Tip document
              </span>
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value)
                }
                disabled={isUploading}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              >
                {Object.entries(documentTypeLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                FiÈ™ier
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={isUploading}
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#036661]/10 file:px-3 file:py-2 file:font-semibold file:text-[#036661]"
              />
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={
                isUploading || !selectedFile || !submission
              }
              className="rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading
                ? "Se Ã®ncarcÄƒ..."
                : "ÃŽncarcÄƒ"}
            </button>
          </div>
        )}

        {isEditable && !submission && (
          <p className="mt-3 text-sm text-amber-700">
            SalveazÄƒ mai Ã®ntÃ¢i ciorna pentru a putea Ã®ncÄƒrca documente.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nu ai Ã®ncÄƒrcat Ã®ncÄƒ documente.
            </div>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {document.original_file_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {documentTypeLabels[document.document_type] ?? "Document"}
                    {" Â· "}
                    {formatFileSize(document.file_size_bytes)}
                    {" Â· "}
                    {formatDate(document.created_at)}
                  </p>
                </div>

                {isEditable && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteDocument(document.id)
                    }
                    disabled={isDeletingId === document.id}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {isDeletingId === document.id
                      ? "Se È™terge..."
                      : "È˜terge"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
    </div>
  );
}

