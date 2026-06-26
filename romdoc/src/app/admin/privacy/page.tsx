import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import LegalPagesEditor, {
  type LegalPageEditorItem,
} from "@/components/admin/legal-pages-editor";
import {
  getAdminMfaRedirect,
} from "@/lib/auth/admin-mfa";
import {
  isTrustedAdminMfaIp,
} from "@/lib/auth/admin-mfa-ip";
import {
  LEGAL_PAGE_KEYS,
  getLegalPageDefinition,
} from "@/lib/legal/legal-pages";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type LegalPageRow = {
  page_key: string;
  title: string;
  content: string;
  updated_at: string;
};

export default async function AdminPrivacyPage() {
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

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("legal_pages")
    .select(`
      page_key,
      title,
      content,
      updated_at
    `)
    .order("page_key", {
      ascending: true,
    });

  const databaseReady =
    !error;

  if (error) {
    console.error(
      "Admin legal pages query failed:",
      error
    );
  }

  const rows = new Map<
    string,
    LegalPageRow
  >(
    (
      (data ?? []) as
        LegalPageRow[]
    ).map((row) => [
      row.page_key,
      row,
    ])
  );

  const legalPages:
    LegalPageEditorItem[] =
    LEGAL_PAGE_KEYS.map(
      (key) => {
        const definition =
          getLegalPageDefinition(key);
        const row =
          rows.get(key);

        return {
          key,
          title:
            row?.title ||
            definition.title,
          route:
            definition.route,
          content:
            row?.content ||
            definition.defaultContent,
          updatedAt:
            row?.updated_at ||
            definition.fallbackUpdatedAt,
        };
      }
    );

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            Administrare
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Documente legale
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
            Editează textele afișate în cele patru pagini din coloana Legal a footerului. Fiecare salvare actualizează automat data modificării și publică imediat noul text.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              Înapoi la Admin
            </Link>
          </div>
        </section>

        <LegalPagesEditor
          initialPages={
            legalPages
          }
          databaseReady={
            databaseReady
          }
        />
      </div>
    </main>
  );
}
