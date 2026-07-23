"use client";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useRouter,
} from "next/navigation";
import {
  type FormEvent,
  useState,
  useTransition,
} from "react";

import {
  getPathname,
} from "@/i18n/navigation";
import {
  getClinicInvitedDoctorRegistrationMetadata,
} from "@/lib/doctors/clinic-invited-doctor-registration";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
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

  specialties:
    SelectOption[];
};

type LinkInviteResponse = {
  message?: string;
  error?: string;

  doctor?: {
    id: string;
    slug: string;
  };
};

function inputClassName() {
  return "romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:cursor-wait disabled:bg-gray-100";
}

export default function ClinicInvitedDoctorRegisterForm({
  token,
  invitedEmail,
  specialties,
}: ClinicInvitedDoctorRegisterFormProps) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "ClinicOrganisationDashboard.invitedDoctorForm"
    );

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      ""
    );

  const [
    lastName,
    setLastName,
  ] =
    useState(
      ""
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      ""
    );

  const [
    specialtyId,
    setSpecialtyId,
  ] =
    useState(
      ""
    );

  const [
    professionalRegistrationNumber,
    setProfessionalRegistrationNumber,
  ] =
    useState(
      ""
    );

  const [
    password,
    setPassword,
  ] =
    useState(
      ""
    );

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] =
    useState(
      ""
    );

  const [
    acceptedAccountModel,
    setAcceptedAccountModel,
  ] =
    useState(
      false
    );

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const homeHref =
    `/${locale}`;

  const termsHref =
    getPathname({
      locale,
      href:
        "/termeni-si-conditii",
    });

  const privacyHref =
    getPathname({
      locale,
      href:
        "/confidentialitate",
    });

  function validatePassword(
    value:
      string
  ) {
    if (
      value.length <
      8
    ) {
      return t(
        "validation.passwordLength"
      );
    }

    if (
      !/[A-Z]/.test(
        value
      )
    ) {
      return t(
        "validation.passwordUppercase"
      );
    }

    if (
      !/[a-z]/.test(
        value
      )
    ) {
      return t(
        "validation.passwordLowercase"
      );
    }

    if (
      !/[0-9]/.test(
        value
      )
    ) {
      return t(
        "validation.passwordNumber"
      );
    }

    return null;
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

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

    if (
      !token
    ) {
      setError(
        t(
          "validation.missingToken"
        )
      );

      return;
    }

    if (
      normalizedFirstName.length <
      2
    ) {
      setError(
        t(
          "validation.firstName"
        )
      );

      return;
    }

    if (
      normalizedLastName.length <
      2
    ) {
      setError(
        t(
          "validation.lastName"
        )
      );

      return;
    }

    if (
      !normalizedEmail ||
      !normalizedEmail.includes(
        "@"
      )
    ) {
      setError(
        t(
          "validation.email"
        )
      );

      return;
    }

    if (
      normalizedPhone.length <
      7
    ) {
      setError(
        t(
          "validation.phone"
        )
      );

      return;
    }

    if (
      !specialtyId
    ) {
      setError(
        t(
          "validation.specialty"
        )
      );

      return;
    }

    const passwordError =
      validatePassword(
        password
      );

    if (
      passwordError
    ) {
      setError(
        passwordError
      );

      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setError(
        t(
          "validation.passwordMismatch"
        )
      );

      return;
    }

    if (
      !acceptedAccountModel
    ) {
      setError(
        t(
          "acknowledgementError"
        )
      );

      return;
    }

    if (
      !acceptedTerms
    ) {
      setError(
        t(
          "validation.terms"
        )
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
              window.location
                .origin
            );

          confirmationUrl.searchParams
            .set(
              "next",
              "/doctor-dashboard/profile"
            );

          confirmationUrl.searchParams
            .set(
              "locale",
              locale
            );

          const {
            data,
            error:
              signUpError,
          } =
            await supabase.auth
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

                    language:
                      locale,

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

          if (
            signUpError
          ) {
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
                t(
                  "validation.existingAccount"
                )
              );

              return;
            }

            if (
              normalizedMessage.includes(
                "database error saving new user"
              )
            ) {
              setError(
                t(
                  "validation.database"
                )
              );

              return;
            }

            setError(
              locale ===
                "ro"
                ? signUpError.message
                : t(
                    "validation.accountCreation"
                  )
            );

            return;
          }

          if (
            !data.user
          ) {
            setError(
              t(
                "validation.accountCreation"
              )
            );

            return;
          }

          const linkResponse =
            await fetch(
              "/api/clinic-doctor-invitations/register",
              {
                method:
                  "POST",

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

                    locale,
                  }),
              }
            );

          const linkResult =
            (await linkResponse.json()) as
              LinkInviteResponse;

          if (
            !linkResponse.ok
          ) {
            setError(
              locale ===
                "ro" &&
              linkResult.error
                ? linkResult.error
                : t(
                    "validation.linking"
                  )
            );

            return;
          }

          if (
            data.session
          ) {
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

              type:
                "doctor",

              next:
                "/doctor-dashboard/profile",

              locale,
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
            t(
              "validation.registration"
            )
          );
        }
      }
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm sm:p-[34px]">
      <header className="text-center">
        <Link
          href={
            homeHref
          }
          className="romdoc-focus-ring inline-block rounded-[8px] text-3xl font-bold text-gray-900"
        >
          RomDoc
        </Link>

        <p className="mt-[21px] text-sm font-semibold text-[#036661]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-2xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      <div className="mt-[21px] space-y-[13px]">
        <p className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm leading-6 text-green-900">
          {t(
            "paymentNotice"
          )}
        </p>

        <p className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm font-medium leading-6 text-amber-950">
          {t(
            "accountNotice"
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm leading-6 text-red-800"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-[34px] space-y-[21px]"
      >
        <div className="grid gap-[21px] sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "firstName"
              )}
            </span>

            <input
              type="text"
              required
              minLength={
                2
              }
              maxLength={
                100
              }
              autoComplete="given-name"
              value={
                firstName
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setFirstName(
                  event.target
                    .value
                )
              }
              className={
                inputClassName()
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "lastName"
              )}
            </span>

            <input
              type="text"
              required
              minLength={
                2
              }
              maxLength={
                100
              }
              autoComplete="family-name"
              value={
                lastName
              }
              disabled={
                isPending
              }
              onChange={(
                event
              ) =>
                setLastName(
                  event.target
                    .value
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
            {t(
              "email"
            )}
          </span>

          <input
            type="email"
            required
            readOnly
            value={
              invitedEmail
            }
            className={`${inputClassName()} cursor-not-allowed`}
          />

          <span className="mt-[8px] block text-xs leading-5 text-gray-500">
            {t(
              "emailHint"
            )}
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "phone"
            )}
          </span>

          <input
            type="tel"
            required
            minLength={
              7
            }
            autoComplete="tel"
            value={
              phone
            }
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setPhone(
                event.target
                  .value
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
            {t(
              "specialty"
            )}
          </span>

          <select
            required
            value={
              specialtyId
            }
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setSpecialtyId(
                event.target
                  .value
              )
            }
            className={
              inputClassName()
            }
          >
            <option value="">
              {t(
                "selectSpecialty"
              )}
            </option>

            {specialties.map(
              (
                specialty
              ) => (
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
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {t(
              "licence"
            )}
          </span>

          <input
            type="text"
            maxLength={
              150
            }
            value={
              professionalRegistrationNumber
            }
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setProfessionalRegistrationNumber(
                event.target
                  .value
              )
            }
            className={
              inputClassName()
            }
          />

          <span className="mt-[8px] block text-xs leading-5 text-gray-500">
            {t(
              "licenceHint"
            )}
          </span>
        </label>

        <div>
          <div className="grid gap-[21px] sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "password"
                )}
              </span>

              <input
                type="password"
                required
                minLength={
                  8
                }
                autoComplete="new-password"
                value={
                  password
                }
                disabled={
                  isPending
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                className={
                  inputClassName()
                }
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "confirmPassword"
                )}
              </span>

              <input
                type="password"
                required
                minLength={
                  8
                }
                autoComplete="new-password"
                value={
                  passwordConfirmation
                }
                disabled={
                  isPending
                }
                onChange={(
                  event
                ) =>
                  setPasswordConfirmation(
                    event.target
                      .value
                  )
                }
                className={
                  inputClassName()
                }
              />
            </label>
          </div>

          <p className="mt-[8px] text-xs leading-5 text-gray-500">
            {t(
              "passwordHelp"
            )}
          </p>
        </div>

        <label className="flex items-start gap-[13px] rounded-[13px] border border-[#036661]/25 bg-[#F0EEE9] p-[13px]">
          <input
            type="checkbox"
            required
            checked={
              acceptedAccountModel
            }
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setAcceptedAccountModel(
                event.target
                  .checked
              )
            }
            className="mt-[5px] h-4 w-4 shrink-0"
          />

          <span className="text-sm font-medium leading-6 text-gray-800">
            {t(
              "acknowledgement"
            )}
          </span>
        </label>

        <label className="flex items-start gap-[13px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] text-sm leading-6 text-gray-700">
          <input
            type="checkbox"
            required
            checked={
              acceptedTerms
            }
            disabled={
              isPending
            }
            onChange={(
              event
            ) =>
              setAcceptedTerms(
                event.target
                  .checked
              )
            }
            className="mt-[5px] h-4 w-4 shrink-0"
          />

          <span>
            {t(
              "acceptPrefix"
            )}{" "}

            <Link
              href={
                termsHref
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {t(
                "terms"
              )}
            </Link>{" "}

            {t(
              "and"
            )}{" "}

            <Link
              href={
                privacyHref
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              {t(
                "privacy"
              )}
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={
            isPending
          }
          className="romdoc-focus-ring w-full rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? t(
                "submitting"
              )
            : t(
                "submit"
              )}
        </button>
      </form>
    </div>
  );
}
