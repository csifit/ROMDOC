import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminPrivacyPlaceholderPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/admin/privacy"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect("/admin");
  }

  const trustedIp =
    await isTrustedAdminMfaIp();

  if (!trustedIp) {
    const mfaRedirect =
      await getAdminMfaRedirect({
        supabase,
        nextPath:
          "/admin/privacy",
      });

    if (mfaRedirect) {
      redirect(
        mfaRedirect
      );
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Administrare
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Confidențialitate
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
            Această pagină este rezervată pentru operațiuni viitoare de confidențialitate, cereri de acces, export sau ștergere date.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            Pentru MVP, închiderea simplă a contului este gestionată din pagina Utilizatori. Pacientul solicită închiderea contului, iar administratorul folosește acțiunea existentă de blocare.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/users"
              className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
            >
              Mergi la Utilizatori
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              Înapoi la Admin
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
