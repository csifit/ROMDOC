import type {
  ReactNode,
} from "react";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { createClient } from "@/lib/supabase/server";

type PublicLayoutProps = {
  children: ReactNode;
};

type PublicProfile = {
  first_name:
    | string
    | null;

  last_name:
    | string
    | null;
};

function getDisplayName(
  profile:
    | PublicProfile
    | null
) {
  if (!profile) {
    return null;
  }

  const name = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || null;
}

export default async function PublicLayout({
  children,
}: PublicLayoutProps) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  let profile:
    | PublicProfile
    | null = null;

  if (user) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        first_name,
        last_name
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Public profile lookup failed:",
        error
      );
    } else {
      profile =
        data as PublicProfile | null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        isAuthenticated={
          Boolean(user)
        }
        userName={
          getDisplayName(
            profile
          )
        }
        userEmail={
          user?.email ??
          null
        }
      />

      <div className="flex-1">
        {children}
      </div>

      <PublicFooter />
    </div>
  );
}
