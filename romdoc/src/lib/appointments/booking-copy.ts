import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export const BOOKING_COPY = {
  ro: {
    preAuth: {
      selectClinicError: "Selectează clinica.",
      selectDateTimeError: "Selectează data și ora programării.",
      unavailable: "Programările online nu sunt încă disponibile pentru acest medic.",
      eyebrow: "Programare online",
      title: "Alege clinica, data și ora",
      description: "Poți selecta intervalul înainte de autentificare. RomDoc îl păstrează temporar în acest browser cât timp te autentifici sau îți confirmi contul.",
      clinicStep: "1. Clinica",
      dateTimeStep: "2. Data și ora",
      selectedSlot: "Intervalul ales pentru {doctorName}: {date}, ora {time}.",
      accountNotice: "Pentru trimiterea cererii ai nevoie de un cont de pacient cu adresa de e-mail confirmată.",
      signIn: "Autentificare și continuare",
      createAccount: "Creează cont de pacient",
      privacy: "Se păstrează temporar doar medicul, clinica, data, ora și durata. Nu se păstrează numele, telefonul, e-mailul, mesajele sau informațiile medicale."
    },
    gate: {
      verifyEmailTitle: "Verifică adresa de e-mail",
      verifyEmailDescription: "Trebuie să confirmi adresa de e-mail înainte de a solicita programarea. După confirmare vei reveni la acest profil, iar clinica, data și ora selectate vor fi restaurate automat.",
      profileError: "Contul nu a putut fi verificat.",
      incompatibleTitle: "Cont incompatibil",
      incompatibleDescription: "Conturile de medic, administrator sau personal clinică nu pot solicita programări ca pacient."
    },
    calendar: {
      title: "Selectează data și ora",
      description: "Datele verzi au cel puțin un interval disponibil. Cererea se trimite după alegerea unei date și a unei ore.",
      selectClinicFirst: "Selectează mai întâi clinica pentru a vedea calendarul disponibil.",
      previousMonth: "Luna precedentă",
      nextMonth: "Luna următoare",
      available: "Disponibil",
      selected: "Selectat",
      unavailable: "Indisponibil",
      availableDateLabel: "{date}, {count} intervale disponibile",
      unavailableDateLabel: "{date}, indisponibil",
      loading: "Se încarcă disponibilitatea...",
      loadFailed: "Disponibilitatea nu a putut fi încărcată.",
      retry: "Încearcă din nou",
      noSlotsTitle: "Nu există intervale libere afișate pentru această lună.",
      noSlotsDescription: "Poți verifica o altă lună disponibilă în calendar. Programarea online rămâne disponibilă doar după alegerea unei date și a unei ore libere.",
      availableTimes: "Ore disponibile pentru {date}",
      noSuitableTimeTitle: "Nu găsești o oră potrivită?",
      noSuitableTimeDescription: "Momentan, RomDoc trimite cererea online doar după selectarea unui interval disponibil."
    },
    form: {
      steps: { clinic: "Clinică", availability: "Data și ora", patient: "Date pacient", review: "Verificare" },
      stepsAria: "Pașii programării",
      unavailable: "Programările online nu sunt încă disponibile pentru acest medic.",
      eyebrow: "Programare online",
      title: "Solicită o programare",
      description: "Completează pașii pentru a solicita o consultație la {doctorName}.",
      restored: "Clinica, data și ora selectate înainte de autentificare au fost restaurate. Verifică intervalul și completează datele pacientului.",
      chooseClinic: "Alege clinica",
      chooseClinicDescription: "Selectează locul în care dorești să aibă loc consultația.",
      continueDateTime: "Continuă la data și ora",
      selectedClinic: "Clinica selectată",
      selectedSlot: "Interval selectat:",
      minutes: "{count} minute",
      back: "Înapoi",
      continuePatient: "Continuă la datele tale",
      patientTitle: "Datele pacientului",
      patientDescription: "Aceste informații sunt folosite pentru identificarea și contactarea pacientului.",
      fullName: "Nume complet",
      phone: "Telefon",
      verifiedEmail: "E-mail verificat",
      accountAssociation: "Programarea va fi asociată acestui cont.",
      doctorMessage: "Mesaj pentru medic",
      optional: "(opțional)",
      messagePlaceholder: "Descrie pe scurt motivul consultației.",
      reviewAppointment: "Verifică programarea",
      reviewTitle: "Verifică detaliile",
      reviewDescription: "Confirmă că informațiile sunt corecte înainte de trimiterea cererii.",
      doctorAndClinic: "Medic și clinică",
      dateAndTime: "Data și ora",
      patient: "Pacient",
      requestNotice: "Aceasta este o cerere de programare. Medicul sau clinica trebuie să o confirme.",
      submitting: "Se trimite...",
      submit: "Trimite cererea",
      invalidClinic: "Selectează o clinică validă.",
      selectDate: "Selectează data programării.",
      invalidDate: "Selectează o dată validă pentru programare.",
      selectTime: "Selectează una dintre orele disponibile.",
      invalidName: "Introdu un nume valid.",
      invalidPhone: "Introdu un număr de telefon valid.",
      submitFailed: "Cererea de programare nu a putut fi trimisă.",
      confirmationFailed: "Cererea a fost salvată, dar pagina de confirmare nu a putut fi deschisă."
    }
  },
  en: {
    preAuth: {
      selectClinicError: "Select a clinic.", selectDateTimeError: "Select the appointment date and time.", unavailable: "Online appointments are not yet available for this doctor.", eyebrow: "Online appointment", title: "Choose the clinic, date and time", description: "You can select the time slot before signing in. RomDoc keeps it temporarily in this browser while you sign in or confirm your account.", clinicStep: "1. Clinic", dateTimeStep: "2. Date and time", selectedSlot: "Selected slot for {doctorName}: {date}, {time}.", accountNotice: "You need a patient account with a confirmed email address to send the request.", signIn: "Sign in and continue", createAccount: "Create patient account", privacy: "Only the doctor, clinic, date, time and duration are stored temporarily. Your name, phone number, email, messages and medical information are not stored."
    },
    gate: { verifyEmailTitle: "Verify your email address", verifyEmailDescription: "You must confirm your email address before requesting the appointment. After confirmation, you will return to this profile and the selected clinic, date and time will be restored automatically.", profileError: "The account could not be verified.", incompatibleTitle: "Incompatible account", incompatibleDescription: "Doctor, administrator and clinic staff accounts cannot request appointments as a patient." },
    calendar: { title: "Select date and time", description: "Green dates have at least one available slot. The request is sent after you choose a date and time.", selectClinicFirst: "Select a clinic first to view the available calendar.", previousMonth: "Previous month", nextMonth: "Next month", available: "Available", selected: "Selected", unavailable: "Unavailable", availableDateLabel: "{date}, {count} available slots", unavailableDateLabel: "{date}, unavailable", loading: "Loading availability...", loadFailed: "Availability could not be loaded.", retry: "Try again", noSlotsTitle: "There are no available slots shown for this month.", noSlotsDescription: "You can check another available month. Online booking remains available only after selecting an open date and time.", availableTimes: "Available times for {date}", noSuitableTimeTitle: "Cannot find a suitable time?", noSuitableTimeDescription: "RomDoc currently sends the online request only after an available slot is selected." },
    form: { steps: { clinic: "Clinic", availability: "Date and time", patient: "Patient details", review: "Review" }, stepsAria: "Appointment steps", unavailable: "Online appointments are not yet available for this doctor.", eyebrow: "Online appointment", title: "Request an appointment", description: "Complete the steps to request a consultation with {doctorName}.", restored: "The clinic, date and time selected before sign-in were restored. Review the slot and complete the patient details.", chooseClinic: "Choose the clinic", chooseClinicDescription: "Select where you would like the consultation to take place.", continueDateTime: "Continue to date and time", selectedClinic: "Selected clinic", selectedSlot: "Selected slot:", minutes: "{count} minutes", back: "Back", continuePatient: "Continue to your details", patientTitle: "Patient details", patientDescription: "This information is used to identify and contact the patient.", fullName: "Full name", phone: "Phone", verifiedEmail: "Verified email", accountAssociation: "The appointment will be linked to this account.", doctorMessage: "Message for the doctor", optional: "(optional)", messagePlaceholder: "Briefly describe the reason for the consultation.", reviewAppointment: "Review appointment", reviewTitle: "Review the details", reviewDescription: "Confirm that the information is correct before sending the request.", doctorAndClinic: "Doctor and clinic", dateAndTime: "Date and time", patient: "Patient", requestNotice: "This is an appointment request. The doctor or clinic must confirm it.", submitting: "Sending...", submit: "Send request", invalidClinic: "Select a valid clinic.", selectDate: "Select the appointment date.", invalidDate: "Select a valid appointment date.", selectTime: "Select one of the available times.", invalidName: "Enter a valid name.", invalidPhone: "Enter a valid phone number.", submitFailed: "The appointment request could not be sent.", confirmationFailed: "The request was saved, but the confirmation page could not be opened." }
  },
  de: {
    preAuth: { selectClinicError: "Wählen Sie eine Klinik aus.", selectDateTimeError: "Wählen Sie Datum und Uhrzeit des Termins aus.", unavailable: "Online-Termine sind für diesen Arzt noch nicht verfügbar.", eyebrow: "Online-Termin", title: "Klinik, Datum und Uhrzeit auswählen", description: "Sie können das Zeitfenster vor der Anmeldung auswählen. RomDoc speichert es vorübergehend in diesem Browser, während Sie sich anmelden oder Ihr Konto bestätigen.", clinicStep: "1. Klinik", dateTimeStep: "2. Datum und Uhrzeit", selectedSlot: "Ausgewähltes Zeitfenster für {doctorName}: {date}, {time} Uhr.", accountNotice: "Zum Senden der Anfrage benötigen Sie ein Patientenkonto mit bestätigter E-Mail-Adresse.", signIn: "Anmelden und fortfahren", createAccount: "Patientenkonto erstellen", privacy: "Vorübergehend werden nur Arzt, Klinik, Datum, Uhrzeit und Dauer gespeichert. Name, Telefonnummer, E-Mail-Adresse, Nachrichten und medizinische Informationen werden nicht gespeichert." },
    gate: { verifyEmailTitle: "E-Mail-Adresse bestätigen", verifyEmailDescription: "Sie müssen Ihre E-Mail-Adresse bestätigen, bevor Sie den Termin anfragen können. Danach kehren Sie zu diesem Profil zurück und Klinik, Datum und Uhrzeit werden automatisch wiederhergestellt.", profileError: "Das Konto konnte nicht überprüft werden.", incompatibleTitle: "Nicht kompatibles Konto", incompatibleDescription: "Arzt-, Administrator- und Klinikpersonalkonten können keine Termine als Patient anfragen." },
    calendar: { title: "Datum und Uhrzeit auswählen", description: "Grüne Daten haben mindestens ein verfügbares Zeitfenster. Die Anfrage wird nach Auswahl von Datum und Uhrzeit gesendet.", selectClinicFirst: "Wählen Sie zuerst eine Klinik aus, um den verfügbaren Kalender zu sehen.", previousMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", available: "Verfügbar", selected: "Ausgewählt", unavailable: "Nicht verfügbar", availableDateLabel: "{date}, {count} verfügbare Zeitfenster", unavailableDateLabel: "{date}, nicht verfügbar", loading: "Verfügbarkeit wird geladen...", loadFailed: "Die Verfügbarkeit konnte nicht geladen werden.", retry: "Erneut versuchen", noSlotsTitle: "Für diesen Monat werden keine freien Zeitfenster angezeigt.", noSlotsDescription: "Sie können einen anderen verfügbaren Monat prüfen. Die Online-Buchung ist erst nach Auswahl eines freien Datums und einer Uhrzeit möglich.", availableTimes: "Verfügbare Zeiten für {date}", noSuitableTimeTitle: "Keine passende Uhrzeit gefunden?", noSuitableTimeDescription: "RomDoc sendet die Online-Anfrage derzeit nur nach Auswahl eines verfügbaren Zeitfensters." },
    form: { steps: { clinic: "Klinik", availability: "Datum und Uhrzeit", patient: "Patientendaten", review: "Prüfung" }, stepsAria: "Terminschritte", unavailable: "Online-Termine sind für diesen Arzt noch nicht verfügbar.", eyebrow: "Online-Termin", title: "Termin anfragen", description: "Füllen Sie die Schritte aus, um eine Konsultation bei {doctorName} anzufragen.", restored: "Die vor der Anmeldung ausgewählte Klinik sowie Datum und Uhrzeit wurden wiederhergestellt. Prüfen Sie das Zeitfenster und ergänzen Sie die Patientendaten.", chooseClinic: "Klinik auswählen", chooseClinicDescription: "Wählen Sie den Ort aus, an dem die Konsultation stattfinden soll.", continueDateTime: "Weiter zu Datum und Uhrzeit", selectedClinic: "Ausgewählte Klinik", selectedSlot: "Ausgewähltes Zeitfenster:", minutes: "{count} Minuten", back: "Zurück", continuePatient: "Weiter zu Ihren Daten", patientTitle: "Patientendaten", patientDescription: "Diese Angaben werden zur Identifizierung und Kontaktaufnahme mit dem Patienten verwendet.", fullName: "Vollständiger Name", phone: "Telefon", verifiedEmail: "Bestätigte E-Mail-Adresse", accountAssociation: "Der Termin wird diesem Konto zugeordnet.", doctorMessage: "Nachricht an den Arzt", optional: "(optional)", messagePlaceholder: "Beschreiben Sie kurz den Grund der Konsultation.", reviewAppointment: "Termin prüfen", reviewTitle: "Details prüfen", reviewDescription: "Bestätigen Sie vor dem Senden, dass die Angaben korrekt sind.", doctorAndClinic: "Arzt und Klinik", dateAndTime: "Datum und Uhrzeit", patient: "Patient", requestNotice: "Dies ist eine Terminanfrage. Der Arzt oder die Klinik muss sie bestätigen.", submitting: "Wird gesendet...", submit: "Anfrage senden", invalidClinic: "Wählen Sie eine gültige Klinik aus.", selectDate: "Wählen Sie das Termindatum aus.", invalidDate: "Wählen Sie ein gültiges Termindatum aus.", selectTime: "Wählen Sie eine der verfügbaren Uhrzeiten aus.", invalidName: "Geben Sie einen gültigen Namen ein.", invalidPhone: "Geben Sie eine gültige Telefonnummer ein.", submitFailed: "Die Terminanfrage konnte nicht gesendet werden.", confirmationFailed: "Die Anfrage wurde gespeichert, aber die Bestätigungsseite konnte nicht geöffnet werden." }
  }
} as const;

export function interpolateBookingCopy(
  template: string,
  values: Record<string, string>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, value),
    template
  );
}
