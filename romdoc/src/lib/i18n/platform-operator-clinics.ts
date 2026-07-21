import type { AppLocale } from "@/lib/i18n/app-locale";

export const PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const platformOperatorClinicMessages = {
  "ro": {
    "common": {
      "administration": "Administrare",
      "operationalManagement": "Management operațional",
      "loading": "Se încarcă...",
      "reload": "Reîncarcă",
      "details": "Detalii",
      "close": "Închide",
      "reset": "Resetează",
      "clearFilters": "Șterge filtrele",
      "none": "—",
      "unknownCity": "Oraș necunoscut",
      "unknownDoctor": "Medic necunoscut",
      "addressUnavailable": "Adresă indisponibilă",
      "organizationUnavailable": "Organizație indisponibilă",
      "emailUnavailable": "E-mail indisponibil",
      "phoneUnavailable": "Telefon indisponibil",
      "openGoogleMaps": "Deschide în Google Maps",
      "openWebsite": "Deschide website",
      "noActions": "Fără acțiuni",
      "showing": "Se afișează {filtered} din {total}",
      "createdAt": "Creată la {date}",
      "submittedAt": "Trimisă la {date}",
      "approvedAt": "Aprobată la {date}",
      "blockedAt": "Blocată la {date}",
      "selectedAddress": "Adresă selectată",
      "statusPending": "În așteptare",
      "statusApproved": "Aprobată",
      "statusRejected": "Respinsă",
      "statusBlocked": "Blocată",
      "statusActive": "Activă",
      "statusRemoved": "Respinsă / eliminată",
      "yes": "Da",
      "no": "Nu"
    },
    "pages": {
      "admin": {
        "title": "Clinici",
        "description": "Moderează propunerile de clinică, aprobă locațiile organizațiilor și gestionează entitățile comune folosite de medici.",
        "billing": "Tarife clinică ↗"
      },
      "manager": {
        "title": "Clinici",
        "description": "Verifică propunerile și actualizează datele publice ale clinicilor în limitele rolului de manager."
      }
    },
    "accordions": {
      "organizationsTitle": "Organizații de clinică",
      "organizationsDescription": "Vezi managerii, locațiile, medicii acoperiți și estimarea de facturare.",
      "locationsTitle": "Aprobă locații organizații",
      "locationsDescription": "Verifică punctele de lucru cerute de Clinic Manager. Aprobarea le face eligibile pentru harta publică.",
      "createTitle": "Adaugă clinică",
      "createDescription": "Creează direct o clinică aprobată folosind o adresă verificată prin Google.",
      "associationsTitle": "Asociază medic cu clinică",
      "associationsDescription": "Gestionează relațiile dintre medicii existenți și clinicile aprobate.",
      "editingTitle": "Editează clinici",
      "editingDescription": "Modifică datele publice, contactul, descrierea și adresa verificată a clinicilor."
    },
    "moderation": {
      "title": "Moderare clinici",
      "description": "Aprobă sau respinge propunerile. Numai Administratorul poate bloca ori reactiva o clinică aprobată.",
      "metrics": {
        "total": "Total",
        "pending": "În așteptare",
        "approved": "Aprobate",
        "blocked": "Blocate"
      },
      "filters": {
        "search": "Caută clinică",
        "searchPlaceholder": "Nume, adresă, medic propunător sau slug",
        "city": "Oraș",
        "allCities": "Toate orașele",
        "pending": "În așteptare",
        "approved": "Aprobate",
        "rejected": "Respinse",
        "blocked": "Blocate"
      },
      "labels": {
        "proposer": "Propusă de",
        "verifiedAddress": "Adresă verificată",
        "internalCity": "Oraș intern RomDoc",
        "county": "Județ",
        "postalCode": "Cod poștal",
        "phone": "Telefon",
        "email": "E-mail",
        "website": "Website",
        "addressVerifiedAt": "Adresă verificată la",
        "rejectionReason": "Motivul respingerii",
        "blockReason": "Motivul blocării",
        "publicVisibility": "Vizibilitate publică"
      },
      "actions": {
        "approve": "Aprobă clinica",
        "reject": "Respinge",
        "block": "Blochează clinica",
        "unblock": "Reactivează clinica",
        "updating": "Se actualizează...",
        "blocking": "Se blochează...",
        "unblocking": "Se reactivează..."
      },
      "prompts": {
        "reject": "Introdu motivul respingerii:",
        "block": "Introdu motivul blocării clinicii:"
      },
      "confirmations": {
        "approve": "Aprobi această clinică și o asociezi medicului care a propus-o?",
        "block": "Blochezi această clinică? Nu va mai apărea în zonele publice RomDoc.",
        "unblock": "Reactivezi această clinică? Va reveni la statutul Aprobată."
      },
      "states": {
        "loadFailed": "Clinicile nu au putut fi încărcate.",
        "updateFailed": "Clinica nu a putut fi actualizată.",
        "empty": "Nu există clinici în această categorie.",
        "noResultsTitle": "Nu am găsit clinici",
        "noResultsDescription": "Modifică termenul căutat sau selectează alt oraș.",
        "loading": "Se încarcă clinicile..."
      }
    },
    "creation": {
      "eyebrow": "Creare directă",
      "title": "Adaugă o clinică",
      "description": "Clinica creată de Administrator este aprobată imediat și devine o entitate comună RomDoc. Nu este asociată automat unui medic.",
      "fields": {
        "name": "Numele clinicii",
        "address": "Adresa verificată prin Google",
        "addressLine2": "Detalii suplimentare adresă",
        "phone": "Telefon",
        "email": "E-mail",
        "website": "Website",
        "description": "Descriere"
      },
      "placeholders": {
        "name": "Exemplu: Clinica Medicală Central",
        "addressLine2": "Etaj, cabinet, corp de clădire",
        "website": "https://"
      },
      "actions": {
        "create": "Creează și aprobă clinica",
        "creating": "Se creează...",
        "clear": "Golește formularul"
      },
      "messages": {
        "nameRequired": "Introdu numele clinicii.",
        "addressRequired": "Selectează adresa clinicii din lista Google.",
        "failed": "Clinica nu a putut fi creată.",
        "success": "Clinica a fost creată și aprobată.",
        "successDetail": "Clinica apare în categoria Aprobate din lista de moderare."
      }
    },
    "editing": {
      "eyebrow": "Editare clinici",
      "title": "Toate clinicile",
      "descriptionAdmin": "Editează datele publice ale oricărei clinici. Modificările se aplică tuturor medicilor asociați.",
      "descriptionManager": "Editează datele publice fără acțiunile rezervate Administratorului.",
      "descriptionDefault": "Editează datele clinicilor la care ai acces.",
      "empty": "Nu există încă clinici în platformă.",
      "search": "Caută clinică",
      "searchPlaceholder": "Nume, oraș, adresă, telefon sau e-mail",
      "status": "Statut",
      "allStatuses": "Toate statuturile",
      "fields": {
        "name": "Numele clinicii",
        "phone": "Telefon",
        "email": "E-mail",
        "website": "Website",
        "addressLine2": "Detalii suplimentare adresă",
        "newAddress": "Schimbă adresa verificată prin Google — opțional",
        "newAddressHelp": "Lasă câmpul gol dacă adresa principală rămâne neschimbată.",
        "newAddressSelected": "Adresă nouă selectată",
        "description": "Descriere"
      },
      "actions": {
        "edit": "Editează",
        "close": "Închide",
        "save": "Salvează clinica",
        "saving": "Se salvează...",
        "cancel": "Anulează"
      },
      "states": {
        "loadFailed": "Clinicile nu au putut fi încărcate.",
        "saveFailed": "Clinica nu a putut fi salvată.",
        "updated": "Clinica a fost actualizată.",
        "noResults": "Nu există clinici care corespund căutării.",
        "loading": "Se încarcă clinicile..."
      }
    },
    "associations": {
      "eyebrow": "Asocieri",
      "title": "Asociază medici cu clinici",
      "description": "Un medic poate lucra în mai multe clinici, iar o clinică poate avea mai mulți medici.",
      "doctorSearch": "Caută medicul",
      "selectDoctor": "Selectează medicul",
      "clinicSearch": "Caută clinica după nume, oraș sau adresă",
      "selectClinic": "Selectează clinica",
      "selectDoctorFirst": "Selectează mai întâi medicul",
      "associated": "Clinici asociate",
      "selectDoctorHint": "Selectează un medic.",
      "noClinics": "Medicul nu are clinici asociate.",
      "selectionRequired": "Selectează un medic și o clinică.",
      "actions": {
        "associate": "Asociază medicul cu clinica",
        "associating": "Se asociază...",
        "remove": "Elimină asocierea",
        "removing": "Se elimină..."
      },
      "states": {
        "loadFailed": "Datele nu au putut fi încărcate.",
        "saveFailed": "Asocierea nu a putut fi salvată.",
        "removeFailed": "Asocierea nu a putut fi eliminată.",
        "associated": "Medicul a fost asociat clinicii.",
        "removed": "Asocierea a fost eliminată.",
        "loading": "Se încarcă..."
      }
    },
    "inline": {
      "title": "Clinici asociate",
      "description": "Adaugă sau elimină clinicile acestui medic. Sunt disponibile numai clinicile aprobate.",
      "search": "Caută clinică, oraș sau adresă",
      "select": "Selectează clinica",
      "selectRequired": "Selectează o clinică.",
      "add": "Adaugă",
      "adding": "Se adaugă...",
      "remove": "Elimină",
      "removing": "Se elimină...",
      "empty": "Medicul nu este asociat încă niciunei clinici.",
      "loadFailed": "Clinicile medicului nu au putut fi încărcate.",
      "addFailed": "Clinica nu a putut fi asociată.",
      "removeFailed": "Asocierea nu a putut fi eliminată.",
      "added": "Clinica a fost asociată medicului.",
      "removed": "Asocierea a fost eliminată.",
      "loading": "Se încarcă clinicile...",
      "adminOnly": "Asocierile globale dintre medici și clinici sunt gestionate numai de Administrator."
    },
    "locations": {
      "title": "Locații organizații clinică",
      "description": "Aprobă punctele de lucru cerute de Clinic Manager. Locația activată poate fi folosită de organizație și devine eligibilă pentru harta publică.",
      "metrics": {
        "pending": "În verificare",
        "active": "Aprobate",
        "removed": "Respinse / eliminate"
      },
      "search": "Caută",
      "searchPlaceholder": "Clinică, organizație, oraș sau adresă",
      "labels": {
        "location": "Locație",
        "organization": "Organizație",
        "status": "Status",
        "publicMap": "Hartă publică",
        "requested": "Cerută",
        "coordinatesAvailable": "Coordonate disponibile",
        "coordinatesMissing": "Coordonate lipsă",
        "appearsOnMap": "Apare pe hartă",
        "notOnMap": "Nu apare încă pe hartă",
        "approvedForOrganization": "Aprobată pentru organizație",
        "underReview": "În verificare",
        "removed": "Respinsă / eliminată"
      },
      "actions": {
        "approve": "Aprobă",
        "reject": "Respinge",
        "processing": "Se procesează..."
      },
      "confirmations": {
        "approve": "Aprobi această locație pentru organizația clinicii? Clinica va deveni eligibilă pentru harta publică dacă are coordonate valide.",
        "reject": "Respingi această locație pentru organizația clinicii?"
      },
      "states": {
        "loadFailed": "Locațiile organizațiilor nu au putut fi încărcate.",
        "actionFailed": "Acțiunea nu a putut fi finalizată.",
        "success": "Acțiunea a fost finalizată.",
        "empty": "Nu există locații în această categorie.",
        "loading": "Se încarcă locațiile..."
      }
    },
    "organizations": {
      "eyebrow": "Organizații de clinică",
      "title": "Clinici, manageri și facturare cumulată",
      "description": "Vezi organizațiile, managerii, locațiile și medicii acoperiți. Aprobarea fiecărui medic invitat rămâne responsabilitatea Clinic Managerului și a fluxului de facturare.",
      "metrics": {
        "organizations": "Organizații",
        "active": "Active",
        "pending": "În așteptare",
        "coveredDoctors": "Medici facturați clinicii"
      },
      "labels": {
        "manager": "Manageri",
        "clinics": "Clinici",
        "doctors": "Medici",
        "billing": "Facturare",
        "contact": "Contact",
        "activeClinics": "Clinici active",
        "pendingClinics": "Locații în așteptare",
        "covered": "Facturați clinicii",
        "registered": "Înregistrați prin clinică",
        "openInvitations": "Invitații deschise",
        "taxId": "CUI",
        "estimate": "Estimare",
        "perMonth": "/ lună",
        "billingMissing": "Date de facturare lipsă",
        "created": "Creată la {date}"
      },
      "statuses": {
        "active": "Activă",
        "suspended": "Suspendată",
        "rejected": "Respinsă",
        "archived": "Arhivată",
        "pending": "În așteptare"
      },
      "empty": "Nu există încă organizații de clinică.",
      "billingRule": "Regula estimativă: medici activi acoperiți de clinică × 60 RON/lună + TVA. Consumul SMS este separat."
    },
    "google": {
      "placeholder": "Caută adresa clinicii",
      "importUnavailable": "Funcția Google Maps importLibrary nu este disponibilă.",
      "elementUnavailable": "Google Places nu a furnizat componenta necesară.",
      "predictionMissing": "Google nu a returnat sugestia selectată.",
      "placeIdMissing": "Google nu a returnat un identificator valid pentru adresă.",
      "verifyError": "Adresa nu a putut fi verificată.",
      "loadError": "Google Places nu a putut fi încărcat.",
      "label": "Adresa clinicii",
      "help": "Selectează o adresă din lista Google",
      "loading": "Se încarcă Google Places...",
      "verifying": "Adresa este verificată...",
      "selected": "Adresă selectată",
      "city": "Oraș",
      "region": "Regiune",
      "postalCode": "Cod poștal",
      "country": "Țară"
    },
    "api": {
      "authentication_required": "Trebuie să fii autentificat.",
      "access_denied": "Nu ai permisiunea necesară.",
      "mfa_required": "Este necesară verificarea Google Authenticator.",
      "admin_required": "Numai administratorii pot efectua această acțiune.",
      "invalid_json": "Cererea nu conține date JSON valide.",
      "invalid_action": "Acțiunea solicitată nu este validă.",
      "clinics_loaded": "Clinicile au fost încărcate.",
      "clinics_load_failed": "Clinicile nu au putut fi încărcate.",
      "clinic_id_required": "Clinica lipsește.",
      "clinic_not_found": "Clinica nu a fost găsită.",
      "clinic_rejection_reason_required": "Introdu motivul respingerii.",
      "clinic_block_reason_required": "Introdu motivul blocării.",
      "clinic_must_be_approved_for_blocking": "Numai clinicile aprobate pot fi blocate.",
      "clinic_block_conflict": "Clinica nu a putut fi blocată. Este posibil ca statutul ei să fi fost modificat între timp.",
      "clinic_blocked": "Clinica a fost blocată și nu mai apare în zonele publice RomDoc.",
      "clinic_must_be_blocked_for_unblocking": "Numai clinicile blocate pot fi reactivate.",
      "clinic_unblock_conflict": "Clinica nu a putut fi reactivată. Este posibil ca statutul ei să fi fost modificat între timp.",
      "clinic_unblocked": "Clinica a fost reactivată și este din nou aprobată.",
      "clinic_must_be_pending": "Numai clinicile aflate în așteptare pot fi moderate.",
      "clinic_reject_conflict": "Clinica nu a putut fi respinsă. Este posibil ca statutul ei să fi fost modificat între timp.",
      "clinic_rejected": "Clinica a fost respinsă.",
      "clinic_proposer_missing": "Clinica nu are un medic propunător asociat.",
      "clinic_proposer_doctor_missing": "Profilul medicului care a propus clinica nu a fost găsit.",
      "clinic_approve_conflict": "Clinica nu a putut fi aprobată. Este posibil ca statutul ei să fi fost modificat între timp.",
      "clinic_association_rollback_failed": "Clinica nu a putut fi asociată medicului. Aprobarea a fost anulată.",
      "clinic_approved": "Clinica a fost aprobată și asociată medicului.",
      "clinic_name_required": "Introdu numele clinicii.",
      "clinic_address_required": "Selectează adresa clinicii din lista Google.",
      "clinic_email_invalid": "Adresa de e-mail a clinicii nu este validă.",
      "clinic_website_invalid": "Adresa website-ului clinicii nu este validă.",
      "clinic_duplicate_place": "Locația Google este deja înregistrată în RomDoc.",
      "clinic_create_failed": "Clinica nu a putut fi creată.",
      "clinic_created": "Clinica a fost creată și aprobată.",
      "editable_clinics_loaded": "Clinicile editabile au fost încărcate.",
      "editable_clinics_load_failed": "Clinicile nu au putut fi încărcate.",
      "doctor_editable_clinics_load_failed": "Clinicile medicului nu au putut fi încărcate.",
      "doctor_profile_missing": "Contul de medic nu este asociat unui profil de medic.",
      "clinic_edit_access_denied": "Nu ai permisiunea de a edita această clinică.",
      "clinic_edit_role_denied": "Nu ai permisiunea de a edita clinici.",
      "clinic_invalid": "Clinica selectată nu este validă.",
      "clinic_update_failed": "Clinica nu a putut fi actualizată.",
      "clinic_translation_update_failed": "Traducerile clinicii nu au putut fi actualizate.",
      "clinic_updated": "Clinica a fost actualizată.",
      "doctor_clinic_data_loaded": "Medicii, clinicile și asocierile au fost încărcate.",
      "doctor_clinic_data_load_failed": "Medicii, clinicile sau asocierile nu au putut fi încărcate.",
      "doctor_clinic_selection_invalid": "Medicul sau clinica selectată nu este validă.",
      "doctor_not_found": "Medicul nu a fost găsit.",
      "clinic_association_approved_required": "Doar clinicile aprobate pot fi asociate medicilor.",
      "doctor_clinic_association_failed": "Asocierea nu a putut fi salvată.",
      "doctor_clinic_associated": "Medicul a fost asociat clinicii.",
      "doctor_clinic_removal_failed": "Asocierea nu a putut fi eliminată.",
      "doctor_clinic_removed": "Asocierea dintre medic și clinică a fost eliminată.",
      "organization_locations_loaded": "Locațiile organizațiilor au fost încărcate.",
      "organization_locations_load_failed": "Locațiile organizațiilor nu au putut fi încărcate.",
      "organization_location_id_required": "Legătura dintre organizație și locație lipsește.",
      "organization_location_not_found": "Locația solicitată nu a fost găsită.",
      "organization_or_clinic_missing": "Organizația sau clinica asociată nu mai există.",
      "organization_inactive": "Organizația clinicii trebuie să fie activă înainte de aprobarea locației.",
      "organization_location_must_be_pending": "Numai locațiile aflate în verificare pot fi moderate.",
      "organization_location_reject_conflict": "Locația nu a putut fi respinsă. Este posibil ca statutul ei să fi fost modificat între timp.",
      "organization_location_rejected": "Locația a fost respinsă pentru această organizație.",
      "clinic_not_eligible_for_organization": "Această clinică este blocată sau respinsă și nu poate fi activată pentru organizație.",
      "clinic_coordinates_missing": "Locația nu are coordonate valide pentru harta publică.",
      "clinic_public_approve_failed": "Clinica nu a putut fi aprobată pentru afișarea publică pe hartă.",
      "organization_location_approve_conflict": "Locația nu a putut fi activată pentru organizație.",
      "organization_location_approved": "Locația a fost aprobată pentru organizație și este eligibilă pentru harta publică."
    }
  },
  "en": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operational management",
      "loading": "Loading...",
      "reload": "Reload",
      "details": "Details",
      "close": "Close",
      "reset": "Reset",
      "clearFilters": "Clear filters",
      "none": "—",
      "unknownCity": "Unknown city",
      "unknownDoctor": "Unknown doctor",
      "addressUnavailable": "Address unavailable",
      "organizationUnavailable": "Organisation unavailable",
      "emailUnavailable": "Email unavailable",
      "phoneUnavailable": "Phone unavailable",
      "openGoogleMaps": "Open in Google Maps",
      "openWebsite": "Open website",
      "noActions": "No actions",
      "showing": "Showing {filtered} of {total}",
      "createdAt": "Created on {date}",
      "submittedAt": "Submitted on {date}",
      "approvedAt": "Approved on {date}",
      "blockedAt": "Blocked on {date}",
      "selectedAddress": "Selected address",
      "statusPending": "Pending",
      "statusApproved": "Approved",
      "statusRejected": "Rejected",
      "statusBlocked": "Blocked",
      "statusActive": "Active",
      "statusRemoved": "Rejected / removed",
      "yes": "Yes",
      "no": "No"
    },
    "pages": {
      "admin": {
        "title": "Clinics",
        "description": "Moderate clinic proposals, approve organisation locations and manage the shared entities used by doctors.",
        "billing": "Clinic pricing ↗"
      },
      "manager": {
        "title": "Clinics",
        "description": "Review proposals and update public clinic information within the manager role limits."
      }
    },
    "accordions": {
      "organizationsTitle": "Clinic organisations",
      "organizationsDescription": "View managers, locations, covered doctors and the billing estimate.",
      "locationsTitle": "Approve organisation locations",
      "locationsDescription": "Review workplaces requested by Clinic Managers. Approval makes them eligible for the public map.",
      "createTitle": "Add clinic",
      "createDescription": "Create an approved clinic directly using a Google-verified address.",
      "associationsTitle": "Associate doctor with clinic",
      "associationsDescription": "Manage relationships between existing doctors and approved clinics.",
      "editingTitle": "Edit clinics",
      "editingDescription": "Update public details, contact information, description and the verified clinic address."
    },
    "moderation": {
      "title": "Clinic moderation",
      "description": "Approve or reject proposals. Only an Administrator can block or reactivate an approved clinic.",
      "metrics": {
        "total": "Total",
        "pending": "Pending",
        "approved": "Approved",
        "blocked": "Blocked"
      },
      "filters": {
        "search": "Search clinics",
        "searchPlaceholder": "Name, address, proposing doctor or slug",
        "city": "City",
        "allCities": "All cities",
        "pending": "Pending",
        "approved": "Approved",
        "rejected": "Rejected",
        "blocked": "Blocked"
      },
      "labels": {
        "proposer": "Proposed by",
        "verifiedAddress": "Verified address",
        "internalCity": "Internal RomDoc city",
        "county": "County / region",
        "postalCode": "Postal code",
        "phone": "Phone",
        "email": "Email",
        "website": "Website",
        "addressVerifiedAt": "Address verified on",
        "rejectionReason": "Rejection reason",
        "blockReason": "Blocking reason",
        "publicVisibility": "Public visibility"
      },
      "actions": {
        "approve": "Approve clinic",
        "reject": "Reject",
        "block": "Block clinic",
        "unblock": "Reactivate clinic",
        "updating": "Updating...",
        "blocking": "Blocking...",
        "unblocking": "Reactivating..."
      },
      "prompts": {
        "reject": "Enter the rejection reason:",
        "block": "Enter the reason for blocking the clinic:"
      },
      "confirmations": {
        "approve": "Approve this clinic and associate it with the doctor who proposed it?",
        "block": "Block this clinic? It will no longer appear in public RomDoc areas.",
        "unblock": "Reactivate this clinic? It will return to Approved status."
      },
      "states": {
        "loadFailed": "Clinics could not be loaded.",
        "updateFailed": "The clinic could not be updated.",
        "empty": "There are no clinics in this category.",
        "noResultsTitle": "No clinics found",
        "noResultsDescription": "Change the search term or select another city.",
        "loading": "Loading clinics..."
      }
    },
    "creation": {
      "eyebrow": "Direct creation",
      "title": "Add a clinic",
      "description": "A clinic created by an Administrator is approved immediately and becomes a shared RomDoc entity. It is not automatically associated with a doctor.",
      "fields": {
        "name": "Clinic name",
        "address": "Google-verified address",
        "addressLine2": "Additional address details",
        "phone": "Phone",
        "email": "Email",
        "website": "Website",
        "description": "Description"
      },
      "placeholders": {
        "name": "Example: Central Medical Clinic",
        "addressLine2": "Floor, office, building wing",
        "website": "https://"
      },
      "actions": {
        "create": "Create and approve clinic",
        "creating": "Creating...",
        "clear": "Clear form"
      },
      "messages": {
        "nameRequired": "Enter the clinic name.",
        "addressRequired": "Select the clinic address from the Google list.",
        "failed": "The clinic could not be created.",
        "success": "The clinic was created and approved.",
        "successDetail": "The clinic appears in the Approved moderation category."
      }
    },
    "editing": {
      "eyebrow": "Clinic editing",
      "title": "All clinics",
      "descriptionAdmin": "Edit the public details of any clinic. Changes apply to all associated doctors.",
      "descriptionManager": "Edit public details without Administrator-only actions.",
      "descriptionDefault": "Edit the details of clinics you can access.",
      "empty": "There are no clinics on the platform yet.",
      "search": "Search clinics",
      "searchPlaceholder": "Name, city, address, phone or email",
      "status": "Status",
      "allStatuses": "All statuses",
      "fields": {
        "name": "Clinic name",
        "phone": "Phone",
        "email": "Email",
        "website": "Website",
        "addressLine2": "Additional address details",
        "newAddress": "Change the Google-verified address — optional",
        "newAddressHelp": "Leave this empty when the main address should remain unchanged.",
        "newAddressSelected": "New address selected",
        "description": "Description"
      },
      "actions": {
        "edit": "Edit",
        "close": "Close",
        "save": "Save clinic",
        "saving": "Saving...",
        "cancel": "Cancel"
      },
      "states": {
        "loadFailed": "Clinics could not be loaded.",
        "saveFailed": "The clinic could not be saved.",
        "updated": "The clinic was updated.",
        "noResults": "No clinics match the search.",
        "loading": "Loading clinics..."
      }
    },
    "associations": {
      "eyebrow": "Associations",
      "title": "Associate doctors with clinics",
      "description": "A doctor can work at several clinics, and a clinic can have several doctors.",
      "doctorSearch": "Search doctors",
      "selectDoctor": "Select doctor",
      "clinicSearch": "Search clinics by name, city or address",
      "selectClinic": "Select clinic",
      "selectDoctorFirst": "Select a doctor first",
      "associated": "Associated clinics",
      "selectDoctorHint": "Select a doctor.",
      "noClinics": "The doctor has no associated clinics.",
      "selectionRequired": "Select a doctor and a clinic.",
      "actions": {
        "associate": "Associate doctor with clinic",
        "associating": "Associating...",
        "remove": "Remove association",
        "removing": "Removing..."
      },
      "states": {
        "loadFailed": "The data could not be loaded.",
        "saveFailed": "The association could not be saved.",
        "removeFailed": "The association could not be removed.",
        "associated": "The doctor was associated with the clinic.",
        "removed": "The association was removed.",
        "loading": "Loading..."
      }
    },
    "inline": {
      "title": "Associated clinics",
      "description": "Add or remove this doctor's clinics. Only approved clinics are available.",
      "search": "Search clinic, city or address",
      "select": "Select clinic",
      "selectRequired": "Select a clinic.",
      "add": "Add",
      "adding": "Adding...",
      "remove": "Remove",
      "removing": "Removing...",
      "empty": "The doctor is not yet associated with a clinic.",
      "loadFailed": "The doctor's clinics could not be loaded.",
      "addFailed": "The clinic could not be associated.",
      "removeFailed": "The association could not be removed.",
      "added": "The clinic was associated with the doctor.",
      "removed": "The association was removed.",
      "loading": "Loading clinics...",
      "adminOnly": "Global doctor-clinic associations are managed only by an Administrator."
    },
    "locations": {
      "title": "Clinic organisation locations",
      "description": "Approve workplaces requested by Clinic Managers. An activated location can be used by the organisation and becomes eligible for the public map.",
      "metrics": {
        "pending": "Under review",
        "active": "Approved",
        "removed": "Rejected / removed"
      },
      "search": "Search",
      "searchPlaceholder": "Clinic, organisation, city or address",
      "labels": {
        "location": "Location",
        "organization": "Organisation",
        "status": "Status",
        "publicMap": "Public map",
        "requested": "Requested",
        "coordinatesAvailable": "Coordinates available",
        "coordinatesMissing": "Coordinates missing",
        "appearsOnMap": "Shown on map",
        "notOnMap": "Not yet shown on map",
        "approvedForOrganization": "Approved for organisation",
        "underReview": "Under review",
        "removed": "Rejected / removed"
      },
      "actions": {
        "approve": "Approve",
        "reject": "Reject",
        "processing": "Processing..."
      },
      "confirmations": {
        "approve": "Approve this location for the clinic organisation? The clinic becomes eligible for the public map when it has valid coordinates.",
        "reject": "Reject this location for the clinic organisation?"
      },
      "states": {
        "loadFailed": "Organisation locations could not be loaded.",
        "actionFailed": "The action could not be completed.",
        "success": "The action was completed.",
        "empty": "There are no locations in this category.",
        "loading": "Loading locations..."
      }
    },
    "organizations": {
      "eyebrow": "Clinic organisations",
      "title": "Clinics, managers and consolidated billing",
      "description": "View organisations, managers, locations and covered doctors. Approval of each invited doctor remains the Clinic Manager's and billing workflow's responsibility.",
      "metrics": {
        "organizations": "Organisations",
        "active": "Active",
        "pending": "Pending",
        "coveredDoctors": "Clinic-billed doctors"
      },
      "labels": {
        "manager": "Managers",
        "clinics": "Clinics",
        "doctors": "Doctors",
        "billing": "Billing",
        "contact": "Contact",
        "activeClinics": "Active clinics",
        "pendingClinics": "Pending locations",
        "covered": "Billed to clinic",
        "registered": "Registered through clinic",
        "openInvitations": "Open invitations",
        "taxId": "Tax ID",
        "estimate": "Estimate",
        "perMonth": "/ month",
        "billingMissing": "Billing information missing",
        "created": "Created on {date}"
      },
      "statuses": {
        "active": "Active",
        "suspended": "Suspended",
        "rejected": "Rejected",
        "archived": "Archived",
        "pending": "Pending"
      },
      "empty": "There are no clinic organisations yet.",
      "billingRule": "Estimated rule: active clinic-covered doctors × RON 60/month + VAT. SMS usage is separate."
    },
    "google": {
      "placeholder": "Search clinic address",
      "importUnavailable": "Google Maps importLibrary is unavailable.",
      "elementUnavailable": "Google Places did not provide the required component.",
      "predictionMissing": "Google did not return the selected suggestion.",
      "placeIdMissing": "Google did not return a valid address identifier.",
      "verifyError": "The address could not be verified.",
      "loadError": "Google Places could not be loaded.",
      "label": "Clinic address",
      "help": "Select an address from the Google list",
      "loading": "Loading Google Places...",
      "verifying": "Verifying address...",
      "selected": "Selected address",
      "city": "City",
      "region": "Region",
      "postalCode": "Postal code",
      "country": "Country"
    },
    "api": {
      "authentication_required": "You must be signed in.",
      "access_denied": "You do not have the required permission.",
      "mfa_required": "Google Authenticator verification is required.",
      "admin_required": "Only administrators can perform this action.",
      "invalid_json": "The request does not contain valid JSON.",
      "invalid_action": "The requested action is invalid.",
      "clinics_loaded": "Clinics were loaded.",
      "clinics_load_failed": "Clinics could not be loaded.",
      "clinic_id_required": "The clinic is missing.",
      "clinic_not_found": "The clinic was not found.",
      "clinic_rejection_reason_required": "Enter the rejection reason.",
      "clinic_block_reason_required": "Enter the blocking reason.",
      "clinic_must_be_approved_for_blocking": "Only approved clinics can be blocked.",
      "clinic_block_conflict": "The clinic could not be blocked. Its status may have changed.",
      "clinic_blocked": "The clinic was blocked and no longer appears in public RomDoc areas.",
      "clinic_must_be_blocked_for_unblocking": "Only blocked clinics can be reactivated.",
      "clinic_unblock_conflict": "The clinic could not be reactivated. Its status may have changed.",
      "clinic_unblocked": "The clinic was reactivated and is approved again.",
      "clinic_must_be_pending": "Only pending clinics can be moderated.",
      "clinic_reject_conflict": "The clinic could not be rejected. Its status may have changed.",
      "clinic_rejected": "The clinic was rejected.",
      "clinic_proposer_missing": "The clinic has no proposing doctor associated with it.",
      "clinic_proposer_doctor_missing": "The profile of the doctor who proposed the clinic was not found.",
      "clinic_approve_conflict": "The clinic could not be approved. Its status may have changed.",
      "clinic_association_rollback_failed": "The clinic could not be associated with the doctor. Approval was rolled back.",
      "clinic_approved": "The clinic was approved and associated with the doctor.",
      "clinic_name_required": "Enter the clinic name.",
      "clinic_address_required": "Select the clinic address from the Google list.",
      "clinic_email_invalid": "The clinic email address is invalid.",
      "clinic_website_invalid": "The clinic website address is invalid.",
      "clinic_duplicate_place": "This Google location is already registered in RomDoc.",
      "clinic_create_failed": "The clinic could not be created.",
      "clinic_created": "The clinic was created and approved.",
      "editable_clinics_loaded": "Editable clinics were loaded.",
      "editable_clinics_load_failed": "Clinics could not be loaded.",
      "doctor_editable_clinics_load_failed": "The doctor's clinics could not be loaded.",
      "doctor_profile_missing": "The doctor account is not associated with a doctor profile.",
      "clinic_edit_access_denied": "You do not have permission to edit this clinic.",
      "clinic_edit_role_denied": "You do not have permission to edit clinics.",
      "clinic_invalid": "The selected clinic is invalid.",
      "clinic_update_failed": "The clinic could not be updated.",
      "clinic_translation_update_failed": "The clinic translations could not be updated.",
      "clinic_updated": "The clinic was updated.",
      "doctor_clinic_data_loaded": "Doctors, clinics and associations were loaded.",
      "doctor_clinic_data_load_failed": "Doctors, clinics or associations could not be loaded.",
      "doctor_clinic_selection_invalid": "The selected doctor or clinic is invalid.",
      "doctor_not_found": "The doctor was not found.",
      "clinic_association_approved_required": "Only approved clinics can be associated with doctors.",
      "doctor_clinic_association_failed": "The association could not be saved.",
      "doctor_clinic_associated": "The doctor was associated with the clinic.",
      "doctor_clinic_removal_failed": "The association could not be removed.",
      "doctor_clinic_removed": "The doctor-clinic association was removed.",
      "organization_locations_loaded": "Organisation locations were loaded.",
      "organization_locations_load_failed": "Organisation locations could not be loaded.",
      "organization_location_id_required": "The organisation-location link is missing.",
      "organization_location_not_found": "The requested location was not found.",
      "organization_or_clinic_missing": "The associated organisation or clinic no longer exists.",
      "organization_inactive": "The clinic organisation must be active before approving the location.",
      "organization_location_must_be_pending": "Only locations under review can be moderated.",
      "organization_location_reject_conflict": "The location could not be rejected. Its status may have changed.",
      "organization_location_rejected": "The location was rejected for this organisation.",
      "clinic_not_eligible_for_organization": "This clinic is blocked or rejected and cannot be activated for the organisation.",
      "clinic_coordinates_missing": "The location does not have valid coordinates for the public map.",
      "clinic_public_approve_failed": "The clinic could not be approved for public map display.",
      "organization_location_approve_conflict": "The location could not be activated for the organisation.",
      "organization_location_approved": "The location was approved for the organisation and is eligible for the public map."
    }
  },
  "de": {
    "common": {
      "administration": "Verwaltung",
      "operationalManagement": "Operatives Management",
      "loading": "Wird geladen...",
      "reload": "Neu laden",
      "details": "Details",
      "close": "Schließen",
      "reset": "Zurücksetzen",
      "clearFilters": "Filter löschen",
      "none": "—",
      "unknownCity": "Unbekannte Stadt",
      "unknownDoctor": "Unbekannter Arzt",
      "addressUnavailable": "Adresse nicht verfügbar",
      "organizationUnavailable": "Organisation nicht verfügbar",
      "emailUnavailable": "E-Mail nicht verfügbar",
      "phoneUnavailable": "Telefon nicht verfügbar",
      "openGoogleMaps": "In Google Maps öffnen",
      "openWebsite": "Website öffnen",
      "noActions": "Keine Aktionen",
      "showing": "{filtered} von {total} werden angezeigt",
      "createdAt": "Erstellt am {date}",
      "submittedAt": "Eingereicht am {date}",
      "approvedAt": "Genehmigt am {date}",
      "blockedAt": "Gesperrt am {date}",
      "selectedAddress": "Ausgewählte Adresse",
      "statusPending": "Ausstehend",
      "statusApproved": "Genehmigt",
      "statusRejected": "Abgelehnt",
      "statusBlocked": "Gesperrt",
      "statusActive": "Aktiv",
      "statusRemoved": "Abgelehnt / entfernt",
      "yes": "Ja",
      "no": "Nein"
    },
    "pages": {
      "admin": {
        "title": "Kliniken",
        "description": "Klinikvorschläge moderieren, Organisationsstandorte genehmigen und gemeinsame Entitäten für Ärzte verwalten.",
        "billing": "Klinikpreise ↗"
      },
      "manager": {
        "title": "Kliniken",
        "description": "Vorschläge prüfen und öffentliche Klinikdaten innerhalb der Manager-Berechtigungen aktualisieren."
      }
    },
    "accordions": {
      "organizationsTitle": "Klinikorganisationen",
      "organizationsDescription": "Manager, Standorte, abgedeckte Ärzte und Abrechnungsschätzung anzeigen.",
      "locationsTitle": "Organisationsstandorte genehmigen",
      "locationsDescription": "Von Klinikmanagern angeforderte Standorte prüfen. Die Genehmigung macht sie für die öffentliche Karte geeignet.",
      "createTitle": "Klinik hinzufügen",
      "createDescription": "Eine genehmigte Klinik direkt mit einer durch Google bestätigten Adresse erstellen.",
      "associationsTitle": "Arzt einer Klinik zuordnen",
      "associationsDescription": "Beziehungen zwischen vorhandenen Ärzten und genehmigten Kliniken verwalten.",
      "editingTitle": "Kliniken bearbeiten",
      "editingDescription": "Öffentliche Daten, Kontaktdaten, Beschreibung und bestätigte Adresse aktualisieren."
    },
    "moderation": {
      "title": "Klinikmoderation",
      "description": "Vorschläge genehmigen oder ablehnen. Nur Administratoren können eine genehmigte Klinik sperren oder reaktivieren.",
      "metrics": {
        "total": "Gesamt",
        "pending": "Ausstehend",
        "approved": "Genehmigt",
        "blocked": "Gesperrt"
      },
      "filters": {
        "search": "Kliniken suchen",
        "searchPlaceholder": "Name, Adresse, vorschlagender Arzt oder Slug",
        "city": "Stadt",
        "allCities": "Alle Städte",
        "pending": "Ausstehend",
        "approved": "Genehmigt",
        "rejected": "Abgelehnt",
        "blocked": "Gesperrt"
      },
      "labels": {
        "proposer": "Vorgeschlagen von",
        "verifiedAddress": "Bestätigte Adresse",
        "internalCity": "Interne RomDoc-Stadt",
        "county": "Region",
        "postalCode": "Postleitzahl",
        "phone": "Telefon",
        "email": "E-Mail",
        "website": "Website",
        "addressVerifiedAt": "Adresse bestätigt am",
        "rejectionReason": "Ablehnungsgrund",
        "blockReason": "Sperrgrund",
        "publicVisibility": "Öffentliche Sichtbarkeit"
      },
      "actions": {
        "approve": "Klinik genehmigen",
        "reject": "Ablehnen",
        "block": "Klinik sperren",
        "unblock": "Klinik reaktivieren",
        "updating": "Wird aktualisiert...",
        "blocking": "Wird gesperrt...",
        "unblocking": "Wird reaktiviert..."
      },
      "prompts": {
        "reject": "Ablehnungsgrund eingeben:",
        "block": "Grund für die Sperrung der Klinik eingeben:"
      },
      "confirmations": {
        "approve": "Diese Klinik genehmigen und dem Arzt zuordnen, der sie vorgeschlagen hat?",
        "block": "Diese Klinik sperren? Sie erscheint dann nicht mehr in öffentlichen RomDoc-Bereichen.",
        "unblock": "Diese Klinik reaktivieren? Sie erhält wieder den Status Genehmigt."
      },
      "states": {
        "loadFailed": "Kliniken konnten nicht geladen werden.",
        "updateFailed": "Die Klinik konnte nicht aktualisiert werden.",
        "empty": "In dieser Kategorie gibt es keine Kliniken.",
        "noResultsTitle": "Keine Kliniken gefunden",
        "noResultsDescription": "Suchbegriff ändern oder eine andere Stadt auswählen.",
        "loading": "Kliniken werden geladen..."
      }
    },
    "creation": {
      "eyebrow": "Direkte Erstellung",
      "title": "Klinik hinzufügen",
      "description": "Eine vom Administrator erstellte Klinik wird sofort genehmigt und wird zu einer gemeinsamen RomDoc-Entität. Sie wird nicht automatisch einem Arzt zugeordnet.",
      "fields": {
        "name": "Klinikname",
        "address": "Durch Google bestätigte Adresse",
        "addressLine2": "Zusätzliche Adressdetails",
        "phone": "Telefon",
        "email": "E-Mail",
        "website": "Website",
        "description": "Beschreibung"
      },
      "placeholders": {
        "name": "Beispiel: Zentrale Medizinische Klinik",
        "addressLine2": "Etage, Praxis, Gebäudeflügel",
        "website": "https://"
      },
      "actions": {
        "create": "Klinik erstellen und genehmigen",
        "creating": "Wird erstellt...",
        "clear": "Formular leeren"
      },
      "messages": {
        "nameRequired": "Klinikname eingeben.",
        "addressRequired": "Klinikadresse aus der Google-Liste auswählen.",
        "failed": "Die Klinik konnte nicht erstellt werden.",
        "success": "Die Klinik wurde erstellt und genehmigt.",
        "successDetail": "Die Klinik erscheint in der Moderationskategorie Genehmigt."
      }
    },
    "editing": {
      "eyebrow": "Klinikbearbeitung",
      "title": "Alle Kliniken",
      "descriptionAdmin": "Öffentliche Daten jeder Klinik bearbeiten. Änderungen gelten für alle zugeordneten Ärzte.",
      "descriptionManager": "Öffentliche Daten ohne Administrator-exklusive Aktionen bearbeiten.",
      "descriptionDefault": "Daten der Kliniken bearbeiten, auf die Sie Zugriff haben.",
      "empty": "Es gibt noch keine Kliniken auf der Plattform.",
      "search": "Kliniken suchen",
      "searchPlaceholder": "Name, Stadt, Adresse, Telefon oder E-Mail",
      "status": "Status",
      "allStatuses": "Alle Status",
      "fields": {
        "name": "Klinikname",
        "phone": "Telefon",
        "email": "E-Mail",
        "website": "Website",
        "addressLine2": "Zusätzliche Adressdetails",
        "newAddress": "Durch Google bestätigte Adresse ändern — optional",
        "newAddressHelp": "Leer lassen, wenn die Hauptadresse unverändert bleiben soll.",
        "newAddressSelected": "Neue Adresse ausgewählt",
        "description": "Beschreibung"
      },
      "actions": {
        "edit": "Bearbeiten",
        "close": "Schließen",
        "save": "Klinik speichern",
        "saving": "Wird gespeichert...",
        "cancel": "Abbrechen"
      },
      "states": {
        "loadFailed": "Kliniken konnten nicht geladen werden.",
        "saveFailed": "Die Klinik konnte nicht gespeichert werden.",
        "updated": "Die Klinik wurde aktualisiert.",
        "noResults": "Keine Klinik entspricht der Suche.",
        "loading": "Kliniken werden geladen..."
      }
    },
    "associations": {
      "eyebrow": "Zuordnungen",
      "title": "Ärzte Kliniken zuordnen",
      "description": "Ein Arzt kann in mehreren Kliniken arbeiten und eine Klinik kann mehrere Ärzte haben.",
      "doctorSearch": "Ärzte suchen",
      "selectDoctor": "Arzt auswählen",
      "clinicSearch": "Kliniken nach Name, Stadt oder Adresse suchen",
      "selectClinic": "Klinik auswählen",
      "selectDoctorFirst": "Zuerst einen Arzt auswählen",
      "associated": "Zugeordnete Kliniken",
      "selectDoctorHint": "Arzt auswählen.",
      "noClinics": "Dem Arzt sind keine Kliniken zugeordnet.",
      "selectionRequired": "Arzt und Klinik auswählen.",
      "actions": {
        "associate": "Arzt der Klinik zuordnen",
        "associating": "Wird zugeordnet...",
        "remove": "Zuordnung entfernen",
        "removing": "Wird entfernt..."
      },
      "states": {
        "loadFailed": "Die Daten konnten nicht geladen werden.",
        "saveFailed": "Die Zuordnung konnte nicht gespeichert werden.",
        "removeFailed": "Die Zuordnung konnte nicht entfernt werden.",
        "associated": "Der Arzt wurde der Klinik zugeordnet.",
        "removed": "Die Zuordnung wurde entfernt.",
        "loading": "Wird geladen..."
      }
    },
    "inline": {
      "title": "Zugeordnete Kliniken",
      "description": "Kliniken dieses Arztes hinzufügen oder entfernen. Nur genehmigte Kliniken sind verfügbar.",
      "search": "Klinik, Stadt oder Adresse suchen",
      "select": "Klinik auswählen",
      "selectRequired": "Klinik auswählen.",
      "add": "Hinzufügen",
      "adding": "Wird hinzugefügt...",
      "remove": "Entfernen",
      "removing": "Wird entfernt...",
      "empty": "Der Arzt ist noch keiner Klinik zugeordnet.",
      "loadFailed": "Die Kliniken des Arztes konnten nicht geladen werden.",
      "addFailed": "Die Klinik konnte nicht zugeordnet werden.",
      "removeFailed": "Die Zuordnung konnte nicht entfernt werden.",
      "added": "Die Klinik wurde dem Arzt zugeordnet.",
      "removed": "Die Zuordnung wurde entfernt.",
      "loading": "Kliniken werden geladen...",
      "adminOnly": "Globale Arzt-Klinik-Zuordnungen werden nur von Administratoren verwaltet."
    },
    "locations": {
      "title": "Standorte von Klinikorganisationen",
      "description": "Von Klinikmanagern angeforderte Standorte genehmigen. Ein aktivierter Standort kann von der Organisation genutzt werden und wird für die öffentliche Karte geeignet.",
      "metrics": {
        "pending": "In Prüfung",
        "active": "Genehmigt",
        "removed": "Abgelehnt / entfernt"
      },
      "search": "Suchen",
      "searchPlaceholder": "Klinik, Organisation, Stadt oder Adresse",
      "labels": {
        "location": "Standort",
        "organization": "Organisation",
        "status": "Status",
        "publicMap": "Öffentliche Karte",
        "requested": "Angefordert",
        "coordinatesAvailable": "Koordinaten verfügbar",
        "coordinatesMissing": "Koordinaten fehlen",
        "appearsOnMap": "Auf Karte sichtbar",
        "notOnMap": "Noch nicht auf Karte sichtbar",
        "approvedForOrganization": "Für Organisation genehmigt",
        "underReview": "In Prüfung",
        "removed": "Abgelehnt / entfernt"
      },
      "actions": {
        "approve": "Genehmigen",
        "reject": "Ablehnen",
        "processing": "Wird verarbeitet..."
      },
      "confirmations": {
        "approve": "Diesen Standort für die Klinikorganisation genehmigen? Mit gültigen Koordinaten wird die Klinik für die öffentliche Karte geeignet.",
        "reject": "Diesen Standort für die Klinikorganisation ablehnen?"
      },
      "states": {
        "loadFailed": "Organisationsstandorte konnten nicht geladen werden.",
        "actionFailed": "Die Aktion konnte nicht abgeschlossen werden.",
        "success": "Die Aktion wurde abgeschlossen.",
        "empty": "In dieser Kategorie gibt es keine Standorte.",
        "loading": "Standorte werden geladen..."
      }
    },
    "organizations": {
      "eyebrow": "Klinikorganisationen",
      "title": "Kliniken, Manager und konsolidierte Abrechnung",
      "description": "Organisationen, Manager, Standorte und abgedeckte Ärzte anzeigen. Die Genehmigung jedes eingeladenen Arztes bleibt Aufgabe des Klinikmanagers und des Abrechnungsablaufs.",
      "metrics": {
        "organizations": "Organisationen",
        "active": "Aktiv",
        "pending": "Ausstehend",
        "coveredDoctors": "Der Klinik berechnete Ärzte"
      },
      "labels": {
        "manager": "Manager",
        "clinics": "Kliniken",
        "doctors": "Ärzte",
        "billing": "Abrechnung",
        "contact": "Kontakt",
        "activeClinics": "Aktive Kliniken",
        "pendingClinics": "Ausstehende Standorte",
        "covered": "Der Klinik berechnet",
        "registered": "Über Klinik registriert",
        "openInvitations": "Offene Einladungen",
        "taxId": "Steuernummer",
        "estimate": "Schätzung",
        "perMonth": "/ Monat",
        "billingMissing": "Abrechnungsdaten fehlen",
        "created": "Erstellt am {date}"
      },
      "statuses": {
        "active": "Aktiv",
        "suspended": "Ausgesetzt",
        "rejected": "Abgelehnt",
        "archived": "Archiviert",
        "pending": "Ausstehend"
      },
      "empty": "Es gibt noch keine Klinikorganisationen.",
      "billingRule": "Schätzregel: aktive von der Klinik abgedeckte Ärzte × 60 RON/Monat + MwSt. SMS-Nutzung wird separat berechnet."
    },
    "google": {
      "placeholder": "Klinikadresse suchen",
      "importUnavailable": "Google Maps importLibrary ist nicht verfügbar.",
      "elementUnavailable": "Google Places hat die erforderliche Komponente nicht bereitgestellt.",
      "predictionMissing": "Google hat den ausgewählten Vorschlag nicht zurückgegeben.",
      "placeIdMissing": "Google hat keine gültige Adress-ID zurückgegeben.",
      "verifyError": "Die Adresse konnte nicht verifiziert werden.",
      "loadError": "Google Places konnte nicht geladen werden.",
      "label": "Klinikadresse",
      "help": "Adresse aus der Google-Liste auswählen",
      "loading": "Google Places wird geladen...",
      "verifying": "Adresse wird verifiziert...",
      "selected": "Ausgewählte Adresse",
      "city": "Stadt",
      "region": "Region",
      "postalCode": "Postleitzahl",
      "country": "Land"
    },
    "api": {
      "authentication_required": "Sie müssen angemeldet sein.",
      "access_denied": "Sie haben nicht die erforderliche Berechtigung.",
      "mfa_required": "Eine Google-Authenticator-Prüfung ist erforderlich.",
      "admin_required": "Nur Administratoren dürfen diese Aktion ausführen.",
      "invalid_json": "Die Anfrage enthält kein gültiges JSON.",
      "invalid_action": "Die angeforderte Aktion ist ungültig.",
      "clinics_loaded": "Kliniken wurden geladen.",
      "clinics_load_failed": "Kliniken konnten nicht geladen werden.",
      "clinic_id_required": "Die Klinik fehlt.",
      "clinic_not_found": "Die Klinik wurde nicht gefunden.",
      "clinic_rejection_reason_required": "Ablehnungsgrund eingeben.",
      "clinic_block_reason_required": "Sperrgrund eingeben.",
      "clinic_must_be_approved_for_blocking": "Nur genehmigte Kliniken können gesperrt werden.",
      "clinic_block_conflict": "Die Klinik konnte nicht gesperrt werden. Ihr Status wurde möglicherweise geändert.",
      "clinic_blocked": "Die Klinik wurde gesperrt und erscheint nicht mehr in öffentlichen RomDoc-Bereichen.",
      "clinic_must_be_blocked_for_unblocking": "Nur gesperrte Kliniken können reaktiviert werden.",
      "clinic_unblock_conflict": "Die Klinik konnte nicht reaktiviert werden. Ihr Status wurde möglicherweise geändert.",
      "clinic_unblocked": "Die Klinik wurde reaktiviert und ist wieder genehmigt.",
      "clinic_must_be_pending": "Nur ausstehende Kliniken können moderiert werden.",
      "clinic_reject_conflict": "Die Klinik konnte nicht abgelehnt werden. Ihr Status wurde möglicherweise geändert.",
      "clinic_rejected": "Die Klinik wurde abgelehnt.",
      "clinic_proposer_missing": "Der Klinik ist kein vorschlagender Arzt zugeordnet.",
      "clinic_proposer_doctor_missing": "Das Profil des Arztes, der die Klinik vorgeschlagen hat, wurde nicht gefunden.",
      "clinic_approve_conflict": "Die Klinik konnte nicht genehmigt werden. Ihr Status wurde möglicherweise geändert.",
      "clinic_association_rollback_failed": "Die Klinik konnte dem Arzt nicht zugeordnet werden. Die Genehmigung wurde zurückgenommen.",
      "clinic_approved": "Die Klinik wurde genehmigt und dem Arzt zugeordnet.",
      "clinic_name_required": "Klinikname eingeben.",
      "clinic_address_required": "Klinikadresse aus der Google-Liste auswählen.",
      "clinic_email_invalid": "Die E-Mail-Adresse der Klinik ist ungültig.",
      "clinic_website_invalid": "Die Website-Adresse der Klinik ist ungültig.",
      "clinic_duplicate_place": "Dieser Google-Standort ist bereits in RomDoc registriert.",
      "clinic_create_failed": "Die Klinik konnte nicht erstellt werden.",
      "clinic_created": "Die Klinik wurde erstellt und genehmigt.",
      "editable_clinics_loaded": "Bearbeitbare Kliniken wurden geladen.",
      "editable_clinics_load_failed": "Kliniken konnten nicht geladen werden.",
      "doctor_editable_clinics_load_failed": "Die Kliniken des Arztes konnten nicht geladen werden.",
      "doctor_profile_missing": "Das Arztkonto ist keinem Arztprofil zugeordnet.",
      "clinic_edit_access_denied": "Sie dürfen diese Klinik nicht bearbeiten.",
      "clinic_edit_role_denied": "Sie dürfen keine Kliniken bearbeiten.",
      "clinic_invalid": "Die ausgewählte Klinik ist ungültig.",
      "clinic_update_failed": "Die Klinik konnte nicht aktualisiert werden.",
      "clinic_translation_update_failed": "Die Klinikübersetzungen konnten nicht aktualisiert werden.",
      "clinic_updated": "Die Klinik wurde aktualisiert.",
      "doctor_clinic_data_loaded": "Ärzte, Kliniken und Zuordnungen wurden geladen.",
      "doctor_clinic_data_load_failed": "Ärzte, Kliniken oder Zuordnungen konnten nicht geladen werden.",
      "doctor_clinic_selection_invalid": "Der ausgewählte Arzt oder die Klinik ist ungültig.",
      "doctor_not_found": "Der Arzt wurde nicht gefunden.",
      "clinic_association_approved_required": "Nur genehmigte Kliniken können Ärzten zugeordnet werden.",
      "doctor_clinic_association_failed": "Die Zuordnung konnte nicht gespeichert werden.",
      "doctor_clinic_associated": "Der Arzt wurde der Klinik zugeordnet.",
      "doctor_clinic_removal_failed": "Die Zuordnung konnte nicht entfernt werden.",
      "doctor_clinic_removed": "Die Arzt-Klinik-Zuordnung wurde entfernt.",
      "organization_locations_loaded": "Organisationsstandorte wurden geladen.",
      "organization_locations_load_failed": "Organisationsstandorte konnten nicht geladen werden.",
      "organization_location_id_required": "Die Verknüpfung zwischen Organisation und Standort fehlt.",
      "organization_location_not_found": "Der angeforderte Standort wurde nicht gefunden.",
      "organization_or_clinic_missing": "Die zugeordnete Organisation oder Klinik existiert nicht mehr.",
      "organization_inactive": "Die Klinikorganisation muss aktiv sein, bevor der Standort genehmigt wird.",
      "organization_location_must_be_pending": "Nur Standorte in Prüfung können moderiert werden.",
      "organization_location_reject_conflict": "Der Standort konnte nicht abgelehnt werden. Sein Status wurde möglicherweise geändert.",
      "organization_location_rejected": "Der Standort wurde für diese Organisation abgelehnt.",
      "clinic_not_eligible_for_organization": "Diese Klinik ist gesperrt oder abgelehnt und kann für die Organisation nicht aktiviert werden.",
      "clinic_coordinates_missing": "Der Standort verfügt nicht über gültige Koordinaten für die öffentliche Karte.",
      "clinic_public_approve_failed": "Die Klinik konnte nicht für die öffentliche Kartenanzeige genehmigt werden.",
      "organization_location_approve_conflict": "Der Standort konnte für die Organisation nicht aktiviert werden.",
      "organization_location_approved": "Der Standort wurde für die Organisation genehmigt und ist für die öffentliche Karte geeignet."
    }
  }
} as const;

export function getPlatformOperatorClinics(locale: AppLocale) {
  return platformOperatorClinicMessages[locale];
}

export function interpolatePlatformClinicCopy(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getPlatformClinicApiMessage(
  locale: AppLocale,
  code: string | null | undefined,
  fallback: string
) {
  if (!code) {
    return fallback;
  }

  const messages = platformOperatorClinicMessages[locale].api as Record<
    string,
    string
  >;

  return messages[code] ?? fallback;
}
