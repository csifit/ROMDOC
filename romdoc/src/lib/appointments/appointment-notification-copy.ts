import type {
  AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";

export type AppointmentNotificationStatus =
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

export type AppointmentReminderKind =
  | "48_hours"
  | "24_hours";

export const NOTIFICATION_INTL_LOCALE:
  Record<
    AppointmentNotificationLocale,
    string
  > = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

type StatusContent = {
  subject: string;
  heading: string;
  message: string;
};

type ReminderContent = {
  subject: string;
  heading: string;
  introduction: string;
  notice: string;
};

type NotificationCopy = {
  greeting: (name: string) => string;
  doctorLabel: string;
  clinicLabel: string;
  dateLabel: string;
  timeLabel: string;
  phoneLabel: string;
  notesLabel: string;
  reasonLabel: string;
  unavailableDate: string;
  unavailableTime: string;
  closing: string;
  tagline: string;
  request: {
    subject: string;
    heading: string;
    message: string;
    actionLabel: string;
  };
  statuses:
    Record<
      AppointmentNotificationStatus,
      StatusContent
    >;
  calendar: {
    title: string;
    description: string;
    viewAppointment: string;
    downloadCalendar: string;
    addGoogleCalendar: string;
    googleTitle: (doctorName: string) => string;
    googleDescription: string;
  };
  patientAccount: {
    title: string;
    description: string;
    actionLabel: string;
  };
  reminders:
    Record<
      AppointmentReminderKind,
      ReminderContent
    >;
  reminderAction: string;
  reminderLoginNotice: string;
};

const COPY:
  Record<
    AppointmentNotificationLocale,
    NotificationCopy
  > = {
    ro: {
      greeting: (name) =>
        `Bună, ${name}.`,
      doctorLabel: "Medic",
      clinicLabel: "Clinică",
      dateLabel: "Data",
      timeLabel: "Ora",
      phoneLabel: "Telefon",
      notesLabel: "Observații",
      reasonLabel: "Motiv",
      unavailableDate:
        "Data nu este disponibilă",
      unavailableTime:
        "Ora nu este disponibilă",
      closing:
        "Mulțumim,\nEchipa RomDoc",
      tagline:
        "RomDoc — găsește medicul potrivit.",
      request: {
        subject:
          "Cerere de programare RomDoc",
        heading:
          "Cererea ta de programare a fost trimisă",
        message:
          "Am înregistrat cererea ta de programare. Clinica sau medicul va confirma disponibilitatea.",
        actionLabel:
          "Vezi cererea",
      },
      statuses: {
        confirmed: {
          subject:
            "Programare confirmată",
          heading:
            "Programarea ta a fost confirmată",
          message:
            "Medicul sau clinica a confirmat programarea ta.",
        },
        rescheduled: {
          subject:
            "Programare reprogramată",
          heading:
            "Programarea ta a fost reprogramată",
          message:
            "Data sau ora programării tale a fost modificată.",
        },
        cancelled: {
          subject:
            "Programare anulată",
          heading:
            "Programarea ta a fost anulată",
          message:
            "Programarea a fost anulată. Poți solicita o nouă programare prin RomDoc.",
        },
        completed: {
          subject:
            "Consultație finalizată",
          heading:
            "Consultația a fost marcată ca finalizată",
          message:
            "Programarea ta a fost înregistrată ca finalizată în RomDoc.",
        },
        no_show: {
          subject:
            "Neprezentare înregistrată",
          heading:
            "Programarea a fost marcată ca neprezentare",
          message:
            "Clinica a înregistrat faptul că pacientul nu s-a prezentat la programare.",
        },
      },
      calendar: {
        title:
          "Detalii și calendar",
        description:
          "Poți deschide detaliile programării, descărca fișierul calendar în format .ics sau adăuga programarea în Google Calendar.",
        viewAppointment:
          "Vezi programarea",
        downloadCalendar:
          "Descarcă în calendar (.ics)",
        addGoogleCalendar:
          "Adaugă în Google Calendar",
        googleTitle: (doctorName) =>
          `Programare - ${doctorName}`,
        googleDescription:
          "Programare medicală confirmată prin RomDoc.",
      },
      patientAccount: {
        title:
          "Creează cont de pacient RomDoc",
        description:
          "Dacă nu ai încă un cont RomDoc, îl poți crea folosind această adresă de e-mail. Contul te ajută să urmărești programările și documentele medicale disponibile în RomDoc.",
        actionLabel:
          "Creează cont RomDoc",
      },
      reminders: {
        "48_hours": {
          subject:
            "Programarea ta este peste 48 de ore",
          heading:
            "Reamintire pentru programarea ta",
          introduction:
            "Programarea ta medicală este programată peste aproximativ 48 de ore.",
          notice:
            "Verifică data, ora și clinica. Dacă nu mai poți ajunge, anulează programarea din contul tău RomDoc.",
        },
        "24_hours": {
          subject:
            "Programarea ta este mâine",
          heading:
            "Programarea ta este în aproximativ 24 de ore",
          introduction:
            "Îți reamintim că programarea ta medicală este în aproximativ 24 de ore.",
          notice:
            "Te rugăm să ajungi la timp. Dacă nu mai poți participa, anulează programarea cât mai curând din contul tău RomDoc.",
        },
      },
      reminderAction:
        "Vezi sau anulează programarea",
      reminderLoginNotice:
        "Pentru siguranța ta, trebuie să te autentifici în contul RomDoc înainte de a anula programarea.",
    },
    en: {
      greeting: (name) =>
        `Hello, ${name}.`,
      doctorLabel: "Doctor",
      clinicLabel: "Clinic",
      dateLabel: "Date",
      timeLabel: "Time",
      phoneLabel: "Phone",
      notesLabel: "Notes",
      reasonLabel: "Reason",
      unavailableDate:
        "Date unavailable",
      unavailableTime:
        "Time unavailable",
      closing:
        "Thank you,\nThe RomDoc team",
      tagline:
        "RomDoc — find the right doctor.",
      request: {
        subject:
          "RomDoc appointment request",
        heading:
          "Your appointment request has been sent",
        message:
          "We recorded your appointment request. The clinic or Doctor will confirm availability.",
        actionLabel:
          "View request",
      },
      statuses: {
        confirmed: {
          subject:
            "Appointment confirmed",
          heading:
            "Your appointment has been confirmed",
          message:
            "The Doctor or clinic has confirmed your appointment.",
        },
        rescheduled: {
          subject:
            "Appointment rescheduled",
          heading:
            "Your appointment has been rescheduled",
          message:
            "The date or time of your appointment has changed.",
        },
        cancelled: {
          subject:
            "Appointment cancelled",
          heading:
            "Your appointment has been cancelled",
          message:
            "The appointment was cancelled. You can request a new appointment through RomDoc.",
        },
        completed: {
          subject:
            "Consultation completed",
          heading:
            "The consultation was marked as completed",
          message:
            "Your appointment was recorded as completed in RomDoc.",
        },
        no_show: {
          subject:
            "No-show recorded",
          heading:
            "The appointment was marked as a no-show",
          message:
            "The clinic recorded that the patient did not attend the appointment.",
        },
      },
      calendar: {
        title:
          "Appointment details and calendar",
        description:
          "You can open the appointment details, download the .ics calendar file, or add the appointment to Google Calendar.",
        viewAppointment:
          "View appointment",
        downloadCalendar:
          "Download calendar (.ics)",
        addGoogleCalendar:
          "Add to Google Calendar",
        googleTitle: (doctorName) =>
          `Appointment - ${doctorName}`,
        googleDescription:
          "Medical appointment confirmed through RomDoc.",
      },
      patientAccount: {
        title:
          "Create a RomDoc patient account",
        description:
          "If you do not yet have a RomDoc account, you can create one using this email address. Your account helps you follow appointments and medical documents available in RomDoc.",
        actionLabel:
          "Create RomDoc account",
      },
      reminders: {
        "48_hours": {
          subject:
            "Your appointment is in 48 hours",
          heading:
            "Appointment reminder",
          introduction:
            "Your medical appointment is scheduled in approximately 48 hours.",
          notice:
            "Check the date, time, and clinic. If you can no longer attend, cancel the appointment from your RomDoc account.",
        },
        "24_hours": {
          subject:
            "Your appointment is tomorrow",
          heading:
            "Your appointment is in approximately 24 hours",
          introduction:
            "This is a reminder that your medical appointment is in approximately 24 hours.",
          notice:
            "Please arrive on time. If you can no longer attend, cancel the appointment from your RomDoc account as soon as possible.",
        },
      },
      reminderAction:
        "View or cancel appointment",
      reminderLoginNotice:
        "For your security, you must sign in to your RomDoc account before cancelling the appointment.",
    },
    de: {
      greeting: (name) =>
        `Hallo, ${name}.`,
      doctorLabel: "Arzt",
      clinicLabel: "Klinik",
      dateLabel: "Datum",
      timeLabel: "Uhrzeit",
      phoneLabel: "Telefon",
      notesLabel: "Hinweise",
      reasonLabel: "Grund",
      unavailableDate:
        "Datum nicht verfügbar",
      unavailableTime:
        "Uhrzeit nicht verfügbar",
      closing:
        "Vielen Dank,\ndas RomDoc-Team",
      tagline:
        "RomDoc — finde den passenden Arzt.",
      request: {
        subject:
          "RomDoc-Terminanfrage",
        heading:
          "Deine Terminanfrage wurde gesendet",
        message:
          "Wir haben deine Terminanfrage gespeichert. Die Klinik oder der Arzt bestätigt die Verfügbarkeit.",
        actionLabel:
          "Anfrage ansehen",
      },
      statuses: {
        confirmed: {
          subject:
            "Termin bestätigt",
          heading:
            "Dein Termin wurde bestätigt",
          message:
            "Der Arzt oder die Klinik hat deinen Termin bestätigt.",
        },
        rescheduled: {
          subject:
            "Termin verschoben",
          heading:
            "Dein Termin wurde verschoben",
          message:
            "Das Datum oder die Uhrzeit deines Termins wurde geändert.",
        },
        cancelled: {
          subject:
            "Termin abgesagt",
          heading:
            "Dein Termin wurde abgesagt",
          message:
            "Der Termin wurde abgesagt. Über RomDoc kannst du einen neuen Termin anfragen.",
        },
        completed: {
          subject:
            "Behandlung abgeschlossen",
          heading:
            "Die Behandlung wurde als abgeschlossen markiert",
          message:
            "Dein Termin wurde in RomDoc als abgeschlossen erfasst.",
        },
        no_show: {
          subject:
            "Nichterscheinen erfasst",
          heading:
            "Der Termin wurde als nicht wahrgenommen markiert",
          message:
            "Die Klinik hat erfasst, dass der Patient nicht zum Termin erschienen ist.",
        },
      },
      calendar: {
        title:
          "Termindetails und Kalender",
        description:
          "Du kannst die Termindetails öffnen, die .ics-Kalenderdatei herunterladen oder den Termin zu Google Kalender hinzufügen.",
        viewAppointment:
          "Termin ansehen",
        downloadCalendar:
          "Kalender herunterladen (.ics)",
        addGoogleCalendar:
          "Zu Google Kalender hinzufügen",
        googleTitle: (doctorName) =>
          `Termin - ${doctorName}`,
        googleDescription:
          "Über RomDoc bestätigter Arzttermin.",
      },
      patientAccount: {
        title:
          "RomDoc-Patientenkonto erstellen",
        description:
          "Falls du noch kein RomDoc-Konto hast, kannst du es mit dieser E-Mail-Adresse erstellen. Das Konto hilft dir, Termine und verfügbare medizinische Dokumente zu verfolgen.",
        actionLabel:
          "RomDoc-Konto erstellen",
      },
      reminders: {
        "48_hours": {
          subject:
            "Dein Termin ist in 48 Stunden",
          heading:
            "Erinnerung an deinen Termin",
          introduction:
            "Dein Arzttermin findet in ungefähr 48 Stunden statt.",
          notice:
            "Prüfe Datum, Uhrzeit und Klinik. Falls du nicht teilnehmen kannst, sage den Termin in deinem RomDoc-Konto ab.",
        },
        "24_hours": {
          subject:
            "Dein Termin ist morgen",
          heading:
            "Dein Termin ist in ungefähr 24 Stunden",
          introduction:
            "Wir erinnern dich daran, dass dein Arzttermin in ungefähr 24 Stunden stattfindet.",
          notice:
            "Bitte sei pünktlich. Falls du nicht teilnehmen kannst, sage den Termin möglichst früh in deinem RomDoc-Konto ab.",
        },
      },
      reminderAction:
        "Termin ansehen oder absagen",
      reminderLoginNotice:
        "Zu deiner Sicherheit musst du dich in deinem RomDoc-Konto anmelden, bevor du den Termin absagst.",
    },
  };

export function
getAppointmentNotificationCopy(
  locale:
    AppointmentNotificationLocale
) {
  return COPY[locale];
}

export function
formatAppointmentNotificationDate(
  date: string | null,
  locale:
    AppointmentNotificationLocale
) {
  const copy =
    getAppointmentNotificationCopy(
      locale
    );

  if (!date) {
    return copy.unavailableDate;
  }

  return new Intl.DateTimeFormat(
    NOTIFICATION_INTL_LOCALE[
      locale
    ],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

export function
formatAppointmentNotificationTime(
  time: string | null,
  locale:
    AppointmentNotificationLocale
) {
  if (!time) {
    return getAppointmentNotificationCopy(
      locale
    ).unavailableTime;
  }

  return time.slice(0, 5);
}
