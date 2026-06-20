import Link from "next/link";
import { redirect } from "next/navigation";
import StaffAppointmentsManager from "@/components/staff/staff-appointments-manager";
import { createClient } from "@/lib/supabase/server";

export default async function StaffDashboardPage() {
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
      "/login?next=/staff-dashboard"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/dashboard");
  }

  if (profile.role !== "staff") {
    redirect("/dashboard");
  }

  const {
    data: activeAssignments,
    error: assignmentError,
  } = await supabase
    .from("doctor_staff")
    .select("id")
    .eq(
      "staff_profile_id",
      user.id
    )
    .eq("status", "active");

  if (assignmentError) {
    console.error(
      "Staff assignment lookup failed:",
      assignmentError
    );
  }

  const hasActiveAssignment =
    Boolean(
      activeAssignments?.length
    );

  const staffName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <Link
              href="/"
              className="text-2xl font-bold text-gray-900"
            >
              RomDoc
            </Link>

            <p className="mt-1 text-sm text-gray-600">
              {staffName ||
                user.email ||
                "Personal medical"}
            </p>

            <span className="mt-2 inline-flex rounded-full bg-[#F0EEE9] px-3 py-1 text-xs font-semibold text-[#9A4F35]">
              Personal — numai programări
            </span>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Pagina principală
          </Link>
        </header>

        {hasActiveAssignment ? (
          <StaffAppointmentsManager />
        ) : (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-amber-950">
              Accesul nu este încă activ
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-900">
              Invitația a fost creată, dar
              medicul trebuie să activeze
              atribuirea înainte de a putea
              administra programările.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}