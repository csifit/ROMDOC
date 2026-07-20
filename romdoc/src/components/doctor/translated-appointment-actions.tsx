"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";

import AppointmentActions, {
  type AppointmentActionsCopy,
} from "@/components/admin/appointment-actions";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type TranslatedAppointmentActionsProps = {
  appointmentId: string;
  currentStatus: string;
  requestedDate: string;
  requestedTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  currentReason: string | null;
};

export default function TranslatedAppointmentActions(
  props:
    TranslatedAppointmentActionsProps
) {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorAppointmentOperations.actions"
    );

  const copy:
    AppointmentActionsCopy = {
      terminalError:
        t("terminalError"),
      updateError:
        t("updateError"),
      updated:
        t("updated"),
      emailFailed:
        (message) =>
          t("emailFailed", {
            message,
          }),
      invalidDateTime:
        t("invalidDateTime"),
      confirmComplete:
        t("confirmComplete"),
      confirmNoShow:
        t("confirmNoShow"),
      selectDateTime:
        t("selectDateTime"),
      differentSlot:
        t("differentSlot"),
      reasonRequired:
        t("reasonRequired"),
      confirmCancel:
        t("confirmCancel"),
      closed:
        t("closed"),
      title:
        t("title"),
      description:
        t("description"),
      confirming:
        t("confirming"),
      confirm:
        t("confirm"),
      saving:
        t("saving"),
      complete:
        t("complete"),
      reschedule:
        t("reschedule"),
      noShow:
        t("noShow"),
      cancel:
        t("cancel"),
      rescheduleTitle:
        t("rescheduleTitle"),
      rescheduleDescription:
        t("rescheduleDescription"),
      close:
        t("close"),
      newDate:
        t("newDate"),
      newTime:
        t("newTime"),
      rescheduleReason:
        t("rescheduleReason"),
      reschedulePlaceholder:
        t("reschedulePlaceholder"),
      saveReschedule:
        t("saveReschedule"),
      dismiss:
        t("dismiss"),
      cancelTitle:
        t("cancelTitle"),
      cancelDescription:
        t("cancelDescription"),
      cancellationReason:
        t("cancellationReason"),
      optional:
        t("optional"),
      cancelling:
        t("cancelling"),
      confirmCancellation:
        t("confirmCancellation"),
    };

  return (
    <AppointmentActions
      {...props}
      locale={locale}
      copy={copy}
    />
  );
}
