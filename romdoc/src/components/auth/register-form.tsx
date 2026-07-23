"use client";

import Link from "next/link";
import {
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import type {
  AppLocale,
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
  initialNextPath: string;
};

type FieldProps = {
  label: string;
  optional?: boolean;
  optionalLabel: string;
  children: ReactNode;
};

type PasswordValidationKey =
  | "passwordLength"
  | "passwordUppercase"
  | "passwordLowercase"
  | "passwordNumber";

function Field({
  label,
  optional = false,
  optionalLabel,
  children,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      {optional ? (
        <span className="ml-2 text-xs text-gray-500">
          {optionalLabel}
        </span>
      ) : null}

      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-wait disabled:bg-gray-100";
}

function getSafeNextPath(
  value: string
) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/patient-dashboard";
  }

  return value;
}

function getPasswordValidationKey(
  password: string
): PasswordValidationKey | null {
  if (password.length < 8) {
    return "passwordLength";
  }

  if (!/[A-Z]/.test(password)) {
    return "passwordUppercase";
  }

  if (!/[a-z]/.test(password)) {
    return "passwordLowercase";
  }

  if (!/[0-9]/.test(password)) {
    return "passwordNumber";
  }

  return null;
}

function getDefaultCountry(
  locale: AppLocale
) {
  if (locale === "de") {
    return "Rumänien";
  }

  if (locale === "en") {
    return "Romania";
  }

  return "România";
}

function getLegalPaths(
  locale: AppLocale
) {
  if (locale === "de") {
    return {
      terms:
        "/de/allgemeine-geschaeftsbedingungen",
      privacy:
        "/de/datenschutz",
    };
  }

  if (locale === "en") {
    return {
      terms:
        "/en/terms-and-conditions",
      privacy:
        "/en/privacy-policy",
    };
  }

  return {
    terms:
      "/ro/termeni-si-conditii",
    privacy:
      "/ro/confidentialitate",
  };
}

export default function RegisterForm({
  specialties,
  locale,
  initialRegistrationType,
  initialNextPath,
}: RegisterFormProps) {
  const t =
    useTranslations(
      "Auth.register"
    );

  const validation =
    useTranslations(
      "Auth.validation"
    );

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
  ] = useState(
    getDefaultCountry(locale)
  );

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
  ] = useState<string | null>(
    null
  );

  const isDoctor =
    registrationType === "doctor";

  const isClinic =
    registrationType === "clinic";

  const safeNextPath =
    getSafeNextPath(
      initialNextPath
    );

  const loginParameters =
    new URLSearchParams({
      locale,
    });

  if (
    safeNextPath !==
    "/patient-dashboard"
  ) {
    loginParameters.set(
      "next",
      safeNextPath
    );
  }

  const loginPath =
    `/login?${loginParameters.toString()}`;

  const legalPaths =
    getLegalPaths(locale);

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
        validation("firstName")
      );
      return;
    }

    if (
      normalizedLastName.length <
      2
    ) {
      setError(
        validation("lastName")
      );
      return;
    }

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        validation("email")
      );
      return;
    }

    const passwordValidationKey =
      getPasswordValidationKey(
        password
      );

    if (passwordValidationKey) {
      setError(
        validation(
          passwordValidationKey
        )
      );
      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setError(
        validation(
          "passwordMismatch"
        )
      );
      return;
    }

    if (isDoctor) {
      if (
        normalizedPhone.length <
        7
      ) {
        setError(
          validation("phone")
        );
        return;
      }

      if (!specialtyId) {
        setError(
          validation(
            "specialty"
          )
        );
        return;
      }

      if (
        !acceptedIndependentAccount
      ) {
        setError(
          validation(
            "independentAcknowledgement"
          )
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
          validation(
            "contactPhone"
          )
        );
        return;
      }

      if (
        clinicName.trim().length <
        2
      ) {
        setError(
          validation(
            "clinicName"
          )
        );
        return;
      }

      if (
        clinicCity.trim().length <
        2
      ) {
        setError(
          validation(
            "clinicCity"
          )
        );
        return;
      }

      if (
        billingCompanyName
          .trim().length < 2
      ) {
        setError(
          validation(
            "billingCompanyName"
          )
        );
        return;
      }

      if (
        billingTaxId
          .trim().length < 2
      ) {
        setError(
          validation(
            "billingTaxId"
          )
        );
        return;
      }

      if (
        billingAddress
          .trim().length < 5
      ) {
        setError(
          validation(
            "billingAddress"
          )
        );
        return;
      }

      if (
        billingCity.trim().length <
        2
      ) {
        setError(
          validation(
            "billingCity"
          )
        );
        return;
      }

      if (
        billingCounty
          .trim().length < 2
      ) {
        setError(
          validation(
            "billingCounty"
          )
        );
        return;
      }

      if (
        !normalizedBillingEmail ||
        !normalizedBillingEmail
          .includes("@")
      ) {
        setError(
          validation(
            "billingEmail"
          )
        );
        return;
      }
    }

    if (!acceptedTerms) {
      setError(
        validation(
          "termsRequired"
        )
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
                : safeNextPath;

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

          confirmationUrl
            .searchParams
            .set(
              "locale",
              locale
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
                    language:
                      locale,

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
                validation(
                  "accountExists"
                )
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
                validation(
                  "databaseRegistration"
                )
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
            const searchParameters =
              new URLSearchParams({
                email:
                  normalizedEmail,

                type:
                  registrationType,

                next:
                  nextPath,

                locale,
              });

            router.replace(
              `/check-email?${searchParameters.toString()}`
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
            validation(
              "accountCreation"
            )
          );
        } catch (
          registrationError
        ) {
          console.error(
            "Registration failed:",
            registrationError
          );

          setError(
            validation(
              "registrationFailed"
            )
          );
        }
      }
    );
  }

  const submitLabel =
    isDoctor
      ? t("submitDoctor")
      : isClinic
        ? t("submitClinic")
        : t("submitPatient");

  const optionalLabel =
    t("optional");

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <Link
          href={`/${locale}`}
          className="inline-block text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("title")}
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {t("description")}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t("description")}
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
          {t("patientTab")}
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
          {t("doctorTab")}
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
          {t("clinicTab")}
        </button>
      </div>

      {isDoctor ? (
        <section className="mt-6 space-y-3 rounded-2xl border border-[#036661]/25 bg-[#F0EEE9] p-5">
          <h2 className="text-base font-bold text-gray-950">
            {t(
              "independentTitle"
            )}
          </h2>

          <p className="text-sm leading-6 text-gray-700">
            {t(
              "independentDescription"
            )}
          </p>

          <p className="text-sm leading-6 text-gray-700">
            {t(
              "independentBilling"
            )}
          </p>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
            {t(
              "independentImmutable"
            )}
          </p>
        </section>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {isClinic
            ? t(
                "clinicDescription"
              )
            : t(
                "patientDescription"
              )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900">
            {t(
              "accountDetails"
            )}
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t(
                "firstName"
              )}
              optionalLabel={
                optionalLabel
              }
            >
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

            <Field
              label={t(
                "lastName"
              )}
              optionalLabel={
                optionalLabel
              }
            >
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

          <Field
            label={t("email")}
            optionalLabel={
              optionalLabel
            }
          >
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
            <Field
              label={t("phone")}
              optionalLabel={
                optionalLabel
              }
            >
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
              {t(
                "doctorDetails"
              )}
            </h2>

            <Field
              label={t(
                "specialty"
              )}
              optionalLabel={
                optionalLabel
              }
            >
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
                  {t(
                    "chooseSpecialty"
                  )}
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
              label={t(
                "professionalRegistrationNumber"
              )}
              optional
              optionalLabel={
                optionalLabel
              }
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
                className={
                  inputClassName()
                }
              />
            </Field>

            <Field
              label={t(
                "message"
              )}
              optional
              optionalLabel={
                optionalLabel
              }
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
                {t(
                  "independentAcknowledgement"
                )}
              </span>
            </label>
          </section>
        ) : null}

        {isClinic ? (
          <>
            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                {t(
                  "clinicDetails"
                )}
              </h2>

              <Field
                label={t(
                  "clinicName"
                )}
                optionalLabel={
                  optionalLabel
                }
              >
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
                <Field
                  label={t(
                    "clinicCity"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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
                  label={t(
                    "clinicWebsite"
                  )}
                  optional
                  optionalLabel={
                    optionalLabel
                  }
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
                    placeholder="https://example.com"
                    className={
                      inputClassName()
                    }
                  />
                </Field>
              </div>

              <Field
                label={t(
                  "message"
                )}
                optional
                optionalLabel={
                  optionalLabel
                }
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
                  className={`${inputClassName()} resize-y`}
                />
              </Field>
            </section>

            <section className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-900">
                {t(
                  "billingDetails"
                )}
              </h2>

              <Field
                label={t(
                  "billingCompanyName"
                )}
                optionalLabel={
                  optionalLabel
                }
              >
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
                <Field
                  label={t(
                    "billingTaxId"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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
                  label={t(
                    "billingTradeRegisterNumber"
                  )}
                  optional
                  optionalLabel={
                    optionalLabel
                  }
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

              <Field
                label={t(
                  "billingAddress"
                )}
                optionalLabel={
                  optionalLabel
                }
              >
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
                <Field
                  label={t(
                    "billingCity"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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

                <Field
                  label={t(
                    "billingCounty"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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
                <Field
                  label={t(
                    "billingCountry"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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

                <Field
                  label={t(
                    "billingEmail"
                  )}
                  optionalLabel={
                    optionalLabel
                  }
                >
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
                    {t(
                      "vatPayer"
                    )}
                  </span>
                </label>

                {isVatPayer ? (
                  <div className="mt-4">
                    <Field
                      label={t(
                        "vatNumber"
                      )}
                      optional
                      optionalLabel={
                        optionalLabel
                      }
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
          <Field
            label={t(
              "password"
            )}
            optionalLabel={
              optionalLabel
            }
          >
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

          <Field
            label={t(
              "confirmPassword"
            )}
            optionalLabel={
              optionalLabel
            }
          >
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

        <ul className="space-y-1 text-xs leading-5 text-gray-500">
          <li>
            {validation(
              "passwordLength"
            )}
          </li>
          <li>
            {validation(
              "passwordUppercase"
            )}
          </li>
          <li>
            {validation(
              "passwordLowercase"
            )}
          </li>
          <li>
            {validation(
              "passwordNumber"
            )}
          </li>
        </ul>

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
              {t(
                "termsPrefix"
              )}{" "}
            </label>

            <Link
              href={
                legalPaths.terms
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800]"
            >
              {t("terms")}
            </Link>{" "}

            {t(
              "privacyConnector"
            )}{" "}

            <Link
              href={
                legalPaths.privacy
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline underline-offset-4 transition-colors hover:text-[#ff2800]"
            >
              {t("privacy")}
            </Link>
            {" "}RomDoc.
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
          loadingText={
            t("submitting")
          }
        >
          {submitLabel}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {t(
          "alreadyHaveAccount"
        )}{" "}

        <Link
          href={loginPath}
          className="romdoc-link underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
