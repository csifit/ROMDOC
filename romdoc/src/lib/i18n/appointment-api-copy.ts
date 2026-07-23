import type {
  AppointmentApiCode,
} from "@/lib/api/appointment-api-codes";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type MessageParameters = {
  leadDays?: number;
  maximumDays?: number;
};

const COPY:
  Record<
    AppLocale,
    Record<
      AppointmentApiCode,
      string
    >
  > = {
    ro: {
      invalid_json:
        "Cererea nu conține date JSON valide.",
      required_fields:
        "Completează toate câmpurile obligatorii și selectează o oră disponibilă.",
      doctor_id_invalid:
        "Medicul selectat nu este valid.",
      clinic_id_invalid:
        "Clinica selectată nu este validă.",
      patient_name_invalid:
        "Introdu un nume valid.",
      patient_phone_invalid:
        "Introdu un număr de telefon valid.",
      provider_data_invalid:
        "Datele medicului sau clinicii nu sunt valide.",
      appointment_date_invalid:
        "Data programării nu este validă.",
      appointment_time_invalid:
        "Ora programării nu este validă.",
      appointment_duration_invalid:
        "Durata programării nu este validă.",
      appointment_notes_too_long:
        "Mesajul pentru medic este prea lung.",
      appointment_too_soon:
        "Programările online pot fi solicitate începând cu {leadDays} zile după data curentă.",
      appointment_too_far:
        "Programările pot fi solicitate cu maximum {maximumDays} de zile în avans.",
      authentication_required:
        "Trebuie să fii autentificat.",
      email_confirmation_required:
        "Confirmă adresa de e-mail înainte de a solicita o programare.",
      patient_email_missing:
        "Contul autentificat nu are o adresă de e-mail validă.",
      patient_profile_lookup_failed:
        "Contul pacientului nu a putut fi verificat.",
      active_patient_required:
        "Doar conturile active de pacient pot solicita programări.",
      doctor_lookup_failed:
        "Medicul selectat nu a putut fi verificat.",
      doctor_unavailable:
        "Medicul selectat nu este disponibil.",
      clinic_scope_lookup_failed:
        "Clinica selectată nu a putut fi verificată.",
      doctor_clinic_unavailable:
        "Clinica selectată nu este disponibilă pentru acest medic.",
      appointment_slots_lookup_failed:
        "Ora selectată nu a putut fi verificată. Reîncarcă pagina și încearcă din nou.",
      appointment_slot_unavailable:
        "Intervalul selectat nu mai este disponibil. Alege o altă oră.",
      appointment_slot_conflict:
        "Intervalul selectat tocmai a fost ocupat. Alege o altă dată sau oră.",
      appointment_outside_working_hours:
        "Intervalul selectat este în afara programului de lucru al medicului.",
      appointment_overlaps_break:
        "Intervalul selectat se suprapune cu o pauză din program.",
      doctor_unavailable_for_period:
        "Medicul este indisponibil în intervalul selectat.",
      appointment_duration_mismatch:
        "Durata programării nu corespunde intervalelor configurate de medic.",
      appointment_create_denied:
        "Contul nu are permisiunea necesară pentru a crea această programare.",
      appointment_create_failed:
        "Programarea nu a putut fi creată.",
      appointment_created:
        "Cererea de programare a fost trimisă.",
      appointment_role_required:
        "Nu ai un rol activ care poate administra programări.",
      appointment_id_invalid:
        "Identificatorul programării nu este valid.",
      appointment_action_invalid:
        "Acțiunea solicitată nu este validă.",
      appointment_schedule_required:
        "Selectează data și ora programării.",
      reschedule_reason_required:
        "Introdu motivul reprogramării.",
      appointment_reason_too_long:
        "Motivul sau nota poate avea cel mult 2.000 de caractere.",
      appointment_not_found:
        "Programarea nu a fost găsită.",
      appointment_action_not_permitted:
        "Nu ai permisiunea de a modifica această programare.",
      appointment_clinic_unavailable:
        "Clinica nu este disponibilă pentru această programare.",
      appointment_date_in_past:
        "Nu poți selecta o dată din trecut.",
      appointment_transition_invalid:
        "Această schimbare nu este permisă pentru starea actuală a programării.",
      appointment_reschedule_same_slot:
        "Pentru reprogramare trebuie să alegi o dată sau o oră diferită.",
      appointment_update_failed:
        "Programarea nu a putut fi actualizată.",
      appointment_confirmed:
        "Programarea a fost confirmată.",
      appointment_rescheduled:
        "Programarea a fost reprogramată.",
      appointment_cancelled:
        "Programarea a fost anulată.",
      appointment_completed:
        "Programarea a fost marcată ca finalizată.",
      appointment_no_show:
        "Programarea a fost marcată ca neprezentare.",
      unexpected_error:
        "A apărut o eroare neașteptată.",
    },
    en: {
      invalid_json:
        "The request does not contain valid JSON.",
      required_fields:
        "Complete all required fields and select an available time.",
      doctor_id_invalid:
        "The selected Doctor is invalid.",
      clinic_id_invalid:
        "The selected clinic is invalid.",
      patient_name_invalid:
        "Enter a valid name.",
      patient_phone_invalid:
        "Enter a valid phone number.",
      provider_data_invalid:
        "The Doctor or clinic information is invalid.",
      appointment_date_invalid:
        "The appointment date is invalid.",
      appointment_time_invalid:
        "The appointment time is invalid.",
      appointment_duration_invalid:
        "The appointment duration is invalid.",
      appointment_notes_too_long:
        "The message for the Doctor is too long.",
      appointment_too_soon:
        "Online appointments can be requested from {leadDays} days after today.",
      appointment_too_far:
        "Appointments can be requested up to {maximumDays} days in advance.",
      authentication_required:
        "You must be signed in.",
      email_confirmation_required:
        "Confirm your email address before requesting an appointment.",
      patient_email_missing:
        "The signed-in account does not have a valid email address.",
      patient_profile_lookup_failed:
        "The patient account could not be verified.",
      active_patient_required:
        "Only active patient accounts can request appointments.",
      doctor_lookup_failed:
        "The selected Doctor could not be verified.",
      doctor_unavailable:
        "The selected Doctor is not available.",
      clinic_scope_lookup_failed:
        "The selected clinic could not be verified.",
      doctor_clinic_unavailable:
        "The selected clinic is not available for this Doctor.",
      appointment_slots_lookup_failed:
        "The selected time could not be verified. Reload the page and try again.",
      appointment_slot_unavailable:
        "The selected time is no longer available. Choose another time.",
      appointment_slot_conflict:
        "The selected time has just been booked. Choose another date or time.",
      appointment_outside_working_hours:
        "The selected time is outside the Doctor's working hours.",
      appointment_overlaps_break:
        "The selected time overlaps a configured break.",
      doctor_unavailable_for_period:
        "The Doctor is unavailable during the selected period.",
      appointment_duration_mismatch:
        "The appointment duration does not match the Doctor's configured slots.",
      appointment_create_denied:
        "This account is not allowed to create the appointment.",
      appointment_create_failed:
        "The appointment could not be created.",
      appointment_created:
        "The appointment request was sent.",
      appointment_role_required:
        "You do not have an active role that can manage appointments.",
      appointment_id_invalid:
        "The appointment identifier is invalid.",
      appointment_action_invalid:
        "The requested action is invalid.",
      appointment_schedule_required:
        "Select the appointment date and time.",
      reschedule_reason_required:
        "Enter the reason for rescheduling.",
      appointment_reason_too_long:
        "The reason or note can contain at most 2,000 characters.",
      appointment_not_found:
        "The appointment was not found.",
      appointment_action_not_permitted:
        "You are not allowed to modify this appointment.",
      appointment_clinic_unavailable:
        "The clinic is not available for this appointment.",
      appointment_date_in_past:
        "You cannot select a date in the past.",
      appointment_transition_invalid:
        "This change is not allowed for the appointment's current status.",
      appointment_reschedule_same_slot:
        "Choose a different date or time when rescheduling.",
      appointment_update_failed:
        "The appointment could not be updated.",
      appointment_confirmed:
        "The appointment was confirmed.",
      appointment_rescheduled:
        "The appointment was rescheduled.",
      appointment_cancelled:
        "The appointment was cancelled.",
      appointment_completed:
        "The appointment was marked as completed.",
      appointment_no_show:
        "The appointment was marked as a no-show.",
      unexpected_error:
        "An unexpected error occurred.",
    },
    de: {
      invalid_json:
        "Die Anfrage enthält keine gültigen JSON-Daten.",
      required_fields:
        "Füllen Sie alle Pflichtfelder aus und wählen Sie eine verfügbare Uhrzeit.",
      doctor_id_invalid:
        "Der ausgewählte Arzt ist ungültig.",
      clinic_id_invalid:
        "Die ausgewählte Klinik ist ungültig.",
      patient_name_invalid:
        "Geben Sie einen gültigen Namen ein.",
      patient_phone_invalid:
        "Geben Sie eine gültige Telefonnummer ein.",
      provider_data_invalid:
        "Die Angaben zum Arzt oder zur Klinik sind ungültig.",
      appointment_date_invalid:
        "Das Termindatum ist ungültig.",
      appointment_time_invalid:
        "Die Terminuhrzeit ist ungültig.",
      appointment_duration_invalid:
        "Die Termindauer ist ungültig.",
      appointment_notes_too_long:
        "Die Nachricht an den Arzt ist zu lang.",
      appointment_too_soon:
        "Online-Termine können ab {leadDays} Tagen nach dem heutigen Datum angefragt werden.",
      appointment_too_far:
        "Termine können höchstens {maximumDays} Tage im Voraus angefragt werden.",
      authentication_required:
        "Sie müssen angemeldet sein.",
      email_confirmation_required:
        "Bestätigen Sie Ihre E-Mail-Adresse, bevor Sie einen Termin anfragen.",
      patient_email_missing:
        "Das angemeldete Konto hat keine gültige E-Mail-Adresse.",
      patient_profile_lookup_failed:
        "Das Patientenkonto konnte nicht überprüft werden.",
      active_patient_required:
        "Nur aktive Patientenkonten können Termine anfragen.",
      doctor_lookup_failed:
        "Der ausgewählte Arzt konnte nicht überprüft werden.",
      doctor_unavailable:
        "Der ausgewählte Arzt ist nicht verfügbar.",
      clinic_scope_lookup_failed:
        "Die ausgewählte Klinik konnte nicht überprüft werden.",
      doctor_clinic_unavailable:
        "Die ausgewählte Klinik ist für diesen Arzt nicht verfügbar.",
      appointment_slots_lookup_failed:
        "Die ausgewählte Uhrzeit konnte nicht überprüft werden. Laden Sie die Seite neu und versuchen Sie es erneut.",
      appointment_slot_unavailable:
        "Die ausgewählte Uhrzeit ist nicht mehr verfügbar. Wählen Sie eine andere Uhrzeit.",
      appointment_slot_conflict:
        "Die ausgewählte Uhrzeit wurde gerade belegt. Wählen Sie ein anderes Datum oder eine andere Uhrzeit.",
      appointment_outside_working_hours:
        "Die ausgewählte Uhrzeit liegt außerhalb der Arbeitszeiten des Arztes.",
      appointment_overlaps_break:
        "Die ausgewählte Uhrzeit überschneidet sich mit einer eingetragenen Pause.",
      doctor_unavailable_for_period:
        "Der Arzt ist im ausgewählten Zeitraum nicht verfügbar.",
      appointment_duration_mismatch:
        "Die Termindauer entspricht nicht den konfigurierten Zeitfenstern des Arztes.",
      appointment_create_denied:
        "Dieses Konto darf den Termin nicht erstellen.",
      appointment_create_failed:
        "Der Termin konnte nicht erstellt werden.",
      appointment_created:
        "Die Terminanfrage wurde gesendet.",
      appointment_role_required:
        "Sie haben keine aktive Rolle, die Termine verwalten darf.",
      appointment_id_invalid:
        "Die Termin-ID ist ungültig.",
      appointment_action_invalid:
        "Die angeforderte Aktion ist ungültig.",
      appointment_schedule_required:
        "Wählen Sie Datum und Uhrzeit des Termins.",
      reschedule_reason_required:
        "Geben Sie den Grund für die Terminverschiebung ein.",
      appointment_reason_too_long:
        "Der Grund oder die Notiz darf höchstens 2.000 Zeichen enthalten.",
      appointment_not_found:
        "Der Termin wurde nicht gefunden.",
      appointment_action_not_permitted:
        "Sie dürfen diesen Termin nicht ändern.",
      appointment_clinic_unavailable:
        "Die Klinik ist für diesen Termin nicht verfügbar.",
      appointment_date_in_past:
        "Sie können kein Datum in der Vergangenheit auswählen.",
      appointment_transition_invalid:
        "Diese Änderung ist für den aktuellen Terminstatus nicht zulässig.",
      appointment_reschedule_same_slot:
        "Wählen Sie beim Verschieben ein anderes Datum oder eine andere Uhrzeit.",
      appointment_update_failed:
        "Der Termin konnte nicht aktualisiert werden.",
      appointment_confirmed:
        "Der Termin wurde bestätigt.",
      appointment_rescheduled:
        "Der Termin wurde verschoben.",
      appointment_cancelled:
        "Der Termin wurde abgesagt.",
      appointment_completed:
        "Der Termin wurde als abgeschlossen markiert.",
      appointment_no_show:
        "Der Termin wurde als nicht wahrgenommen markiert.",
      unexpected_error:
        "Ein unerwarteter Fehler ist aufgetreten.",
    },
  };

export function
getAppointmentApiMessage(
  locale: AppLocale,
  code:
    AppointmentApiCode,
  parameters:
    MessageParameters = {}
) {
  return COPY[locale][code]
    .replaceAll(
      "{leadDays}",
      String(
        parameters.leadDays ??
          ""
      )
    )
    .replaceAll(
      "{maximumDays}",
      String(
        parameters.maximumDays ??
          ""
      )
    );
}
