"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";

import DoctorInvitationsList from "@/components/admin/doctor-invitations-list";
import InviteDoctorDialog from "@/components/admin/invite-doctor-dialog";
import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import { getPlatformOperatorDoctors } from "@/lib/i18n/platform-operator-doctors";

export default function AdminDoctorInvitations() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorDoctors(locale);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleCreated = useCallback(() => {
    setSuccess(copy.invitations.panel.success);
    setRefreshKey((current) => current + 1);
  }, [copy.invitations.panel.success]);

  return (
    <div className="space-y-[21px]">
      <section className="rounded-[13px] border border-[#036661]/20 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col gap-[13px] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              {copy.invitations.panel.title}
            </h2>

            <p className="mt-[8px] max-w-2xl text-sm leading-6 text-gray-600">
              {copy.invitations.panel.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setDialogOpen(true);
            }}
            className="romdoc-focus-ring shrink-0 rounded-[13px] bg-[#036661] px-[21px] py-[13px] font-semibold text-white transition-colors hover:bg-[#ff2800]"
          >
            {copy.invitations.panel.action}
          </button>
        </div>
      </section>

      {success ? (
        <div
          role="status"
          className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      <details className="group rounded-[13px] border border-gray-200 bg-white shadow-sm">
        <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] p-[21px]">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              {copy.invitations.panel.historyTitle}
            </h2>
            <p className="mt-[5px] text-sm text-gray-600">
              {copy.invitations.panel.historyDescription}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="text-xl text-gray-500 transition group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>

        <div className="border-t border-gray-200 p-[13px] sm:p-[21px]">
          <DoctorInvitationsList refreshKey={refreshKey} />
        </div>
      </details>

      <InviteDoctorDialog
        open={dialogOpen}
        onClose={handleClose}
        onCreated={handleCreated}
      />
    </div>
  );
}
