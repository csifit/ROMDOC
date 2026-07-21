import { redirect } from "next/navigation";

import UsersManagement from "@/components/admin/users-management";
import {
  getPlatformOperatorAccess,
  PLATFORM_OPERATOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-access";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ClosureRequestProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  account_closure_requested_at: string;
};

function replaceTokens(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default async function AdminUsersPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorAccess(locale);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/users",
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

  const admin = createAdminClient();
  const {
    data: closureRequestProfiles,
    error: closureRequestError,
  } = await admin
    .from("profiles")
    .select(
      "id, first_name, last_name, account_closure_requested_at"
    )
    .eq("role", "patient")
    .eq("account_status", "active")
    .not("account_closure_requested_at", "is", null)
    .order("account_closure_requested_at", { ascending: true });

  if (closureRequestError) {
    console.error(
      "Account closure request list failed:",
      closureRequestError
    );
  }

  const requests = (closureRequestProfiles ?? []) as ClosureRequestProfile[];
  const requestsWithEmail = await Promise.all(
    requests.map(async (requestProfile) => {
      const { data: authUserResult } =
        await admin.auth.admin.getUserById(requestProfile.id);

      return {
        ...requestProfile,
        email: authUserResult.user?.email ?? null,
      };
    })
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(PLATFORM_OPERATOR_LOCALE_TAGS[locale], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(value));

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.common.administration}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.users.page.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.users.page.adminDescription}
        </p>
      </header>

      {requestsWithEmail.length > 0 && (
        <details className="rounded-[13px] border border-amber-200 bg-amber-50 shadow-sm">
          <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[13px] p-[21px] marker:hidden">
            <div className="flex items-center justify-between gap-[13px]">
              <div>
                <h2 className="text-lg font-bold text-amber-950">
                  {copy.users.closure.title}
                </h2>
                <p className="mt-[5px] text-sm text-amber-900">
                  {copy.users.closure.description}
                </p>
              </div>
              <span className="rounded-full bg-amber-200 px-[8px] py-[5px] text-sm font-semibold text-amber-950">
                {requestsWithEmail.length}
              </span>
            </div>
          </summary>

          <div className="divide-y divide-amber-200 border-t border-amber-200 px-[21px]">
            {requestsWithEmail.map((requestProfile) => {
              const name =
                [requestProfile.first_name, requestProfile.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || copy.users.closure.patientFallback;

              return (
                <div
                  key={requestProfile.id}
                  className="grid gap-[8px] py-[13px] sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-amber-950">
                      {name}
                    </p>
                    <p className="mt-[5px] text-sm text-amber-900">
                      {requestProfile.email ?? copy.common.emailUnavailable}
                    </p>
                  </div>
                  <p className="text-sm text-amber-900">
                    {replaceTokens(copy.users.closure.requestedAt, {
                      date: formatDate(
                        requestProfile.account_closure_requested_at
                      ),
                    })}
                  </p>
                  <span className="w-fit rounded-full bg-white px-[8px] py-[5px] text-xs font-semibold text-amber-900">
                    {copy.users.closure.requested}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <UsersManagement />
    </div>
  );
}
