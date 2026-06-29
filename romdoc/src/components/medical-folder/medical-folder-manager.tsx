"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type MedicalDocument = {
  id: string;
  document_type: string;
  title: string;
  description: string | null;
  content_format: "file" | "text";
  content_text: string | null;
  original_file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
  created_at: string;
  uploaded_by_doctor_id: string;
  can_delete: boolean;
};

type ApiResponse = {
  documents?: MedicalDocument[];
  document?: MedicalDocument;
  success?: boolean;
  signedUrl?: string;
  error?: string;
};

type MedicalFolderManagerProps = {
  appointmentId: string;
  appointmentStatus: string;
  apiEndpoint: string;
  downloadEndpoint: string;
  pdfEndpoint: string;
  standalone?: boolean;
};

const typeLabels: Record<string, string> = {
  consultation_note: "Notă de consultație",
  prescription: "Rețetă",
  laboratory_result: "Rezultat de laborator",
  imaging_result: "Rezultat imagistic",
  referral: "Trimitere",
  medical_certificate: "Adeverință medicală",
  discharge_summary: "Scrisoare medicală",
  other: "Alt document",
};

const readableStatuses = new Set([
  "confirmed",
  "rescheduled",
  "completed",
]);

const writableStatuses = new Set([
  "confirmed",
  "rescheduled",
]);

export default function MedicalFolderManager({
  appointmentId,
  appointmentStatus,
  apiEndpoint,
  downloadEndpoint,
  pdfEndpoint,
  standalone = false,
}: MedicalFolderManagerProps) {
  const [documents, setDocuments] =
    useState<MedicalDocument[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    downloadingDocumentId,
    setDownloadingDocumentId,
  ] = useState<string | null>(null);

  const [
    generatingPdfId,
    setGeneratingPdfId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [mode, setMode] =
    useState<"file" | "text">(
      "text"
    );

  const [
    documentType,
    setDocumentType,
  ] = useState("consultation_note");

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    contentText,
    setContentText,
  ] = useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const canView =
    readableStatuses.has(
      appointmentStatus
    );

  const canEdit =
    writableStatuses.has(
      appointmentStatus
    );

  const loadDocuments =
    useCallback(async () => {
      if (
        !standalone ||
        !canView
      ) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `${apiEndpoint}?appointmentId=${encodeURIComponent(
              appointmentId
            )}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Dosarul nu a putut fi încărcat."
          );
        }

        setDocuments(
          result.documents ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Dosarul nu a putut fi încărcat."
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      apiEndpoint,
      appointmentId,
      canView,
      standalone,
    ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setContentText("");
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canEdit) {
      setError(
        "Programarea este finalizată. Dosarul medical este disponibil numai pentru consultare."
      );
      return;
    }

    if (
      !title.trim() ||
      (
        mode === "text" &&
        !contentText.trim()
      ) ||
      (
        mode === "file" &&
        !file
      )
    ) {
      setError(
        "Completează câmpurile obligatorii."
      );
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const formData =
        new FormData();

      formData.set(
        "appointmentId",
        appointmentId
      );

      formData.set(
        "documentType",
        mode === "text"
          ? "consultation_note"
          : documentType
      );

      formData.set(
        "title",
        title.trim()
      );

      formData.set(
        "description",
        description.trim()
      );

      if (mode === "text") {
        formData.set(
          "contentText",
          contentText.trim()
        );
      } else if (file) {
        formData.set(
          "file",
          file
        );
      }

      const response =
        await fetch(
          apiEndpoint,
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi salvat."
        );
      }

      setMessage(
        mode === "text"
          ? "Nota medicală a fost salvată."
          : "Documentul a fost încărcat."
      );

      resetForm();

      await loadDocuments();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Documentul nu a putut fi salvat."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function generatePdf(
    documentId: string,
    documentTitle: string
  ) {
    setGeneratingPdfId(
      documentId
    );

    setError("");

    try {
      const response =
        await fetch(
          pdfEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
              appointmentId,
            }),
          }
        );

      if (!response.ok) {
        const result =
          (await response.json()) as
            ApiResponse;

        throw new Error(
          result.error ??
            "PDF-ul nu a putut fi generat."
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        `${documentTitle}.pdf`;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(
        pdfError instanceof Error
          ? pdfError.message
          : "PDF-ul nu a putut fi generat."
      );
    } finally {
      setGeneratingPdfId(
        null
      );
    }
  }

  async function downloadDocument(
    documentId: string
  ) {
    setDownloadingDocumentId(
      documentId
    );

    setError("");

    try {
      const response =
        await fetch(
          downloadEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
              appointmentId,
            }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (
        !response.ok ||
        !result.signedUrl
      ) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi descărcat."
        );
      }

      const anchor =
        document.createElement("a");

      anchor.href =
        result.signedUrl;
      anchor.target =
        "_blank";
      anchor.rel =
        "noopener noreferrer";

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Documentul nu a putut fi descărcat."
      );
    } finally {
      setDownloadingDocumentId(
        null
      );
    }
  }

  async function removeDocument(
    documentId: string
  ) {
    if (!canEdit) {
      setError(
        "Documentele unei programări finalizate nu mai pot fi șterse."
      );
      return;
    }

    if (
      !window.confirm(
        "Ștergi acest document din Dosarul medical?"
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          apiEndpoint,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
              appointmentId,
            }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi șters."
        );
      }

      setMessage(
        "Documentul a fost șters."
      );

      await loadDocuments();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Documentul nu a putut fi șters."
      );
    }
  }

  if (!canView) {
    return standalone ? (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Dosarul medical este disponibil numai pentru programările confirmate, reprogramate sau finalizate.
      </section>
    ) : null;
  }

  if (!standalone) {
    return (
      <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h4 className="text-lg font-bold text-gray-900">
              Dosar medical
            </h4>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              {canEdit
                ? "Adaugă note și documente înainte de finalizarea programării."
                : "Programarea este finalizată. Dosarul este disponibil numai pentru consultare."}
            </p>
          </div>

          <a
            href={`/medical-folder/${appointmentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="romdoc-button romdoc-button-primary w-fit"
          >
            Deschide Dosarul medical
            <span
              aria-hidden="true"
              className="ml-1"
            >
              ↗
            </span>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Dosar medical
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {canEdit
              ? "Adaugă note medicale și documente înainte de închiderea programării."
              : "Poți consulta și descărca documentele existente."}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            canEdit
              ? "bg-green-100 text-green-800"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {canEdit
            ? "Dosar deschis"
            : "Doar citire"}
        </span>
      </div>

      {!canEdit && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Programarea este finalizată. Nu mai pot fi adăugate, modificate sau șterse note și documente. Conținutul existent rămâne disponibil pentru consultare, descărcare și generare PDF.
        </div>
      )}

      {canEdit && (
        <form
          onSubmit={submit}
          className="mt-5 space-y-4"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setMode("text")
              }
              className={
                mode === "text"
                  ? "romdoc-button romdoc-button-primary romdoc-button-sm"
                  : "romdoc-button romdoc-button-secondary romdoc-button-sm"
              }
            >
              Notă medicală
            </button>

            <button
              type="button"
              onClick={() =>
                setMode("file")
              }
              className={
                mode === "file"
                  ? "romdoc-button romdoc-button-primary romdoc-button-sm"
                  : "romdoc-button romdoc-button-secondary romdoc-button-sm"
              }
            >
              Încarcă document
            </button>
          </div>

          {mode === "file" && (
            <select
              value={documentType}
              onChange={(event) =>
                setDocumentType(
                  event.target.value
                )
              }
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {Object.entries(
                typeLabels
              )
                .filter(
                  ([key]) =>
                    key !==
                    "consultation_note"
                )
                .map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
            </select>
          )}

          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            maxLength={250}
            placeholder="Titlul documentului"
            className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            maxLength={5000}
            rows={2}
            placeholder="Descriere opțională"
            className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
          />

          {mode === "text" ? (
            <textarea
              value={contentText}
              onChange={(event) =>
                setContentText(
                  event.target.value
                )
              }
              maxLength={20000}
              rows={6}
              placeholder="Conținutul notei medicale"
              className="romdoc-focus-ring w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
            />
          ) : (
            <div>
              <input
                ref={fileInputRef}
                id={`patient-document-${appointmentId}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  setFile(
                    event.target.files?.[0] ??
                      null
                  )
                }
                className="sr-only"
              />

              <label
                htmlFor={`patient-document-${appointmentId}`}
                className="romdoc-focus-ring block w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 transition-colors hover:border-[#036661] hover:bg-[#036661]/5"
              >
                <span className="font-semibold text-[#036661]">
                  Click here to upload
                </span>{" "}
                <span>
                  (accepted: .pdf, .jpg, .jpeg, .png, .webp):
                </span>{" "}
                <span className="font-medium text-gray-900">
                  {file
                    ? file.name
                    : "No files chosen."}
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="romdoc-button romdoc-button-primary"
          >
            {isSaving
              ? "Se salvează..."
              : mode === "text"
                ? "Salvează nota"
                : "Încarcă documentul"}
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-semibold text-gray-900">
          Documentele pacientului
        </h3>

        {isLoading ? (
          <p className="mt-3 text-sm text-gray-600">
            Se încarcă...
          </p>
        ) : documents.length ===
          0 ? (
          <p className="mt-3 text-sm text-gray-600">
            Nu există încă documente.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {documents.map(
              (
                medicalDocument
              ) => (
                <article
                  key={
                    medicalDocument.id
                  }
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                        {typeLabels[
                          medicalDocument.document_type
                        ] ??
                          "Document"}
                      </p>

                      <h4 className="mt-1 font-semibold text-gray-900">
                        {
                          medicalDocument.title
                        }
                      </h4>

                      {medicalDocument.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {
                            medicalDocument.description
                          }
                        </p>
                      )}
                    </div>

                    {canEdit &&
                      medicalDocument.can_delete && (
                        <button
                          type="button"
                          onClick={() =>
                            void removeDocument(
                              medicalDocument.id
                            )
                          }
                          className="text-sm font-semibold text-red-700 hover:underline"
                        >
                          Șterge
                        </button>
                      )}
                  </div>

                  {medicalDocument.content_format ===
                    "text" &&
                    medicalDocument.content_text && (
                      <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                        {
                          medicalDocument.content_text
                        }
                      </p>
                    )}

                  {medicalDocument.content_format ===
                    "text" && (
                    <button
                      type="button"
                      disabled={
                        generatingPdfId ===
                        medicalDocument.id
                      }
                      onClick={() =>
                        void generatePdf(
                          medicalDocument.id,
                          medicalDocument.title
                        )
                      }
                      className="romdoc-button romdoc-button-secondary romdoc-button-sm mt-3"
                    >
                      {generatingPdfId ===
                      medicalDocument.id
                        ? "Se generează..."
                        : "Descarcă PDF"}
                    </button>
                  )}

                  {medicalDocument.content_format ===
                    "file" && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        {
                          medicalDocument.original_file_name
                        }
                      </p>

                      <button
                        type="button"
                        disabled={
                          downloadingDocumentId ===
                          medicalDocument.id
                        }
                        onClick={() =>
                          void downloadDocument(
                            medicalDocument.id
                          )
                        }
                        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                      >
                        {downloadingDocumentId ===
                        medicalDocument.id
                          ? "Se pregătește..."
                          : "Descarcă"}
                      </button>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
