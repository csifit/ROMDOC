"use client";

import {
  useCallback,
  useState,
} from "react";

import DoctorInvitationsList from "@/components/admin/doctor-invitations-list";
import InviteDoctorDialog from "@/components/admin/invite-doctor-dialog";

export default function AdminDoctorInvitations() {
  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [refreshKey, setRefreshKey] =
    useState(0);
  const [success, setSuccess] =
    useState<string | null>(
      null
    );

  const handleClose =
    useCallback(() => {
      setDialogOpen(false);
    }, []);

  const handleCreated =
    useCallback(() => {
      setSuccess(
        "Invitația medicului a fost trimisă."
      );
      setRefreshKey(
        (current) =>
          current + 1
      );
    }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#036661]/20 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Invită un medic
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Trimite o invitație personalizată și acordă acces gratuit fără plată Stripe pentru perioada aleasă.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setDialogOpen(true);
            }}
            className="romdoc-focus-ring shrink-0 rounded-xl bg-[#036661] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#ff2800]"
          >
            Invită medic
          </button>
        </div>
      </section>

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      ) : null}

      <DoctorInvitationsList
        refreshKey={
          refreshKey
        }
      />

      <InviteDoctorDialog
        open={dialogOpen}
        onClose={
          handleClose
        }
        onCreated={
          handleCreated
        }
      />
    </div>
  );
}
