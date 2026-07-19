import Link from "next/link";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    type?: string;
    next?: string;
  }>;
};

function getSafeNextPath(nextPath: string | undefined) {
  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//")
  ) {
    return null;
  }

  return nextPath;
}

function getSafeLoginHref(nextPath: string | null) {
  return nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";
}

function getSafePasswordResetHref(nextPath: string | null) {
  return nextPath
    ? `/forgot-password?next=${encodeURIComponent(nextPath)}`
    : "/forgot-password";
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const parameters = await searchParams;
  const email = parameters.email?.trim() ?? "";
  const isDoctor = parameters.type === "doctor";
  const isClinic = parameters.type === "clinic";
  const nextPath = getSafeNextPath(parameters.next);
  const loginHref = getSafeLoginHref(nextPath);
  const passwordResetHref = getSafePasswordResetHref(nextPath);

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[21px] py-[34px] sm:px-[34px] sm:py-[55px]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <section className="romdoc-card w-full p-[21px] text-center sm:p-[34px]">
          <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-green-100 text-2xl">
            ✉
          </div>

          <h1 className="mt-[21px] text-3xl font-bold text-gray-900">
            Verifică adresa de e-mail
          </h1>

          <p className="mt-[13px] leading-7 text-gray-600">
            Dacă această adresă nu este deja asociată unui cont RomDoc, am trimis un mesaj de confirmare
            {email ? (
              <>
                {" "}
                la{" "}
                <strong className="text-gray-900">{email}</strong>
              </>
            ) : null}
            .
          </p>

          <p className="mt-[8px] leading-7 text-gray-600">
            Deschide mesajul și apasă linkul de confirmare pentru activarea contului.
          </p>

          <div className="romdoc-notice romdoc-notice-info mt-[21px] text-left">
            <h2 className="font-bold">Nu ai primit mesajul?</h2>

            <p className="mt-[8px]">
              Adresa poate fi deja asociată unui cont RomDoc. Din motive de securitate, formularul de înregistrare nu confirmă public existența unui cont.
            </p>

            <p className="mt-[8px]">
              Încearcă autentificarea. Dacă nu îți amintești parola, solicită resetarea ei.
            </p>
          </div>

          {isDoctor && (
            <div className="mt-[21px] rounded-[13px] border border-[#D97757]/30 bg-[#F0EEE9] p-[13px] text-left text-sm leading-6 text-gray-800">
              După confirmarea e-mailului, vei putea continua cu plata abonamentului de medic:
              <strong>{" "}60 lei/lună + TVA</strong>.
            </div>
          )}

          {isClinic && (
            <div className="mt-[21px] rounded-[13px] border border-[#D97757]/30 bg-[#F0EEE9] p-[13px] text-left text-sm leading-6 text-gray-800">
              După confirmarea e-mailului, cererea clinicii va putea fi verificată de RomDoc. Datele de facturare transmise vor fi folosite pentru configurarea contului de clinică în pașii următori.
            </div>
          )}

          <div className="romdoc-notice romdoc-notice-warning mt-[13px] text-left">
            Verifică și dosarele Spam sau Promotions dacă mesajul nu apare în Inbox.
          </div>

          <div className="mt-[21px] grid gap-[8px] sm:grid-cols-2">
            <Link
              href={loginHref}
              className="romdoc-button romdoc-button-primary justify-center"
            >
              Mergi la autentificare
            </Link>

            <Link
              href={passwordResetHref}
              className="romdoc-button romdoc-button-secondary justify-center"
            >
              Resetează parola
            </Link>
          </div>

          <Link
            href="/"
            className="romdoc-link mt-[21px] inline-block text-sm font-semibold underline-offset-4 hover:underline"
          >
            Înapoi la pagina principală
          </Link>
        </section>
      </div>
    </main>
  );
}
