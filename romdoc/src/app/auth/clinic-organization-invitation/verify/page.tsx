import {
  redirect,
} from "next/navigation";

import ClinicOrganizationInvitationVerification from "@/components/auth/clinic-organization-invitation-verification";

export const dynamic =
  "force-dynamic";

type ClinicOrganizationInvitationOtpType =
  | "invite"
  | "magiclink";

type ClinicOrganizationInvitationVerifyPageProps = {
  searchParams:
    Promise<{
      token_hash?: string;
      type?: string;
      locale?: string;
    }>;
};

export default async function ClinicOrganizationInvitationVerifyPage({
  searchParams,
}: ClinicOrganizationInvitationVerifyPageProps) {
  const params =
    await searchParams;

  const tokenHash =
    typeof params
      .token_hash ===
      "string"
      ? params
          .token_hash
          .trim()
          .slice(
            0,
            1000
          )
      : "";

  const otpType:
    ClinicOrganizationInvitationOtpType | null =
      params.type ===
          "invite" ||
        params.type ===
          "magiclink"
        ? params.type
        : null;

  const locale =
    params.locale ===
      "en"
      ? "en"
      : params.locale ===
          "de"
        ? "de"
        : "ro";

  if (
    !tokenHash ||
    !otpType
  ) {
    redirect(
      "/login?error=invalid-clinic-organization-invitation"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6">
      <ClinicOrganizationInvitationVerification
        tokenHash={
          tokenHash
        }
        otpType={
          otpType
        }
        locale={
          locale
        }
      />
    </main>
  );
}
