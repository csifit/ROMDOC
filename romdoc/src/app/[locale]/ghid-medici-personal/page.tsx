import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import PublicLayout from "@/components/public/public-layout";
import {
  type AppLocale,
  routing,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

const siteUrl =
  (
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    "https://www.romdoc.fit"
  ).replace(/\/+$/, "");

function isLocale(
  value: string
): value is AppLocale {
  return routing.locales.includes(
    value as AppLocale
  );
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } =
    await params;

  const isEnglish =
    locale === "en";

  const title =
    isEnglish
      ? "User guide for doctors and medical staff"
      : "Ghid de utilizare pentru medici și personalul medical";

  const description =
    isEnglish
      ? "Learn how doctors and authorized medical staff use RomDoc to create and manage appointments, handle patient medical folders and complete consultations safely."
      : "Află cum folosesc medicii și personalul medical autorizat RomDoc pentru programări, Dosarul medical al pacientului și finalizarea consultațiilor.";

  const canonical =
    isEnglish
      ? "/en/doctor-staff-guide"
      : "/ro/ghid-medici-personal";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ro:
          "/ro/ghid-medici-personal",
        en:
          "/en/doctor-staff-guide",
        "x-default":
          "/ro/ghid-medici-personal",
      },
    },
    openGraph: {
      type: "article",
      locale:
        isEnglish
          ? "en_US"
          : "ro_RO",
      siteName: "RomDoc",
      title,
      description,
      url:
        `${siteUrl}${canonical}`,
    },
  };
}

export default async function DoctorStaffGuidePage({
  params,
}: Props) {
  const { locale } =
    await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isEnglish =
    locale === "en";

  const homeHref =
    isEnglish ? "/en" : "/ro";

  const registerHref =
    "/register?role=doctor";

  const loginHref =
    "/login";

  const permissions = [
    {
      title: isEnglish
        ? "Doctor access"
        : "Accesul medicului",
      body: isEnglish
        ? "The doctor manages their own appointments, clinics, availability, services and patient medical-folder records. The doctor remains responsible for the medical act and the accuracy of clinical information."
        : "Medicul își administrează programările, clinicile, disponibilitatea, serviciile și documentele din Dosarul medical al pacienților. Medicul rămâne responsabil pentru actul medical și pentru corectitudinea informațiilor clinice.",
    },
    {
      title: isEnglish
        ? "Authorized staff access"
        : "Accesul personalului autorizat",
      body: isEnglish
        ? "An active staff member can support the doctor with appointment management and medical-folder operations for the doctor they are assigned to. Access ends when the assignment is deactivated."
        : "Un membru activ al personalului poate ajuta medicul cu administrarea programărilor și operațiunile din Dosarul medical pentru medicul la care este atribuit. Accesul încetează atunci când atribuirea este dezactivată.",
    },
  ];

  const appointmentStatuses = [
    {
      title: isEnglish
        ? "Pending"
        : "În așteptare",
      body: isEnglish
        ? "The patient submitted a request that has not yet been confirmed."
        : "Pacientul a trimis o solicitare care nu a fost încă confirmată.",
    },
    {
      title: isEnglish
        ? "Confirmed"
        : "Confirmată",
      body: isEnglish
        ? "The date and time were accepted. Medical-folder documents may be added."
        : "Data și ora au fost acceptate. Pot fi adăugate documente în Dosarul medical.",
    },
    {
      title: isEnglish
        ? "Rescheduled"
        : "Reprogramată",
      body: isEnglish
        ? "The appointment was moved to another date or time. The medical folder remains open."
        : "Programarea a fost mutată la o altă dată sau oră. Dosarul medical rămâne deschis.",
    },
    {
      title: isEnglish
        ? "Completed"
        : "Finalizată",
      body: isEnglish
        ? "The consultation is closed. Existing medical-folder content becomes read-only."
        : "Consultația este închisă. Conținutul existent din Dosarul medical devine disponibil numai pentru citire.",
    },
    {
      title: isEnglish
        ? "Cancelled"
        : "Anulată",
      body: isEnglish
        ? "The appointment will no longer take place and cannot be modified."
        : "Programarea nu va mai avea loc și nu mai poate fi modificată.",
    },
    {
      title: isEnglish
        ? "No-show"
        : "Neprezentare",
      body: isEnglish
        ? "The patient did not attend the appointment."
        : "Pacientul nu s-a prezentat la programare.",
    },
  ];

  const creationFields = [
    isEnglish
      ? "Doctor"
      : "Medicul",
    isEnglish
      ? "Clinic"
      : "Clinica",
    isEnglish
      ? "Booking source"
      : "Sursa programării",
    isEnglish
      ? "Patient name"
      : "Numele pacientului",
    isEnglish
      ? "Phone number"
      : "Numărul de telefon",
    isEnglish
      ? "Email address"
      : "Adresa de e-mail",
    isEnglish
      ? "Date and time"
      : "Data și ora",
    isEnglish
      ? "Optional notes"
      : "Observații opționale",
  ];

  const medicalDocumentTypes = [
    isEnglish
      ? "Consultation notes"
      : "Note de consultație",
    isEnglish
      ? "Prescriptions"
      : "Rețete",
    isEnglish
      ? "Laboratory results"
      : "Rezultate de laborator",
    isEnglish
      ? "Imaging results"
      : "Rezultate imagistice",
    isEnglish
      ? "Referrals"
      : "Trimiteri",
    isEnglish
      ? "Medical certificates"
      : "Adeverințe medicale",
    isEnglish
      ? "Discharge or medical letters"
      : "Scrisori medicale",
    isEnglish
      ? "Other relevant documents"
      : "Alte documente relevante",
  ];

  const workflow = [
    isEnglish
      ? "The appointment is confirmed"
      : "Programarea este confirmată",
    isEnglish
      ? "The patient arrives at the clinic"
      : "Pacientul se prezintă la clinică",
    isEnglish
      ? "The doctor performs the consultation and necessary investigations"
      : "Medicul efectuează consultația și investigațiile necesare",
    isEnglish
      ? "The doctor or authorized staff uploads the relevant medical-folder documents, when needed"
      : "Medicul sau personalul autorizat încarcă documentele relevante în Dosarul medical, atunci când este necesar",
    isEnglish
      ? "All notes and documents are checked"
      : "Sunt verificate toate notele și documentele",
    isEnglish
      ? "The appointment is closed using “Mark as completed”"
      : "Programarea este închisă folosind acțiunea „Marchează finalizată”",
  ];

  const completionChecklist = [
    isEnglish
      ? "The consultation has ended."
      : "Consultația s-a încheiat.",
    isEnglish
      ? "The medical note is complete."
      : "Nota medicală este completă.",
    isEnglish
      ? "All relevant documents were uploaded."
      : "Toate documentele relevante au fost încărcate.",
    isEnglish
      ? "The patient and appointment were checked."
      : "Pacientul și programarea au fost verificate.",
    isEnglish
      ? "No further appointment changes are required."
      : "Nu mai sunt necesare modificări ale programării.",
  ];

  const securityRules = [
    isEnglish
      ? "Use only your own RomDoc account and do not share your password."
      : "Folosește numai propriul cont RomDoc și nu partaja parola.",
    isEnglish
      ? "Check the patient name and appointment before uploading a document."
      : "Verifică numele pacientului și programarea înainte de încărcarea unui document.",
    isEnglish
      ? "Access only the records needed for your professional activity."
      : "Accesează numai dosarele necesare activității tale profesionale.",
    isEnglish
      ? "Do not export or share medical documents without an appropriate legal basis and authorization."
      : "Nu exporta și nu distribui documente medicale fără un temei și o autorizare corespunzătoare.",
    isEnglish
      ? "Sign out after using a shared device."
      : "Deconectează-te după utilizarea unui dispozitiv comun.",
  ];

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Guide for doctors and staff"
                : "Ghid pentru medici și personal"}
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {isEnglish
                ? "User guide for doctors and medical staff"
                : "Ghid de utilizare pentru medici și personalul medical"}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">
              {isEnglish
                ? "This public guide explains how doctors and authorized medical staff use RomDoc to create appointments, manage appointment statuses and work safely with the patient medical folder."
                : "Acest ghid public explică modul în care medicii și membrii personalului medical autorizat folosesc RomDoc pentru crearea programărilor, administrarea statusurilor și lucrul în siguranță cu Dosarul medical al pacientului."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="romdoc-button romdoc-button-primary"
              >
                {isEnglish
                  ? "Sign in"
                  : "Autentificare"}
              </Link>

              <Link
                href={registerHref}
                className="romdoc-button romdoc-button-secondary"
              >
                {isEnglish
                  ? "Join as a doctor"
                  : "Înscrie-te ca medic"}
              </Link>
            </div>
          </header>

          <nav
            aria-label={
              isEnglish
                ? "Guide sections"
                : "Secțiunile ghidului"
            }
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="#acces"
                className="rounded-full bg-[#036661]/10 px-4 py-2 font-semibold text-[#036661] hover:bg-[#036661]/15"
              >
                {isEnglish
                  ? "Access"
                  : "Acces"}
              </a>

              <a
                href="#programari"
                className="rounded-full bg-[#036661]/10 px-4 py-2 font-semibold text-[#036661] hover:bg-[#036661]/15"
              >
                {isEnglish
                  ? "Appointments"
                  : "Programări"}
              </a>

              <a
                href="#dosar-medical"
                className="rounded-full bg-[#036661]/10 px-4 py-2 font-semibold text-[#036661] hover:bg-[#036661]/15"
              >
                {isEnglish
                  ? "Medical folder"
                  : "Dosar medical"}
              </a>

              <a
                href="#procedura"
                className="rounded-full bg-[#036661]/10 px-4 py-2 font-semibold text-[#036661] hover:bg-[#036661]/15"
              >
                {isEnglish
                  ? "Recommended workflow"
                  : "Procedura recomandată"}
              </a>

              <a
                href="#securitate"
                className="rounded-full bg-[#036661]/10 px-4 py-2 font-semibold text-[#036661] hover:bg-[#036661]/15"
              >
                {isEnglish
                  ? "Security"
                  : "Securitate"}
              </a>
            </div>
          </nav>

          <section
            id="acces"
            aria-labelledby="access-title"
            className="mt-8 scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Access and roles"
                : "Acces și roluri"}
            </p>

            <h2
              id="access-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "Who can manage appointments and records"
                : "Cine poate administra programările și dosarele"}
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {permissions.map(
                (permission) => (
                  <article
                    key={
                      permission.title
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {
                        permission.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {
                        permission.body
                      }
                    </p>
                  </article>
                )
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              {isEnglish
                ? "Staff access is delegated by the doctor. Staff should carry out clinical-document operations only under the doctor’s instructions and according to the clinic’s internal procedures."
                : "Accesul personalului este delegat de medic. Personalul trebuie să efectueze operațiunile asupra documentelor clinice numai conform instrucțiunilor medicului și procedurilor interne ale clinicii."}
            </div>
          </section>

          <section
            id="programari"
            aria-labelledby="appointments-title"
            className="mt-8 scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Appointment management"
                : "Administrarea programărilor"}
            </p>

            <h2
              id="appointments-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "Create and manage appointments"
                : "Crearea și gestionarea programărilor"}
            </h2>

            <p className="mt-5 text-sm leading-7 text-gray-700">
              {isEnglish
                ? "Doctors and authorized staff can create appointments received by phone, email, directly at the clinic or through another supported source. A manually created appointment is saved as confirmed."
                : "Medicii și personalul autorizat pot crea programări primite prin telefon, e-mail, direct la clinică sau prin altă sursă acceptată. O programare creată manual este salvată ca programare confirmată."}
            </p>

            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEnglish
                    ? "Required information"
                    : "Informații necesare"}
                </h3>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {creationFields.map(
                    (field) => (
                      <li
                        key={field}
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#036661] text-xs font-bold text-white"
                        >
                          ✓
                        </span>

                        <span>
                          {field}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </article>

              <article className="rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEnglish
                    ? "Available actions"
                    : "Acțiuni disponibile"}
                </h3>

                <p className="mt-4 text-sm leading-7 text-gray-700">
                  {isEnglish
                    ? "Depending on the current status, the doctor or staff can confirm, reschedule, cancel, complete or mark a no-show. RomDoc also checks availability and prevents invalid scheduling conflicts."
                    : "În funcție de statusul curent, medicul sau personalul poate confirma, reprograma, anula, finaliza sau marca neprezentarea. RomDoc verifică disponibilitatea și previne suprapunerile nevalide."}
                </p>

                <p className="mt-4 text-sm leading-7 text-gray-700">
                  {isEnglish
                    ? "Closed appointments remain visible in the history but can no longer be modified."
                    : "Programările închise rămân vizibile în istoric, dar nu mai pot fi modificate."}
                </p>
              </article>
            </div>

            <h3 className="mt-9 text-2xl font-bold text-gray-900">
              {isEnglish
                ? "Appointment statuses"
                : "Statusurile programărilor"}
            </h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointmentStatuses.map(
                (status) => (
                  <article
                    key={status.title}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <h4 className="font-semibold text-gray-900">
                      {status.title}
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {status.body}
                    </p>
                  </article>
                )
              )}
            </div>
          </section>

          <section
            id="dosar-medical"
            aria-labelledby="medical-folder-title"
            className="mt-8 scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Patient medical folder"
                : "Dosarul medical al pacientului"}
            </p>

            <h2
              id="medical-folder-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "Add clinical documents before completing the appointment"
                : "Adaugă documentele clinice înainte de finalizarea programării"}
            </h2>

            <p className="mt-5 text-sm leading-7 text-gray-700">
              {isEnglish
                ? "The medical folder is available only when the appointment is linked to a registered patient account. It opens in a separate secure browser tab from the appointment details."
                : "Dosarul medical este disponibil numai atunci când programarea este asociată unui cont de pacient înregistrat. Acesta se deschide într-o filă securizată separată din detaliile programării."}
            </p>

            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-gray-200 p-5">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEnglish
                    ? "Documents that may be added"
                    : "Documente care pot fi adăugate"}
                </h3>

                <ul className="mt-4 space-y-3">
                  {medicalDocumentTypes.map(
                    (documentType) => (
                      <li
                        key={
                          documentType
                        }
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#036661]"
                        />

                        <span>
                          {
                            documentType
                          }
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </article>

              <article className="rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEnglish
                    ? "Open and closed folders"
                    : "Dosare deschise și închise"}
                </h3>

                <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700">
                  <p>
                    <strong>
                      {isEnglish
                        ? "Confirmed or rescheduled:"
                        : "Confirmată sau reprogramată:"}
                    </strong>{" "}
                    {isEnglish
                      ? "notes and documents can be added, downloaded and, where permitted, deleted."
                      : "pot fi adăugate note și documente, acestea pot fi descărcate și, unde există permisiune, șterse."}
                  </p>

                  <p>
                    <strong>
                      {isEnglish
                        ? "Completed:"
                        : "Finalizată:"}
                    </strong>{" "}
                    {isEnglish
                      ? "the folder becomes read-only. Existing documents remain available for viewing, download and PDF generation, but no new content can be added or deleted."
                      : "dosarul devine disponibil numai pentru citire. Documentele existente rămân disponibile pentru consultare, descărcare și generare PDF, dar nu mai pot fi adăugate sau șterse elemente."}
                  </p>

                  <p>
                    <strong>
                      {isEnglish
                        ? "Pending, cancelled or no-show:"
                        : "În așteptare, anulată sau neprezentare:"}
                    </strong>{" "}
                    {isEnglish
                      ? "the medical folder is not available for clinical uploads."
                      : "Dosarul medical nu este disponibil pentru încărcări clinice."}
                  </p>
                </div>
              </article>
            </div>

            <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="text-lg font-semibold text-red-950">
                {isEnglish
                  ? "Important before completion"
                  : "Important înainte de finalizare"}
              </h3>

              <p className="mt-3 text-sm leading-7 text-red-900">
                {isEnglish
                  ? "Upload all necessary notes and documents before selecting “Mark as completed”. After completion, the medical folder is locked against uploads and deletion."
                  : "Încarcă toate notele și documentele necesare înainte de selectarea acțiunii „Marchează finalizată”. După finalizare, Dosarul medical este blocat pentru încărcări și ștergeri."}
              </p>
            </div>
          </section>

          <section
            id="procedura"
            aria-labelledby="workflow-title"
            className="mt-8 scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Recommended workflow"
                : "Procedura recomandată"}
            </p>

            <h2
              id="workflow-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "From confirmation to completion"
                : "De la confirmare la finalizare"}
            </h2>

            <ol className="mt-7 space-y-0">
              {workflow.map(
                (step, index) => (
                  <li
                    key={step}
                    className="relative flex gap-4 pb-7 last:pb-0"
                  >
                    {index <
                      workflow.length -
                        1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-5 top-10 h-[calc(100%-1.5rem)] w-px bg-[#036661]/30"
                      />
                    )}

                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#036661] font-bold text-white">
                      {index + 1}
                    </span>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
                      <p className="font-semibold leading-7 text-gray-900">
                        {step}
                      </p>
                    </div>
                  </li>
                )
              )}
            </ol>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-950">
                {isEnglish
                  ? "Do not complete the appointment before the clinical documentation is ready."
                  : "Nu finaliza programarea înainte ca documentația clinică să fie pregătită."}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="completion-title"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Completion checklist"
                : "Verificare înainte de finalizare"}
            </p>

            <h2
              id="completion-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "Before selecting “Mark as completed”"
                : "Înainte de a selecta „Marchează finalizată”"}
            </h2>

            <ul className="mt-7 space-y-4">
              {completionChecklist.map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-start gap-4 rounded-2xl border border-gray-200 p-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-800"
                    >
                      ✓
                    </span>

                    <span className="pt-1 text-sm leading-7 text-gray-700">
                      {item}
                    </span>
                  </li>
                )
              )}
            </ul>
          </section>

          <section
            id="securitate"
            aria-labelledby="security-title"
            className="mt-8 scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish
                ? "Privacy and security"
                : "Confidențialitate și securitate"}
            </p>

            <h2
              id="security-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {isEnglish
                ? "Protect patient information"
                : "Protejează informațiile pacientului"}
            </h2>

            <ul className="mt-7 space-y-4">
              {securityRules.map(
                (rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-4 text-sm leading-7 text-gray-700"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#036661]"
                    />

                    <span>
                      {rule}
                    </span>
                  </li>
                )
              )}
            </ul>

            <p className="mt-7 rounded-2xl bg-gray-50 p-5 text-sm leading-7 text-gray-700">
              {isEnglish
                ? "Important document actions may be recorded for security, accountability and audit. The doctor remains responsible for the medical act, while authorized staff must follow the doctor’s instructions and the clinic’s rules."
                : "Acțiunile importante asupra documentelor pot fi înregistrate pentru siguranță, responsabilitate și audit. Medicul rămâne responsabil pentru actul medical, iar personalul autorizat trebuie să respecte instrucțiunile medicului și regulile clinicii."}
            </p>
          </section>

          <section className="mt-8 rounded-3xl bg-[#036661] p-6 text-white shadow-sm sm:p-8 lg:p-10">
            <h2 className="text-3xl font-bold">
              {isEnglish
                ? "Ready to use RomDoc?"
                : "Ești pregătit să folosești RomDoc?"}
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85">
              {isEnglish
                ? "Sign in to manage appointments or create a doctor account to begin configuring your public profile and medical practice."
                : "Autentifică-te pentru a administra programările sau creează un cont de medic pentru a începe configurarea profilului public și a activității medicale."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-[#036661] transition hover:bg-gray-100"
              >
                {isEnglish
                  ? "Sign in"
                  : "Autentificare"}
              </Link>

              <Link
                href={registerHref}
                className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                {isEnglish
                  ? "Create doctor account"
                  : "Creează cont de medic"}
              </Link>

              <Link
                href={homeHref}
                className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                {isEnglish
                  ? "RomDoc home"
                  : "Pagina principală"}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
