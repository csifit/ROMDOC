"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type DoctorInvitationOtpType = "invite" | "magiclink";

type DoctorInvitationVerificationProps = {
  tokenHash: string;
  otpType: DoctorInvitationOtpType;
};

type VerifyResponse = {
  error?: string;
  next?: string;
};

export default function DoctorInvitationVerification({
  tokenHash,
  otpType,
}: DoctorInvitationVerificationProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function verifyInvitation() {
    setError(null);
    setIsVerifying(true);

    try {
      const response = await fetch(
        "/api/auth/doctor-invitation/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokenHash,
            otpType,
          }),
        }
      );

      const result = (await response.json()) as VerifyResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Invitația nu a putut fi verificată."
        );
      }

      router.replace(result.next ?? "/auth/doctor-invitation");
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Invitația nu a putut fi verificată."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[#036661]">
        Invitație RomDoc
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950">
        Confirmă invitația
      </h1>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        Pentru siguranță, invitația nu este activată automat când linkul este deschis. Apasă butonul de mai jos pentru a continua.
      </p>

      <div className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#F0EEE9] p-4 text-sm leading-6 text-gray-700">
        Această etapă protejează invitația împotriva sistemelor automate de verificare a linkurilor din e-mail.
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={verifyInvitation}
        disabled={isVerifying}
        className="romdoc-focus-ring mt-7 w-full rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isVerifying
          ? "Se verifică invitația..."
          : "Continuă și confirmă invitația"}
      </button>
    </div>
  );
}
