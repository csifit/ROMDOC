import Link from "next/link";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    type?: string;
    next?: string;
  }>;
};

function getSafeLoginHref(nextPath: string | undefined) {
  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//")
  ) {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const parameters =
    await searchParams;

  const email =
    parameters.email?.trim() ?? "";

  const isDoctor =
    parameters.type === "doctor";

  const isClinic =
    parameters.type === "clinic";

  const loginHref = getSafeLoginHref(
    parameters.next
  );

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✉
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Verifică adresa de e-mail
          </h1>

          <p className="mt-4 leading-7 text-gray-600">
            Am trimis un mesaj de
            confirmare
            {email ? (
              <>
                {" "}
                la{" "}
                <strong className="text-gray-900">
                  {email}
                </strong>
              </>
            ) : null}
            .
          </p>

          <p className="mt-3 leading-7 text-gray-600">
            Deschide mesajul și apasă
            linkul de confirmare pentru
            activarea contului RomDoc.
          </p>

          {isDoctor && (
            <div className="mt-6 rounded-xl border border-[#D97757]/30 bg-[#F0EEE9] p-4 text-left text-sm leading-6 text-gray-800">
              După confirmarea e-mailului,
              vei putea continua cu plata
              abonamentului de medic:
              <strong>
                {" "}60 lei/lună + TVA
              </strong>
              .
            </div>
          )}

          {isClinic && (
            <div className="mt-6 rounded-xl border border-[#D97757]/30 bg-[#F0EEE9] p-4 text-left text-sm leading-6 text-gray-800">
              După confirmarea e-mailului,
              cererea clinicii va putea fi
              verificată de RomDoc. Datele de
              facturare transmise vor fi folosite
              pentru configurarea contului de
              clinică în pașii următori.
            </div>
          )}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-900">
            Verifică și dosarele Spam sau
            Promotions dacă mesajul nu apare
            în Inbox.
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={loginHref}
              className="rounded-xl bg-[#D97757] px-5 py-3 text-sm font-semibold text-white"
            >
              Mergi la autentificare
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-800"
            >
              Pagina principală
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
