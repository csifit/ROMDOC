"use client";

import Link from "next/link";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  type AppLocale,
} from "@/i18n/routing";
import {
  getClinicInvitedDoctorRegistrationMetadata,
} from "@/lib/doctors/clinic-invited-doctor-registration";
import {
  createClient,
} from "@/lib/supabase/client";

type SelectOption = {
  id: string;
  name: string;
};

type ClinicInvitedDoctorRegisterFormProps = {
  token: string;
  invitedEmail: string;
  specialties: SelectOption[];
  locale: AppLocale;
};

type LinkInviteResponse = {
  message?: string;
  error?: string;
  doctor?: {
    id: string;
    slug: string;
  };
};

type RegistrationCopy = {
  eyebrow: string;
  title: string;
  description: string;
  paymentNotice: string;
  accountNotice: string;
  acknowledgement: string;
  acknowledgementError: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  selectSpecialty: string;
  licence: string;
  licenceHint: string;
  password: string;
  confirmPassword: string;
  accept: string;
  terms: string;
  privacy: string;
  submit: string;
  submitting: string;
};

const COPY:
  Record<AppLocale, RegistrationCopy> = {
    ro: {
      eyebrow:
        "Invitație din partea clinicii",

      title:
        "Creează un cont separat de medic invitat",

      description:
        "Această invitație creează un cont RomDoc nou, cu o adresă de e-mail și un ID de utilizator separate de orice cont independent pe care îl ai deja.",

      paymentNotice:
        "Abonamentul acestui cont este plătit de organizația clinicii. Nu trebuie să activezi un abonament Stripe individual pentru acest cont.",

      accountNotice:
        "Tipul contului este „medic invitat de clinică” și nu poate fi schimbat ulterior în „medic independent”. Pentru activitate independentă este necesar un alt cont, creat cu o altă adresă de e-mail.",

      acknowledgement:
        "Înțeleg că acesta este un cont separat, plătit de clinică, și că nu poate fi transformat într-un cont independent.",

      acknowledgementError:
        "Confirmă că ai înțeles caracterul separat și permanent al contului invitat de clinică.",

      firstName: "Prenume",
      lastName: "Nume",
      email: "E-mailul invitației",
      phone: "Telefon",
      specialty: "Specialitate",
      selectSpecialty:
        "Selectează specialitatea",

      licence:
        "Cod parafă / număr profesional",

      licenceHint:
        "Opțional și informativ. RomDoc nu compară, nu avertizează și nu unește conturi care folosesc același număr.",

      password: "Parolă",
      confirmPassword:
        "Confirmă parola",

      accept: "Accept",
      terms: "Termenii și condițiile",
      privacy:
        "Politica de confidențialitate",

      submit:
        "Creează contul invitat de clinică",

      submitting:
        "Se creează contul...",
    },

    en: {
      eyebrow: "Clinic invitation",

      title:
        "Create a separate clinic-invited doctor account",

      description:
        "This invitation creates a new RomDoc account with an email address and user ID separate from any independent account you may already have.",

      paymentNotice:
        "The clinic organisation pays the subscription for this account. You do not need to activate an individual Stripe subscription for it.",

      accountNotice:
        "The account type is “clinic-invited doctor” and cannot later be changed to “independent doctor”. Independent activity requires another account created with another email address.",

      acknowledgement:
        "I understand that this is a separate clinic-paid account and cannot be converted into an independent account.",

      acknowledgementError:
        "Confirm that you understand the separate and permanent nature of the clinic-invited account.",

      firstName: "First name",
      lastName: "Last name",
      email: "Invitation email",
      phone: "Phone",
      specialty: "Specialty",
      selectSpecialty:
        "Select the specialty",

      licence:
        "Professional registration number",

      licenceHint:
        "Optional and informational. RomDoc does not compare, warn about or merge accounts using the same number.",

      password: "Password",
      confirmPassword:
        "Confirm password",

      accept: "I accept",
      terms: "Terms and Conditions",
      privacy: "Privacy Policy",

      submit:
        "Create clinic-invited account",

      submitting:
        "Creating account...",
    },

    de: {
      eyebrow: "Einladung der Klinik",

      title:
        "Separates Konto als von einer Klinik eingeladener Arzt erstellen",

      description:
        "Diese Einladung erstellt ein neues RomDoc-Konto mit einer E-Mail-Adresse und Benutzer-ID, die von jedem bereits bestehenden unabhängigen Konto getrennt sind.",

      paymentNotice:
        "Die Klinikorganisation bezahlt das Abonnement für dieses Konto. Für dieses Konto müssen Sie kein eigenes Stripe-Abonnement aktivieren.",

      accountNotice:
        "Der Kontotyp lautet „von einer Klinik eingeladener Arzt“ und kann später nicht in „selbstständiger Arzt“ geändert werden. Für eine unabhängige Tätigkeit ist ein weiteres Konto mit einer anderen E-Mail-Adresse erforderlich.",

      acknowledgement:
        "Ich verstehe, dass dies ein separates, von der Klinik bezahltes Konto ist und nicht in ein unabhängiges Konto umgewandelt werden kann.",

      acknowledgementError:
        "Bestätigen Sie, dass Sie den separaten und dauerhaften Charakter des von der Klinik eingeladenen Kontos verstanden haben.",

      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail der Einladung",
      phone: "Telefon",
      specialty: "Fachrichtung",
      selectSpecialty:
        "Fachrichtung auswählen",

      licence:
        "Berufliche Registrierungsnummer",

      licenceHint:
        "Optional und rein informativ. RomDoc vergleicht Konten mit derselben Nummer nicht, zeigt keine Warnungen an und führt sie nicht zusammen.",

      password: "Passwort",
      confirmPassword:
        "Passwort bestätigen",

      accept: "Ich akzeptiere",
      terms:
        "Allgemeinen Geschäftsbedingungen",

      privacy: "Datenschutzerklärung",

      submit:
        "Klinik-Einladungskonto erstellen",

      submitting:
        "Konto wird erstellt...",
    },
  };

function validatePassword(
  password: string
) {
  if (password.length < 8) {
    return "Parola trebuie să conțină cel puțin 8 caractere.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o literă mare.";
  }

  if (!/[a-z]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o literă mică.";
  }

  if (!/[0-9]/.test(password)) {
    return "Parola trebuie să conțină cel puțin o cifră.";
  }

  return null;
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-wait disabled:bg-gray-100";
}

export default function ClinicInvitedDoctorRegisterForm({
  token,
  invitedEmail,
  specialties,
  locale,
}: ClinicInvitedDoctorRegisterFormProps) {
  const text =
    COPY[locale] ??
    COPY.ro;

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    specialtyId,
    setSpecialtyId,
  ] = useState("");

  const [
    professionalRegistrationNumber,
    setProfessionalRegistrationNumber,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [
    acceptedAccountModel,
    setAcceptedAccountModel,
  ] = useState(false);

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    const normalizedEmail =
      invitedEmail
        .trim()
        .toLowerCase();

    const normalizedPhone =
      phone.trim();

    if (!token) {
      setError(
        "Linkul invitației nu conține tokenul necesar."
      );
      return;
    }

    if (
      normalizedFirstName.length <
      2
    ) {
      setError(
        "Introdu un prenume valid."
      );
      return;
    }

    if (
      normalizedLastName.length <
      2
    ) {
      setError(
        "Introdu un nume de familie valid."
      );
      return;
    }

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Invitația nu conține o adresă de e-mail validă."
      );
      return;
    }

    if (
      normalizedPhone.length < 7
    ) {
      setError(
        "Introdu un număr de telefon valid."
      );
      return;
    }

    if (!specialtyId) {
      setError(
        "Selectează specialitatea medicală."
      );
      return;
    }

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setError(
        "Parolele introduse nu coincid."
      );
      return;
    }

    if (!acceptedAccountModel) {
      setError(
        text.acknowledgementError
      );
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Trebuie să accepți termenii și politica de confidențialitate."
      );
      return;
    }

    startTransition(
      async () => {
        try {
          const supabase =
            createClient();

          const confirmationUrl =
            new URL(
              "/auth/confirm",
              window.location.origin
            );

          confirmationUrl
            .searchParams
            .set(
              "next",
              "/doctor-dashboard/profile"
            );

          const {
            data,
            error:
              signUpError,
          } =
            await supabase
              .auth
              .signUp({
                email:
                  normalizedEmail,

                password,

                options: {
                  emailRedirectTo:
                    confirmationUrl
                      .toString(),

                  data: {
                    ...getClinicInvitedDoctorRegistrationMetadata(
                      token
                    ),

                    first_name:
                      normalizedFirstName,

                    last_name:
                      normalizedLastName,

                    phone:
                      normalizedPhone,

                    specialty_id:
                      specialtyId,

                    professional_registration_number:
                      professionalRegistrationNumber
                        .trim() ||
                      null,

                    message:
                      "Clinic-invited doctor account. Clinic-paid coverage requires activation by the clinic organization.",
                  },
                },
              });

          if (signUpError) {
            const normalizedMessage =
              signUpError.message
                .toLowerCase();

            if (
              normalizedMessage
                .includes(
                  "already registered"
                ) ||
              normalizedMessage
                .includes(
                  "already been registered"
                )
            ) {
              setError(
                "Există deja un cont pentru această adresă de e-mail. Invitația clinicii necesită o adresă de e-mail nouă și un ID de utilizator separat."
              );
              return;
            }

            if (
              normalizedMessage
                .includes(
                  "database error saving new user"
                )
            ) {
              setError(
                "Contul nu a putut fi creat. Verifică migrarea bazei de date pentru înregistrare."
              );
              return;
            }

            setError(
              signUpError.message
            );
            return;
          }

          if (!data.user) {
            setError(
              "Contul nu a putut fi creat. Încearcă din nou."
            );
            return;
          }

          const linkResponse =
            await fetch(
              "/api/clinic-doctor-invitations/register",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    token,
                    userId:
                      data.user.id,
                    email:
                      normalizedEmail,
                  }),
              }
            );

          const linkResult =
            (await linkResponse
              .json()) as
              LinkInviteResponse;

          if (!linkResponse.ok) {
            setError(
              linkResult.error ??
                "Contul a fost creat, dar invitația clinicii nu a putut fi conectată. Contactează RomDoc."
            );
            return;
          }

          if (data.session) {
            router.replace(
              "/doctor-dashboard/profile"
            );

            router.refresh();
            return;
          }

          const checkEmailParams =
            new URLSearchParams({
              email:
                normalizedEmail,

              type: "doctor",

              next:
                "/doctor-dashboard/profile",
            });

          router.replace(
            `/check-email?${checkEmailParams.toString()}`
          );

          router.refresh();
        } catch (
          registrationError
        ) {
          console.error(
            "Clinic invited doctor registration failed:",
            registrationError
          );

          setError(
            "Înregistrarea nu a putut fi finalizată."
          );
        }
      }
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <Link
          href="/"
          className="inline-block text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <p className="mt-6 text-sm font-semibold text-[#036661]">
          {text.eyebrow}
        </p>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {text.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {text.description}
        </p>
      </header>

      <div className="mt-6 space-y-3">
        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
          {text.paymentNotice}
        </p>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-950">
          {text.accountNotice}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {text.firstName}
            </span>

            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="given-name"
              value={firstName}
              disabled={isPending}
              onChange={(event) =>
                setFirstName(
                  event.target.value
                )
              }
              className={
                inputClassName()
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {text.lastName}
            </span>

            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="family-name"
              value={lastName}
              disabled={isPending}
              onChange={(event) =>
                setLastName(
                  event.target.value
                )
              }
              className={
                inputClassName()
              }
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {text.email}
          </span>

          <input
            type="email"
            required
            readOnly
            value={invitedEmail}
            className={`${inputClassName()} cursor-not-allowed`}
          />

          <span className="mt-2 block text-xs leading-5 text-gray-500">
            Această adresă este fixată de invitație și trebuie să fie diferită de orice cont RomDoc existent.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {text.phone}
          </span>

          <input
            type="tel"
            required
            minLength={7}
            autoComplete="tel"
            value={phone}
            disabled={isPending}
            onChange={(event) =>
              setPhone(
                event.target.value
              )
            }
            placeholder="+40 700 000 000"
            className={
              inputClassName()
            }
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {text.specialty}
          </span>

          <select
            required
            value={specialtyId}
            disabled={isPending}
            onChange={(event) =>
              setSpecialtyId(
                event.target.value
              )
            }
            className={
              inputClassName()
            }
          >
            <option value="">
              {text.selectSpecialty}
            </option>

            {specialties.map(
              (specialty) => (
                <option
                  key={specialty.id}
                  value={specialty.id}
                >
                  {specialty.name}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {text.licence}
          </span>

          <input
            type="text"
            maxLength={150}
            value={
              professionalRegistrationNumber
            }
            disabled={isPending}
            onChange={(event) =>
              setProfessionalRegistrationNumber(
                event.target.value
              )
            }
            className={
              inputClassName()
            }
          />

          <span className="mt-2 block text-xs leading-5 text-gray-500">
            {text.licenceHint}
          </span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {text.password}
            </span>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              disabled={isPending}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              className={
                inputClassName()
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {
                text.confirmPassword
              }
            </span>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={
                passwordConfirmation
              }
              disabled={isPending}
              onChange={(event) =>
                setPasswordConfirmation(
                  event.target.value
                )
              }
              className={
                inputClassName()
              }
            />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-[#036661]/25 bg-[#F0EEE9] p-4">
          <input
            type="checkbox"
            required
            checked={
              acceptedAccountModel
            }
            disabled={isPending}
            onChange={(event) =>
              setAcceptedAccountModel(
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4 shrink-0"
          />

          <span className="text-sm font-medium leading-6 text-gray-800">
            {text.acknowledgement}
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            disabled={isPending}
            onChange={(event) =>
              setAcceptedTerms(
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4 shrink-0"
          />

          <span>
            {text.accept}{" "}

            <Link
              href="/termeni-si-conditii"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {text.terms}
            </Link>{" "}

            și{" "}

            <Link
              href="/confidentialitate"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {text.privacy}
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="romdoc-focus-ring w-full rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? text.submitting
            : text.submit}
        </button>
      </form>
    </div>
  );
}
