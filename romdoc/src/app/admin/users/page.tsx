import {
  redirect,
} from "next/navigation";

import UsersManagement from "@/components/admin/users-management";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type ClosureRequestProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  account_closure_requested_at: string;
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(value)
  );
}

export default async function AdminUsersPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/admin/users"
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      closureRequestProfiles,
    error:
      closureRequestError,
  } =
    await admin
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        account_closure_requested_at
      `)
      .eq(
        "role",
        "patient"
      )
      .eq(
        "account_status",
        "active"
      )
      .not(
        "account_closure_requested_at",
        "is",
        null
      )
      .order(
        "account_closure_requested_at",
        {
          ascending:
            true,
        }
      );

  if (
    closureRequestError
  ) {
    console.error(
      "Account closure request list failed:",
      closureRequestError
    );
  }

  const requests =
    (
      closureRequestProfiles ??
      []
    ) as ClosureRequestProfile[];

  const requestsWithEmail =
    await Promise.all(
      requests.map(
        async (
          requestProfile
        ) => {
          const {
            data:
              authUserResult,
          } =
            await admin.auth.admin
              .getUserById(
                requestProfile.id
              );

          return {
            ...requestProfile,
            email:
              authUserResult.user
                ?.email ??
              null,
          };
        }
      )
    );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Utilizatori
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi conturile înregistrate, filtrează utilizatorii după rol și gestionează accesul prin acțiunile existente.
        </p>
      </header>

      {requestsWithEmail.length >
        0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-amber-950">
                Închideri de cont solicitate
              </h2>

              <p className="mt-1 text-sm text-amber-900">
                Folosește acțiunea existentă de blocare din tabelul Utilizatori.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-200 px-3 py-1 text-sm font-semibold text-amber-950">
              {requestsWithEmail.length}
            </span>
          </div>

          <div className="mt-5 divide-y divide-amber-200">
            {requestsWithEmail.map(
              (
                requestProfile
              ) => {
                const name =
                  [
                    requestProfile.first_name,
                    requestProfile.last_name,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")
                    .trim() ||
                  "Pacient";

                return (
                  <div
                    key={
                      requestProfile.id
                    }
                    className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-amber-950">
                        {name}
                      </p>

                      <p className="mt-1 text-sm text-amber-900">
                        {requestProfile.email ??
                          "E-mail indisponibil"}
                      </p>
                    </div>

                    <p className="text-sm text-amber-900">
                      Solicitată:{" "}
                      {formatDate(
                        requestProfile.account_closure_requested_at
                      )}
                    </p>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900">
                      Închidere solicitată
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      <UsersManagement />
    </div>
  );
}
