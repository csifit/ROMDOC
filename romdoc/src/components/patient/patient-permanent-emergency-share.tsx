"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import QRCode from "qrcode";

import {
  type PermanentEmergencyShareAction,
  type PermanentEmergencyShareApiError,
  type PermanentEmergencyShareCredential,
  type PermanentEmergencyShareResponse,
} from "@/lib/medical-folder-share-grants";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

const ACTION_ERROR_KEYS:
  Record<string, string> = {
    authentication_required:
      "errors.authentication",
    active_patient_account_required:
      "errors.account",
    permanent_emergency_share_not_found:
      "errors.notFound",
    configuration_missing:
      "errors.configuration",
    permanent_emergency_share_load_failed:
      "errors.load",
    permanent_emergency_share_action_failed:
      "errors.action",
    invalid_action:
      "errors.action",
    invalid_request:
      "errors.action",
  };

const EMAIL_ERROR_KEYS:
  Record<string, string> = {
    invalid_email:
      "email.errors.invalid",
    invalid_share_token:
      "email.errors.token",
    share_grant_not_found:
      "email.errors.notFound",
    share_grant_revoked:
      "email.errors.revoked",
    share_disabled:
      "email.errors.disabled",
    email_configuration_missing:
      "email.errors.configuration",
    email_send_failed:
      "email.errors.send",
    authentication_required:
      "errors.authentication",
    active_patient_account_required:
      "errors.account",
  };

function formatDateTime(
  value: string,
  locale: AppLocale
) {
  const date =
    new Date(value);

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
      timeStyle: "short",
    }
  ).format(date);
}

async function copyText(
  value: string
) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard
      .writeText(value);
    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value =
    value;
  textarea.readOnly =
    true;
  textarea.style.position =
    "fixed";
  textarea.style.opacity =
    "0";

  document.body
    .appendChild(
      textarea
    );
  textarea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  textarea.remove();

  if (!copied) {
    throw new Error(
      "copy_failed"
    );
  }
}

function loadImage(
  source: string
) {
  return new Promise<
    HTMLImageElement
  >((resolve, reject) => {
    const image =
      new Image();

    image.onload = () =>
      resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "image_load_failed"
        )
      );
    image.src =
      source;
  });
}

function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string
) {
  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    canvas.toDataURL(
      "image/png"
    );
  anchor.download =
    filename;
  anchor.click();
}

function drawCenteredLines(
  context:
    CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maximumWidth: number,
  lineHeight: number
) {
  const words =
    text.split(/\s+/);
  const lines:
    string[] = [];
  let current = "";

  for (const word of words) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      current &&
      context.measureText(
        candidate
      ).width > maximumWidth
    ) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  lines.forEach(
    (line, index) => {
      context.fillText(
        line,
        centerX,
        startY +
          index *
            lineHeight
      );
    }
  );

  return lines.length;
}

function isEmail(
  value: string
) {
  return (
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    )
  );
}

export default function PatientPermanentEmergencyShare() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.folder.sharing.permanentEmergency"
    );

  const [
    credential,
    setCredential,
  ] = useState<
    PermanentEmergencyShareCredential |
    null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    activeAction,
    setActiveAction,
  ] = useState<
    PermanentEmergencyShareAction |
    null
  >(null);

  const [
    qrDataUrl,
    setQrDataUrl,
  ] = useState("");

  const [
    recipientEmail,
    setRecipientEmail,
  ] = useState("");

  const [
    isSendingEmail,
    setIsSendingEmail,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const translateError =
    useCallback(
      (
        payload:
          PermanentEmergencyShareApiError,
        fallbackKey: string
      ) => {
        const key =
          ACTION_ERROR_KEYS[
            payload.error
          ];

        return t(
          key ??
            fallbackKey
        );
      },
      [t]
    );

  const loadCredential =
    useCallback(
      async () => {
        setIsLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/patient/folder/permanent-emergency-share",
              {
                method: "GET",
                cache: "no-store",
              }
            );

          const payload =
            await response
              .json() as
              | PermanentEmergencyShareResponse
              | PermanentEmergencyShareApiError;

          if (
            !response.ok ||
            "error" in payload
          ) {
            throw new Error(
              "error" in payload
                ? translateError(
                    payload,
                    "errors.load"
                  )
                : t(
                    "errors.load"
                  )
            );
          }

          setCredential(
            payload.credential
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t(
                  "errors.load"
                )
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        t,
        translateError,
      ]
    );

  useEffect(() => {
    void loadCredential();
  }, [loadCredential]);

  useEffect(() => {
    let cancelled =
      false;

    async function generateQr() {
      if (!credential) {
        setQrDataUrl("");
        return;
      }

      try {
        const result =
          await QRCode
            .toDataURL(
              credential.qrUrl,
              {
                width: 560,
                margin: 3,
                errorCorrectionLevel:
                  "M",
              }
            );

        if (!cancelled) {
          setQrDataUrl(
            result
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            t(
              "errors.qr"
            )
          );
        }
      }
    }

    void generateQr();

    return () => {
      cancelled = true;
    };
  }, [
    credential,
    t,
  ]);

  async function performAction(
    action:
      PermanentEmergencyShareAction
  ) {
    if (
      action === "replace" &&
      !window.confirm(
        t(
          "confirmReplace"
        )
      )
    ) {
      return;
    }

    if (
      action === "deactivate" &&
      !window.confirm(
        t(
          "confirmDeactivate"
        )
      )
    ) {
      return;
    }

    setActiveAction(action);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/permanent-emergency-share",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
              }),
          }
        );

      const payload =
        await response
          .json() as
          | PermanentEmergencyShareResponse
          | PermanentEmergencyShareApiError;

      if (
        !response.ok ||
        "error" in payload ||
        !payload.credential
      ) {
        throw new Error(
          "error" in payload
            ? translateError(
                payload,
                "errors.action"
              )
            : t(
                "errors.action"
              )
        );
      }

      setCredential(
        payload.credential
      );

      setSuccess(
        t(
          `messages.${action}`
        )
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : t(
              "errors.action"
            )
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function copyLink() {
    if (!credential) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await copyText(
        credential.shareUrl
      );
      setSuccess(
        t(
          "messages.copied"
        )
      );
    } catch {
      setError(
        t(
          "errors.copy"
        )
      );
    }
  }

  function downloadQr() {
    if (
      !credential ||
      !qrDataUrl
    ) {
      return;
    }

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      qrDataUrl;
    anchor.download =
      `romdoc-${credential.tokenHint}-emergency-qr.png`;
    anchor.click();
  }

  async function downloadLockScreen() {
    if (!qrDataUrl) {
      return;
    }

    setError("");

    try {
      const qrImage =
        await loadImage(
          qrDataUrl
        );

      const canvas =
        document.createElement(
          "canvas"
        );
      canvas.width = 1080;
      canvas.height = 1920;

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        throw new Error(
          "canvas_unavailable"
        );
      }

      context.fillStyle =
        "#F0EEE9";
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.fillStyle =
        "#036661";
      context.fillRect(
        0,
        0,
        canvas.width,
        410
      );

      context.textAlign =
        "center";
      context.fillStyle =
        "#FFFFFF";
      context.font =
        "700 72px Arial";
      drawCenteredLines(
        context,
        t(
          "lockScreen.title"
        ),
        540,
        145,
        900,
        88
      );

      context.font =
        "400 38px Arial";
      context.fillText(
        t(
          "lockScreen.subtitle"
        ),
        540,
        335
      );

      context.fillStyle =
        "#FFFFFF";
      context.fillRect(
        130,
        515,
        820,
        980
      );

      context.drawImage(
        qrImage,
        220,
        610,
        640,
        640
      );

      context.fillStyle =
        "#111827";
      context.font =
        "700 44px Arial";
      drawCenteredLines(
        context,
        t(
          "lockScreen.scan"
        ),
        540,
        1335,
        700,
        56
      );

      context.fillStyle =
        "#036661";
      context.font =
        "700 54px Arial";
      context.fillText(
        "RomDoc",
        540,
        1640
      );

      context.fillStyle =
        "#4B5563";
      context.font =
        "400 28px Arial";
      drawCenteredLines(
        context,
        t(
          "lockScreen.footer"
        ),
        540,
        1715,
        850,
        40
      );

      downloadCanvas(
        canvas,
        "romdoc-emergency-lock-screen.png"
      );
    } catch {
      setError(
        t(
          "errors.image"
        )
      );
    }
  }

  async function downloadPrintCard() {
    if (!qrDataUrl) {
      return;
    }

    setError("");

    try {
      const qrImage =
        await loadImage(
          qrDataUrl
        );

      const canvas =
        document.createElement(
          "canvas"
        );
      canvas.width = 1600;
      canvas.height = 1000;

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        throw new Error(
          "canvas_unavailable"
        );
      }

      context.fillStyle =
        "#FFFFFF";
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.fillStyle =
        "#036661";
      context.fillRect(
        0,
        0,
        585,
        canvas.height
      );

      context.drawImage(
        qrImage,
        85,
        245,
        415,
        415
      );

      context.textAlign =
        "center";
      context.fillStyle =
        "#FFFFFF";
      context.font =
        "700 58px Arial";
      context.fillText(
        "RomDoc",
        292,
        125
      );

      context.font =
        "700 31px Arial";
      drawCenteredLines(
        context,
        t(
          "printCard.scan"
        ),
        292,
        745,
        450,
        42
      );

      context.textAlign =
        "left";
      context.fillStyle =
        "#111827";
      context.font =
        "700 58px Arial";
      context.fillText(
        t(
          "printCard.title"
        ),
        675,
        180
      );

      context.fillStyle =
        "#036661";
      context.font =
        "700 34px Arial";
      context.fillText(
        t(
          "printCard.permanent"
        ),
        675,
        265
      );

      context.fillStyle =
        "#374151";
      context.font =
        "400 31px Arial";
      context.textAlign =
        "center";
      drawCenteredLines(
        context,
        t(
          "printCard.description"
        ),
        1080,
        390,
        720,
        48
      );

      context.fillStyle =
        "#FEF3C7";
      context.fillRect(
        675,
        620,
        800,
        190
      );

      context.fillStyle =
        "#78350F";
      context.font =
        "700 28px Arial";
      drawCenteredLines(
        context,
        t(
          "printCard.notice"
        ),
        1075,
        690,
        700,
        40
      );

      downloadCanvas(
        canvas,
        "romdoc-emergency-print-card.png"
      );
    } catch {
      setError(
        t(
          "errors.image"
        )
      );
    }
  }

  async function sendEmail() {
    if (!credential) {
      return;
    }

    const normalizedEmail =
      recipientEmail
        .trim()
        .toLowerCase();

    if (!isEmail(normalizedEmail)) {
      setError(
        t(
          "email.errors.invalid"
        )
      );
      return;
    }

    setIsSendingEmail(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/patient/folder/share-email",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                shareGrantId:
                  credential.grantId,
                shareToken:
                  credential.shareToken,
                recipientEmail:
                  normalizedEmail,
                locale,
              }),
          }
        );

      const payload =
        await response
          .json() as
          | {
              success: true;
            }
          | PermanentEmergencyShareApiError;

      if (
        !response.ok ||
        "error" in payload
      ) {
        const key =
          "error" in payload
            ? EMAIL_ERROR_KEYS[
                payload.error
              ]
            : null;

        throw new Error(
          t(
            key ??
              "email.errors.send"
          )
        );
      }

      setRecipientEmail("");
      setSuccess(
        t(
          "messages.emailSent"
        )
      );
    } catch (emailError) {
      setError(
        emailError instanceof Error
          ? emailError.message
          : t(
              "email.errors.send"
            )
      );
    } finally {
      setIsSendingEmail(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[21px] border border-emerald-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          {t(
            "eyebrow"
          )}
        </p>
        <p className="mt-[13px] text-sm text-gray-600">
          {t(
            "loading"
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[21px] border border-emerald-200 bg-white shadow-sm">
      <div className="border-b border-emerald-200 bg-emerald-50 p-[21px] sm:p-[34px]">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-start">
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

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-700">
              {t(
                "description"
              )}
            </p>
          </div>

          {credential && (
            <span
              className={
                credential.status ===
                  "active"
                  ? "inline-flex w-fit rounded-full border border-emerald-300 bg-white px-[13px] py-[8px] text-sm font-bold text-emerald-800"
                  : "inline-flex w-fit rounded-full border border-amber-300 bg-white px-[13px] py-[8px] text-sm font-bold text-amber-800"
              }
            >
              {t(
                `statuses.${credential.status}`
              )}
            </span>
          )}
        </div>

        <div className="mt-[17px] rounded-[13px] border border-amber-300 bg-amber-50 p-[13px] text-sm leading-6 text-amber-950">
          <strong>
            {t(
              "privacyTitle"
            )}
          </strong>{" "}
          {t(
            "privacyNotice"
          )}
        </div>
      </div>

      <div className="p-[21px] sm:p-[34px]">
        {error && (
          <div
            role="alert"
            className="mb-[17px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-[17px] rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px] text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {!credential ? (
          <div className="rounded-[17px] border border-dashed border-emerald-300 bg-emerald-50/50 p-[21px] sm:p-[34px]">
            <h3 className="text-xl font-bold text-gray-900">
              {t(
                "inactiveTitle"
              )}
            </h3>

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {t(
                "inactiveDescription"
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                void performAction(
                  "activate"
                )
              }
              disabled={
                activeAction !==
                null
              }
              className="romdoc-button romdoc-button-primary mt-[21px]"
            >
              {activeAction ===
              "activate"
                ? t(
                    "actions.activating"
                  )
                : t(
                    "actions.activate"
                  )}
            </button>
          </div>
        ) : (
          <div className="grid gap-[21px] xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-[21px]">
              <div className="rounded-[17px] border border-gray-200 bg-gray-50 p-[17px]">
                <label
                  htmlFor="permanent-emergency-share-link"
                  className="text-xs font-bold uppercase tracking-wide text-gray-600"
                >
                  {t(
                    "linkLabel"
                  )}
                </label>

                <input
                  id="permanent-emergency-share-link"
                  type="text"
                  readOnly
                  value={
                    credential.shareUrl
                  }
                  onFocus={(
                    event: {
                      currentTarget:
                        HTMLInputElement;
                    }
                  ) =>
                    event.currentTarget
                      .select()
                  }
                  className="romdoc-focus-ring mt-[8px] w-full rounded-[10px] border border-gray-300 bg-white px-[13px] py-[10px] font-mono text-xs text-gray-900"
                />

                <div className="mt-[13px] flex flex-wrap gap-[8px]">
                  <button
                    type="button"
                    onClick={() =>
                      void copyLink()
                    }
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {t(
                      "actions.copy"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      downloadQr
                    }
                    disabled={
                      !qrDataUrl
                    }
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {t(
                      "actions.downloadQr"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void downloadLockScreen()
                    }
                    disabled={
                      !qrDataUrl
                    }
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {t(
                      "actions.downloadLockScreen"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void downloadPrintCard()
                    }
                    disabled={
                      !qrDataUrl
                    }
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {t(
                      "actions.downloadPrintCard"
                    )}
                  </button>
                </div>
              </div>

              <dl className="grid gap-[13px] rounded-[17px] border border-gray-200 bg-white p-[17px] sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t(
                      "labels.availability"
                    )}
                  </dt>
                  <dd className="mt-[5px] font-semibold text-gray-900">
                    {t(
                      "labels.permanent"
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t(
                      "labels.accessCount"
                    )}
                  </dt>
                  <dd className="mt-[5px] font-semibold text-gray-900">
                    {
                      credential.accessCount
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t(
                      "labels.lastAccess"
                    )}
                  </dt>
                  <dd className="mt-[5px] font-semibold text-gray-900">
                    {credential.lastAccessedAt
                      ? formatDateTime(
                          credential.lastAccessedAt,
                          locale
                        )
                      : t(
                          "labels.never"
                        )}
                  </dd>
                </div>
              </dl>

              <div className="rounded-[17px] border border-blue-200 bg-blue-50 p-[17px]">
                <h3 className="font-bold text-blue-950">
                  {t(
                    "lockScreenHelp.title"
                  )}
                </h3>
                <p className="mt-[8px] text-sm leading-6 text-blue-900">
                  {t(
                    "lockScreenHelp.description"
                  )}
                </p>
              </div>

              <div className="rounded-[17px] border border-gray-200 bg-gray-50 p-[17px]">
                <h3 className="font-bold text-gray-900">
                  {t(
                    "email.title"
                  )}
                </h3>
                <p className="mt-[5px] text-sm leading-6 text-gray-600">
                  {t(
                    "email.description"
                  )}
                </p>

                <div className="mt-[13px] flex flex-col gap-[8px] sm:flex-row">
                  <input
                    type="email"
                    value={
                      recipientEmail
                    }
                    onChange={(
                      event: {
                        target: {
                          value: string;
                        };
                      }
                    ) =>
                      setRecipientEmail(
                        event.target.value
                      )
                    }
                    placeholder={t(
                      "email.placeholder"
                    )}
                    disabled={
                      credential.status ===
                        "disabled" ||
                      isSendingEmail
                    }
                    className="romdoc-focus-ring min-w-0 flex-1 rounded-[10px] border border-gray-300 bg-white px-[13px] py-[10px] text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void sendEmail()
                    }
                    disabled={
                      credential.status ===
                        "disabled" ||
                      isSendingEmail
                    }
                    className="romdoc-button romdoc-button-primary romdoc-button-sm"
                  >
                    {isSendingEmail
                      ? t(
                          "email.sending"
                        )
                      : t(
                          "email.send"
                        )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-[8px] border-t border-gray-200 pt-[21px]">
                {credential.status ===
                "active" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void performAction(
                        "deactivate"
                      )
                    }
                    disabled={
                      activeAction !==
                      null
                    }
                    className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                  >
                    {activeAction ===
                    "deactivate"
                      ? t(
                          "actions.deactivating"
                        )
                      : t(
                          "actions.deactivate"
                        )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void performAction(
                        "reactivate"
                      )
                    }
                    disabled={
                      activeAction !==
                      null
                    }
                    className="romdoc-button romdoc-button-primary romdoc-button-sm"
                  >
                    {activeAction ===
                    "reactivate"
                      ? t(
                          "actions.reactivating"
                        )
                      : t(
                          "actions.reactivate"
                        )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void performAction(
                      "replace"
                    )
                  }
                  disabled={
                    activeAction !==
                    null
                  }
                  className="romdoc-button romdoc-button-secondary romdoc-button-sm border-red-200 text-red-700 hover:bg-red-50"
                >
                  {activeAction ===
                  "replace"
                    ? t(
                        "actions.replacing"
                      )
                    : t(
                        "actions.replace"
                      )}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center rounded-[17px] border border-gray-200 bg-white p-[17px]">
              {qrDataUrl ? (
                <img
                  src={
                    qrDataUrl
                  }
                  alt={t(
                    "qrAlt"
                  )}
                  width={560}
                  height={560}
                  className={
                    credential.status ===
                      "active"
                      ? "h-auto w-full max-w-[350px] rounded-[13px] border border-gray-200 bg-white"
                      : "h-auto w-full max-w-[350px] rounded-[13px] border border-gray-200 bg-white opacity-40 grayscale"
                  }
                />
              ) : (
                <div className="flex aspect-square w-full max-w-[350px] items-center justify-center rounded-[13px] border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                  {t(
                    "qrLoading"
                  )}
                </div>
              )}

              <p className="mt-[13px] text-center text-sm font-bold text-[#036661]">
                {credential.status ===
                  "active"
                  ? t(
                      "scan"
                    )
                  : t(
                      "disabledNotice"
                    )}
              </p>

              <p className="mt-[8px] text-center text-xs leading-5 text-gray-500">
                {t(
                  "stableNotice"
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
