import Link from "next/link";

import DoctorClinicInviteAcceptPanel from "@/components/doctor-clinic-invite/doctor-clinic-invite-accept-panel";
import PublicFooter from "@/components/public/public-footer";
import { createClient } from "@/lib/supabase/server";

type DoctorClinicInvitePageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

function getSafeToken(value: string | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export default async function DoctorClinicInvitePage({
  searchParams,
}: DoctorClinicInvitePageProps) {
  const resolvedSearchParams = await searchParams;
  const token = getSafeToken(resolvedSearchParams?.token);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = token
    ? `/doctor-clinic-invite?token=${encodeURIComponent(token)}`
    : "/doctor-clinic-invite";

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <Link
            href="/"
            className="inline-block text-3xl font-bold text-gray-900"
          >
            RomDoc
          </Link>

          <p className="mt-8 text-sm font-semibold text-[#9A4F35]">
            Invitație clinică
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Acceptă invitația clinicii
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Această invitație asociază contul tău de medic cu o clinică. După
            acceptare, acoperirea abonamentului de către clinică va trebui
            aprobată de administratorul RomDoc.
          </p>

          {!token ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              Linkul invitației nu conține un token valid. Solicită clinicii să
              trimită o invitație nouă.
            </div>
          ) : user ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Pentru siguranță, invitația poate fi acceptată doar de contul de
                medic care are aceeași adresă de e-mail ca invitația.
              </div>

              <DoctorClinicInviteAcceptPanel token={token} />
            </div>
          ) : (
            <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              <p>
                Pentru a accepta invitația, autentifică-te cu contul tău de
                medic. Dacă nu ai încă un cont, creează un cont de medic și
                revino la acest link după confirmarea e-mailului.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="romdoc-focus-ring rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#024d49]"
                >
                  Autentificare
                </Link>

                <Link
                  href={`/register?role=doctor&next=${encodeURIComponent(nextPath)}`}
                  className="romdoc-focus-ring rounded-xl border border-[#036661] px-4 py-2.5 text-sm font-semibold text-[#036661] transition hover:bg-[#036661]/10"
                >
                  Creează cont de medic
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
