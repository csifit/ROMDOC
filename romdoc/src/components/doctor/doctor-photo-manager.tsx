"use client";

import { ChangeEvent, useRef, useState } from "react";
import Button from "@/components/ui/button";

type DoctorPhotoManagerProps = {
  initialPhotoUrl: string | null;
  doctorName: string;
};

type ApiResponse = {
  success?: boolean;
  photoUrl?: string | null;
  error?: string;
};

export default function DoctorPhotoManager({
  initialPhotoUrl,
  doctorName,
}: DoctorPhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setMessage("");
    setError("");

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)) {
      setError("Fotografia trebuie să fie JPG, PNG sau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Fotografia trebuie să aibă cel mult 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (!selectedFile) {
      setError("Selectează o fotografie.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/doctor/photo", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.photoUrl) {
        throw new Error(
          payload.error ?? "Fotografia nu a putut fi salvată."
        );
      }

      setPhotoUrl(payload.photoUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setMessage("Fotografia de profil a fost actualizată.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Fotografia nu a putut fi salvată."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePhoto() {
    if (!photoUrl || isSaving) {
      return;
    }

    if (!window.confirm("Elimini fotografia publică de profil?")) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/doctor/photo", {
        method: "DELETE",
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Fotografia nu a putut fi eliminată."
        );
      }

      setPhotoUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setMessage("Fotografia de profil a fost eliminată.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Fotografia nu a putut fi eliminată."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const displayedPhoto = previewUrl ?? photoUrl;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-[#F0EEE9]">
          {displayedPhoto ? (
            <img
              src={displayedPhoto}
              alt={`Fotografie de profil pentru ${doctorName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#036661]">
              {doctorName.trim().charAt(0).toUpperCase() || "M"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#036661]">
            Imagine publică
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Fotografia de profil
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Folosește o fotografie profesională, clară și recentă. Sunt
            acceptate fișiere JPG, PNG și WebP de cel mult 5 MB.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="romdoc-focus-ring mt-5 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#036661] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#ff2800]"
          />

          {message && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void uploadPhoto()}
              disabled={!selectedFile || isSaving}
            >
              {isSaving ? "Se salvează..." : "Publică fotografia"}
            </Button>

            {photoUrl && (
              <button
                type="button"
                onClick={() => void deletePhoto()}
                disabled={isSaving}
                className="romdoc-focus-ring rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Elimină fotografia
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
