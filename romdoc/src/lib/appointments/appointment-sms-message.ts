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
  videoUrl?: string | null;
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
  videoUrl,
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

  if (videoUrl) {
    if (event === "reminder_24_hours") {
      switch (locale) {
        case "en": return `RomDoc: Video appointment tomorrow, ${date}, ${time}, with ${doctor}. Join: ${videoUrl}. Not recorded or stored.`;
        case "de": return `RomDoc: Videosprechstunde morgen, ${date}, ${time}, bei ${doctor}. Link: ${videoUrl}. Keine Aufzeichnung oder Speicherung.`;
        case "ro":
        default: return `RomDoc: Consultație video mâine, ${date}, ${time}, cu ${doctor}. Acces: ${videoUrl}. Nu este înregistrată sau stocată.`;
      }
    }

    switch (locale) {
      case "en": return `RomDoc: Video appointment with ${doctor} confirmed for ${date}, ${time}. Join: ${videoUrl}. Not recorded or stored.`;
      case "de": return `RomDoc: Videosprechstunde bei ${doctor} bestätigt: ${date}, ${time}. Link: ${videoUrl}. Keine Aufzeichnung oder Speicherung.`;
      case "ro":
      default: return `RomDoc: Consultație video cu ${doctor} confirmată: ${date}, ${time}. Acces: ${videoUrl}. Nu este înregistrată sau stocată.`;
    }
  }

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
        return `RomDoc: Reamintire: ai programare maine, in data de ${date}, la ora ${time}, la ${doctor}, ${clinic}${addressPart}.`;
    }
  }

  switch (locale) {
    case "en":
      return `RomDoc: Your appointment with ${doctor} is confirmed for ${time} on ${date}, at ${clinic}${addressPart}.`;

    case "de":
      return `RomDoc: Dein Termin bei ${doctor} ist für ${time} Uhr am ${date}, in ${clinic} bestätigt${addressPart}.`;

    case "ro":
    default:
      return `RomDoc: Programarea la ${doctor} a fost confirmata pentru ora ${time}, in data de ${date}, la ${clinic}${addressPart}.`;
  }
}
