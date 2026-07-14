import Link from "next/link";
import { redirect } from "next/navigation";

import LegalPagesEditor, { type LegalPageEditorItem } from "@/components/admin/legal-pages-editor";
import { getAdminMfaRedirect } from "@/lib/auth/admin-mfa";
import { isTrustedAdminMfaIp } from "@/lib/auth/admin-mfa-ip";
import {
  LEGAL_LOCALES,
  LEGAL_PAGE_KEYS,
  getLegalPageDefinition,
  type LegalLocale,
  type LegalPageKey,
} from "@/lib/legal/legal-pages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Row = { page_key: LegalPageKey; locale: LegalLocale; title: string; content: string; updated_at: string };

export default async function AdminPrivacyPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=/admin/privacy");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.role !== "admin" || profile.account_status !== "active") redirect("/admin");

  if (!(await isTrustedAdminMfaIp())) {
    const mfaRedirect = await getAdminMfaRedirect({ supabase, nextPath: "/admin/privacy" });
    if (mfaRedirect) redirect(mfaRedirect);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("legal_pages").select("page_key, locale, title, content, updated_at").order("page_key").order("locale");
  if (error) console.error("Admin localized legal pages query failed:", error);

  const rows = new Map<string, Row>(((data ?? []) as Row[]).map((row) => [`${row.page_key}:${row.locale}`, row]));
  const legalPages: LegalPageEditorItem[] = LEGAL_PAGE_KEYS.flatMap((key) => LEGAL_LOCALES.map((locale) => {
    const definition = getLegalPageDefinition(key, locale);
    const row = rows.get(`${key}:${locale}`);
    return {
      key,
      locale,
      title: row?.title || definition.title,
      route: definition.route,
      content: row?.content || definition.defaultContent,
      updatedAt: row?.updated_at || definition.fallbackUpdatedAt,
    };
  }));

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">Administrare</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Documente legale multilingve</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">Selectează documentul, apoi fila RO, EN sau DE. Fiecare traducere este salvată și publicată separat pe pagina limbii corespunzătoare.</p>
          <div className="mt-6"><Link href="/admin" className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-100">Înapoi la Admin</Link></div>
        </section>
        <LegalPagesEditor initialPages={legalPages} databaseReady={!error} />
      </div>
    </main>
  );
}
