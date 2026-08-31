"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ClinicOrganizationInvitationOtpType =
  | "invite"
  | "magiclink";

type Locale =
  | "ro"
  | "en"
  | "de";

type Props = {
  tokenHash: string;
  otpType: ClinicOrganizationInvitationOtpType;
  locale: Locale;
};

type VerifyResponse = {
  error?: string;
  next?: string;
};

const COPY = {
  ro: {
    eyebrow:
      "Invitație RomDoc",
    title:
      "Confirmă invitația organizației",
    description:
      "Pentru siguranță, invitația nu este activată automat când linkul este deschis. Apasă butonul de mai jos pentru a continua.",
    protection:
      "Această etapă protejează invitația împotriva sistemelor automate de verificare a linkurilor din e-mail.",
    failed:
      "Invitația nu a putut fi verificată.",
    verifying:
      "Se verifică invitația...",
    action:
      "Continuă și confirmă invitația",
  },
  en: {
    eyebrow:
      "RomDoc invitation",
    title:
      "Confirm the organisation invitation",
    description:
      "For security, the invitation is not activated automatically when the link is opened. Use the button below to continue.",
    protection:
      "This step protects the invitation from automated email link-scanning systems.",
    failed:
      "The invitation could not be verified.",
    verifying:
      "Verifying invitation...",
    action:
      "Continue and confirm invitation",
  },
  de: {
    eyebrow:
      "RomDoc-Einladung",
    title:
      "Einladung der Organisation bestätigen",
    description:
      "Aus Sicherheitsgründen wird die Einladung beim Öffnen des Links nicht automatisch aktiviert. Verwenden Sie die Schaltfläche unten, um fortzufahren.",
    protection:
      "Dieser Schritt schützt die Einladung vor automatischen Link-Prüfsystemen in E-Mails.",
    failed:
      "Die Einladung konnte nicht überprüft werden.",
    verifying:
      "Einladung wird überprüft...",
    action:
      "Weiter und Einladung bestätigen",
  },
} as const;

export default function ClinicOrganizationInvitationVerification({
  tokenHash,
  otpType,
  locale,
}: Props) {
  const router =
    useRouter();

  const copy =
    COPY[
      locale
    ];

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isVerifying,
    setIsVerifying,
  ] =
    useState(false);

  async function verifyInvitation() {
    setError(null);
    setIsVerifying(
      true
    );

    try {
      const response =
        await fetch(
          "/api/auth/clinic-organization-invitation/verify",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                tokenHash,
                otpType,
              }),
          }
        );

      const result =
        (await response.json()) as
          VerifyResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            copy.failed
        );
      }

      router.replace(
        result.next ??
          "/auth/clinic-organization-invitation"
      );

      router.refresh();
    } catch (
      verifyError
    ) {
      setError(
        verifyError instanceof
          Error
          ? verifyError.message
          : copy.failed
      );
    } finally {
      setIsVerifying(
        false
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <p className="text-sm font-semibold text-[#036661]">
        {copy.eyebrow}
      </p>

      <h1 className="mt-[8px] text-3xl font-bold text-gray-950">
        {copy.title}
      </h1>

      <p className="mt-[13px] text-sm leading-6 text-gray-600">
        {copy.description}
      </p>

      <div className="mt-[21px] rounded-[13px] border border-[#036661]/20 bg-[#F0EEE9] p-[13px] text-sm leading-6 text-gray-700">
        {copy.protection}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={
          verifyInvitation
        }
        disabled={
          isVerifying
        }
        className="romdoc-focus-ring mt-[21px] w-full rounded-[13px] bg-[#036661] px-[21px] py-[13px] font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerifying
          ? copy.verifying
          : copy.action}
      </button>
    </div>
  );
}
