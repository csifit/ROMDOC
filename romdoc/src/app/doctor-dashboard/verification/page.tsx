import { redirect } from "next/navigation";
import DoctorVerificationForm from "@/components/doctor/doctor-verification-form";
import { requireActiveProfile } from "@/lib/auth/require-active-profile";

export default async function DoctorVerificationPage() {
  const { profile } =
    await requireActiveProfile();

  if (profile.role !== "doctor") {
    redirect("/");
  }

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            Panou medic
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Verificare profesională
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Trimite informațiile și documentele necesare pentru ca RomDoc să poată verifica dreptul de practică declarat. RomDoc verifică documentele existente, dar nu emite licențe medicale.
          </p>
        </header>

        <div className="mt-8">
          <DoctorVerificationForm />
        </div>
      </div>
    </main>
  );
}
