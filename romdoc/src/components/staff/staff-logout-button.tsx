"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

export default function StaffLogoutButton() {
  const router =
    useRouter();

  const [
    isSigningOut,
    setIsSigningOut,
  ] =
    useState(false);

  async function handleLogout() {
    setIsSigningOut(true);

    try {
      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth
          .signOut();

      if (error) {
        console.error(
          "Staff sign out failed:",
          error
        );
      }
    } finally {
      router.replace(
        "/login"
      );
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void handleLogout()
      }
      disabled={
        isSigningOut
      }
      className="romdoc-button romdoc-button-secondary romdoc-button-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut
        ? "Se deconectează..."
        : "Deconectare"}
    </button>
  );
}
