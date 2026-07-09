"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type SelectOption = {
  id: string;
  name: string;
};

type ClinicInvitedDoctorRegisterFormProps = {
  token: string;
  invitedEmail: string;
  specialties: SelectOption[];
};

type LinkInviteResponse = {
  message?: string;
  error?: string;
  doctor?: {
    id: string;
    slug: string;
  };
};

function validatePassword(password: string) {
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

export default function ClinicInvitedDoctorRegisterForm({
  token,
  invitedEmail,
  specialties,
}: ClinicInvitedDoctorRegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [phone, setPhone] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [professionalRegistrationNumber, setProfessionalRegistrationNumber] =
    useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!token) {
      setError("Linkul invitației nu conține tokenul necesar.");
      return;
    }

    if (normalizedFirstName.length < 2) {
      setError("Introdu un prenume valid.");
      return;
    }

    if (normalizedLastName.length < 2) {
      setError("Introdu un nume de familie valid.");
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Introdu o adresă de e-mail validă.");
      return;
    }

    if (invitedEmail && normalizedEmail !== invitedEmail.toLowerCase()) {
      setError(
        "Folosește aceeași adresă de e-mail pe care a fost trimisă invitația clinicii."
      );
      return;
    }

    if (normalizedPhone.length < 7) {
      setError("Introdu un număr de telefon valid.");
      return;
    }

    if (!specialtyId) {
      setError("Selectează specialitatea medicală.");
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Parolele introduse nu coincid.");
      return;
    }

    if (!acceptedTerms) {
      setError("Trebuie să accepți termenii și politica de confidențialitate.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const confirmationUrl = new URL("/auth/confirm", window.location.origin);
        confirmationUrl.searchParams.set("next", "/doctor-dashboard/profile");

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: confirmationUrl.toString(),
            data: {
              registration_type: "clinic_invited_doctor",
              clinic_invite_token: token,
              clinic_paid: true,
              doctor_account_type: "clinic_sub_account",
              first_name: normalizedFirstName,
              last_name: normalizedLastName,
              phone: normalizedPhone,
              specialty_id: specialtyId,
              professional_registration_number:
                professionalRegistrationNumber.trim() || null,
              message:
                "Medic invitat de clinică. Cont sub clinică. Abonamentul este acoperit de clinică.",
            },
          },
        });

        if (signUpError) {
          const normalizedMessage = signUpError.message.toLowerCase();

          if (
            normalizedMessage.includes("already registered") ||
            normalizedMessage.includes("already been registered")
          ) {
            setError(
              "Există deja un cont pentru această adresă de e-mail. Pentru un cont clinic separat, folosește o adresă de e-mail diferită."
            );
            return;
          }

          if (normalizedMessage.includes("database error saving new user")) {
            setError(
              "Contul nu a putut fi creat. Verifică migrarea bazei de date pentru înregistrare."
            );
            return;
          }

          setError(signUpError.message);
          return;
        }

        if (!data.user) {
          setError("Contul nu a putut fi creat. Încearcă din nou.");
          return;
        }

        const linkResponse = await fetch(
          "/api/clinic-doctor-invitations/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
              userId: data.user.id,
              email: normalizedEmail,
            }),
          }
        );

        const linkResult = (await linkResponse.json()) as LinkInviteResponse;

        if (!linkResponse.ok) {
          setError(
            linkResult.error ??
              "Contul a fost creat, dar invitația clinicii nu a putut fi conectată. Contactează RomDoc."
          );
          return;
        }

        if (data.session) {
          router.replace("/doctor-dashboard/profile");
          router.refresh();
          return;
        }

        const checkEmailParams = new URLSearchParams({
          email: normalizedEmail,
          type: "doctor",
          next: "/doctor-dashboard/profile",
        });

        router.replace(`/check-email?${checkEmailParams.toString()}`);
        router.refresh();
      } catch (registrationError) {
        console.error("Clinic invited doctor registration failed:", registrationError);
        setError("Înregistrarea nu a putut fi finalizată.");
      }
    });
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="text-center">
        <Link href="/" className="inline-block text-3xl font-bold text-gray-900">
          RomDoc
        </Link>
        <p className="mt-6 text-sm font-semibold text-[#036661]">
          Invitație clinică
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Creează contul de medic sub clinică
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Acest cont va fi creat ca sub-cont de medic al clinicii care te-a
          invitat. Abonamentul RomDoc este acoperit de clinică, deci nu trebuie
          să plătești individual prin Stripe pentru această invitație.
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
        Plata abonamentului și consumul SMS aferent acestui cont sunt
        responsabilitatea clinicii. Dacă vrei să lucrezi independent sau pentru
        altă clinică, folosește o altă adresă de e-mail și creează un cont
        separat.
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Prenume</span>
            <input
              type="text"
              required
              minLength={2}
              value={firstName}
              disabled={isPending}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nume</span>
            <input
              type="text"
              required
              minLength={2}
              value={lastName}
              disabled={isPending}
              onChange={(event) => setLastName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">E-mail</span>
          <input
            type="email"
            required
            value={email}
            disabled={Boolean(invitedEmail) || isPending}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:bg-gray-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Telefon</span>
          <input
            type="tel"
            required
            minLength={7}
            value={phone}
            disabled={isPending}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+40 700 000 000"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Specialitate</span>
          <select
            required
            value={specialtyId}
            disabled={isPending}
            onChange={(event) => setSpecialtyId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">Selectează specialitatea</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Cod parafă / număr de înregistrare profesională
          </span>
          <input
            type="text"
            value={professionalRegistrationNumber}
            disabled={isPending}
            onChange={(event) =>
              setProfessionalRegistrationNumber(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Parolă</span>
            <input
              type="password"
              required
              value={password}
              disabled={isPending}
              onChange={(event) => setPassword(event.target.value)}
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
              value={passwordConfirmation}
              disabled={isPending}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            disabled={isPending}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1"
          />
          <span>
            Accept{" "}
            <Link
              href="/termeni-si-conditii"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              Termenii și condițiile
            </Link>{" "}
            și{" "}
            <Link
              href="/confidentialitate"
              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
            >
              Politica de confidențialitate
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
            ? "Se creează contul..."
            : "Creează contul de medic sub clinică"}
        </button>
      </form>
    </div>
  );
}
