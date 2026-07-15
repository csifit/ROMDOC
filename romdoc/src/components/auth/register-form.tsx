"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import {
  type AppLocale,
} from "@/i18n/routing";
import {
  getIndependentDoctorRegistrationMetadata,
} from "@/lib/doctors/independent-doctor-registration";
import {
  createClient,
} from "@/lib/supabase/client";

type RegistrationType =
  | "patient"
  | "doctor"
  | "clinic";

type SelectOption = {
  id: string;
  name: string;
};

type RegisterFormProps = {
  specialties: SelectOption[];
  locale: AppLocale;
  initialRegistrationType:
    RegistrationType;
};

type FieldProps = {
  label: string;
  optional?: boolean;
  children: ReactNode;
};

type IndependentCopy = {
  tabLabel: string;
  submitLabel: string;
  title: string;
  description: string;
  billing: string;
  immutable: string;
  acknowledgement: string;
  acknowledgementError: string;
};

const INDEPENDENT_COPY:
  Record<AppLocale, IndependentCopy> = {
    ro: {
      tabLabel:
        "Sunt medic independent",

      submitLabel:
        "Continuă ca medic independent",

      title:
        "Cont de medic independent",

      description:
        "Acest formular creează un cont profesional independent, asociat exclusiv adresei de e-mail introduse aici.",

      billing:
        "Abonamentul RomDoc este plătit direct de medic: 60 RON/lună + TVA sau 600 RON/an + TVA.",

      immutable:
        "Contul nu poate fi transformat ulterior într-un cont plătit de clinică. Pentru acoperire plătită de clinică este necesară o invitație separată, trimisă la o altă adresă de e-mail, care va crea un alt utilizator RomDoc.",

      acknowledgement:
        "Înțeleg că acest cont rămâne independent și nu poate primi ulterior acoperire plătită de clinică.",

      acknowledgementError:
        "Confirmă că ai înțeles caracterul independent și permanent al acestui cont.",
    },

    en: {
      tabLabel:
        "I am an independent doctor",

      submitLabel:
        "Continue as an independent doctor",

      title:
        "Independent doctor account",

      description:
        "This form creates an independent professional account associated exclusively with the email address entered here.",

      billing:
        "The RomDoc subscription is paid directly by the doctor: RON 60/month plus VAT or RON 600/year plus VAT.",

      immutable:
        "This account cannot later be converted into a clinic-paid account. Clinic-paid coverage requires a separate invitation sent to another email address, creating another RomDoc user.",

      acknowledgement:
        "I understand that this account remains independent and cannot later receive clinic-paid coverage.",

      acknowledgementError:
        "Confirm that you understand the independent and permanent nature of this account.",
    },

    de: {
      tabLabel:
        "Ich bin selbstständiger Arzt",

      submitLabel:
        "Als selbstständiger Arzt fortfahren",

      title:
        "Konto für selbstständige Ärzte",

      description:
        "Dieses Formular erstellt ein unabhängiges berufliches Konto, das ausschließlich mit der hier angegebenen E-Mail-Adresse verknüpft ist.",

      billing:
        "Das RomDoc-Abonnement wird direkt vom Arzt bezahlt: 60 RON pro Monat zuzüglich Mehrwertsteuer oder 600 RON pro Jahr zuzüglich Mehrwertsteuer.",

      immutable:
        "Dieses Konto kann später nicht in ein von einer Klinik bezahltes Konto umgewandelt werden. Eine von einer Klinik bezahlte Abdeckung erfordert eine separate Einladung an eine andere E-Mail-Adresse und erstellt einen weiteren RomDoc-Benutzer.",

      acknowledgement:
        "Ich verstehe, dass dieses Konto unabhängig bleibt und später keine von einer Klinik bezahlte Abdeckung erhalten kann.",

      acknowledgementError:
        "Bestätigen Sie, dass Sie den unabhängigen und dauerhaften Charakter dieses Kontos verstanden haben.",
    },
  };

function Field({
  label,
  optional = false,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      {optional ? (
        <span className="ml-2 text-xs text-gray-500">
          Opțional
        </span>
      ) : null}

      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-wait disabled:bg-gray-100";
}

function getSafeNextPath() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/patient-dashboard";
  }

  const searchParams =
    new URLSearchParams(
      window.location.search
    );

  const nextPath =
    searchParams.get("next");

  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//")
  ) {
    return "/patient-dashboard";
  }

  return nextPath;
}

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

export default function RegisterForm({
  specialties,
  locale,
  initialRegistrationType,
}: RegisterFormProps) {
  const independentCopy =
    INDEPENDENT_COPY[locale] ??
    INDEPENDENT_COPY.ro;

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    registrationType,
    setRegistrationType,
  ] = useState<RegistrationType>(
    initialRegistrationType
  );

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    email,
    setEmail,
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
    message,
    setMessage,
  ] = useState("");

  const [
    clinicName,
    setClinicName,
  ] = useState("");

  const [
    clinicCity,
    setClinicCity,
  ] = useState("");

  const [
    clinicWebsite,
    setClinicWebsite,
  ] = useState("");

  const [
    billingCompanyName,
    setBillingCompanyName,
  ] = useState("");

  const [
    billingTaxId,
    setBillingTaxId,
  ] = useState("");

  const [
    billingTradeRegisterNumber,
    setBillingTradeRegisterNumber,
  ] = useState("");

  const [
    billingAddress,
    setBillingAddress,
  ] = useState("");

  const [
    billingCity,
    setBillingCity,
  ] = useState("");

  const [
    billingCounty,
    setBillingCounty,
  ] = useState("");

  const [
    billingCountry,
    setBillingCountry,
  ] = useState("România");

  const [
    billingEmail,
    setBillingEmail,
  ] = useState("");

  const [
    isVatPayer,
    setIsVatPayer,
  ] = useState(false);

  const [
    vatNumber,
    setVatNumber,
  ] = useState("");

  const [
    acceptedIndependentAccount,
    setAcceptedIndependentAccount,
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

  const isDoctor =
    registrationType === "doctor";

  const isClinic =
    registrationType === "clinic";

  const loginPath =
    useMemo(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "/login";
      }

      const nextPath =
        getSafeNextPath();

      if (
        nextPath ===
        "/patient-dashboard"
      ) {
        return "/login";
      }

      return `/login?next=${encodeURIComponent(
        nextPath
      )}`;
    }, []);

  function selectRegistrationType(
    type: RegistrationType
  ) {
    setRegistrationType(type);
    setError(null);

    if (type !== "doctor") {
      setAcceptedIndependentAccount(
        false
      );
    }

    if (
      typeof window !==
      "undefined"
    ) {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.set(
        "type",
        type
      );

      url.searchParams.set(
        "role",
        type
      );

      window.history.replaceState(
        {},
        "",
        url
      );
    }
  }

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
      email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      phone.trim();

    const normalizedBillingEmail =
      billingEmail
        .trim()
        .toLowerCase();

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
        "Introdu o adresă de e-mail validă."
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

    if (isDoctor) {
      if (
        normalizedPhone.length <
        7
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

      if (
        !acceptedIndependentAccount
      ) {
        setError(
          independentCopy
            .acknowledgementError
        );
        return;
      }
    }

    if (isClinic) {
      if (
        normalizedPhone.length <
        7
      ) {
        setError(
          "Introdu un număr de telefon valid pentru persoana de contact."
        );
        return;
      }

      if (
        clinicName.trim().length <
        2
      ) {
        setError(
          "Introdu denumirea clinicii sau organizației."
        );
        return;
      }

      if (
        clinicCity.trim().length <
        2
      ) {
        setError(
          "Introdu orașul clinicii."
        );
        return;
      }

      if (
        billingCompanyName
          .trim().length < 2
      ) {
        setError(
          "Introdu denumirea firmei pentru facturare."
        );
        return;
      }

      if (
        billingTaxId
          .trim().length < 2
      ) {
        setError(
          "Introdu CUI-ul firmei."
        );
        return;
      }

      if (
        billingAddress
          .trim().length < 5
      ) {
        setError(
          "Introdu adresa de facturare."
        );
        return;
      }

      if (
        billingCity.trim().length <
        2
      ) {
        setError(
          "Introdu orașul de facturare."
        );
        return;
      }

      if (
        billingCounty
          .trim().length < 2
      ) {
        setError(
          "Introdu județul de facturare."
        );
        return;
      }

      if (
        !normalizedBillingEmail ||
        !normalizedBillingEmail
          .includes("@")
      ) {
        setError(
          "Introdu o adresă de e-mail validă pentru facturare."
        );
        return;
      }
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

          const nextPath =
            isDoctor
              ? "/doctor-application"
              : isClinic
                ? "/dashboard"
                : getSafeNextPath();

          const confirmationUrl =
            new URL(
              "/auth/confirm",
              window.location
                .origin
            );

          confirmationUrl
            .searchParams
            .set(
              "next",
              nextPath
            );

          const independentMetadata =
            isDoctor
              ? getIndependentDoctorRegistrationMetadata()
              : {
                  doctor_account_type:
                    null,

                  registration_source:
                    null,
                };

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
                    registration_type:
                      registrationType,

                    ...independentMetadata,

                    first_name:
                      normalizedFirstName,

                    last_name:
                      normalizedLastName,

                    phone:
                      isDoctor ||
                      isClinic
                        ? normalizedPhone
                        : null,

                    specialty_id:
                      isDoctor
                        ? specialtyId
                        : null,

                    professional_registration_number:
                      isDoctor
                        ? professionalRegistrationNumber
                            .trim()
                        : null,

                    message:
                      isDoctor ||
                      isClinic
                        ? message
                            .trim()
                        : null,

                    clinic_name:
                      isClinic
                        ? clinicName
                            .trim()
                        : null,

                    clinic_city:
                      isClinic
                        ? clinicCity
                            .trim()
                        : null,

                    clinic_website:
                      isClinic
                        ? clinicWebsite
                            .trim()
                        : null,

                    billing_company_name:
                      isClinic
                        ? billingCompanyName
                            .trim()
                        : null,

                    billing_tax_id:
                      isClinic
                        ? billingTaxId
                            .trim()
                        : null,

                    billing_trade_register_number:
                      isClinic
                        ? billingTradeRegisterNumber
                            .trim()
                        : null,

                    billing_address:
                      isClinic
                        ? billingAddress
                            .trim()
                        : null,

                    billing_city:
                      isClinic
                        ? billingCity
                            .trim()
                        : null,

                    billing_county:
                      isClinic
                        ? billingCounty
                            .trim()
                        : null,

                    billing_country:
                      isClinic
                        ? billingCountry
                            .trim()
                        : null,

                    billing_email:
                      isClinic
                        ? normalizedBillingEmail
                        : null,

                    is_vat_payer:
                      isClinic
                        ? isVatPayer
                        : null,

                    vat_number:
                      isClinic
                        ? vatNumber
                            .trim()
                        : null,
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
                "Există deja un cont pentru această adresă de e-mail."
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

          if (
            data.user &&
            !data.session
          ) {
            const searchParams =
              new URLSearchParams({
                email:
                  normalizedEmail,

                type:
                  registrationType,

                next:
                  nextPath,
              });

            router.replace(
              `/check-email?${searchParams.toString()}`
            );

            router.refresh();
            return;
          }

          if (data.session) {
            router.replace(
              nextPath
            );

            router.refresh();
            return;
          }

          setError(
            "Contul nu a putut fi creat. Încearcă din nou."
          );
        } catch (
          registrationError
        ) {
          console.error(
            "Registration failed:",
            registrationError
          );

          setError(
            "Înregistrarea nu a putut fi finalizată."
          );
        }
      }
    );
  }

  const submitLabel =
    isDoctor
      ? independentCopy
          .submitLabel
      : isClinic
        ? "Trimite cererea clinicii"
        : "Creează cont de pacient";

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <Link
          href="/"
          className="inline-block text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Creează un cont
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Alege tipul contului pe
          care dorești să îl creezi.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Tip cont"
        className="mt-8 grid grid-cols-1 gap-1 rounded-xl bg-[#F0EEE9] p-1 sm:grid-cols-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            registrationType ===
            "patient"
          }
          onClick={() =>
            selectRegistrationType(
              "patient"
            )
          }
          className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
            registrationType ===
            "patient"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sunt pacient
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isDoctor}
          onClick={() =>
            selectRegistrationType(
              "doctor"
            )
          }
          className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
            isDoctor
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {independentCopy.tabLabel}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isClinic}
          onClick={() =>
            selectRegistrationType(
              "clinic"
            )
          }
          className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
            isClinic
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Suntem clinică
        </button>
      </div>

      {isDoctor ? (
        <section className="mt-6 space-y-3 rounded-2xl border border-[#036661]/25 bg-[#F0EEE9] p-5">
          <h2 className="text-base font-bold text-gray-950">
            {independentCopy.title}
          </h2>

          <p className="text-sm leading-6 text-gray-700">
            {
              independentCopy
                .description
            }
          </p>

          <p className="text-sm leading-6 text-gray-700">
            {
              independentCopy
                .billing
            }
          </p>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
            {
              independentCopy
                .immutable
            }
          </p>
        </section>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {isClinic ? (
            <>
              Contul de clinică este
              pentru organizații care
              doresc să invite medici,
              să centralizeze
              abonamentele acoperite
              de clinică și să
              urmărească datele de
              facturare.
            </>
          ) : (
            <>
              Contul de pacient îți
              permite să soliciți
              programări și să
              consulți istoricul
              acestora.
            </>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900">
            Date cont
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prenume">
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
            </Field>

            <Field label="Nume">
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
            </Field>
          </div>

          <Field label="E-mail">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              disabled={isPending}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              className={
                inputClassName()
              }
            />
          </Field>

          {(isDoctor ||
            isClinic) ? (
            <Field label="Telefon">
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
            </Field>
          ) : null}
        </section>

        {isDoctor ? (
          <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-semibold text-gray-900">
              Date medic independent
            </h2>

            <Field label="Specialitate">
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
                  Selectează
                  specialitatea
                </option>

                {specialties.map(
                  (specialty) => (
                    <option
                      key={
                        specialty.id
                      }
                      value={
                        specialty.id
                      }
                    >
                      {
                        specialty.name
                      }
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field
              label="Număr profesional"
              optional
            >
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
                placeholder="Număr de parafă sau identificator profesional"
                className={
                  inputClassName()
                }
              />
            </Field>

            <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-600">
              Numărul profesional este
              informativ. RomDoc nu
              compară automat conturile
              cu același număr, nu
              afișează avertismente și
              nu unește conturi.
            </p>

            <Field
              label="Mesaj"
              optional
            >
              <textarea
                rows={4}
                maxLength={1000}
                value={message}
                disabled={isPending}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Alte informații relevante"
                className={`${inputClassName()} resize-y`}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-xl border border-[#036661]/25 bg-white p-4">
              <input
                type="checkbox"
                required
                checked={
                  acceptedIndependentAccount
                }
                disabled={isPending}
                onChange={(event) =>
                  setAcceptedIndependentAccount(
                    event.target
                      .checked
                  )
                }
                className="mt-1 h-4 w-4 shrink-0"
              />

              <span className="text-sm font-medium leading-6 text-gray-800">
                {
                  independentCopy
                    .acknowledgement
                }
              </span>
            </label>
          </section>
        ) : null}

        {isClinic ? (
          <>
            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Date clinică /
                organizație
              </h2>

              <Field label="Denumire clinică / organizație">
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={180}
                  value={clinicName}
                  disabled={isPending}
                  onChange={(event) =>
                    setClinicName(
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClassName()
                  }
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Oraș">
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={clinicCity}
                    disabled={isPending}
                    onChange={(event) =>
                      setClinicCity(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>

                <Field
                  label="Website"
                  optional
                >
                  <input
                    type="url"
                    maxLength={250}
                    value={
                      clinicWebsite
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setClinicWebsite(
                        event.target
                          .value
                      )
                    }
                    placeholder="https://clinica.ro"
                    className={
                      inputClassName()
                    }
                  />
                </Field>
              </div>

              <Field
                label="Mesaj"
                optional
              >
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={message}
                  disabled={isPending}
                  onChange={(event) =>
                    setMessage(
                      event.target
                        .value
                    )
                  }
                  placeholder="Exemplu: numărul aproximativ de medici, orașe sau întrebări despre oferta pentru clinici"
                  className={`${inputClassName()} resize-y`}
                />
              </Field>
            </section>

            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Date de facturare
              </h2>

              <Field label="Denumire firmă">
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={180}
                  value={
                    billingCompanyName
                  }
                  disabled={isPending}
                  onChange={(event) =>
                    setBillingCompanyName(
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClassName()
                  }
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="CUI">
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={
                      billingTaxId
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingTaxId(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>

                <Field
                  label="Nr. Registrul Comerțului"
                  optional
                >
                  <input
                    type="text"
                    maxLength={80}
                    value={
                      billingTradeRegisterNumber
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingTradeRegisterNumber(
                        event.target
                          .value
                      )
                    }
                    placeholder="J02/000/2026"
                    className={
                      inputClassName()
                    }
                  />
                </Field>
              </div>

              <Field label="Adresă de facturare">
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={250}
                  value={
                    billingAddress
                  }
                  disabled={isPending}
                  onChange={(event) =>
                    setBillingAddress(
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClassName()
                  }
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Oraș facturare">
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={
                      billingCity
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCity(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>

                <Field label="Județ">
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={
                      billingCounty
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCounty(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Țară">
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={
                      billingCountry
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCountry(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>

                <Field label="E-mail facturare">
                  <input
                    type="email"
                    required
                    value={
                      billingEmail
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingEmail(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClassName()
                    }
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={
                      isVatPayer
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setIsVatPayer(
                        event.target
                          .checked
                      )
                    }
                    className="mt-1 h-4 w-4 shrink-0"
                  />

                  <span className="text-sm leading-6 text-gray-700">
                    Firma este
                    plătitoare de TVA
                  </span>
                </label>

                {isVatPayer ? (
                  <div className="mt-4">
                    <Field
                      label="Cod TVA"
                      optional
                    >
                      <input
                        type="text"
                        maxLength={60}
                        value={
                          vatNumber
                        }
                        disabled={
                          isPending
                        }
                        onChange={(
                          event
                        ) =>
                          setVatNumber(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="RO12345678"
                        className={
                          inputClassName()
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Parolă">
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
          </Field>

          <Field label="Confirmă parola">
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
          </Field>
        </div>

        <p className="text-xs leading-5 text-gray-500">
          Parola trebuie să conțină
          minimum 8 caractere, o literă
          mare, o literă mică și o
          cifră.
        </p>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <input
            id="accepted-terms"
            type="checkbox"
            aria-labelledby="accepted-terms-label"
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

          <p
            id="accepted-terms-label"
            className="text-sm leading-6 text-gray-700"
          >
            <label
              htmlFor="accepted-terms"
              className="cursor-pointer"
            >
              Sunt de acord cu{" "}
            </label>

            <Link
              href="/termeni-si-conditii"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800]"
            >
              termenii și condițiile
            </Link>{" "}
            și{" "}
            <Link
              href="/confidentialitate"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800]"
            >
              politica de
              confidențialitate
            </Link>{" "}
            RomDoc.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={isPending}
          loadingText="Se creează contul..."
        >
          {submitLabel}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Ai deja un cont?{" "}

        <Link
          href={loginPath}
          className="romdoc-link underline-offset-4 hover:underline"
        >
          Autentificare
        </Link>
      </p>
    </div>
  );
}
