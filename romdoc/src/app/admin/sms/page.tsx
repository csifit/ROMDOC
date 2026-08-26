import {
  redirect,
} from "next/navigation";

import AdminSmsControlPanel from "@/components/admin/admin-sms-control-panel";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

const COPY: Record<
  AppLocale,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  ro: {
    eyebrow: "Administrare",
    title: "SMS",
    description:
      "Controlează serviciul SMS și urmărește utilizarea operațională. Costurile SMS sunt incluse în abonamente și nu sunt calculate separat pe această pagină.",
  },
  en: {
    eyebrow: "Administration",
    title: "SMS",
    description:
      "Control the SMS service and review operational usage. SMS costs are included in subscriptions and are not calculated separately on this page.",
  },
  de: {
    eyebrow: "Administration",
    title: "SMS",
    description:
      "Steuere den SMS-Dienst und prüfe die operative Nutzung. SMS-Kosten sind in den Abonnements enthalten und werden auf dieser Seite nicht separat berechnet.",
  },
};

export default async function AdminSmsPage() {
  const locale = await getStoredAppLocale();
  const copy = COPY[locale];
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/sms",
    });

    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.eyebrow}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.title}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.description}
        </p>
      </header>

      <AdminSmsControlPanel locale={locale} />
    </div>
  );
}
