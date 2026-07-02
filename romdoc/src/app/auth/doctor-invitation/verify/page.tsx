import {
  redirect,
} from "next/navigation";

import DoctorInvitationVerification from "@/components/auth/doctor-invitation-verification";

export const dynamic =
  "force-dynamic";

type DoctorInvitationVerifyPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
  }>;
};

export default async function DoctorInvitationVerifyPage({
  searchParams,
}: DoctorInvitationVerifyPageProps) {
  const params =
    await searchParams;

  const tokenHash =
    typeof params.token_hash ===
      "string"
      ? params.token_hash
          .trim()
          .slice(0, 1000)
      : "";

  if (
    !tokenHash ||
    params.type !==
      "invite"
  ) {
    redirect(
      "/login?error=invalid-doctor-invitation"
    );
  }

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6">
      <DoctorInvitationVerification
        tokenHash={
          tokenHash
        }
      />
    </main>
  );
}
