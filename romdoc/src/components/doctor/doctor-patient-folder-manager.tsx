"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
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

type Props = {
  appointmentId: string;
  appointmentStatus: string;
};

const typeLabels: Record<string, string> = {
  consultation_note:
    "Notă de consultație",
  prescription: "Rețetă",
  laboratory_result:
    "Rezultat de laborator",
  imaging_result:
    "Rezultat imagistic",
  referral: "Trimitere",
  medical_certificate:
    "Adeverință medicală",
  discharge_summary:
    "Scrisoare medicală",
  other: "Alt document",
};

export default function DoctorPatientFolderManager({
  appointmentId,
  appointmentStatus,
}: Props) {
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
  const [documentType, setDocumentType] =
    useState("consultation_note");
  const [title, setTitle] =
    useState("");
  const [description, setDescription] =
    useState("");
  const [contentText, setContentText] =
    useState("");
  const [file, setFile] =
    useState<File | null>(null);

  const enabled = [
    "confirmed",
    "rescheduled",
    "completed",
  ].includes(appointmentStatus);

  const loadDocuments =
    useCallback(async () => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/doctor/patient-folder?appointmentId=${appointmentId}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as ApiResponse;

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
      appointmentId,
      enabled,
    ]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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
          "/api/doctor/patient-folder",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json() as
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

      setTitle("");
      setDescription("");
      setContentText("");
      setFile(null);

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
    title: string
  ) {
    setGeneratingPdfId(
      documentId
    );
    setError("");

    try {
      const response =
        await fetch(
          "/api/medical-folder/pdf",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              documentId,
            }),
          }
        );

      if (!response.ok) {
        const result =
          (await response.json()) as ApiResponse;

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
        `${title}.pdf`;

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
          "/api/doctor/patient-folder/download",
          {
            method: "POST",
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
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.signedUrl
      ) {
        throw new Error(
          result.error ??
            "Documentul nu a putut fi descărcat."
        );
      }

      window.location.assign(
        result.signedUrl
      );
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
    if (
      !window.confirm(
        "Ștergi acest document din Dosarul medical?"
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    const response =
      await fetch(
        "/api/doctor/patient-folder",
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
      await response.json() as
        ApiResponse;

    if (!response.ok) {
      setError(
        result.error ??
          "Documentul nu a putut fi șters."
      );
      return;
    }

    setMessage(
      "Documentul a fost șters."
    );

    await loadDocuments();
  }

  if (!enabled) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
      <h4 className="text-lg font-bold text-gray-900">
        Dosar medical
      </h4>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Adaugă o notă medicală sau un document pentru pacient.
        Pacientul îl va putea vedea în contul său.
      </p>

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
            {Object.entries(typeLabels)
              .filter(
                ([key]) =>
                  key !==
                  "consultation_note"
              )
              .map(
                ([value, label]) => (
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
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) =>
              setFile(
                event.target.files?.[0] ??
                  null
              )
            }
            className="block w-full text-sm text-gray-700"
          />
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
        <h5 className="font-semibold text-gray-900">
          Documentele pacientului
        </h5>

        {isLoading ? (
          <p className="mt-3 text-sm text-gray-600">
            Se încarcă...
          </p>
        ) : documents.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            Nu există încă documente.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {documents.map(
              (document) => (
                <article
                  key={document.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#036661]">
                        {typeLabels[
                          document.document_type
                        ] ??
                          "Document"}
                      </p>

                      <h6 className="mt-1 font-semibold text-gray-900">
                        {document.title}
                      </h6>

                      {document.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {document.description}
                        </p>
                      )}
                    </div>

                    {document.can_delete && (
                      <button
                        type="button"
                        onClick={() =>
                          void removeDocument(
                            document.id
                          )
                        }
                        className="text-sm font-semibold text-red-700 hover:underline"
                      >
                        Șterge
                      </button>
                    )}
                  </div>

                  {document.content_format ===
                    "text" &&
                    document.content_text && (
                      <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                        {
                          document.content_text
                        }
                      </p>
                    )}

                  {document.content_format ===
                    "text" && (
                    <button
                      type="button"
                      disabled={
                        generatingPdfId ===
                        document.id
                      }
                      onClick={() =>
                        void generatePdf(
                          document.id,
                          document.title
                        )
                      }
                      className="romdoc-button romdoc-button-secondary romdoc-button-sm mt-3"
                    >
                      {generatingPdfId ===
                      document.id
                        ? "Se generează..."
                        : "Descarcă PDF"}
                    </button>
                  )}

                  {document.content_format ===
                    "file" && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        {document.original_file_name}
                      </p>

                      <button
                        type="button"
                        disabled={
                          downloadingDocumentId ===
                          document.id
                        }
                        onClick={() =>
                          void downloadDocument(
                            document.id
                          )
                        }
                        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                      >
                        {downloadingDocumentId ===
                        document.id
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
