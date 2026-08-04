import {
  redirect,
} from "next/navigation";

import DoctorInvitationVerification from "@/components/auth/doctor-invitation-verification";

export const dynamic = "force-dynamic";

type DoctorInvitationOtpType = "invite" | "magiclink";

type DoctorInvitationVerifyPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
  }>;
};

export default async function DoctorInvitationVerifyPage({
  searchParams,
}: DoctorInvitationVerifyPageProps) {
  const params = await searchParams;

  const tokenHash =
    typeof params.token_hash === "string"
      ? params.token_hash.trim().slice(0, 1000)
      : "";

  const otpType: DoctorInvitationOtpType | null =
    params.type === "invite" || params.type === "magiclink"
      ? params.type
      : null;

  if (!tokenHash || !otpType) {
    redirect("/login?error=invalid-doctor-invitation");
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6">
      <DoctorInvitationVerification
        tokenHash={tokenHash}
        otpType={otpType}
      />
    </main>
  );
}
