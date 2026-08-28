"use client";

import {
  type FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getAccountSecurityCopy,
} from "@/lib/i18n/account-security";
import {
  createClient,
} from "@/lib/supabase/client";

type SharedAccountSecuritySettingsProps = {
  locale: AppLocale;
};

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorCode(
  error: unknown
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (
      error as {
        code?: unknown;
      }
    ).code === "string"
  ) {
    return (
      error as {
        code: string;
      }
    ).code;
  }

  return "";
}

function getErrorMessage(
  error: unknown
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message.toLowerCase();
  }

  return "";
}

export default function SharedAccountSecuritySettings({
  locale,
}: SharedAccountSecuritySettingsProps) {
  const copy =
    getAccountSecurityCopy(
      locale
    );

  const [
    currentEmail,
    setCurrentEmail,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState(false);

  const [
    newEmail,
    setNewEmail,
  ] = useState("");

  const [
    pendingEmail,
    setPendingEmail,
  ] = useState<string | null>(
    null
  );

  const [
    emailError,
    setEmailError,
  ] = useState<string | null>(
    null
  );

  const [
    emailMessage,
    setEmailMessage,
  ] = useState<string | null>(
    null
  );

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState<string | null>(
    null
  );

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState<string | null>(
    null
  );

  const [
    isEmailPending,
    startEmailTransition,
  ] = useTransition();

  const [
    isPasswordPending,
    startPasswordTransition,
  ] = useTransition();

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const supabase =
        createClient();

      const {
        data: {
          user,
        },
        error,
      } =
        await supabase.auth
          .getUser();

      if (!active) {
        return;
      }

      if (
        error ||
        !user
      ) {
        console.error(
          "Shared account security user lookup failed:",
          error
        );

        setLoadError(true);
        setIsLoading(false);
        return;
      }

      setCurrentEmail(
        user.email ?? ""
      );

      setLoadError(false);
      setIsLoading(false);
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, []);

  function submitEmailChange(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setEmailError(null);
    setEmailMessage(null);

    const normalizedEmail =
      newEmail
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setEmailError(
        copy.emailRequired
      );
      return;
    }

    if (
      !EMAIL_PATTERN.test(
        normalizedEmail
      )
    ) {
      setEmailError(
        copy.emailInvalid
      );
      return;
    }

    if (
      currentEmail &&
      normalizedEmail ===
        currentEmail
          .trim()
          .toLowerCase()
    ) {
      setEmailError(
        copy.emailSame
      );
      return;
    }

    startEmailTransition(
      async () => {
        const supabase =
          createClient();

        const {
          error,
        } =
          await supabase.auth
            .updateUser({
              email:
                normalizedEmail,
            });

        if (error) {
          const code =
            getErrorCode(
              error
            );

          console.error(
            "Account email change failed:",
            {
              code,
              status:
                error.status,
            }
          );

          if (
            code ===
              "user_already_exists" ||
            code ===
              "email_exists"
          ) {
            setEmailError(
              copy.emailInUse
            );
            return;
          }

          if (
            code ===
              "over_email_send_rate_limit" ||
            code ===
              "over_request_rate_limit"
          ) {
            setEmailError(
              copy.emailRateLimited
            );
            return;
          }

          setEmailError(
            copy.emailGenericError
          );
          return;
        }

        setPendingEmail(
          normalizedEmail
        );
        setNewEmail("");
        setEmailMessage(
          copy.emailSuccess
        );
      }
    );
  }

  function submitPasswordChange(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordError(
        copy.passwordCurrentRequired
      );
      return;
    }

    if (
      newPassword.length <
      12
    ) {
      setPasswordError(
        copy.passwordTooShort
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        copy.passwordMismatch
      );
      return;
    }

    if (
      newPassword ===
      currentPassword
    ) {
      setPasswordError(
        copy.passwordSame
      );
      return;
    }

    startPasswordTransition(
      async () => {
        const supabase =
          createClient();

        const {
          error,
        } =
          await supabase.auth
            .updateUser({
              password:
                newPassword,
              current_password:
                currentPassword,
            });

        if (error) {
          const code =
            getErrorCode(
              error
            );

          const message =
            getErrorMessage(
              error
            );

          console.error(
            "Account password change failed:",
            {
              code,
              status:
                error.status,
            }
          );

          if (
            code ===
              "same_password"
          ) {
            setPasswordError(
              copy.passwordSame
            );
            return;
          }

          if (
            code ===
              "weak_password"
          ) {
            setPasswordError(
              copy.passwordWeak
            );
            return;
          }

          if (
            code ===
              "invalid_credentials" ||
            message.includes(
              "current password"
            ) ||
            message.includes(
              "password is incorrect"
            )
          ) {
            setPasswordError(
              copy.passwordIncorrect
            );
            return;
          }

          if (
            code ===
              "over_request_rate_limit"
          ) {
            setPasswordError(
              copy.passwordRateLimited
            );
            return;
          }

          setPasswordError(
            copy.passwordGenericError
          );
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMessage(
          copy.passwordSuccess
        );
      }
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <p className="text-sm text-gray-600">
          {copy.loading}
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section
        role="alert"
        className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm text-red-800 shadow-sm"
      >
        {copy.loadError}
      </section>
    );
  }

  return (
    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {copy.pageEyebrow}
        </p>

        <h2 className="mt-[8px] text-2xl font-bold text-gray-900">
          {copy.sectionTitle}
        </h2>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.sectionDescription}
        </p>
      </div>

      <div className="mt-[21px] grid gap-[21px] lg:grid-cols-[minmax(0,0.618fr)_minmax(0,1fr)]">
        <form
          onSubmit={
            submitEmailChange
          }
          className="rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]"
        >
          <h3 className="text-lg font-bold text-gray-900">
            {copy.emailTitle}
          </h3>

          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {copy.emailDescription}
          </p>

          <div className="mt-[21px] rounded-[13px] border border-gray-200 bg-white p-[13px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.currentEmail}
            </p>

            <p className="mt-[5px] break-all text-sm font-semibold text-gray-900">
              {currentEmail ||
                copy.emailUnavailable}
            </p>
          </div>

          {pendingEmail && (
            <div className="mt-[13px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {copy.pendingEmail}
              </p>

              <p className="mt-[5px] break-all text-sm font-semibold text-amber-950">
                {pendingEmail}
              </p>
            </div>
          )}

          <label className="mt-[21px] block">
            <span className="text-sm font-medium text-gray-800">
              {copy.newEmail}
            </span>

            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={newEmail}
              disabled={
                isEmailPending
              }
              onChange={(
                event
              ) =>
                setNewEmail(
                  event.target.value
                )
              }
              placeholder={
                copy.newEmailPlaceholder
              }
              className="mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <p className="mt-[13px] text-xs leading-5 text-gray-500">
            {copy.emailPrivateNote}
          </p>

          {emailError && (
            <div
              role="alert"
              className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              {emailError}
            </div>
          )}

          {emailMessage && (
            <div
              role="status"
              className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
            >
              {emailMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isEmailPending
            }
            className="romdoc-button romdoc-button-primary romdoc-button-sm mt-[21px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEmailPending
              ? copy.emailSubmitting
              : copy.emailSubmit}
          </button>
        </form>

        <form
          onSubmit={
            submitPasswordChange
          }
          className="rounded-[21px] border border-gray-200 bg-gray-50 p-[21px]"
        >
          <h3 className="text-lg font-bold text-gray-900">
            {copy.passwordTitle}
          </h3>

          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {copy.passwordDescription}
          </p>

          <div className="mt-[21px] grid gap-[13px]">
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                {copy.currentPassword}
              </span>

              <input
                type="password"
                autoComplete="current-password"
                value={
                  currentPassword
                }
                disabled={
                  isPasswordPending
                }
                onChange={(
                  event
                ) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                className="mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                {copy.newPassword}
              </span>

              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                disabled={
                  isPasswordPending
                }
                onChange={(
                  event
                ) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                className="mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                {copy.confirmPassword}
              </span>

              <input
                type="password"
                autoComplete="new-password"
                value={
                  confirmPassword
                }
                disabled={
                  isPasswordPending
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                className="mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <p className="mt-[13px] text-xs leading-5 text-gray-500">
            {copy.passwordRequirements}
          </p>

          {passwordError && (
            <div
              role="alert"
              className="mt-[13px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
            >
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div
              role="status"
              className="mt-[13px] rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
            >
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isPasswordPending
            }
            className="romdoc-button romdoc-button-primary romdoc-button-sm mt-[21px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPasswordPending
              ? copy.passwordSubmitting
              : copy.passwordSubmit}
          </button>
        </form>
      </div>
    </section>
  );
}
