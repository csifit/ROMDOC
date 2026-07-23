import type {
  ClinicOrganizationApiCode,
} from "@/lib/api/clinic-organization-api-codes";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

const COPY:
  Record<
    AppLocale,
    Record<
      ClinicOrganizationApiCode,
      string
    >
  > = {
    ro: {
      invalid_json:
        "Cererea nu conține date JSON valide.",
      authentication_required:
        "Trebuie să fii autentificat.",
      clinic_manager_required:
        "Doar un Clinic Manager poate efectua această acțiune.",
      active_manager_required:
        "Contul Clinic Manager trebuie să fie activ.",
      organization_required:
        "Selectează organizația clinicii.",
      organization_access_denied:
        "Nu ai acces la această organizație de clinică.",
      organization_not_found:
        "Organizația clinicii nu a fost găsită.",
      organization_not_active:
        "Organizația clinicii nu este activă. Numai Administratorul RomDoc poate suspenda sau reactiva organizația.",
      doctor_email_invalid:
        "Introdu o adresă de e-mail validă pentru medic.",
      invitation_check_failed:
        "Invitația nu a putut fi verificată.",
      invitation_already_exists:
        "Există deja o invitație activă sau acceptată pentru acest medic în această organizație.",
      invitation_create_failed:
        "Invitația nu a putut fi creată.",
      invitation_sent:
        "Invitația a fost creată și trimisă medicului.",
      invitation_created_email_failed:
        "Invitația a fost creată. E-mailul nu a fost trimis automat, dar poți copia linkul de invitație.",
      location_name_required:
        "Introdu numele locației.",
      location_address_required:
        "Selectează adresa locației din lista Google.",
      location_email_invalid:
        "Adresa de e-mail a locației nu este validă.",
      location_website_invalid:
        "Adresa website-ului locației nu este validă.",
      location_address_verification_failed:
        "Adresa locației nu a putut fi verificată.",
      location_city_resolution_failed:
        "Orașul locației nu a putut fi verificat.",
      clinic_lookup_failed:
        "Locația existentă nu a putut fi verificată.",
      location_create_failed:
        "Locația nu a putut fi creată.",
      location_translation_failed:
        "Denumirea locației nu a putut fi salvată.",
      organization_location_lookup_failed:
        "Asocierea locației cu organizația nu a putut fi verificată.",
      organization_location_already_active:
        "Locația este deja activă pentru organizația clinicii.",
      organization_location_already_pending:
        "Locația a fost deja solicitată și așteaptă aprobarea RomDoc.",
      organization_location_create_failed:
        "Locația nu a putut fi asociată organizației.",
      organization_location_submitted:
        "Locația a fost trimisă spre verificare și asociere cu organizația clinicii.",
      relationship_required:
        "Relația medic-organizație lipsește.",
      clinic_required:
        "Alege o locație aprobată.",
      doctor_relationship_not_found:
        "Medicul invitat nu a fost găsit.",
      approved_location_required:
        "Locația selectată nu este o locație aprobată pentru această organizație.",
      doctor_location_update_failed:
        "Locația medicului nu a putut fi actualizată.",
      organization_locations_lookup_failed:
        "Locațiile organizației nu au putut fi verificate.",
      doctor_location_cleanup_failed:
        "Asocierile vechi ale medicului nu au putut fi curățate.",
      doctor_location_sync_failed:
        "Locația a fost salvată în relația organizației, dar nu a putut fi sincronizată pe profilul medicului.",
      doctor_location_assigned:
        "Medicul a fost atribuit locației aprobate.",
      doctor_location_prepared:
        "Locația a fost pregătită pentru medicul invitat și se va sincroniza după crearea contului.",
    },
    en: {
      invalid_json:
        "The request does not contain valid JSON.",
      authentication_required:
        "You must be signed in.",
      clinic_manager_required:
        "Only a Clinic Manager can perform this action.",
      active_manager_required:
        "The Clinic Manager account must be active.",
      organization_required:
        "Select the clinic organisation.",
      organization_access_denied:
        "You do not have access to this clinic organisation.",
      organization_not_found:
        "The clinic organisation was not found.",
      organization_not_active:
        "The clinic organisation is not active. Only a RomDoc Administrator can suspend or reactivate the organisation.",
      doctor_email_invalid:
        "Enter a valid email address for the Doctor.",
      invitation_check_failed:
        "The invitation could not be checked.",
      invitation_already_exists:
        "An active or accepted invitation already exists for this Doctor in this organisation.",
      invitation_create_failed:
        "The invitation could not be created.",
      invitation_sent:
        "The invitation was created and sent to the Doctor.",
      invitation_created_email_failed:
        "The invitation was created. The email was not sent automatically, but you can copy the invitation link.",
      location_name_required:
        "Enter the location name.",
      location_address_required:
        "Select the location address from the Google list.",
      location_email_invalid:
        "The location email address is invalid.",
      location_website_invalid:
        "The location website address is invalid.",
      location_address_verification_failed:
        "The location address could not be verified.",
      location_city_resolution_failed:
        "The location city could not be verified.",
      clinic_lookup_failed:
        "The existing location could not be verified.",
      location_create_failed:
        "The location could not be created.",
      location_translation_failed:
        "The location name could not be saved.",
      organization_location_lookup_failed:
        "The organisation-location association could not be checked.",
      organization_location_already_active:
        "The location is already active for the clinic organisation.",
      organization_location_already_pending:
        "The location has already been submitted and is awaiting RomDoc approval.",
      organization_location_create_failed:
        "The location could not be associated with the organisation.",
      organization_location_submitted:
        "The location was submitted for review and association with the clinic organisation.",
      relationship_required:
        "The Doctor-organisation relationship is missing.",
      clinic_required:
        "Choose an approved location.",
      doctor_relationship_not_found:
        "The invited Doctor was not found.",
      approved_location_required:
        "The selected location is not approved for this organisation.",
      doctor_location_update_failed:
        "The Doctor's location could not be updated.",
      organization_locations_lookup_failed:
        "The organisation's locations could not be verified.",
      doctor_location_cleanup_failed:
        "The Doctor's old location associations could not be removed.",
      doctor_location_sync_failed:
        "The location was saved on the organisation relationship but could not be synchronized to the Doctor profile.",
      doctor_location_assigned:
        "The Doctor was assigned to the approved location.",
      doctor_location_prepared:
        "The location was prepared for the invited Doctor and will synchronize after account creation.",
    },
    de: {
      invalid_json:
        "Die Anfrage enthält keine gültigen JSON-Daten.",
      authentication_required:
        "Sie müssen angemeldet sein.",
      clinic_manager_required:
        "Nur ein Klinikmanager kann diese Aktion ausführen.",
      active_manager_required:
        "Das Klinikmanager-Konto muss aktiv sein.",
      organization_required:
        "Wählen Sie die Klinikorganisation aus.",
      organization_access_denied:
        "Sie haben keinen Zugriff auf diese Klinikorganisation.",
      organization_not_found:
        "Die Klinikorganisation wurde nicht gefunden.",
      organization_not_active:
        "Die Klinikorganisation ist nicht aktiv. Nur ein RomDoc-Administrator kann die Organisation sperren oder reaktivieren.",
      doctor_email_invalid:
        "Geben Sie eine gültige E-Mail-Adresse für den Arzt ein.",
      invitation_check_failed:
        "Die Einladung konnte nicht geprüft werden.",
      invitation_already_exists:
        "Für diesen Arzt existiert in dieser Organisation bereits eine aktive oder angenommene Einladung.",
      invitation_create_failed:
        "Die Einladung konnte nicht erstellt werden.",
      invitation_sent:
        "Die Einladung wurde erstellt und an den Arzt gesendet.",
      invitation_created_email_failed:
        "Die Einladung wurde erstellt. Die E-Mail wurde nicht automatisch gesendet, aber Sie können den Einladungslink kopieren.",
      location_name_required:
        "Geben Sie den Namen des Standorts ein.",
      location_address_required:
        "Wählen Sie die Standortadresse aus der Google-Liste.",
      location_email_invalid:
        "Die E-Mail-Adresse des Standorts ist ungültig.",
      location_website_invalid:
        "Die Website-Adresse des Standorts ist ungültig.",
      location_address_verification_failed:
        "Die Standortadresse konnte nicht überprüft werden.",
      location_city_resolution_failed:
        "Die Stadt des Standorts konnte nicht überprüft werden.",
      clinic_lookup_failed:
        "Der vorhandene Standort konnte nicht überprüft werden.",
      location_create_failed:
        "Der Standort konnte nicht erstellt werden.",
      location_translation_failed:
        "Der Standortname konnte nicht gespeichert werden.",
      organization_location_lookup_failed:
        "Die Zuordnung zwischen Organisation und Standort konnte nicht geprüft werden.",
      organization_location_already_active:
        "Der Standort ist für die Klinikorganisation bereits aktiv.",
      organization_location_already_pending:
        "Der Standort wurde bereits eingereicht und wartet auf die RomDoc-Freigabe.",
      organization_location_create_failed:
        "Der Standort konnte der Organisation nicht zugeordnet werden.",
      organization_location_submitted:
        "Der Standort wurde zur Prüfung und Zuordnung zur Klinikorganisation eingereicht.",
      relationship_required:
        "Die Beziehung zwischen Arzt und Organisation fehlt.",
      clinic_required:
        "Wählen Sie einen freigegebenen Standort.",
      doctor_relationship_not_found:
        "Der eingeladene Arzt wurde nicht gefunden.",
      approved_location_required:
        "Der ausgewählte Standort ist für diese Organisation nicht freigegeben.",
      doctor_location_update_failed:
        "Der Standort des Arztes konnte nicht aktualisiert werden.",
      organization_locations_lookup_failed:
        "Die Standorte der Organisation konnten nicht überprüft werden.",
      doctor_location_cleanup_failed:
        "Die alten Standortzuordnungen des Arztes konnten nicht entfernt werden.",
      doctor_location_sync_failed:
        "Der Standort wurde in der Organisationsbeziehung gespeichert, konnte aber nicht mit dem Arztprofil synchronisiert werden.",
      doctor_location_assigned:
        "Der Arzt wurde dem freigegebenen Standort zugeordnet.",
      doctor_location_prepared:
        "Der Standort wurde für den eingeladenen Arzt vorbereitet und wird nach der Kontoerstellung synchronisiert.",
    },
  };

export function
getClinicOrganizationApiMessage(
  locale: AppLocale,
  code:
    ClinicOrganizationApiCode
) {
  return COPY[locale][code];
}
