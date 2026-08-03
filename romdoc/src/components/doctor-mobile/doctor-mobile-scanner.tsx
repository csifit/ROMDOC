"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import EmergencyMedicalSummary from "@/components/medical-folder/emergency-medical-summary";
import {
  type DirectMedicalFolderShareError,
  type DirectMedicalFolderShareResponse,
  type SharedMedicalDocument,
} from "@/lib/medical-folder-share-grants";
import {
  parseMedicalFolderQrValue,
} from "@/lib/doctor-mobile/medical-folder-qr";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  calculateAge,
  type MedicalProfileEntry,
  type MedicalProfileValue,
  type OrganDonationPreference,
} from "@/lib/patient-medical-profile";

type ScannerInstance =
  import("html5-qrcode").Html5Qrcode;

type ScannerPayload =
  | DirectMedicalFolderShareResponse
  | DirectMedicalFolderShareError;

const READER_ID =
  "romdoc-doctor-mobile-qr-reader";

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function isApiError(
  payload: ScannerPayload
): payload is DirectMedicalFolderShareError {
  return (
    "error" in payload &&
    typeof payload.error ===
      "string"
  );
}

function formatDate(
  value: string,
  locale: AppLocale
) {
  const date =
    new Date(
      value.includes("T")
        ? value
        : `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      dateStyle: "medium",
      timeStyle:
        value.includes("T")
          ? "short"
          : undefined,
    }
  ).format(date);
}

function formatFileSize(
  value: number,
  locale: AppLocale
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];
  let amount = value;
  let index = 0;

  while (
    amount >= 1024 &&
    index < units.length - 1
  ) {
    amount /= 1024;
    index += 1;
  }

  return `${new Intl.NumberFormat(
    INTL_LOCALE[locale],
    {
      maximumFractionDigits:
        index === 0 ? 0 : 1,
    }
  ).format(amount)} ${units[index]}`;
}

function SharedProfile({
  entries,
  locale,
}: {
  entries: MedicalProfileEntry[];
  locale: AppLocale;
}) {
  const t =
    useTranslations(
      "PatientPages.folder.profile"
    );

  function valueText(
    entry: MedicalProfileEntry
  ) {
    const value:
      MedicalProfileValue =
        entry.value;

    switch (entry.fieldKey) {
      case "date_of_birth": {
        const date =
          value.date ?? "";

        if (!date) {
          return t(
            "notCompletedShort"
          );
        }

        const age =
          calculateAge(date);
        const formatted =
          formatDate(date, locale);

        return age === null
          ? formatted
          : t(
              "dateWithAge",
              {
                date: formatted,
                age,
              }
            );
      }

      case "sex":
        if (
          value.sex === "male"
        ) {
          return t("male");
        }

        if (
          value.sex === "female"
        ) {
          return t("female");
        }

        return t(
          "notCompletedShort"
        );

      case "blood_group": {
        const group =
          value.group ?? "";
        const rh =
          value.rh ?? "";

        if (
          !group ||
          group === "unknown"
        ) {
          return t(
            "unknownFeminine"
          );
        }

        if (
          !rh ||
          rh === "unknown"
        ) {
          return t(
            "rhUnknown",
            { group }
          );
        }

        return `${group}${
          rh === "positive"
            ? "+"
            : "-"
        }`;
      }

      case "emergency_contact":
        return [
          value.name,
          value.relationship,
          value.phone,
        ]
          .filter(Boolean)
          .join(" · ") ||
          t("notCompletedShort");

      case "family_doctor":
        return [
          value.name,
          value.clinic,
          value.phone,
        ]
          .filter(Boolean)
          .join(" · ") ||
          t("notCompletedShort");

      case "organ_donation_preference": {
        const preference =
          (
            value.preference ??
            "not_specified"
          ) as OrganDonationPreference;

        return t(
          `organDonation.values.${preference}`
        );
      }

      default:
        return (
          value.text?.trim() ||
          t("notCompletedShort")
        );
    }
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <h3 className="text-xl font-bold text-gray-900">
        {t("title")}
      </h3>

      <dl className="mt-[21px] grid gap-[13px] sm:grid-cols-2">
        {entries.map(
          (entry) => (
            <div
              key={entry.fieldKey}
              className="rounded-[13px] border border-gray-200 bg-gray-50 p-[17px]"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  `fields.${entry.fieldKey}`
                )}
              </dt>
              <dd className="mt-[8px] whitespace-pre-wrap text-sm leading-6 text-gray-900">
                {valueText(entry)}
              </dd>
            </div>
          )
        )}
      </dl>
    </section>
  );
}

function SharedContent({
  payload,
  locale,
  onReset,
}: {
  payload:
    DirectMedicalFolderShareResponse;
  locale: AppLocale;
  onReset: () => void;
}) {
  const t =
    useTranslations(
      "DoctorMobileScanner"
    );
  const publicT =
    useTranslations(
      "MedicalFolderSharePublic"
    );

  return (
    <div className="space-y-[21px]">
      <header className="rounded-[21px] border border-emerald-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#036661]">
              {t("result.authorized")}
            </p>
            <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
              {publicT(
                `scopes.${payload.shareScope}`
              )}
            </h2>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {t(
                "result.patient",
                {
                  name:
                    payload.patient
                      .legalName ||
                    publicT(
                      "patientFallback"
                    ),
                }
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="romdoc-button romdoc-button-secondary"
          >
            {t("scanAnother")}
          </button>
        </div>

        <div className="mt-[17px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-xs leading-5 text-blue-950">
          {t(
            "result.noAppointment"
          )}
        </div>

        <div className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-950">
          {t("result.readOnly")}
        </div>

        <p className="mt-[13px] text-xs text-gray-500">
          {payload.isPermanent ||
          !payload.expiresAt
            ? publicT(
                "permanentAccess"
              )
            : publicT(
                "expires",
                {
                  date: formatDate(
                    payload.expiresAt,
                    locale
                  ),
                }
              )}
        </p>
      </header>

      {payload.shareScope ===
        "emergency_summary" ? (
        <div className="overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
          <EmergencyMedicalSummary
            entries={payload.entries}
            patient={payload.patient}
            locale={locale}
          />
        </div>
      ) : payload.entries.length >
          0 ? (
        <SharedProfile
          entries={payload.entries}
          locale={locale}
        />
      ) : null}

      {payload.documents.length >
        0 && (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <h3 className="text-xl font-bold text-gray-900">
            {publicT(
              "documents.title"
            )}
          </h3>

          <div className="mt-[21px] grid gap-[13px]">
            {payload.documents.map(
              (document: SharedMedicalDocument) => (
                <article
                  key={document.id}
                  className="rounded-[13px] border border-gray-200 bg-gray-50 p-[17px]"
                >
                  <div className="flex flex-col justify-between gap-[8px] sm:flex-row sm:items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {document.title}
                      </h4>
                      <p className="mt-[5px] text-xs leading-5 text-gray-500">
                        {document.doctorName}
                        {" · "}
                        {formatDate(
                          document.createdAt,
                          locale
                        )}
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-gray-200 bg-white px-[10px] py-[5px] text-xs font-semibold text-gray-600">
                      {document.contentFormat ===
                        "text"
                        ? publicT(
                            "documents.text"
                          )
                        : publicT(
                            "documents.file"
                          )}
                    </span>
                  </div>

                  {document.description && (
                    <p className="mt-[13px] text-sm leading-6 text-gray-600">
                      {document.description}
                    </p>
                  )}

                  {document.contentFormat ===
                    "text" &&
                    document.contentText && (
                    <div className="mt-[13px] whitespace-pre-wrap rounded-[10px] border border-gray-200 bg-white p-[13px] text-sm leading-6 text-gray-900">
                      {document.contentText}
                    </div>
                  )}

                  {document.contentFormat ===
                    "file" && (
                    <div className="mt-[13px] flex flex-col justify-between gap-[8px] rounded-[10px] border border-gray-200 bg-white p-[13px] sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {document.originalFileName}
                        </p>
                        <p className="mt-[3px] text-xs text-gray-500">
                          {formatFileSize(
                            document.fileSizeBytes,
                            locale
                          )}
                        </p>
                      </div>

                      {document.downloadUrl ? (
                        <a
                          href={document.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="romdoc-button romdoc-button-primary romdoc-button-sm"
                        >
                          {publicT(
                            "documents.download"
                          )}
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500">
                          {publicT(
                            "documents.downloadDisabled"
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        </section>
      )}

      {payload.documents.length ===
        0 &&
        payload.shareScope ===
          "selected_documents" && (
        <section className="rounded-[21px] border border-gray-200 bg-white p-[34px] text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {publicT(
              "documents.empty"
            )}
          </p>
        </section>
      )}
    </div>
  );
}

export default function DoctorMobileScanner() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );
  const t =
    useTranslations(
      "DoctorMobileScanner"
    );

  const scannerRef =
    useRef<ScannerInstance | null>(
      null
    );
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    isStarting,
    setIsStarting,
  ] = useState(false);
  const [
    isCameraActive,
    setIsCameraActive,
  ] = useState(false);
  const [
    isOpening,
    setIsOpening,
  ] = useState(false);
  const [
    manualValue,
    setManualValue,
  ] = useState("");
  const [
    error,
    setError,
  ] = useState("");
  const [
    payload,
    setPayload,
  ] = useState<
    DirectMedicalFolderShareResponse |
    null
  >(null);

  const stopCamera =
    useCallback(
      async () => {
        const scanner =
          scannerRef.current;

        if (!scanner) {
          setIsCameraActive(false);
          return;
        }

        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // The browser may already have stopped the stream.
        }

        try {
          scanner.clear();
        } catch {
          // The reader element may already be empty.
        }

        scannerRef.current = null;
        setIsCameraActive(false);
      },
      []
    );

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const openScannedValue =
    useCallback(
      async (
        scannedValue: string
      ) => {
        const parsed =
          parseMedicalFolderQrValue(
            scannedValue
          );

        if (!parsed) {
          setError(
            t("errors.invalidCode")
          );
          return;
        }

        await stopCamera();
        setError("");
        setPayload(null);
        setIsOpening(true);

        try {
          const response =
            await fetch(
              "/api/doctor/mobile/medical-folder",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                  token: parsed.token,
                }),
              }
            );

          const result =
            await response.json() as
              ScannerPayload;

          if (
            !response.ok ||
            isApiError(result)
          ) {
            throw new Error(
              isApiError(result)
                ? result.message
                : t("errors.openFailed")
            );
          }

          setPayload(result);
          setManualValue("");
        } catch (openError) {
          setError(
            openError instanceof Error
              ? openError.message
              : t("errors.openFailed")
          );
        } finally {
          setIsOpening(false);
        }
      },
      [stopCamera, t]
    );

  async function startCamera() {
    if (
      isStarting ||
      isOpening
    ) {
      return;
    }

    setIsStarting(true);
    setError("");
    setPayload(null);

    try {
      await stopCamera();

      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } =
        await import(
          "html5-qrcode"
        );

      const scanner =
        new Html5Qrcode(
          READER_ID,
          {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
          }
        );

      scannerRef.current =
        scanner;

      await scanner.start(
        {
          facingMode:
            "environment",
        },
        {
          fps: 10,
          qrbox: (
            viewfinderWidth: number,
            viewfinderHeight: number
          ) => {
            const size =
              Math.floor(
                Math.min(
                  viewfinderWidth,
                  viewfinderHeight
                ) * 0.72
              );

            return {
              width: size,
              height: size,
            };
          },
          aspectRatio: 1,
        },
        (decodedText) => {
          void openScannedValue(
            decodedText
          );
        },
        () => {
          // Normal scan misses are intentionally ignored.
        }
      );

      setIsCameraActive(true);
    } catch (cameraError) {
      scannerRef.current = null;
      setIsCameraActive(false);
      setError(
        cameraError instanceof Error
          ? t(
              "errors.cameraWithReason",
              {
                reason:
                  cameraError.message,
              }
            )
          : t("errors.camera")
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function scanImageFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setPayload(null);
    setIsOpening(true);

    try {
      await stopCamera();

      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } =
        await import(
          "html5-qrcode"
        );

      const scanner =
        new Html5Qrcode(
          READER_ID,
          {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
            verbose: false,
          }
        );

      scannerRef.current =
        scanner;

      const decodedText =
        await scanner.scanFile(
          file,
          true
        );

      scanner.clear();
      scannerRef.current = null;
      setIsOpening(false);
      await openScannedValue(
        decodedText
      );
    } catch (fileError) {
      scannerRef.current = null;
      setIsOpening(false);
      setError(
        fileError instanceof Error
          ? t(
              "errors.fileWithReason",
              {
                reason:
                  fileError.message,
              }
            )
          : t("errors.file")
      );
    }
  }

  function reset() {
    setPayload(null);
    setError("");
    setManualValue("");
  }

  if (payload) {
    return (
      <SharedContent
        payload={payload}
        locale={locale}
        onReset={reset}
      />
    );
  }

  return (
    <section className="rounded-[21px] border border-blue-200 bg-white p-[21px] shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">
        {t("title")}
      </h2>
      <p className="mt-[8px] text-sm leading-6 text-gray-600">
        {t("description")}
      </p>

      <div className="mt-[17px] rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px] text-xs leading-5 text-emerald-950">
        {t("noAppointmentNotice")}
      </div>

      <div
        id={READER_ID}
        className={`mt-[17px] overflow-hidden rounded-[13px] border border-gray-200 bg-black ${
          isCameraActive ||
          isStarting
            ? "min-h-[280px]"
            : "min-h-0 border-0"
        }`}
      />

      <div className="mt-[17px] flex flex-wrap gap-[8px]">
        <button
          type="button"
          onClick={() =>
            void startCamera()
          }
          disabled={
            isStarting ||
            isOpening ||
            isCameraActive
          }
          className="romdoc-button romdoc-button-primary"
        >
          {isStarting
            ? t("startingCamera")
            : t("startCamera")}
        </button>

        {isCameraActive && (
          <button
            type="button"
            onClick={() =>
              void stopCamera()
            }
            className="romdoc-button romdoc-button-secondary"
          >
            {t("stopCamera")}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            fileInputRef.current
              ?.click()
          }
          disabled={isOpening}
          className="romdoc-button romdoc-button-secondary"
        >
          {t("chooseImage")}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={
            (event: ChangeEvent<HTMLInputElement>) =>
              void scanImageFile(
                event
              )
          }
          className="sr-only"
        />
      </div>

      <div className="mt-[21px] border-t border-gray-200 pt-[17px]">
        <label
          htmlFor="doctor-mobile-share-link"
          className="text-sm font-semibold text-gray-900"
        >
          {t("manualLabel")}
        </label>
        <p className="mt-[5px] text-xs leading-5 text-gray-500">
          {t("manualHelp")}
        </p>
        <textarea
          id="doctor-mobile-share-link"
          value={manualValue}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setManualValue(
              event.target.value
            )
          }
          rows={3}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            t("manualPlaceholder")
          }
          className="romdoc-input mt-[8px] w-full font-mono text-xs"
        />
        <button
          type="button"
          onClick={() =>
            void openScannedValue(
              manualValue
            )
          }
          disabled={
            isOpening ||
            !manualValue.trim()
          }
          className="romdoc-button romdoc-button-primary mt-[13px]"
        >
          {isOpening
            ? t("opening")
            : t("openShare")}
        </button>
      </div>

      {isOpening && (
        <div className="mt-[17px] flex items-center gap-[13px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px] text-sm font-semibold text-blue-900">
          <div className="h-[21px] w-[21px] animate-spin rounded-full border-2 border-blue-300 border-t-blue-800" />
          {t("opening")}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-[17px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm leading-6 text-red-800"
        >
          {error}
        </div>
      )}

      <p className="mt-[17px] text-xs leading-5 text-gray-500">
        {t("privacy")}
      </p>
    </section>
  );
}
