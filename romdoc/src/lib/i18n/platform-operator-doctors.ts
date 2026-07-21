import type { AppLocale } from "@/lib/i18n/app-locale";

export const PLATFORM_OPERATOR_DOCTOR_LOCALE_TAGS = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const platformOperatorDoctorMessages = {
  "ro": {
    "common": {
      "administration": "Administrare",
      "operationalManagement": "Management operațional",
      "doctorFallback": "Medic",
      "unknown": "Necunoscut",
      "none": "—",
      "yes": "Da",
      "no": "Nu",
      "close": "Închide",
      "details": "Detalii",
      "hide": "Ascunde",
      "open": "Deschide",
      "reload": "Reîncarcă",
      "loading": "Se încarcă...",
      "resetFilters": "Resetează filtrele",
      "showing": "Se afișează {filtered} din {total}",
      "created": "Creat la {date}",
      "createdAt": "Creată {date}",
      "monthsFree": "{count} luni gratuite",
      "languageRomanian": "Română",
      "languageEnglish": "Engleză",
      "recordedDiagnostic": "Diagnostic înregistrat",
      "publicProfile": "Deschide profilul public"
    },
    "pages": {
      "adminDoctors": {
        "title": "Medici",
        "description": "Urmărește conturile medicilor, verificarea profesională și situațiile care necesită intervenție. Activarea normală nu necesită aprobare administrativă."
      },
      "managerDoctors": {
        "title": "Medici",
        "description": "Caută și filtrează medicii și folosește numai acțiunile operaționale permise rolului de manager."
      },
      "adminVerifications": {
        "title": "Verificări profesionale",
        "description": "Examinează cererile și documentele medicilor, începe analiza, aprobă sau respinge solicitările și păstrează observații interne."
      },
      "managerVerifications": {
        "title": "Verificări profesionale",
        "description": "Examinează cererile și documentele profesionale ale medicilor prin fluxul securizat RomDoc."
      }
    },
    "doctors": {
      "metrics": {
        "total": "Total medici",
        "active": "Profiluri active",
        "suspended": "Profiluri suspendate",
        "verified": "Verificați profesional",
        "attention": "Necesită atenție"
      },
      "filters": {
        "title": "Căutare și filtre",
        "description": "Restrânge lista fără a modifica datele.",
        "searchLabel": "Caută medic",
        "searchPlaceholder": "Caută după nume, e-mail, specialitate, clinică sau slug...",
        "doctorStatus": "Statut profil",
        "accountStatus": "Statut cont",
        "subscriptionStatus": "Abonament",
        "payer": "Plătitor",
        "verification": "Verificare",
        "allProfiles": "Toate profilurile",
        "profileActive": "Profil activ",
        "profileSuspended": "Profil suspendat",
        "allAccounts": "Toate conturile",
        "accountActive": "Cont activ",
        "accountSuspended": "Cont suspendat",
        "accountBlocked": "Cont blocat",
        "allSubscriptions": "Toate abonamentele",
        "subscriptionActive": "Abonament activ",
        "subscriptionTrialing": "Perioadă de probă",
        "subscriptionPastDue": "Plată restantă",
        "subscriptionCanceled": "Anulat",
        "subscriptionNone": "Fără abonament",
        "allPayers": "Toți plătitorii",
        "payerDoctor": "Medic",
        "payerClinic": "Clinică",
        "allVerifications": "Toate verificările",
        "verificationVerified": "Verificați",
        "verificationPending": "În verificare",
        "verificationNotSubmitted": "Nedepus",
        "verificationRejected": "Respinși",
        "verificationExpired": "Expirați"
      },
      "labels": {
        "titleFallback": "Medic",
        "emailUnavailable": "E-mail indisponibil",
        "organization": "Organizație",
        "specialties": "Specialități",
        "doctorProfile": "Profil medic",
        "userAccount": "Cont utilizator",
        "payer": "Plătitor",
        "verification": "Verificare profesională",
        "registrationNumber": "Număr profesional",
        "expires": "Expiră",
        "clinics": "Clinici",
        "activeStaff": "Personal activ",
        "rating": "Rating",
        "reviews": "{count} recenzii",
        "commercialDetails": "Detalii comerciale",
        "accountType": "Tip cont",
        "subscriptionPayer": "Plătitor abonament",
        "clinicOrganization": "Organizație clinică",
        "plan": "Plan",
        "stripeStatus": "Status Stripe",
        "periodEnd": "Sfârșit perioadă",
        "annual": "Anual",
        "monthly": "Lunar",
        "clinicCovered": "Acoperit de clinică",
        "clinicNotApplicable": "N/A clinică",
        "publicResponsibility": "Profilul public este responsabilitatea medicului. Completitudinea este informațională, iar verificarea profesională controlează numai insigna RomDoc.",
        "clinicAssociations": "Asocieri cu clinici",
        "clinicAssociationsDeferred": "Gestionarea detaliată a clinicilor rămâne în fluxul dedicat clinicilor."
      },
      "doctorStatuses": {
        "active": "Activ",
        "suspended": "Suspendat"
      },
      "accountStatuses": {
        "active": "Activ",
        "suspended": "Suspendat",
        "blocked": "Blocat"
      },
      "accountTypes": {
        "independent": "Medic independent",
        "clinic": "Medic clinică"
      },
      "payers": {
        "doctor": "Medic / Stripe",
        "clinic": "Clinică"
      },
      "verificationStatuses": {
        "not_submitted": "Nedepus",
        "pending": "În verificare",
        "verified": "Verificat",
        "rejected": "Respins",
        "expired": "Expirat"
      },
      "subscriptionStatuses": {
        "clinic": "Plătit de clinică",
        "none": "Fără abonament",
        "active": "Activ",
        "trialing": "Perioadă de probă",
        "past_due": "Plată restantă",
        "canceled": "Anulat",
        "unpaid": "Neplătit",
        "paused": "Suspendat"
      },
      "actions": {
        "showDetails": "Detalii",
        "hideDetails": "Închide",
        "suspendProfile": "Suspendă profil",
        "reactivateProfile": "Reactivează profil",
        "blockAccount": "Blochează cont",
        "unblockAccount": "Deblochează cont",
        "verify": "Verifică profesional",
        "removeVerification": "Elimină verificarea",
        "statusConfirm": "Schimbi statutul medicului {name} în „{status}”?",
        "accountConfirm": "Schimbi statutul contului {name} în „{status}”?",
        "registrationPrompt": "Introdu numărul de înregistrare profesională:",
        "expiryPrompt": "Data expirării verificării, în format YYYY-MM-DD. Lasă necompletat dacă nu expiră:",
        "removeVerificationConfirm": "Elimini verificarea profesională a acestui medic?"
      },
      "states": {
        "loading": "Se încarcă medicii...",
        "empty": "Nu există medici care corespund filtrelor.",
        "loadFailed": "Medicii nu au putut fi încărcați.",
        "actionFailed": "Acțiunea nu a putut fi finalizată."
      }
    },
    "invitations": {
      "panel": {
        "title": "Invită un medic",
        "description": "Trimite o invitație personalizată și acordă acces gratuit fără plată Stripe pentru perioada aleasă.",
        "action": "Invită medic",
        "success": "Invitația medicului a fost trimisă.",
        "historyTitle": "Istoric invitații",
        "historyDescription": "Urmărește invitațiile trimise, acceptate, expirate sau eșuate."
      },
      "dialog": {
        "eyebrow": "Administrare",
        "title": "Invită un medic",
        "description": "Medicul va primi un e-mail securizat și acces gratuit pentru perioada selectată.",
        "firstName": "Prenume",
        "lastName": "Nume",
        "email": "E-mail",
        "invitationLanguage": "Limba invitației",
        "freeAccess": "Acces gratuit",
        "personalMessage": "Mesaj personalizat",
        "messagePlaceholder": "Exemplu: Dorim să vă invităm să vă alăturați platformei RomDoc...",
        "plainText": "Mesajul acceptă numai text simplu. Nu introduce HTML.",
        "cancel": "Anulează",
        "send": "Trimite invitația",
        "sending": "Se trimite...",
        "languageNote": "Invitațiile pot fi trimise în română sau engleză."
      },
      "filters": {
        "searchLabel": "Caută invitație",
        "searchPlaceholder": "Caută nume sau e-mail...",
        "status": "Statut",
        "all": "Toate"
      },
      "statuses": {
        "draft": "Ciornă",
        "sent": "Trimisă",
        "accepted": "Acceptată",
        "expired": "Expirată",
        "cancelled": "Anulată",
        "failed": "Eșuată"
      },
      "details": {
        "language": "Limba",
        "sent": "Trimisă",
        "expires": "Expiră",
        "accepted": "Acceptată",
        "authUser": "Utilizator Auth",
        "doctor": "Medic",
        "error": "Eroare",
        "personalMessage": "Mesaj personalizat"
      },
      "states": {
        "loading": "Se încarcă invitațiile...",
        "empty": "Nu există invitații care corespund filtrelor.",
        "loadFailed": "Invitațiile nu au putut fi încărcate.",
        "sendFailed": "Invitația nu a putut fi trimisă."
      }
    },
    "verifications": {
      "metrics": {
        "total": "Total cereri",
        "submitted": "Trimise",
        "underReview": "În analiză",
        "verified": "Aprobate"
      },
      "filters": {
        "searchLabel": "Caută medic",
        "searchPlaceholder": "Caută după numele medicului...",
        "statusLabel": "Starea cererii",
        "all": "Toate cererile"
      },
      "statuses": {
        "submitted": "Trimisă",
        "under_review": "În analiză",
        "verified": "Aprobată",
        "rejected": "Respinsă",
        "expired": "Expirată"
      },
      "queue": {
        "submittedAt": "Trimisă: {date}",
        "unknownDoctor": "Medic necunoscut",
        "medicalProfile": "Profil medical"
      },
      "detail": {
        "eyebrow": "Cerere profesională",
        "professionalNumber": "Număr profesional",
        "issuingAuthority": "Autoritate emitentă",
        "professionalTitle": "Titlu profesional",
        "countryExpiry": "Țară / expirare",
        "documents": "Documente",
        "noDocuments": "Medicul nu a atașat documente.",
        "openDocument": "Deschide documentul",
        "opening": "Se deschide...",
        "rejectionReason": "Motivul respingerii",
        "audit": "Istoric de audit",
        "auditDescription": "Acest istoric este generat de baza de date și nu poate fi modificat din interfața de administrare.",
        "noAudit": "Nu există încă evenimente de audit pentru această cerere.",
        "internalNotes": "Observații interne",
        "noNotes": "Nu există observații interne.",
        "notePlaceholder": "Observație vizibilă numai operatorilor autorizați...",
        "rejectionPlaceholder": "Explică medicului ce informații lipsesc sau trebuie corectate.",
        "startReview": "Începe analiza",
        "startingReview": "Se preia...",
        "approve": "Aprobă verificarea",
        "approving": "Se aprobă...",
        "reject": "Respinge cererea",
        "rejecting": "Se respinge...",
        "markExpired": "Marchează expirată",
        "updating": "Se actualizează...",
        "approveConfirm": "Aprobi această verificare și publici insigna „Medic verificat de RomDoc”?",
        "rejectConfirm": "Respingi această cerere? Motivul va fi vizibil medicului.",
        "expireConfirm": "Marchezi această verificare ca expirată și elimini insigna publică?"
      },
      "documentTypes": {
        "identity_document": "Document de identitate",
        "professional_certificate": "Certificat profesional",
        "membership_certificate": "Certificat de membru",
        "practice_authorization": "Autorizație de practică",
        "other": "Alt document",
        "unknown": "Document"
      },
      "auditEvents": {
        "draft_created": "Ciornă creată",
        "submitted": "Cerere trimisă",
        "review_started": "Analiză începută",
        "approved": "Verificare aprobată",
        "rejected": "Cerere respinsă",
        "expired_manual": "Verificare expirată manual",
        "expired_automatic": "Verificare expirată automat",
        "withdrawn": "Cerere retrasă"
      },
      "actors": {
        "system": "Sistem RomDoc",
        "admin": "Administrator",
        "manager": "Manager",
        "doctor": "Medic"
      },
      "states": {
        "loading": "Se încarcă cererile de verificare...",
        "emptyTitle": "Nu există cereri în această categorie",
        "emptyDescription": "Cererile trimise de medici vor apărea aici.",
        "loadFailed": "Cererile nu au putut fi încărcate.",
        "documentFailed": "Documentul nu a putut fi deschis.",
        "updateFailed": "Verificarea nu a putut fi actualizată.",
        "rejectionRequired": "Introdu motivul respingerii."
      }
    },
    "api": {
      "authentication_required": "Trebuie să fii autentificat.",
      "access_denied": "Nu ai permisiunea necesară.",
      "mfa_required": "Este necesară verificarea Google Authenticator.",
      "admin_required": "Doar administratorii pot efectua această acțiune.",
      "invalid_json": "Cererea nu conține date JSON valide.",
      "invalid_request_data": "Datele trimise nu sunt valide.",
      "invalid_action": "Acțiunea solicitată nu este validă.",
      "doctors_load_failed": "Medicii nu au putut fi încărcați.",
      "doctor_subscriptions_load_failed": "Abonamentele medicilor nu au putut fi încărcate.",
      "doctor_clinic_links_load_failed": "Asocierile clinicilor nu au putut fi încărcate.",
      "doctor_staff_load_failed": "Personalul medicilor nu a putut fi încărcat.",
      "clinic_organizations_load_failed": "Organizațiile clinicilor nu au putut fi încărcate.",
      "doctor_auth_load_failed": "Datele de autentificare ale medicilor nu au putut fi încărcate.",
      "doctors_loaded": "Medicii au fost încărcați.",
      "doctor_id_required": "Medicul lipsește.",
      "doctor_not_found": "Medicul nu a fost găsit.",
      "invalid_doctor_status": "Statutul medicului nu este valid.",
      "doctor_status_update_failed": "Statutul medicului nu a putut fi actualizat.",
      "doctor_reactivated": "Medicul a fost reactivat.",
      "doctor_suspended": "Medicul a fost suspendat.",
      "doctor_account_missing": "Medicul nu are un cont de utilizator asociat.",
      "invalid_doctor_account_status": "Statutul contului nu este valid.",
      "doctor_account_status_update_failed": "Statutul contului nu a putut fi actualizat.",
      "doctor_account_blocked": "Contul medicului a fost blocat.",
      "doctor_account_suspended": "Contul medicului a fost suspendat.",
      "doctor_account_reactivated": "Contul medicului a fost reactivat.",
      "invalid_professional_verification_status": "Statutul verificării profesionale nu este valid.",
      "professional_registration_required": "Introdu numărul de înregistrare profesională.",
      "professional_verification_expiry_invalid": "Data expirării verificării nu este validă.",
      "professional_verification_update_failed": "Verificarea profesională nu a putut fi actualizată.",
      "doctor_professionally_verified": "Medicul a fost verificat profesional.",
      "professional_verification_updated": "Statutul verificării profesionale a fost actualizat.",
      "verification_document_load_failed": "Documentul nu a putut fi încărcat.",
      "verification_document_not_found": "Documentul nu a fost găsit.",
      "verification_signed_url_failed": "Linkul temporar nu a putut fi creat.",
      "verification_submissions_load_failed": "Cererile de verificare nu au putut fi încărcate.",
      "verification_submissions_loaded": "Cererile de verificare au fost încărcate.",
      "verification_submission_required": "Cererea de verificare lipsește.",
      "invalid_verification_action": "Acțiunea de verificare nu este validă.",
      "verification_rejection_reason_required": "Motivul respingerii este obligatoriu.",
      "verification_submission_not_found": "Cererea de verificare nu a fost găsită.",
      "verification_action_conflict": "Cererea nu mai poate primi această acțiune în starea curentă.",
      "verification_update_failed": "Verificarea nu a putut fi actualizată.",
      "verification_review_started": "Cererea a fost preluată pentru analiză.",
      "verification_approved": "Medicul a fost verificat cu succes.",
      "verification_rejected": "Cererea a fost respinsă.",
      "verification_expired": "Verificarea a fost marcată ca expirată.",
      "doctor_invitation_status_filter_invalid": "Filtrul de statut nu este valid.",
      "doctor_invitations_load_failed": "Invitațiile medicilor nu au putut fi încărcate.",
      "doctor_invitations_loaded": "Invitațiile medicilor au fost încărcate.",
      "doctor_invitation_invalid_payload": "Cererea nu conține date valide.",
      "doctor_invitation_email_invalid": "Adresa de e-mail nu este validă.",
      "doctor_invitation_first_name_required": "Prenumele medicului este obligatoriu.",
      "doctor_invitation_last_name_required": "Numele medicului este obligatoriu.",
      "doctor_invitation_message_invalid": "Mesajul personalizat nu este valid.",
      "doctor_invitation_months_invalid": "Perioada gratuită trebuie să fie între 1 și 36 de luni.",
      "doctor_invitation_check_failed": "Invitația nu a putut fi verificată.",
      "active_invitation_exists": "Există deja o invitație activă pentru această adresă de e-mail.",
      "invitation_create_failed": "Invitația medicului nu a putut fi creată.",
      "site_url_not_configured": "Invitația a fost înregistrată, dar configurația URL-ului aplicației lipsește.",
      "invitation_send_failed": "Invitația a fost înregistrată, dar e-mailul nu a putut fi trimis.",
      "invitation_state_update_failed": "E-mailul a fost trimis, dar starea internă nu a putut fi actualizată. Verifică invitația înainte de retrimitere.",
      "doctor_invitation_sent": "Invitația medicului a fost trimisă."
    }
  },
  "en": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operational management",
      "doctorFallback": "Doctor",
      "unknown": "Unknown",
      "none": "—",
      "yes": "Yes",
      "no": "No",
      "close": "Close",
      "details": "Details",
      "hide": "Hide",
      "open": "Open",
      "reload": "Reload",
      "loading": "Loading...",
      "resetFilters": "Reset filters",
      "showing": "Showing {filtered} of {total}",
      "created": "Created on {date}",
      "createdAt": "Created {date}",
      "monthsFree": "{count} complimentary months",
      "languageRomanian": "Romanian",
      "languageEnglish": "English",
      "recordedDiagnostic": "Recorded diagnostic",
      "publicProfile": "Open public profile"
    },
    "pages": {
      "adminDoctors": {
        "title": "Doctors",
        "description": "Monitor doctor accounts, professional verification and cases requiring intervention. Normal activation does not require administrator approval."
      },
      "managerDoctors": {
        "title": "Doctors",
        "description": "Search and filter doctors and use only the operational actions allowed to the Manager role."
      },
      "adminVerifications": {
        "title": "Professional verification",
        "description": "Review doctor submissions and documents, start reviews, approve or reject requests and keep internal notes."
      },
      "managerVerifications": {
        "title": "Professional verification",
        "description": "Review doctors’ professional submissions and documents through the secured RomDoc workflow."
      }
    },
    "doctors": {
      "metrics": {
        "total": "Total doctors",
        "active": "Active profiles",
        "suspended": "Suspended profiles",
        "verified": "Professionally verified",
        "attention": "Requires attention"
      },
      "filters": {
        "title": "Search and filters",
        "description": "Narrow the list without changing data.",
        "searchLabel": "Search doctors",
        "searchPlaceholder": "Search by name, email, specialty, clinic or slug...",
        "doctorStatus": "Profile status",
        "accountStatus": "Account status",
        "subscriptionStatus": "Subscription",
        "payer": "Payer",
        "verification": "Verification",
        "allProfiles": "All profiles",
        "profileActive": "Active profile",
        "profileSuspended": "Suspended profile",
        "allAccounts": "All accounts",
        "accountActive": "Active account",
        "accountSuspended": "Suspended account",
        "accountBlocked": "Blocked account",
        "allSubscriptions": "All subscriptions",
        "subscriptionActive": "Active subscription",
        "subscriptionTrialing": "Trial",
        "subscriptionPastDue": "Past due",
        "subscriptionCanceled": "Cancelled",
        "subscriptionNone": "No subscription",
        "allPayers": "All payers",
        "payerDoctor": "Doctor",
        "payerClinic": "Clinic",
        "allVerifications": "All verifications",
        "verificationVerified": "Verified",
        "verificationPending": "Under verification",
        "verificationNotSubmitted": "Not submitted",
        "verificationRejected": "Rejected",
        "verificationExpired": "Expired"
      },
      "labels": {
        "titleFallback": "Doctor",
        "emailUnavailable": "Email unavailable",
        "organization": "Organisation",
        "specialties": "Specialties",
        "doctorProfile": "Doctor profile",
        "userAccount": "User account",
        "payer": "Payer",
        "verification": "Professional verification",
        "registrationNumber": "Professional number",
        "expires": "Expires",
        "clinics": "Clinics",
        "activeStaff": "Active staff",
        "rating": "Rating",
        "reviews": "{count} reviews",
        "commercialDetails": "Commercial details",
        "accountType": "Account type",
        "subscriptionPayer": "Subscription payer",
        "clinicOrganization": "Clinic organisation",
        "plan": "Plan",
        "stripeStatus": "Stripe status",
        "periodEnd": "Period end",
        "annual": "Annual",
        "monthly": "Monthly",
        "clinicCovered": "Covered by clinic",
        "clinicNotApplicable": "N/A for clinic",
        "publicResponsibility": "The public profile remains the doctor’s responsibility. Completeness is informational, while professional verification controls only the RomDoc badge.",
        "clinicAssociations": "Clinic associations",
        "clinicAssociationsDeferred": "Detailed clinic management remains in the dedicated clinic workflow."
      },
      "doctorStatuses": {
        "active": "Active",
        "suspended": "Suspended"
      },
      "accountStatuses": {
        "active": "Active",
        "suspended": "Suspended",
        "blocked": "Blocked"
      },
      "accountTypes": {
        "independent": "Independent doctor",
        "clinic": "Clinic doctor"
      },
      "payers": {
        "doctor": "Doctor / Stripe",
        "clinic": "Clinic"
      },
      "verificationStatuses": {
        "not_submitted": "Not submitted",
        "pending": "Under verification",
        "verified": "Verified",
        "rejected": "Rejected",
        "expired": "Expired"
      },
      "subscriptionStatuses": {
        "clinic": "Paid by clinic",
        "none": "No subscription",
        "active": "Active",
        "trialing": "Trial",
        "past_due": "Past due",
        "canceled": "Cancelled",
        "unpaid": "Unpaid",
        "paused": "Paused"
      },
      "actions": {
        "showDetails": "Details",
        "hideDetails": "Close",
        "suspendProfile": "Suspend profile",
        "reactivateProfile": "Reactivate profile",
        "blockAccount": "Block account",
        "unblockAccount": "Unblock account",
        "verify": "Verify professionally",
        "removeVerification": "Remove verification",
        "statusConfirm": "Change {name}’s doctor status to “{status}”?",
        "accountConfirm": "Change {name}’s account status to “{status}”?",
        "registrationPrompt": "Enter the professional registration number:",
        "expiryPrompt": "Verification expiry date in YYYY-MM-DD format. Leave empty if it does not expire:",
        "removeVerificationConfirm": "Remove this doctor’s professional verification?"
      },
      "states": {
        "loading": "Loading doctors...",
        "empty": "No doctors match the selected filters.",
        "loadFailed": "Doctors could not be loaded.",
        "actionFailed": "The action could not be completed."
      }
    },
    "invitations": {
      "panel": {
        "title": "Invite a doctor",
        "description": "Send a personalised invitation and grant complimentary access without Stripe payment for the selected period.",
        "action": "Invite doctor",
        "success": "The doctor invitation was sent.",
        "historyTitle": "Invitation history",
        "historyDescription": "Track sent, accepted, expired or failed invitations."
      },
      "dialog": {
        "eyebrow": "Administration",
        "title": "Invite a doctor",
        "description": "The doctor will receive a secure email and complimentary access for the selected period.",
        "firstName": "First name",
        "lastName": "Last name",
        "email": "Email",
        "invitationLanguage": "Invitation language",
        "freeAccess": "Complimentary access",
        "personalMessage": "Personal message",
        "messagePlaceholder": "Example: We would like to invite you to join RomDoc...",
        "plainText": "The message accepts plain text only. Do not enter HTML.",
        "cancel": "Cancel",
        "send": "Send invitation",
        "sending": "Sending...",
        "languageNote": "Invitations can be sent in Romanian or English."
      },
      "filters": {
        "searchLabel": "Search invitations",
        "searchPlaceholder": "Search by name or email...",
        "status": "Status",
        "all": "All"
      },
      "statuses": {
        "draft": "Draft",
        "sent": "Sent",
        "accepted": "Accepted",
        "expired": "Expired",
        "cancelled": "Cancelled",
        "failed": "Failed"
      },
      "details": {
        "language": "Language",
        "sent": "Sent",
        "expires": "Expires",
        "accepted": "Accepted",
        "authUser": "Auth user",
        "doctor": "Doctor",
        "error": "Error",
        "personalMessage": "Personal message"
      },
      "states": {
        "loading": "Loading invitations...",
        "empty": "No invitations match the filters.",
        "loadFailed": "Invitations could not be loaded.",
        "sendFailed": "The invitation could not be sent."
      }
    },
    "verifications": {
      "metrics": {
        "total": "Total submissions",
        "submitted": "Submitted",
        "underReview": "Under review",
        "verified": "Approved"
      },
      "filters": {
        "searchLabel": "Search doctors",
        "searchPlaceholder": "Search by doctor name...",
        "statusLabel": "Submission status",
        "all": "All submissions"
      },
      "statuses": {
        "submitted": "Submitted",
        "under_review": "Under review",
        "verified": "Approved",
        "rejected": "Rejected",
        "expired": "Expired"
      },
      "queue": {
        "submittedAt": "Submitted: {date}",
        "unknownDoctor": "Unknown doctor",
        "medicalProfile": "Medical profile"
      },
      "detail": {
        "eyebrow": "Professional submission",
        "professionalNumber": "Professional number",
        "issuingAuthority": "Issuing authority",
        "professionalTitle": "Professional title",
        "countryExpiry": "Country / expiry",
        "documents": "Documents",
        "noDocuments": "The doctor did not attach documents.",
        "openDocument": "Open document",
        "opening": "Opening...",
        "rejectionReason": "Rejection reason",
        "audit": "Audit history",
        "auditDescription": "This history is generated by the database and cannot be changed from the administration interface.",
        "noAudit": "There are no audit events for this submission yet.",
        "internalNotes": "Internal notes",
        "noNotes": "There are no internal notes.",
        "notePlaceholder": "Note visible only to authorised operators...",
        "rejectionPlaceholder": "Explain what information is missing or must be corrected.",
        "startReview": "Start review",
        "startingReview": "Starting...",
        "approve": "Approve verification",
        "approving": "Approving...",
        "reject": "Reject submission",
        "rejecting": "Rejecting...",
        "markExpired": "Mark expired",
        "updating": "Updating...",
        "approveConfirm": "Approve this verification and publish the “RomDoc Verified Doctor” badge?",
        "rejectConfirm": "Reject this submission? The reason will be visible to the doctor.",
        "expireConfirm": "Mark this verification as expired and remove the public badge?"
      },
      "documentTypes": {
        "identity_document": "Identity document",
        "professional_certificate": "Professional certificate",
        "membership_certificate": "Membership certificate",
        "practice_authorization": "Practice authorisation",
        "other": "Other document",
        "unknown": "Document"
      },
      "auditEvents": {
        "draft_created": "Draft created",
        "submitted": "Submission sent",
        "review_started": "Review started",
        "approved": "Verification approved",
        "rejected": "Submission rejected",
        "expired_manual": "Verification manually expired",
        "expired_automatic": "Verification automatically expired",
        "withdrawn": "Submission withdrawn"
      },
      "actors": {
        "system": "RomDoc system",
        "admin": "Administrator",
        "manager": "Manager",
        "doctor": "Doctor"
      },
      "states": {
        "loading": "Loading verification submissions...",
        "emptyTitle": "No submissions in this category",
        "emptyDescription": "Doctor submissions will appear here.",
        "loadFailed": "Submissions could not be loaded.",
        "documentFailed": "The document could not be opened.",
        "updateFailed": "The verification could not be updated.",
        "rejectionRequired": "Enter a rejection reason."
      }
    },
    "api": {
      "authentication_required": "You must be signed in.",
      "access_denied": "You do not have the required permission.",
      "mfa_required": "Google Authenticator verification is required.",
      "admin_required": "Only administrators can perform this action.",
      "invalid_json": "The request does not contain valid JSON.",
      "invalid_request_data": "The submitted data is invalid.",
      "invalid_action": "The requested action is invalid.",
      "doctors_load_failed": "Doctors could not be loaded.",
      "doctor_subscriptions_load_failed": "Doctor subscriptions could not be loaded.",
      "doctor_clinic_links_load_failed": "Clinic associations could not be loaded.",
      "doctor_staff_load_failed": "Doctor staff data could not be loaded.",
      "clinic_organizations_load_failed": "Clinic organisations could not be loaded.",
      "doctor_auth_load_failed": "Doctor authentication data could not be loaded.",
      "doctors_loaded": "Doctors were loaded.",
      "doctor_id_required": "The doctor is required.",
      "doctor_not_found": "The doctor was not found.",
      "invalid_doctor_status": "The doctor status is invalid.",
      "doctor_status_update_failed": "The doctor status could not be updated.",
      "doctor_reactivated": "The doctor was reactivated.",
      "doctor_suspended": "The doctor was suspended.",
      "doctor_account_missing": "The doctor has no associated user account.",
      "invalid_doctor_account_status": "The account status is invalid.",
      "doctor_account_status_update_failed": "The account status could not be updated.",
      "doctor_account_blocked": "The doctor account was blocked.",
      "doctor_account_suspended": "The doctor account was suspended.",
      "doctor_account_reactivated": "The doctor account was reactivated.",
      "invalid_professional_verification_status": "The professional verification status is invalid.",
      "professional_registration_required": "Enter the professional registration number.",
      "professional_verification_expiry_invalid": "The verification expiry date is invalid.",
      "professional_verification_update_failed": "Professional verification could not be updated.",
      "doctor_professionally_verified": "The doctor was professionally verified.",
      "professional_verification_updated": "The professional verification status was updated.",
      "verification_document_load_failed": "The document could not be loaded.",
      "verification_document_not_found": "The document was not found.",
      "verification_signed_url_failed": "The temporary link could not be created.",
      "verification_submissions_load_failed": "Verification submissions could not be loaded.",
      "verification_submissions_loaded": "Verification submissions were loaded.",
      "verification_submission_required": "The verification submission is required.",
      "invalid_verification_action": "The verification action is invalid.",
      "verification_rejection_reason_required": "A rejection reason is required.",
      "verification_submission_not_found": "The verification submission was not found.",
      "verification_action_conflict": "This action is no longer allowed in the submission’s current state.",
      "verification_update_failed": "The verification could not be updated.",
      "verification_review_started": "The submission was taken under review.",
      "verification_approved": "The doctor was verified successfully.",
      "verification_rejected": "The submission was rejected.",
      "verification_expired": "The verification was marked as expired.",
      "doctor_invitation_status_filter_invalid": "The status filter is invalid.",
      "doctor_invitations_load_failed": "Doctor invitations could not be loaded.",
      "doctor_invitations_loaded": "Doctor invitations were loaded.",
      "doctor_invitation_invalid_payload": "The request data is invalid.",
      "doctor_invitation_email_invalid": "The email address is invalid.",
      "doctor_invitation_first_name_required": "The doctor’s first name is required.",
      "doctor_invitation_last_name_required": "The doctor’s last name is required.",
      "doctor_invitation_message_invalid": "The personal message is invalid.",
      "doctor_invitation_months_invalid": "The complimentary period must be between 1 and 36 months.",
      "doctor_invitation_check_failed": "The invitation could not be checked.",
      "active_invitation_exists": "An active invitation already exists for this email address.",
      "invitation_create_failed": "The doctor invitation could not be created.",
      "site_url_not_configured": "The invitation was recorded, but the application URL is not configured.",
      "invitation_send_failed": "The invitation was recorded, but the email could not be sent.",
      "invitation_state_update_failed": "The email was sent, but the internal state could not be updated. Check the invitation before resending.",
      "doctor_invitation_sent": "The doctor invitation was sent."
    }
  },
  "de": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operatives Management",
      "doctorFallback": "Arzt",
      "unknown": "Unbekannt",
      "none": "—",
      "yes": "Ja",
      "no": "Nein",
      "close": "Schließen",
      "details": "Details",
      "hide": "Ausblenden",
      "open": "Öffnen",
      "reload": "Neu laden",
      "loading": "Wird geladen...",
      "resetFilters": "Filter zurücksetzen",
      "showing": "{filtered} von {total} werden angezeigt",
      "created": "Erstellt am {date}",
      "createdAt": "Erstellt {date}",
      "monthsFree": "{count} kostenlose Monate",
      "languageRomanian": "Rumänisch",
      "languageEnglish": "Englisch",
      "recordedDiagnostic": "Gespeicherte Diagnose",
      "publicProfile": "Öffentliches Profil öffnen"
    },
    "pages": {
      "adminDoctors": {
        "title": "Ärzte",
        "description": "Arztkonten, berufliche Verifizierung und Fälle mit Handlungsbedarf überwachen. Die normale Aktivierung benötigt keine Administratorfreigabe."
      },
      "managerDoctors": {
        "title": "Ärzte",
        "description": "Ärzte suchen und filtern und nur die für die Managerrolle erlaubten operativen Aktionen verwenden."
      },
      "adminVerifications": {
        "title": "Berufliche Verifizierungen",
        "description": "Anträge und Dokumente prüfen, Prüfungen beginnen, Anträge genehmigen oder ablehnen und interne Notizen führen."
      },
      "managerVerifications": {
        "title": "Berufliche Verifizierungen",
        "description": "Berufliche Anträge und Dokumente der Ärzte über den gesicherten RomDoc-Ablauf prüfen."
      }
    },
    "doctors": {
      "metrics": {
        "total": "Ärzte insgesamt",
        "active": "Aktive Profile",
        "suspended": "Gesperrte Profile",
        "verified": "Beruflich verifiziert",
        "attention": "Handlungsbedarf"
      },
      "filters": {
        "title": "Suche und Filter",
        "description": "Liste einschränken, ohne Daten zu ändern.",
        "searchLabel": "Ärzte suchen",
        "searchPlaceholder": "Nach Name, E-Mail, Fachgebiet, Klinik oder Slug suchen...",
        "doctorStatus": "Profilstatus",
        "accountStatus": "Kontostatus",
        "subscriptionStatus": "Abonnement",
        "payer": "Zahler",
        "verification": "Verifizierung",
        "allProfiles": "Alle Profile",
        "profileActive": "Aktives Profil",
        "profileSuspended": "Gesperrtes Profil",
        "allAccounts": "Alle Konten",
        "accountActive": "Aktives Konto",
        "accountSuspended": "Ausgesetztes Konto",
        "accountBlocked": "Gesperrtes Konto",
        "allSubscriptions": "Alle Abonnements",
        "subscriptionActive": "Aktives Abonnement",
        "subscriptionTrialing": "Testphase",
        "subscriptionPastDue": "Zahlung überfällig",
        "subscriptionCanceled": "Gekündigt",
        "subscriptionNone": "Kein Abonnement",
        "allPayers": "Alle Zahler",
        "payerDoctor": "Arzt",
        "payerClinic": "Klinik",
        "allVerifications": "Alle Verifizierungen",
        "verificationVerified": "Verifiziert",
        "verificationPending": "In Prüfung",
        "verificationNotSubmitted": "Nicht eingereicht",
        "verificationRejected": "Abgelehnt",
        "verificationExpired": "Abgelaufen"
      },
      "labels": {
        "titleFallback": "Arzt",
        "emailUnavailable": "E-Mail nicht verfügbar",
        "organization": "Organisation",
        "specialties": "Fachgebiete",
        "doctorProfile": "Arztprofil",
        "userAccount": "Benutzerkonto",
        "payer": "Zahler",
        "verification": "Berufliche Verifizierung",
        "registrationNumber": "Berufsnummer",
        "expires": "Läuft ab",
        "clinics": "Kliniken",
        "activeStaff": "Aktives Personal",
        "rating": "Bewertung",
        "reviews": "{count} Bewertungen",
        "commercialDetails": "Kommerzielle Details",
        "accountType": "Kontotyp",
        "subscriptionPayer": "Abonnementzahler",
        "clinicOrganization": "Klinikorganisation",
        "plan": "Plan",
        "stripeStatus": "Stripe-Status",
        "periodEnd": "Periodenende",
        "annual": "Jährlich",
        "monthly": "Monatlich",
        "clinicCovered": "Von Klinik übernommen",
        "clinicNotApplicable": "Nicht zutreffend für Klinik",
        "publicResponsibility": "Das öffentliche Profil bleibt in der Verantwortung des Arztes. Die Vollständigkeit ist informativ; die berufliche Verifizierung steuert nur das RomDoc-Abzeichen.",
        "clinicAssociations": "Klinikzuordnungen",
        "clinicAssociationsDeferred": "Die detaillierte Klinikverwaltung bleibt im eigenen Klinikablauf."
      },
      "doctorStatuses": {
        "active": "Aktiv",
        "suspended": "Gesperrt"
      },
      "accountStatuses": {
        "active": "Aktiv",
        "suspended": "Ausgesetzt",
        "blocked": "Gesperrt"
      },
      "accountTypes": {
        "independent": "Unabhängiger Arzt",
        "clinic": "Klinikarzt"
      },
      "payers": {
        "doctor": "Arzt / Stripe",
        "clinic": "Klinik"
      },
      "verificationStatuses": {
        "not_submitted": "Nicht eingereicht",
        "pending": "In Prüfung",
        "verified": "Verifiziert",
        "rejected": "Abgelehnt",
        "expired": "Abgelaufen"
      },
      "subscriptionStatuses": {
        "clinic": "Von Klinik bezahlt",
        "none": "Kein Abonnement",
        "active": "Aktiv",
        "trialing": "Testphase",
        "past_due": "Überfällig",
        "canceled": "Gekündigt",
        "unpaid": "Unbezahlt",
        "paused": "Pausiert"
      },
      "actions": {
        "showDetails": "Details",
        "hideDetails": "Schließen",
        "suspendProfile": "Profil sperren",
        "reactivateProfile": "Profil reaktivieren",
        "blockAccount": "Konto sperren",
        "unblockAccount": "Konto entsperren",
        "verify": "Beruflich verifizieren",
        "removeVerification": "Verifizierung entfernen",
        "statusConfirm": "Arztstatus von {name} auf „{status}“ ändern?",
        "accountConfirm": "Kontostatus von {name} auf „{status}“ ändern?",
        "registrationPrompt": "Berufliche Registrierungsnummer eingeben:",
        "expiryPrompt": "Ablaufdatum der Verifizierung im Format YYYY-MM-DD. Leer lassen, wenn sie nicht abläuft:",
        "removeVerificationConfirm": "Berufliche Verifizierung dieses Arztes entfernen?"
      },
      "states": {
        "loading": "Ärzte werden geladen...",
        "empty": "Keine Ärzte entsprechen den Filtern.",
        "loadFailed": "Ärzte konnten nicht geladen werden.",
        "actionFailed": "Die Aktion konnte nicht abgeschlossen werden."
      }
    },
    "invitations": {
      "panel": {
        "title": "Arzt einladen",
        "description": "Personalisierte Einladung senden und für den gewählten Zeitraum kostenlosen Zugang ohne Stripe-Zahlung gewähren.",
        "action": "Arzt einladen",
        "success": "Die Arzteinladung wurde gesendet.",
        "historyTitle": "Einladungsverlauf",
        "historyDescription": "Gesendete, angenommene, abgelaufene oder fehlgeschlagene Einladungen verfolgen."
      },
      "dialog": {
        "eyebrow": "Administration",
        "title": "Arzt einladen",
        "description": "Der Arzt erhält eine sichere E-Mail und kostenlosen Zugang für den gewählten Zeitraum.",
        "firstName": "Vorname",
        "lastName": "Nachname",
        "email": "E-Mail",
        "invitationLanguage": "Einladungssprache",
        "freeAccess": "Kostenloser Zugang",
        "personalMessage": "Persönliche Nachricht",
        "messagePlaceholder": "Beispiel: Wir möchten Sie zu RomDoc einladen...",
        "plainText": "Die Nachricht akzeptiert nur Klartext. Kein HTML eingeben.",
        "cancel": "Abbrechen",
        "send": "Einladung senden",
        "sending": "Wird gesendet...",
        "languageNote": "Einladungen können auf Rumänisch oder Englisch gesendet werden."
      },
      "filters": {
        "searchLabel": "Einladungen suchen",
        "searchPlaceholder": "Nach Name oder E-Mail suchen...",
        "status": "Status",
        "all": "Alle"
      },
      "statuses": {
        "draft": "Entwurf",
        "sent": "Gesendet",
        "accepted": "Angenommen",
        "expired": "Abgelaufen",
        "cancelled": "Storniert",
        "failed": "Fehlgeschlagen"
      },
      "details": {
        "language": "Sprache",
        "sent": "Gesendet",
        "expires": "Läuft ab",
        "accepted": "Angenommen",
        "authUser": "Auth-Benutzer",
        "doctor": "Arzt",
        "error": "Fehler",
        "personalMessage": "Persönliche Nachricht"
      },
      "states": {
        "loading": "Einladungen werden geladen...",
        "empty": "Keine Einladungen entsprechen den Filtern.",
        "loadFailed": "Einladungen konnten nicht geladen werden.",
        "sendFailed": "Die Einladung konnte nicht gesendet werden."
      }
    },
    "verifications": {
      "metrics": {
        "total": "Anträge insgesamt",
        "submitted": "Eingereicht",
        "underReview": "In Prüfung",
        "verified": "Genehmigt"
      },
      "filters": {
        "searchLabel": "Ärzte suchen",
        "searchPlaceholder": "Nach Arztname suchen...",
        "statusLabel": "Antragsstatus",
        "all": "Alle Anträge"
      },
      "statuses": {
        "submitted": "Eingereicht",
        "under_review": "In Prüfung",
        "verified": "Genehmigt",
        "rejected": "Abgelehnt",
        "expired": "Abgelaufen"
      },
      "queue": {
        "submittedAt": "Eingereicht: {date}",
        "unknownDoctor": "Unbekannter Arzt",
        "medicalProfile": "Medizinisches Profil"
      },
      "detail": {
        "eyebrow": "Beruflicher Antrag",
        "professionalNumber": "Berufsnummer",
        "issuingAuthority": "Ausstellende Behörde",
        "professionalTitle": "Berufsbezeichnung",
        "countryExpiry": "Land / Ablauf",
        "documents": "Dokumente",
        "noDocuments": "Der Arzt hat keine Dokumente beigefügt.",
        "openDocument": "Dokument öffnen",
        "opening": "Wird geöffnet...",
        "rejectionReason": "Ablehnungsgrund",
        "audit": "Audit-Verlauf",
        "auditDescription": "Dieser Verlauf wird von der Datenbank erzeugt und kann in der Administration nicht geändert werden.",
        "noAudit": "Für diesen Antrag gibt es noch keine Audit-Ereignisse.",
        "internalNotes": "Interne Notizen",
        "noNotes": "Keine internen Notizen vorhanden.",
        "notePlaceholder": "Nur für autorisierte Operatoren sichtbare Notiz...",
        "rejectionPlaceholder": "Erklären Sie, welche Angaben fehlen oder korrigiert werden müssen.",
        "startReview": "Prüfung beginnen",
        "startingReview": "Wird übernommen...",
        "approve": "Verifizierung genehmigen",
        "approving": "Wird genehmigt...",
        "reject": "Antrag ablehnen",
        "rejecting": "Wird abgelehnt...",
        "markExpired": "Als abgelaufen markieren",
        "updating": "Wird aktualisiert...",
        "approveConfirm": "Diese Verifizierung genehmigen und das Abzeichen „Von RomDoc verifizierter Arzt“ veröffentlichen?",
        "rejectConfirm": "Diesen Antrag ablehnen? Der Grund ist für den Arzt sichtbar.",
        "expireConfirm": "Diese Verifizierung als abgelaufen markieren und das öffentliche Abzeichen entfernen?"
      },
      "documentTypes": {
        "identity_document": "Identitätsdokument",
        "professional_certificate": "Berufszertifikat",
        "membership_certificate": "Mitgliedsbescheinigung",
        "practice_authorization": "Berufsausübungserlaubnis",
        "other": "Anderes Dokument",
        "unknown": "Dokument"
      },
      "auditEvents": {
        "draft_created": "Entwurf erstellt",
        "submitted": "Antrag gesendet",
        "review_started": "Prüfung begonnen",
        "approved": "Verifizierung genehmigt",
        "rejected": "Antrag abgelehnt",
        "expired_manual": "Verifizierung manuell abgelaufen",
        "expired_automatic": "Verifizierung automatisch abgelaufen",
        "withdrawn": "Antrag zurückgezogen"
      },
      "actors": {
        "system": "RomDoc-System",
        "admin": "Administrator",
        "manager": "Manager",
        "doctor": "Arzt"
      },
      "states": {
        "loading": "Verifizierungsanträge werden geladen...",
        "emptyTitle": "Keine Anträge in dieser Kategorie",
        "emptyDescription": "Eingereichte Arztanträge erscheinen hier.",
        "loadFailed": "Anträge konnten nicht geladen werden.",
        "documentFailed": "Das Dokument konnte nicht geöffnet werden.",
        "updateFailed": "Die Verifizierung konnte nicht aktualisiert werden.",
        "rejectionRequired": "Ablehnungsgrund eingeben."
      }
    },
    "api": {
      "authentication_required": "Sie müssen angemeldet sein.",
      "access_denied": "Sie haben nicht die erforderliche Berechtigung.",
      "mfa_required": "Eine Google-Authenticator-Prüfung ist erforderlich.",
      "admin_required": "Nur Administratoren dürfen diese Aktion ausführen.",
      "invalid_json": "Die Anfrage enthält kein gültiges JSON.",
      "invalid_request_data": "Die übermittelten Daten sind ungültig.",
      "invalid_action": "Die angeforderte Aktion ist ungültig.",
      "doctors_load_failed": "Ärzte konnten nicht geladen werden.",
      "doctor_subscriptions_load_failed": "Arztabonnements konnten nicht geladen werden.",
      "doctor_clinic_links_load_failed": "Klinikzuordnungen konnten nicht geladen werden.",
      "doctor_staff_load_failed": "Arztpersonal konnte nicht geladen werden.",
      "clinic_organizations_load_failed": "Klinikorganisationen konnten nicht geladen werden.",
      "doctor_auth_load_failed": "Authentifizierungsdaten der Ärzte konnten nicht geladen werden.",
      "doctors_loaded": "Ärzte wurden geladen.",
      "doctor_id_required": "Der Arzt fehlt.",
      "doctor_not_found": "Der Arzt wurde nicht gefunden.",
      "invalid_doctor_status": "Der Arztstatus ist ungültig.",
      "doctor_status_update_failed": "Der Arztstatus konnte nicht aktualisiert werden.",
      "doctor_reactivated": "Der Arzt wurde reaktiviert.",
      "doctor_suspended": "Der Arzt wurde gesperrt.",
      "doctor_account_missing": "Dem Arzt ist kein Benutzerkonto zugeordnet.",
      "invalid_doctor_account_status": "Der Kontostatus ist ungültig.",
      "doctor_account_status_update_failed": "Der Kontostatus konnte nicht aktualisiert werden.",
      "doctor_account_blocked": "Das Arztkonto wurde gesperrt.",
      "doctor_account_suspended": "Das Arztkonto wurde ausgesetzt.",
      "doctor_account_reactivated": "Das Arztkonto wurde reaktiviert.",
      "invalid_professional_verification_status": "Der Status der beruflichen Verifizierung ist ungültig.",
      "professional_registration_required": "Berufliche Registrierungsnummer eingeben.",
      "professional_verification_expiry_invalid": "Das Ablaufdatum der Verifizierung ist ungültig.",
      "professional_verification_update_failed": "Die berufliche Verifizierung konnte nicht aktualisiert werden.",
      "doctor_professionally_verified": "Der Arzt wurde beruflich verifiziert.",
      "professional_verification_updated": "Der Status der beruflichen Verifizierung wurde aktualisiert.",
      "verification_document_load_failed": "Das Dokument konnte nicht geladen werden.",
      "verification_document_not_found": "Das Dokument wurde nicht gefunden.",
      "verification_signed_url_failed": "Der temporäre Link konnte nicht erstellt werden.",
      "verification_submissions_load_failed": "Verifizierungsanträge konnten nicht geladen werden.",
      "verification_submissions_loaded": "Verifizierungsanträge wurden geladen.",
      "verification_submission_required": "Der Verifizierungsantrag fehlt.",
      "invalid_verification_action": "Die Verifizierungsaktion ist ungültig.",
      "verification_rejection_reason_required": "Ein Ablehnungsgrund ist erforderlich.",
      "verification_submission_not_found": "Der Verifizierungsantrag wurde nicht gefunden.",
      "verification_action_conflict": "Diese Aktion ist im aktuellen Status des Antrags nicht mehr zulässig.",
      "verification_update_failed": "Die Verifizierung konnte nicht aktualisiert werden.",
      "verification_review_started": "Der Antrag wurde zur Prüfung übernommen.",
      "verification_approved": "Der Arzt wurde erfolgreich verifiziert.",
      "verification_rejected": "Der Antrag wurde abgelehnt.",
      "verification_expired": "Die Verifizierung wurde als abgelaufen markiert.",
      "doctor_invitation_status_filter_invalid": "Der Statusfilter ist ungültig.",
      "doctor_invitations_load_failed": "Arzteinladungen konnten nicht geladen werden.",
      "doctor_invitations_loaded": "Arzteinladungen wurden geladen.",
      "doctor_invitation_invalid_payload": "Die Anfragedaten sind ungültig.",
      "doctor_invitation_email_invalid": "Die E-Mail-Adresse ist ungültig.",
      "doctor_invitation_first_name_required": "Der Vorname des Arztes ist erforderlich.",
      "doctor_invitation_last_name_required": "Der Nachname des Arztes ist erforderlich.",
      "doctor_invitation_message_invalid": "Die persönliche Nachricht ist ungültig.",
      "doctor_invitation_months_invalid": "Der kostenlose Zeitraum muss zwischen 1 und 36 Monaten liegen.",
      "doctor_invitation_check_failed": "Die Einladung konnte nicht geprüft werden.",
      "active_invitation_exists": "Für diese E-Mail-Adresse besteht bereits eine aktive Einladung.",
      "invitation_create_failed": "Die Arzteinladung konnte nicht erstellt werden.",
      "site_url_not_configured": "Die Einladung wurde gespeichert, aber die Anwendungs-URL ist nicht konfiguriert.",
      "invitation_send_failed": "Die Einladung wurde gespeichert, aber die E-Mail konnte nicht gesendet werden.",
      "invitation_state_update_failed": "Die E-Mail wurde gesendet, aber der interne Status konnte nicht aktualisiert werden. Prüfen Sie die Einladung vor erneutem Versand.",
      "doctor_invitation_sent": "Die Arzteinladung wurde gesendet."
    }
  }
} as const;

export function getPlatformOperatorDoctors(locale: AppLocale) {
  return platformOperatorDoctorMessages[locale];
}

export function interpolatePlatformDoctorCopy(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getPlatformDoctorApiMessage(
  locale: AppLocale,
  code: string | null | undefined,
  fallback: string
) {
  if (!code) {
    return fallback;
  }

  const messages = platformOperatorDoctorMessages[locale].api as Record<
    string,
    string
  >;

  return messages[code] ?? fallback;
}
