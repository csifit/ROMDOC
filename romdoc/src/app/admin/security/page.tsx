import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

function formatDate(
  value:
    | string
    | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export default async function AdminSecurityPage() {
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
      "/login?next=/admin/security"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    ![
      "admin",
      "manager",
    ].includes(
      profile.role
    ) ||
    profile.account_status !==
      "active"
  ) {
    redirect("/dashboard");
  }

  const [
    factorsResult,
    assuranceResult,
  ] =
    await Promise.all([
      supabase.auth.mfa
        .listFactors(),
      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel(),
    ]);

  const factor =
    factorsResult.data
      ?.totp?.[0] ??
    null;

  const configuredAt =
    factor
      ? formatDate(
          factor.updated_at ??
            factor.created_at
        )
      : null;

  const currentLevel =
    assuranceResult.data
      ?.currentLevel ??
    "aal1";

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          Securitate
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Account security
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Verifică starea autentificării în doi pași pentru contul
          administrativ RomDoc.
        </p>
      </header>

      {factorsResult.error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-sm"
        >
          Setările MFA nu au putut fi încărcate. Reîncarcă pagina și
          încearcă din nou.
        </div>
      ) : factor ? (
        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 12 2 2 4-4"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-green-950">
                Google Authenticator este activ
              </h2>

              <p className="mt-2 text-sm leading-6 text-green-900">
                Contul are un factor TOTP configurat. MFA rămâne
                obligatorie pentru accesul administrativ RomDoc.
              </p>

              {configuredAt && (
                <p className="mt-3 text-xs text-green-800">
                  Configurat sau actualizat la {configuredAt}.
                </p>
              )}

              <p className="mt-1 text-xs text-green-800">
                Nivelul sesiunii curente:{" "}
                <strong>
                  {currentLevel ===
                  "aal2"
                    ? "AAL2 — verificată prin MFA"
                    : "AAL1 — sesiune fără verificare MFA curentă"}
                </strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-amber-950">
            Google Authenticator nu este configurat
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-900">
            Configurează autentificarea în doi pași înainte de a folosi
            contul administrativ din afara unei rețele de încredere.
          </p>

          <Link
            href="/mfa/admin/setup?next=/admin/security"
            className="romdoc-button romdoc-button-primary romdoc-button-sm mt-5"
          >
            Configurează Google Authenticator
          </Link>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Recomandări
        </h2>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
          <li>
            Păstrează telefonul și aplicația Google Authenticator protejate.
          </li>
          <li>
            Nu comunica nimănui codurile temporare de șase cifre.
          </li>
          <li>
            Dacă pierzi accesul la autentificator, folosește procedura
            internă de recuperare a contului administrativ.
          </li>
        </ul>
      </div>
    </section>
  );
}
