import type {
  AppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";

export type AppointmentSmsCopyEvent =
  | "confirmed"
  | "reminder_24_hours";

type AppointmentSmsMessageInput = {
  locale:
    AppointmentNotificationLocale;
  event:
    AppointmentSmsCopyEvent;
  scheduledDate: string;
  scheduledTime: string;
  doctorName: string;
  clinicName: string;
  clinicAddress:
    string | null;
};

function normalizeSmsValue(
  value: string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function formatSmsDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function getAddressPart(
  locale:
    AppointmentNotificationLocale,
  clinicAddress:
    string | null
) {
  if (!clinicAddress) {
    return "";
  }

  const address =
    normalizeSmsValue(
      clinicAddress
    );

  switch (locale) {
    case "en":
      return `, address ${address}`;

    case "de":
      return `, Adresse ${address}`;

    case "ro":
    default:
      return `, adresa ${address}`;
  }
}

export function
buildAppointmentSmsMessage({
  locale,
  event,
  scheduledDate,
  scheduledTime,
  doctorName,
  clinicName,
  clinicAddress,
}: AppointmentSmsMessageInput) {
  const date =
    formatSmsDate(
      scheduledDate
    );

  const time =
    scheduledTime.slice(
      0,
      5
    );

  const doctor =
    normalizeSmsValue(
      doctorName
    );

  const clinic =
    normalizeSmsValue(
      clinicName
    );

  const addressPart =
    getAddressPart(
      locale,
      clinicAddress
    );

  if (
    event ===
    "reminder_24_hours"
  ) {
    switch (locale) {
      case "en":
        return `RomDoc: Reminder: your appointment is tomorrow, ${date}, at ${time}, with ${doctor}, at ${clinic}${addressPart}.`;

      case "de":
        return `RomDoc: Erinnerung: Dein Termin ist morgen, am ${date}, um ${time} Uhr bei ${doctor}, in ${clinic}${addressPart}.`;

      case "ro":
      default:
        return `RomDoc: Reamintire: ai programare mâine, în data de ${date}, la ora ${time}, la ${doctor}, ${clinic}${addressPart}.`;
    }
  }

  switch (locale) {
    case "en":
      return `RomDoc: Your appointment with ${doctor} is confirmed for ${time} on ${date}, at ${clinic}${addressPart}.`;

    case "de":
      return `RomDoc: Dein Termin bei ${doctor} ist für ${time} Uhr am ${date}, in ${clinic} bestätigt${addressPart}.`;

    case "ro":
    default:
      return `RomDoc: Programarea la ${doctor} a fost confirmată pentru ora ${time}, în data de ${date}, la ${clinic}${addressPart}.`;
  }
}
