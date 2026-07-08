import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.romdoc.fit"
).replace(/\/+$/, "");

function isLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === "en";

  const title = isEnglish
    ? "User guide for doctors and medical staff"
    : "Ghid de utilizare pentru medici și personalul medical";

  const description = isEnglish
    ? "Learn how doctors and authorized medical staff use RomDoc to manage appointments, patient medical folders and SMS appointment notifications."
    : "Află cum folosesc medicii și personalul medical autorizat RomDoc pentru programări, Dosarul medical al pacientului și notificări SMS de programare.";

  const canonical = isEnglish
    ? "/en/doctor-staff-guide"
    : "/ro/ghid-medici-personal";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ro: "/ro/ghid-medici-personal",
        en: "/en/doctor-staff-guide",
        "x-default": "/ro/ghid-medici-personal",
      },
    },
    openGraph: {
      type: "article",
      locale: isEnglish ? "en_US" : "ro_RO",
      siteName: "RomDoc",
      title,
      description,
      url: `${siteUrl}${canonical}`,
    },
  };
}

export default async function DoctorStaffGuidePage({
  params,
}: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const isEnglish = locale === "en";
  const homeHref = isEnglish ? "/en" : "/ro";
  const registerHref = "/register?role=doctor";
  const loginHref = "/login";

  const permissions = [
    {
      title: isEnglish ? "Doctor access" : "Accesul medicului",
      body: isEnglish
        ? "The doctor manages their own appointments, clinics, availability, services and patient medical-folder records. The doctor remains responsible for the medical act and the accuracy of clinical information."
        : "Medicul își administrează programările, clinicile, disponibilitatea, serviciile și documentele din Dosarul medical al pacienților. Medicul rămâne responsabil pentru actul medical și pentru corectitudinea informațiilor clinice.",
    },
    {
      title: isEnglish ? "Authorized staff access" : "Accesul personalului autorizat",
      body: isEnglish
        ? "An active staff member can support the doctor with appointment management, messaging and medical-folder operations for the doctor they are assigned to. Access ends when the assignment is deactivated."
        : "Un membru activ al personalului poate ajuta medicul cu administrarea programărilor, mesajele și operațiunile din Dosarul medical pentru medicul la care este atribuit. Accesul încetează atunci când atribuirea este dezactivată.",
    },
  ];

  const appointmentStatuses = [
    {
      title: isEnglish ? "Pending" : "În așteptare",
      body: isEnglish
        ? "The patient submitted a request that has not yet been confirmed."
        : "Pacientul a trimis o solicitare care nu a fost încă confirmată.",
    },
    {
      title: isEnglish ? "Confirmed" : "Confirmată",
      body: isEnglish
        ? "The date and time were accepted. When SMS is enabled by the platform, the patient may receive an appointment confirmation SMS."
        : "Data și ora au fost acceptate. Atunci când serviciul SMS este activat în platformă, pacientul poate primi un SMS de confirmare a programării.",
    },
    {
      title: isEnglish ? "Rescheduled" : "Reprogramată",
      body: isEnglish
        ? "The appointment was moved to another date or time. The medical folder remains open."
        : "Programarea a fost mutată la o altă dată sau oră. Dosarul medical rămâne deschis.",
    },
    {
      title: isEnglish ? "Completed" : "Finalizată",
      body: isEnglish
        ? "The consultation is closed. Existing medical-folder content becomes read-only."
        : "Consultația este închisă. Conținutul existent din Dosarul medical devine disponibil numai pentru citire.",
    },
    {
      title: isEnglish ? "Cancelled" : "Anulată",
      body: isEnglish
        ? "The appointment will no longer take place and cannot be modified."
        : "Programarea nu va mai avea loc și nu mai poate fi modificată.",
    },
    {
      title: isEnglish ? "No-show" : "Neprezentare",
      body: isEnglish
        ? "The patient did not attend the appointment."
        : "Pacientul nu s-a prezentat la programare.",
    },
  ];

  const smsRules = [
    isEnglish
      ? "SMS messages are operational appointment notifications, not medical communication."
      : "SMS-urile sunt notificări operaționale despre programare, nu comunicare medicală.",
    isEnglish
      ? "SMS confirmations can be sent when an appointment becomes confirmed."
      : "Confirmările SMS pot fi trimise atunci când o programare devine confirmată.",
    isEnglish
      ? "RomDoc can also send a 24-hour SMS reminder for the patient."
      : "Platforma RomDoc poate trimite și o reamintire SMS către pacient cu 24 de ore înainte.",
    isEnglish
      ? "The messaging/SMS service is billed separately from the doctor subscription. Subscription fees do not include SMS provider costs."
      : "Serviciul de mesagerie/SMS este facturat separat de abonamentul medicului. Costurile SMS nu sunt incluse în abonament.",
    isEnglish
      ? "Unpaid SMS costs cumulate from month to month until the outstanding balance is paid."
      : "Costurile SMS neplătite se cumulează de la o lună la alta până la achitarea soldului restant.",
    isEnglish
      ? "The doctor can pay the outstanding SMS balance through RomDoc/Stripe; the fiscal invoice is issued separately through SAGA."
      : "Medicul poate achita soldul SMS restant prin RomDoc/Stripe; factura fiscală este emisă separat prin SAGA.",
    isEnglish
      ? "SMS text should not contain diagnosis, symptoms, medical notes, uploaded document names or investigation results."
      : "Textul SMS nu trebuie să conțină diagnostic, simptome, note medicale, nume de documente încărcate sau rezultate de investigații.",
  ];

  const creationFields = [
    isEnglish ? "Doctor" : "Medicul",
    isEnglish ? "Clinic" : "Clinica",
    isEnglish ? "Booking source" : "Sursa programării",
    isEnglish ? "Patient name" : "Numele pacientului",
    isEnglish ? "Phone number" : "Numărul de telefon",
    isEnglish ? "Email address" : "Adresa de e-mail",
    isEnglish ? "Available time slot" : "Interval disponibil",
    isEnglish ? "Optional notes" : "Observații opționale",
  ];

  const workflow = [
    isEnglish ? "The appointment is confirmed" : "Programarea este confirmată",
    isEnglish ? "The patient receives email confirmation and, when enabled, SMS confirmation" : "Pacientul primește confirmare prin e-mail și, atunci când este activ, confirmare prin SMS",
    isEnglish ? "The patient may receive a 24-hour SMS reminder when the reminder service is enabled" : "Pacientul poate primi o reamintire SMS cu 24 de ore înainte atunci când serviciul este activ",
    isEnglish ? "The patient arrives at the clinic" : "Pacientul se prezintă la clinică",
    isEnglish ? "The doctor performs the consultation and necessary investigations" : "Medicul efectuează consultația și investigațiile necesare",
    isEnglish ? "The doctor or authorized staff uploads the relevant medical-folder documents, when needed" : "Medicul sau personalul autorizat încarcă documentele relevante în Dosarul medical, atunci când este necesar",
    isEnglish ? "The appointment is closed using “Mark as completed”" : "Programarea este închisă folosind acțiunea „Marchează finalizată”",
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
              {isEnglish ? "Guide for doctors and staff" : "Ghid pentru medici și personal"}
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {isEnglish
                ? "User guide for doctors and medical staff"
                : "Ghid de utilizare pentru medici și personalul medical"}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">
              {isEnglish
                ? "This guide explains how doctors and authorized staff use RomDoc to manage appointments, work with the patient medical folder and understand appointment SMS notifications and separate SMS billing."
                : "Acest ghid explică modul în care medicii și personalul autorizat folosesc RomDoc pentru administrarea programărilor, lucrul cu Dosarul medical al pacientului, notificările SMS de programare și facturarea separată a serviciului SMS."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={loginHref} className="romdoc-button romdoc-button-primary">
                {isEnglish ? "Sign in" : "Autentificare"}
              </Link>
              <Link href={registerHref} className="romdoc-button romdoc-button-secondary">
                {isEnglish ? "Join as a doctor" : "Înscrie-te ca medic"}
              </Link>
            </div>
          </header>

          <section id="acces" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Access" : "Acces"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "Who can do what" : "Cine poate face ce"}
            </h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {permissions.map((item) => (
                <article key={item.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-700">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="programari" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Appointments" : "Programări"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "Appointment statuses" : "Statusurile programărilor"}
            </h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {appointmentStatuses.map((status) => (
                <article key={status.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">{status.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-700">{status.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="sms" className="mt-8 rounded-3xl border border-[#036661]/20 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">SMS</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "SMS appointment service" : "Serviciul SMS pentru programări"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-700">
              {isEnglish
                ? "RomDoc can provide SMS notifications as an appointment communication service. This service has its own usage cost and is not part of the base doctor subscription."
                : "RomDoc oferă notificări SMS ca serviciu de comunicare pentru programări. Acest serviciu are cost propriu de utilizare și nu face parte din abonamentul de bază al medicului."}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
              {smsRules.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="creare-programare" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Manual appointments" : "Programări create manual"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "Fields used by doctors and staff" : "Câmpuri folosite de medici și personal"}
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {creationFields.map((field) => (
                <div key={field} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-800">
                  {field}
                </div>
              ))}
            </div>
          </section>

          <section id="flux" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Workflow" : "Flux de lucru"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "From confirmation to completion" : "De la confirmare la finalizare"}
            </h2>
            <ol className="mt-7 space-y-4">
              {workflow.map((item, index) => (
                <li key={item} className="flex gap-4 rounded-2xl border border-gray-200 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#036661] font-bold text-white">{index + 1}</span>
                  <p className="pt-2 text-sm leading-6 text-gray-700">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="securitate" className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {isEnglish ? "Security" : "Securitate"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {isEnglish ? "Safe use rules" : "Reguli de utilizare sigură"}
            </h2>
            <ul className="mt-7 space-y-3 text-sm leading-7 text-gray-700">
              {securityRules.map((rule) => (
                <li key={rule} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={homeHref} className="romdoc-button romdoc-button-secondary">
              {isEnglish ? "Back to RomDoc" : "Înapoi la RomDoc"}
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
