import {
  redirect,
} from "next/navigation";
import ReviewsManagement from "@/components/admin/reviews-management";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminReviewsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?next=/admin/reviews"
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.role !== "admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Recenzii
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Moderează recenziile care conțin limbaj nepotrivit,
          informații personale, spam sau conținut care încalcă
          regulile platformei.
        </p>
      </header>

      <ReviewsManagement />
    </div>
  );
}