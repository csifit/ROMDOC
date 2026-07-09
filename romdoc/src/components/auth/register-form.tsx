"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/button";

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
};

function getSafeNextPath() {
  if (typeof window === "undefined") {
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

function getInitialRegistrationType():
  RegistrationType {
  if (typeof window === "undefined") {
    return "patient";
  }

  const searchParams =
    new URLSearchParams(
      window.location.search
    );

  const requestedType =
    searchParams.get("type") ??
    searchParams.get("role");

  if (requestedType === "doctor") {
    return "doctor";
  }

  if (
    requestedType === "clinic" ||
    requestedType === "clinica"
  ) {
    return "clinic";
  }

  return "patient";
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
}: RegisterFormProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [
    registrationType,
    setRegistrationType,
  ] = useState<RegistrationType>(
    getInitialRegistrationType
  );

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [phone, setPhone] =
    useState("");

  const [specialtyId, setSpecialtyId] =
    useState("");

  const [
    professionalRegistrationNumber,
    setProfessionalRegistrationNumber,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [clinicName, setClinicName] =
    useState("");

  const [clinicCity, setClinicCity] =
    useState("");

  const [clinicWebsite, setClinicWebsite] =
    useState("");

  const [billingCompanyName, setBillingCompanyName] =
    useState("");

  const [billingTaxId, setBillingTaxId] =
    useState("");

  const [
    billingTradeRegisterNumber,
    setBillingTradeRegisterNumber,
  ] = useState("");

  const [billingAddress, setBillingAddress] =
    useState("");

  const [billingCity, setBillingCity] =
    useState("");

  const [billingCounty, setBillingCounty] =
    useState("");

  const [billingCountry, setBillingCountry] =
    useState("România");

  const [billingEmail, setBillingEmail] =
    useState("");

  const [isVatPayer, setIsVatPayer] =
    useState(false);

  const [vatNumber, setVatNumber] =
    useState("");

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loginPath = useMemo(() => {
    if (typeof window === "undefined") {
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

    if (
      typeof window !== "undefined"
    ) {
      const url =
        new URL(window.location.href);

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
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);

    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedPhone =
      phone.trim();

    const normalizedBillingEmail =
      billingEmail.trim().toLowerCase();

    if (
      normalizedFirstName.length < 2
    ) {
      setError(
        "Introdu un prenume valid."
      );

      return;
    }

    if (
      normalizedLastName.length < 2
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

    if (
      registrationType === "doctor"
    ) {
      if (normalizedPhone.length < 7) {
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
    }

    if (
      registrationType === "clinic"
    ) {
      if (normalizedPhone.length < 7) {
        setError(
          "Introdu un număr de telefon valid pentru persoana de contact."
        );

        return;
      }

      if (clinicName.trim().length < 2) {
        setError(
          "Introdu denumirea clinicii sau organizației."
        );

        return;
      }

      if (clinicCity.trim().length < 2) {
        setError(
          "Introdu orașul clinicii."
        );

        return;
      }

      if (
        billingCompanyName.trim().length < 2
      ) {
        setError(
          "Introdu denumirea firmei pentru facturare."
        );

        return;
      }

      if (billingTaxId.trim().length < 2) {
        setError("Introdu CUI-ul firmei.");
        return;
      }

      if (
        billingAddress.trim().length < 5
      ) {
        setError(
          "Introdu adresa de facturare."
        );

        return;
      }

      if (billingCity.trim().length < 2) {
        setError(
          "Introdu orașul de facturare."
        );

        return;
      }

      if (billingCounty.trim().length < 2) {
        setError(
          "Introdu județul de facturare."
        );

        return;
      }

      if (
        !normalizedBillingEmail ||
        !normalizedBillingEmail.includes("@")
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

    startTransition(async () => {
      try {
        const supabase =
          createClient();

        const nextPath =
          registrationType === "doctor"
            ? "/doctor-application"
            : registrationType === "clinic"
              ? "/dashboard"
              : getSafeNextPath();

        const confirmationUrl =
          new URL(
            "/auth/confirm",
            window.location.origin
          );

        confirmationUrl.searchParams.set(
          "next",
          nextPath
        );

        const {
          data,
          error: signUpError,
        } =
          await supabase.auth.signUp({
            email:
              normalizedEmail,

            password,

            options: {
              emailRedirectTo:
                confirmationUrl.toString(),

              data: {
                registration_type:
                  registrationType,

                first_name:
                  normalizedFirstName,

                last_name:
                  normalizedLastName,

                phone:
                  registrationType ===
                    "doctor" ||
                  registrationType ===
                    "clinic"
                    ? normalizedPhone
                    : null,

                specialty_id:
                  registrationType ===
                  "doctor"
                    ? specialtyId
                    : null,

                professional_registration_number:
                  registrationType ===
                  "doctor"
                    ? professionalRegistrationNumber.trim()
                    : null,

                message:
                  registrationType ===
                    "doctor" ||
                  registrationType ===
                    "clinic"
                    ? message.trim()
                    : null,

                clinic_name:
                  registrationType ===
                  "clinic"
                    ? clinicName.trim()
                    : null,

                clinic_city:
                  registrationType ===
                  "clinic"
                    ? clinicCity.trim()
                    : null,

                clinic_website:
                  registrationType ===
                  "clinic"
                    ? clinicWebsite.trim()
                    : null,

                billing_company_name:
                  registrationType ===
                  "clinic"
                    ? billingCompanyName.trim()
                    : null,

                billing_tax_id:
                  registrationType ===
                  "clinic"
                    ? billingTaxId.trim()
                    : null,

                billing_trade_register_number:
                  registrationType ===
                  "clinic"
                    ? billingTradeRegisterNumber.trim()
                    : null,

                billing_address:
                  registrationType ===
                  "clinic"
                    ? billingAddress.trim()
                    : null,

                billing_city:
                  registrationType ===
                  "clinic"
                    ? billingCity.trim()
                    : null,

                billing_county:
                  registrationType ===
                  "clinic"
                    ? billingCounty.trim()
                    : null,

                billing_country:
                  registrationType ===
                  "clinic"
                    ? billingCountry.trim()
                    : null,

                billing_email:
                  registrationType ===
                  "clinic"
                    ? normalizedBillingEmail
                    : null,

                is_vat_payer:
                  registrationType ===
                  "clinic"
                    ? isVatPayer
                    : null,

                vat_number:
                  registrationType ===
                  "clinic"
                    ? vatNumber.trim()
                    : null,
              },
            },
          });

        if (signUpError) {
          const normalizedMessage =
            signUpError.message
              .toLowerCase();

          if (
            normalizedMessage.includes(
              "already registered"
            ) ||
            normalizedMessage.includes(
              "already been registered"
            )
          ) {
            setError(
              "Există deja un cont pentru această adresă de e-mail."
            );

            return;
          }

          if (
            normalizedMessage.includes(
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
          router.replace(nextPath);
          router.refresh();
          return;
        }

        setError(
          "Contul nu a putut fi creat. Încearcă din nou."
        );
      } catch (registrationError) {
        console.error(
          "Registration failed:",
          registrationError
        );

        setError(
          "Înregistrarea nu a putut fi finalizată."
        );
      }
    });
  }

  const isDoctor =
    registrationType === "doctor";

  const isClinic =
    registrationType === "clinic";

  const submitLabel =
    isDoctor
      ? "Continuă ca medic"
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
          Alege tipul contului pe care
          dorești să îl creezi.
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
          Sunt medic
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

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
        {isDoctor ? (
          <>
            Contul de medic va fi activat
            după confirmarea e-mailului și
            plata abonamentului RomDoc de{" "}
            <strong>
              60 lei/lună + TVA
            </strong>
            .
          </>
        ) : isClinic ? (
          <>
            Contul de clinică este pentru
            organizații care doresc să invite
            medici, să centralizeze abonamentele
            acoperite de clinică și să urmărească
            datele de facturare.
          </>
        ) : (
          <>
            Contul de pacient îți permite
            să soliciți programări și să
            consulți istoricul acestora.
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900">
            Date cont
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Prenume
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
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Nume
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
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              E-mail
            </span>

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
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          {(isDoctor || isClinic) && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Telefon
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
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          )}
        </section>

        {isDoctor && (
          <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-semibold text-gray-900">
              Date medic
            </h2>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Specialitate
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
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">
                  Selectează specialitatea
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
                Număr profesional
              </span>
              <span className="ml-2 text-xs text-gray-500">
                Opțional
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
                placeholder="Număr de parafă sau identificator profesional"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Mesaj
              </span>
              <span className="ml-2 text-xs text-gray-500">
                Opțional
              </span>

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
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>
          </section>
        )}

        {isClinic && (
          <>
            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Date clinică / organizație
              </h2>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Denumire clinică / organizație
                </span>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={180}
                  value={clinicName}
                  disabled={isPending}
                  onChange={(event) =>
                    setClinicName(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Oraș
                  </span>

                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={clinicCity}
                    disabled={isPending}
                    onChange={(event) =>
                      setClinicCity(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Website
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    Opțional
                  </span>

                  <input
                    type="url"
                    maxLength={250}
                    value={clinicWebsite}
                    disabled={isPending}
                    onChange={(event) =>
                      setClinicWebsite(
                        event.target.value
                      )
                    }
                    placeholder="https://clinica.ro"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Mesaj
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  Opțional
                </span>

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
                  placeholder="Exemplu: numărul aproximativ de medici, orașe sau întrebări despre oferta pentru clinici"
                  className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                />
              </label>
            </section>

            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                Date de facturare
              </h2>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Denumire firmă
                </span>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={180}
                  value={billingCompanyName}
                  disabled={isPending}
                  onChange={(event) =>
                    setBillingCompanyName(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    CUI
                  </span>

                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={billingTaxId}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingTaxId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Nr. Registrul Comerțului
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    Opțional
                  </span>

                  <input
                    type="text"
                    maxLength={80}
                    value={
                      billingTradeRegisterNumber
                    }
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingTradeRegisterNumber(
                        event.target.value
                      )
                    }
                    placeholder="J02/000/2026"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Adresă de facturare
                </span>

                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={250}
                  value={billingAddress}
                  disabled={isPending}
                  onChange={(event) =>
                    setBillingAddress(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Oraș facturare
                  </span>

                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={billingCity}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCity(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Județ
                  </span>

                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={billingCounty}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCounty(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Țară
                  </span>

                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={billingCountry}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingCountry(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    E-mail facturare
                  </span>

                  <input
                    type="email"
                    required
                    value={billingEmail}
                    disabled={isPending}
                    onChange={(event) =>
                      setBillingEmail(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isVatPayer}
                    disabled={isPending}
                    onChange={(event) =>
                      setIsVatPayer(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span className="text-sm leading-6 text-gray-700">
                    Firma este plătitoare de TVA
                  </span>
                </label>

                {isVatPayer && (
                  <label className="mt-4 block">
                    <span className="text-sm font-medium text-gray-700">
                      Cod TVA
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Opțional
                    </span>

                    <input
                      type="text"
                      maxLength={60}
                      value={vatNumber}
                      disabled={isPending}
                      onChange={(event) =>
                        setVatNumber(
                          event.target.value
                        )
                      }
                      placeholder="RO12345678"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
                    />
                  </label>
                )}
              </div>
            </section>
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Parolă
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
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Confirmă parola
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
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>
        </div>

        <p className="text-xs leading-5 text-gray-500">
          Parola trebuie să conțină
          minimum 8 caractere, o literă
          mare, o literă mică și o cifră.
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
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#036661] focus-visible:ring-offset-2"
            >
              termenii și condițiile
            </Link>{" "}
            și{" "}
            <Link
              href="/confidentialitate"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#036661] focus-visible:ring-offset-2"
            >
              politica de confidențialitate
            </Link>{" "}
            RomDoc.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

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
