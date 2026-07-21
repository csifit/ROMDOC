import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export const PLATFORM_OPERATOR_LOCALE_TAGS = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const accessMessages = {
  "ro": {
    "common": {
      "administration": "Administrare",
      "operationalManagement": "Management operațional",
      "accessAdministration": "Administrare acces",
      "nameUnavailable": "Nume indisponibil",
      "emailUnavailable": "E-mail indisponibil",
      "yes": "Da",
      "no": "Nu",
      "protected": "Protejat",
      "resetFilters": "Resetează filtrele",
      "noDate": "—",
      "reason": "Motiv",
      "loading": "Se încarcă..."
    },
    "roles": {
      "admin": "Administrator",
      "manager": "Manager",
      "clinic_manager": "Manager clinică",
      "doctor": "Medic",
      "doctor_applicant": "Candidat medic",
      "staff": "Personal",
      "patient": "Pacient",
      "unknown": "Rol necunoscut"
    },
    "accountStatuses": {
      "active": "Activ",
      "blocked": "Blocat",
      "suspended": "Suspendat",
      "unknown": "Necunoscut"
    },
    "users": {
      "page": {
        "title": "Utilizatori",
        "adminDescription": "Vezi conturile înregistrate, filtrează utilizatorii după rol și gestionează accesul prin acțiunile existente.",
        "managerDescription": "Vezi conturile înregistrate și gestionează suspendarea sau reactivarea conturilor în limitele rolului de manager."
      },
      "closure": {
        "title": "Închideri de cont solicitate",
        "description": "Folosește acțiunea existentă de blocare din tabelul Utilizatori.",
        "requestedAt": "Solicitată: {date}",
        "requested": "Închidere solicitată",
        "patientFallback": "Pacient"
      },
      "metrics": {
        "total": "Total utilizatori",
        "active": "Conturi active",
        "blocked": "Conturi blocate"
      },
      "filters": {
        "searchLabel": "Caută utilizator",
        "searchPlaceholder": "Caută după nume, e-mail, telefon sau rol...",
        "roleLabel": "Filtrează după rol",
        "statusLabel": "Filtrează după statut",
        "allRoles": "Toate rolurile",
        "allStatuses": "Toate statuturile",
        "roleOptions": {
          "patient": "Pacienți",
          "doctor_applicant": "Candidați medici",
          "doctor": "Medici",
          "staff": "Personal",
          "clinic_manager": "Manageri de clinică",
          "manager": "Manageri",
          "admin": "Administratori"
        },
        "statusOptions": {
          "active": "Active",
          "blocked": "Blocate"
        },
        "showing": "Se afișează {filtered} din {total}"
      },
      "table": {
        "user": "Utilizator",
        "role": "Rol",
        "emailVerified": "E-mail verificat",
        "status": "Statut",
        "registered": "Înregistrat",
        "lastSignIn": "Ultima autentificare",
        "action": "Acțiune",
        "verified": "Verificat",
        "unverified": "Neverificat",
        "loading": "Se încarcă utilizatorii...",
        "empty": "Nu există utilizatori care corespund filtrelor.",
        "protectedExplanation": "Administratorii și managerii sunt gestionați prin fluxurile lor dedicate."
      },
      "actions": {
        "block": "Blochează",
        "unblock": "Deblochează",
        "updating": "Se actualizează...",
        "blockPrompt": "Introdu motivul blocării contului {account}:",
        "unblockConfirm": "Deblochezi contul {account}?"
      },
      "messages": {
        "loadFailed": "Utilizatorii nu au putut fi încărcați.",
        "statusUpdateFailed": "Statutul utilizatorului nu a putut fi actualizat.",
        "statusUpdated": "Statutul utilizatorului a fost actualizat."
      }
    },
    "managers": {
      "page": {
        "title": "Manageri RomDoc",
        "description": "Invită manageri operaționali și controlează accesul lor. Managerii nu pot invita alți manageri și nu pot modifica administratori."
      },
      "metrics": {
        "total": "Total manageri",
        "active": "Activi",
        "suspended": "Suspendați",
        "pendingInvitations": "Invitații în așteptare"
      },
      "invite": {
        "title": "Invită un manager",
        "description": "Managerul primește un e-mail de invitație și trebuie să configureze Google Authenticator înainte de accesul la panoul operațional.",
        "firstName": "Prenume",
        "lastName": "Nume",
        "email": "E-mail",
        "type": "Tip manager",
        "operational": "Operațional",
        "operationalDescription": "Acces pentru administrare operațională, fără permisiuni de facturare SMS.",
        "accounting": "Facturare",
        "accountingDescription": "Acces la facturare SMS, verificarea facturilor și informațiile necesare facturării.",
        "send": "Trimite invitația",
        "sending": "Se trimite..."
      },
      "filters": {
        "searchLabel": "Caută manager",
        "searchPlaceholder": "Caută după nume sau e-mail...",
        "statusLabel": "Filtrează după statut",
        "typeLabel": "Filtrează după tip",
        "allStatuses": "Toate statuturile",
        "allTypes": "Toate tipurile",
        "active": "Activi",
        "suspended": "Suspendați",
        "operational": "Operaționali",
        "accounting": "Facturare",
        "showing": "Se afișează {filtered} din {total}"
      },
      "table": {
        "title": "Manageri activi și suspendați",
        "manager": "Manager",
        "email": "E-mail",
        "type": "Tip",
        "confirmed": "Confirmat",
        "status": "Statut",
        "created": "Creat",
        "lastSignIn": "Ultima autentificare",
        "actions": "Acțiuni",
        "empty": "Nu există manageri care corespund filtrelor.",
        "loading": "Se încarcă managerii..."
      },
      "types": {
        "accounting": "Facturare",
        "operational": "Operațional"
      },
      "actions": {
        "grantAccounting": "Acordă Facturare",
        "revokeAccounting": "Elimină Facturare",
        "suspend": "Suspendă",
        "activate": "Activează",
        "delete": "Șterge",
        "revokeInvitation": "Revocă",
        "deleteConfirm": "Ștergi managerul {name} din lista de manageri?\n\nContul nu va fi șters fizic din istoricul RomDoc, dar rolul de manager va fi eliminat și accesul operațional va fi blocat."
      },
      "invitations": {
        "title": "Invitații",
        "pendingCount": "{count} în așteptare",
        "status": "Statut: {status}",
        "expires": "Expiră: {date}",
        "empty": "Nu există invitații."
      },
      "invitationStatuses": {
        "pending": "În așteptare",
        "accepted": "Acceptată",
        "declined": "Refuzată",
        "expired": "Expirată",
        "revoked": "Revocată",
        "cancelled": "Anulată",
        "unknown": "Necunoscut"
      },
      "messages": {
        "loadFailed": "Managerii nu au putut fi încărcați.",
        "invitationFailed": "Invitația nu a putut fi trimisă.",
        "actionFailed": "Acțiunea nu a putut fi finalizată.",
        "genericSuccess": "Modificarea a fost salvată."
      },
      "emailInvitation": {
        "subjectOperational": "Invitație RomDoc — Manager Operațional",
        "subjectAccounting": "Invitație RomDoc — Manager Facturare",
        "heading": "Invitație RomDoc",
        "greeting": "Bună, {name},",
        "operationalType": "Manager Operațional",
        "accountingType": "Manager Facturare",
        "body": "Ai fost invitat(ă) să devii {type} în platforma RomDoc.",
        "instructions": "Apasă butonul de mai jos pentru a confirma invitația și pentru a crea parola contului.",
        "action": "Acceptă invitația",
        "fallback": "Dacă butonul nu funcționează, copiază acest link în browser:",
        "ignore": "Dacă nu te așteptai la această invitație, poți ignora acest e-mail."
      }
    },
    "api": {
      "users_loaded": "Utilizatorii au fost încărcați.",
      "managers_loaded": "Managerii au fost încărcați.",
      "authentication_required": "Trebuie să fii autentificat.",
      "access_denied": "Nu ai permisiunea necesară.",
      "mfa_required": "Este necesară verificarea Google Authenticator.",
      "admin_required": "Doar administratorii pot efectua această acțiune.",
      "users_auth_load_failed": "Utilizatorii de autentificare nu au putut fi încărcați.",
      "user_profiles_load_failed": "Profilurile utilizatorilor nu au putut fi încărcate.",
      "doctor_subscriptions_load_failed": "Abonamentele medicilor nu au putut fi încărcate.",
      "invalid_json": "Cererea nu conține date JSON valide.",
      "user_id_required": "Utilizatorul lipsește.",
      "invalid_user_action": "Acțiunea solicitată nu este validă.",
      "block_reason_required": "Introdu motivul blocării.",
      "self_account_action_forbidden": "Nu îți poți modifica propriul cont prin această acțiune.",
      "user_not_found": "Profilul utilizatorului nu a fost găsit.",
      "manager_privileged_target_forbidden": "Managerii nu pot modifica administratori sau alți manageri.",
      "manager_action_forbidden": "Managerii pot doar suspenda sau reactiva utilizatori.",
      "doctor_applicant_required": "Numai candidații medici pot fi activați.",
      "doctor_applicant_blocked": "Contul candidatului este blocat. Deblochează contul înainte de activare.",
      "doctor_auth_account_not_found": "Contul de autentificare al candidatului nu a fost găsit.",
      "doctor_email_unverified": "Candidatul trebuie să își verifice adresa de e-mail înainte de activare.",
      "doctor_subscription_check_failed": "Abonamentul candidatului nu a putut fi verificat.",
      "doctor_subscription_missing": "Candidatul nu are un abonament de medic.",
      "doctor_subscription_inactive": "Candidatul nu are un abonament activ sau în perioada de probă.",
      "doctor_profile_check_failed": "Profilul de medic existent nu a putut fi verificat.",
      "doctor_slug_failed": "Slug-ul profilului de medic nu a putut fi generat.",
      "doctor_profile_create_failed": "Profilul de medic nu a putut fi creat.",
      "doctor_profile_activate_failed": "Profilul de medic existent nu a putut fi activat.",
      "doctor_profile_not_identified": "Profilul de medic nu a putut fi identificat.",
      "doctor_subscription_link_failed": "Abonamentul nu a putut fi asociat profilului de medic.",
      "doctor_role_activation_failed": "Rolul de medic nu a putut fi acordat. Modificările au fost anulate.",
      "doctor_activated": "Candidatul a fost activat ca medic.",
      "admin_account_protected": "Conturile de administrator nu pot fi blocate din această pagină.",
      "manager_account_protected": "Conturile de manager sunt gestionate din pagina dedicată Manageri.",
      "account_already_blocked": "Contul este deja blocat.",
      "account_already_active": "Contul este deja activ.",
      "auth_block_failed": "Contul de autentificare nu a putut fi blocat.",
      "profile_block_failed": "Profilul nu a putut fi blocat. Modificarea autentificării a fost anulată.",
      "user_blocked": "Utilizatorul a fost blocat.",
      "auth_unblock_failed": "Contul de autentificare nu a putut fi deblocat.",
      "profile_unblock_failed": "Profilul nu a putut fi deblocat. Modificarea autentificării a fost anulată.",
      "user_unblocked": "Utilizatorul a fost deblocat.",
      "managers_load_failed": "Managerii nu au putut fi încărcați.",
      "manager_auth_load_failed": "Datele de autentificare ale managerilor nu au putut fi încărcate.",
      "invalid_request_data": "Datele trimise nu sunt valide.",
      "invalid_email": "Introdu o adresă de e-mail validă.",
      "manager_invitation_exists": "Există deja o invitație activă pentru această adresă.",
      "existing_account_requires_separate_flow": "Adresa aparține deja unui cont. Rolul trebuie acordat printr-un flux administrativ separat.",
      "manager_invitation_link_failed": "Linkul de invitație nu a putut fi generat.",
      "manager_profile_create_failed": "Profilul de manager nu a putut fi creat.",
      "accounting_permission_grant_failed": "Permisiunea de facturare nu a putut fi acordată.",
      "manager_invitation_email_failed": "E-mailul de invitație nu a putut fi trimis.",
      "manager_invitation_record_failed": "Invitația a fost trimisă, dar evidența internă nu a putut fi creată.",
      "manager_invited": "Invitația de manager a fost trimisă.",
      "manager_id_required": "Managerul lipsește.",
      "self_permission_change_forbidden": "Nu îți poți modifica propriile permisiuni din această pagină.",
      "manager_not_found": "Managerul nu a fost găsit.",
      "accounting_permission_update_failed": "Permisiunea de facturare nu a putut fi actualizată.",
      "accounting_permission_granted": "Permisiunea Facturare a fost acordată.",
      "accounting_permission_revoked": "Permisiunea Facturare a fost eliminată.",
      "self_manager_account_change_forbidden": "Nu îți poți modifica propriul cont din această pagină.",
      "manager_delete_failed": "Managerul nu a putut fi șters.",
      "manager_deleted": "Managerul a fost șters din lista de manageri și accesul operațional a fost blocat.",
      "manager_update_failed": "Managerul nu a putut fi actualizat.",
      "manager_suspended": "Managerul a fost suspendat.",
      "manager_activated": "Managerul a fost activat.",
      "invitation_id_required": "Invitația lipsește.",
      "invitation_revoke_failed": "Invitația nu a putut fi revocată.",
      "invitation_revoked": "Invitația a fost revocată.",
      "invalid_manager_action": "Acțiunea solicitată nu este validă."
    }
  },
  "en": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operational management",
      "accessAdministration": "Access administration",
      "nameUnavailable": "Name unavailable",
      "emailUnavailable": "Email unavailable",
      "yes": "Yes",
      "no": "No",
      "protected": "Protected",
      "resetFilters": "Reset filters",
      "noDate": "—",
      "reason": "Reason",
      "loading": "Loading..."
    },
    "roles": {
      "admin": "Administrator",
      "manager": "Manager",
      "clinic_manager": "Clinic Manager",
      "doctor": "Doctor",
      "doctor_applicant": "Doctor applicant",
      "staff": "Staff",
      "patient": "Patient",
      "unknown": "Unknown role"
    },
    "accountStatuses": {
      "active": "Active",
      "blocked": "Blocked",
      "suspended": "Suspended",
      "unknown": "Unknown"
    },
    "users": {
      "page": {
        "title": "Users",
        "adminDescription": "View registered accounts, filter users by role and manage access through the existing actions.",
        "managerDescription": "View registered accounts and manage suspension or reactivation within the limits of the Manager role."
      },
      "closure": {
        "title": "Requested account closures",
        "description": "Use the existing block action in the Users table.",
        "requestedAt": "Requested: {date}",
        "requested": "Closure requested",
        "patientFallback": "Patient"
      },
      "metrics": {
        "total": "Total users",
        "active": "Active accounts",
        "blocked": "Blocked accounts"
      },
      "filters": {
        "searchLabel": "Search users",
        "searchPlaceholder": "Search by name, email, phone or role...",
        "roleLabel": "Filter by role",
        "statusLabel": "Filter by status",
        "allRoles": "All roles",
        "allStatuses": "All statuses",
        "roleOptions": {
          "patient": "Patients",
          "doctor_applicant": "Doctor applicants",
          "doctor": "Doctors",
          "staff": "Staff",
          "clinic_manager": "Clinic Managers",
          "manager": "Managers",
          "admin": "Administrators"
        },
        "statusOptions": {
          "active": "Active",
          "blocked": "Blocked"
        },
        "showing": "Showing {filtered} of {total}"
      },
      "table": {
        "user": "User",
        "role": "Role",
        "emailVerified": "Email verified",
        "status": "Status",
        "registered": "Registered",
        "lastSignIn": "Last sign-in",
        "action": "Action",
        "verified": "Verified",
        "unverified": "Unverified",
        "loading": "Loading users...",
        "empty": "No users match the selected filters.",
        "protectedExplanation": "Administrators and Managers are managed through their dedicated workflows."
      },
      "actions": {
        "block": "Block",
        "unblock": "Unblock",
        "updating": "Updating...",
        "blockPrompt": "Enter the reason for blocking {account}:",
        "unblockConfirm": "Unblock {account}?"
      },
      "messages": {
        "loadFailed": "The users could not be loaded.",
        "statusUpdateFailed": "The user status could not be updated.",
        "statusUpdated": "The user status was updated."
      }
    },
    "managers": {
      "page": {
        "title": "RomDoc Managers",
        "description": "Invite operational Managers and control their access. Managers cannot invite other Managers or modify Administrators."
      },
      "metrics": {
        "total": "Total Managers",
        "active": "Active",
        "suspended": "Suspended",
        "pendingInvitations": "Pending invitations"
      },
      "invite": {
        "title": "Invite a Manager",
        "description": "The Manager receives an invitation email and must configure Google Authenticator before entering the operational dashboard.",
        "firstName": "First name",
        "lastName": "Last name",
        "email": "Email",
        "type": "Manager type",
        "operational": "Operational",
        "operationalDescription": "Operational administration access without SMS billing permissions.",
        "accounting": "Billing",
        "accountingDescription": "Access to SMS billing, invoice verification and invoicing information.",
        "send": "Send invitation",
        "sending": "Sending..."
      },
      "filters": {
        "searchLabel": "Search Managers",
        "searchPlaceholder": "Search by name or email...",
        "statusLabel": "Filter by status",
        "typeLabel": "Filter by type",
        "allStatuses": "All statuses",
        "allTypes": "All types",
        "active": "Active",
        "suspended": "Suspended",
        "operational": "Operational",
        "accounting": "Billing",
        "showing": "Showing {filtered} of {total}"
      },
      "table": {
        "title": "Active and suspended Managers",
        "manager": "Manager",
        "email": "Email",
        "type": "Type",
        "confirmed": "Confirmed",
        "status": "Status",
        "created": "Created",
        "lastSignIn": "Last sign-in",
        "actions": "Actions",
        "empty": "No Managers match the selected filters.",
        "loading": "Loading Managers..."
      },
      "types": {
        "accounting": "Billing",
        "operational": "Operational"
      },
      "actions": {
        "grantAccounting": "Grant Billing",
        "revokeAccounting": "Remove Billing",
        "suspend": "Suspend",
        "activate": "Activate",
        "delete": "Delete",
        "revokeInvitation": "Revoke",
        "deleteConfirm": "Remove {name} from the Managers list?\n\nThe account will not be physically deleted from RomDoc history, but the Manager role will be removed and operational access will be blocked."
      },
      "invitations": {
        "title": "Invitations",
        "pendingCount": "{count} pending",
        "status": "Status: {status}",
        "expires": "Expires: {date}",
        "empty": "There are no invitations."
      },
      "invitationStatuses": {
        "pending": "Pending",
        "accepted": "Accepted",
        "declined": "Declined",
        "expired": "Expired",
        "revoked": "Revoked",
        "cancelled": "Cancelled",
        "unknown": "Unknown"
      },
      "messages": {
        "loadFailed": "The Managers could not be loaded.",
        "invitationFailed": "The invitation could not be sent.",
        "actionFailed": "The action could not be completed.",
        "genericSuccess": "The change was saved."
      },
      "emailInvitation": {
        "subjectOperational": "RomDoc invitation — Operational Manager",
        "subjectAccounting": "RomDoc invitation — Billing Manager",
        "heading": "RomDoc invitation",
        "greeting": "Hello, {name},",
        "operationalType": "Operational Manager",
        "accountingType": "Billing Manager",
        "body": "You have been invited to become a {type} on the RomDoc platform.",
        "instructions": "Use the button below to accept the invitation and create your account password.",
        "action": "Accept invitation",
        "fallback": "If the button does not work, copy this link into your browser:",
        "ignore": "If you were not expecting this invitation, you can ignore this email."
      }
    },
    "api": {
      "users_loaded": "Users were loaded.",
      "managers_loaded": "Managers were loaded.",
      "authentication_required": "You must be signed in.",
      "access_denied": "You do not have the required permission.",
      "mfa_required": "Google Authenticator verification is required.",
      "admin_required": "Only Administrators can perform this action.",
      "users_auth_load_failed": "Authentication users could not be loaded.",
      "user_profiles_load_failed": "User profiles could not be loaded.",
      "doctor_subscriptions_load_failed": "Doctor subscriptions could not be loaded.",
      "invalid_json": "The request does not contain valid JSON.",
      "user_id_required": "The user is missing.",
      "invalid_user_action": "The requested action is invalid.",
      "block_reason_required": "Enter the reason for blocking the account.",
      "self_account_action_forbidden": "You cannot modify your own account through this action.",
      "user_not_found": "The user profile was not found.",
      "manager_privileged_target_forbidden": "Managers cannot modify Administrators or other Managers.",
      "manager_action_forbidden": "Managers may only suspend or reactivate users.",
      "doctor_applicant_required": "Only doctor applicants can be activated.",
      "doctor_applicant_blocked": "The applicant account is blocked. Unblock it before activation.",
      "doctor_auth_account_not_found": "The applicant authentication account was not found.",
      "doctor_email_unverified": "The applicant must verify their email address before activation.",
      "doctor_subscription_check_failed": "The applicant subscription could not be checked.",
      "doctor_subscription_missing": "The applicant does not have a doctor subscription.",
      "doctor_subscription_inactive": "The applicant does not have an active or trial subscription.",
      "doctor_profile_check_failed": "The existing doctor profile could not be checked.",
      "doctor_slug_failed": "The doctor profile slug could not be generated.",
      "doctor_profile_create_failed": "The doctor profile could not be created.",
      "doctor_profile_activate_failed": "The existing doctor profile could not be activated.",
      "doctor_profile_not_identified": "The doctor profile could not be identified.",
      "doctor_subscription_link_failed": "The subscription could not be linked to the doctor profile.",
      "doctor_role_activation_failed": "The Doctor role could not be granted. The changes were rolled back.",
      "doctor_activated": "The applicant was activated as a Doctor.",
      "admin_account_protected": "Administrator accounts cannot be blocked from this page.",
      "manager_account_protected": "Manager accounts are managed from the dedicated Managers page.",
      "account_already_blocked": "The account is already blocked.",
      "account_already_active": "The account is already active.",
      "auth_block_failed": "The authentication account could not be blocked.",
      "profile_block_failed": "The profile could not be blocked. The authentication change was rolled back.",
      "user_blocked": "The user was blocked.",
      "auth_unblock_failed": "The authentication account could not be unblocked.",
      "profile_unblock_failed": "The profile could not be unblocked. The authentication change was rolled back.",
      "user_unblocked": "The user was unblocked.",
      "managers_load_failed": "The Managers could not be loaded.",
      "manager_auth_load_failed": "Manager authentication data could not be loaded.",
      "invalid_request_data": "The submitted data is invalid.",
      "invalid_email": "Enter a valid email address.",
      "manager_invitation_exists": "There is already an active invitation for this address.",
      "existing_account_requires_separate_flow": "The address already belongs to an account. The role must be granted through a separate administrative workflow.",
      "manager_invitation_link_failed": "The invitation link could not be generated.",
      "manager_profile_create_failed": "The Manager profile could not be created.",
      "accounting_permission_grant_failed": "The Billing permission could not be granted.",
      "manager_invitation_email_failed": "The invitation email could not be sent.",
      "manager_invitation_record_failed": "The invitation was sent, but the internal record could not be created.",
      "manager_invited": "The Manager invitation was sent.",
      "manager_id_required": "The Manager is missing.",
      "self_permission_change_forbidden": "You cannot modify your own permissions from this page.",
      "manager_not_found": "The Manager was not found.",
      "accounting_permission_update_failed": "The Billing permission could not be updated.",
      "accounting_permission_granted": "The Billing permission was granted.",
      "accounting_permission_revoked": "The Billing permission was removed.",
      "self_manager_account_change_forbidden": "You cannot modify your own account from this page.",
      "manager_delete_failed": "The Manager could not be removed.",
      "manager_deleted": "The Manager was removed from the Managers list and operational access was blocked.",
      "manager_update_failed": "The Manager could not be updated.",
      "manager_suspended": "The Manager was suspended.",
      "manager_activated": "The Manager was activated.",
      "invitation_id_required": "The invitation is missing.",
      "invitation_revoke_failed": "The invitation could not be revoked.",
      "invitation_revoked": "The invitation was revoked.",
      "invalid_manager_action": "The requested action is invalid."
    }
  },
  "de": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operative Verwaltung",
      "accessAdministration": "Zugriffsverwaltung",
      "nameUnavailable": "Name nicht verfügbar",
      "emailUnavailable": "E-Mail nicht verfügbar",
      "yes": "Ja",
      "no": "Nein",
      "protected": "Geschützt",
      "resetFilters": "Filter zurücksetzen",
      "noDate": "—",
      "reason": "Grund",
      "loading": "Wird geladen..."
    },
    "roles": {
      "admin": "Administrator",
      "manager": "Manager",
      "clinic_manager": "Klinikmanager",
      "doctor": "Arzt",
      "doctor_applicant": "Arztbewerber",
      "staff": "Personal",
      "patient": "Patient",
      "unknown": "Unbekannte Rolle"
    },
    "accountStatuses": {
      "active": "Aktiv",
      "blocked": "Gesperrt",
      "suspended": "Suspendiert",
      "unknown": "Unbekannt"
    },
    "users": {
      "page": {
        "title": "Benutzer",
        "adminDescription": "Registrierte Konten anzeigen, Benutzer nach Rolle filtern und den Zugriff über die vorhandenen Aktionen verwalten.",
        "managerDescription": "Registrierte Konten anzeigen und Sperrung oder Reaktivierung innerhalb der Grenzen der Managerrolle verwalten."
      },
      "closure": {
        "title": "Beantragte Kontoschließungen",
        "description": "Die vorhandene Sperraktion in der Benutzertabelle verwenden.",
        "requestedAt": "Beantragt: {date}",
        "requested": "Schließung beantragt",
        "patientFallback": "Patient"
      },
      "metrics": {
        "total": "Benutzer insgesamt",
        "active": "Aktive Konten",
        "blocked": "Gesperrte Konten"
      },
      "filters": {
        "searchLabel": "Benutzer suchen",
        "searchPlaceholder": "Nach Name, E-Mail, Telefon oder Rolle suchen...",
        "roleLabel": "Nach Rolle filtern",
        "statusLabel": "Nach Status filtern",
        "allRoles": "Alle Rollen",
        "allStatuses": "Alle Status",
        "roleOptions": {
          "patient": "Patienten",
          "doctor_applicant": "Arztbewerber",
          "doctor": "Ärzte",
          "staff": "Personal",
          "clinic_manager": "Klinikmanager",
          "manager": "Manager",
          "admin": "Administratoren"
        },
        "statusOptions": {
          "active": "Aktiv",
          "blocked": "Gesperrt"
        },
        "showing": "{filtered} von {total} werden angezeigt"
      },
      "table": {
        "user": "Benutzer",
        "role": "Rolle",
        "emailVerified": "E-Mail bestätigt",
        "status": "Status",
        "registered": "Registriert",
        "lastSignIn": "Letzte Anmeldung",
        "action": "Aktion",
        "verified": "Bestätigt",
        "unverified": "Nicht bestätigt",
        "loading": "Benutzer werden geladen...",
        "empty": "Keine Benutzer entsprechen den ausgewählten Filtern.",
        "protectedExplanation": "Administratoren und Manager werden über ihre eigenen Abläufe verwaltet."
      },
      "actions": {
        "block": "Sperren",
        "unblock": "Entsperren",
        "updating": "Wird aktualisiert...",
        "blockPrompt": "Grund für die Sperrung von {account} eingeben:",
        "unblockConfirm": "{account} entsperren?"
      },
      "messages": {
        "loadFailed": "Die Benutzer konnten nicht geladen werden.",
        "statusUpdateFailed": "Der Benutzerstatus konnte nicht aktualisiert werden.",
        "statusUpdated": "Der Benutzerstatus wurde aktualisiert."
      }
    },
    "managers": {
      "page": {
        "title": "RomDoc-Manager",
        "description": "Operative Manager einladen und ihren Zugriff kontrollieren. Manager können keine weiteren Manager einladen und keine Administratoren ändern."
      },
      "metrics": {
        "total": "Manager insgesamt",
        "active": "Aktiv",
        "suspended": "Suspendiert",
        "pendingInvitations": "Ausstehende Einladungen"
      },
      "invite": {
        "title": "Manager einladen",
        "description": "Der Manager erhält eine Einladungs-E-Mail und muss Google Authenticator einrichten, bevor das operative Dashboard genutzt werden kann.",
        "firstName": "Vorname",
        "lastName": "Nachname",
        "email": "E-Mail",
        "type": "Managertyp",
        "operational": "Operativ",
        "operationalDescription": "Zugriff auf die operative Verwaltung ohne Berechtigungen für die SMS-Abrechnung.",
        "accounting": "Abrechnung",
        "accountingDescription": "Zugriff auf SMS-Abrechnung, Rechnungsprüfung und Informationen für die Rechnungsstellung.",
        "send": "Einladung senden",
        "sending": "Wird gesendet..."
      },
      "filters": {
        "searchLabel": "Manager suchen",
        "searchPlaceholder": "Nach Name oder E-Mail suchen...",
        "statusLabel": "Nach Status filtern",
        "typeLabel": "Nach Typ filtern",
        "allStatuses": "Alle Status",
        "allTypes": "Alle Typen",
        "active": "Aktiv",
        "suspended": "Suspendiert",
        "operational": "Operativ",
        "accounting": "Abrechnung",
        "showing": "{filtered} von {total} werden angezeigt"
      },
      "table": {
        "title": "Aktive und suspendierte Manager",
        "manager": "Manager",
        "email": "E-Mail",
        "type": "Typ",
        "confirmed": "Bestätigt",
        "status": "Status",
        "created": "Erstellt",
        "lastSignIn": "Letzte Anmeldung",
        "actions": "Aktionen",
        "empty": "Keine Manager entsprechen den ausgewählten Filtern.",
        "loading": "Manager werden geladen..."
      },
      "types": {
        "accounting": "Abrechnung",
        "operational": "Operativ"
      },
      "actions": {
        "grantAccounting": "Abrechnung gewähren",
        "revokeAccounting": "Abrechnung entfernen",
        "suspend": "Suspendieren",
        "activate": "Aktivieren",
        "delete": "Entfernen",
        "revokeInvitation": "Widerrufen",
        "deleteConfirm": "{name} aus der Managerliste entfernen?\n\nDas Konto wird nicht physisch aus der RomDoc-Historie gelöscht, aber die Managerrolle wird entfernt und der operative Zugriff gesperrt."
      },
      "invitations": {
        "title": "Einladungen",
        "pendingCount": "{count} ausstehend",
        "status": "Status: {status}",
        "expires": "Läuft ab: {date}",
        "empty": "Es gibt keine Einladungen."
      },
      "invitationStatuses": {
        "pending": "Ausstehend",
        "accepted": "Angenommen",
        "declined": "Abgelehnt",
        "expired": "Abgelaufen",
        "revoked": "Widerrufen",
        "cancelled": "Storniert",
        "unknown": "Unbekannt"
      },
      "messages": {
        "loadFailed": "Die Manager konnten nicht geladen werden.",
        "invitationFailed": "Die Einladung konnte nicht gesendet werden.",
        "actionFailed": "Die Aktion konnte nicht abgeschlossen werden.",
        "genericSuccess": "Die Änderung wurde gespeichert."
      },
      "emailInvitation": {
        "subjectOperational": "RomDoc-Einladung — Operativer Manager",
        "subjectAccounting": "RomDoc-Einladung — Abrechnungsmanager",
        "heading": "RomDoc-Einladung",
        "greeting": "Hallo {name},",
        "operationalType": "Operativer Manager",
        "accountingType": "Abrechnungsmanager",
        "body": "Sie wurden eingeladen, als {type} auf der RomDoc-Plattform tätig zu werden.",
        "instructions": "Mit der folgenden Schaltfläche können Sie die Einladung annehmen und Ihr Kontopasswort erstellen.",
        "action": "Einladung annehmen",
        "fallback": "Falls die Schaltfläche nicht funktioniert, kopieren Sie diesen Link in den Browser:",
        "ignore": "Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren."
      }
    },
    "api": {
      "users_loaded": "Benutzer wurden geladen.",
      "managers_loaded": "Manager wurden geladen.",
      "authentication_required": "Sie müssen angemeldet sein.",
      "access_denied": "Sie verfügen nicht über die erforderliche Berechtigung.",
      "mfa_required": "Eine Bestätigung über Google Authenticator ist erforderlich.",
      "admin_required": "Nur Administratoren können diese Aktion ausführen.",
      "users_auth_load_failed": "Authentifizierungsbenutzer konnten nicht geladen werden.",
      "user_profiles_load_failed": "Benutzerprofile konnten nicht geladen werden.",
      "doctor_subscriptions_load_failed": "Arztabonnements konnten nicht geladen werden.",
      "invalid_json": "Die Anfrage enthält kein gültiges JSON.",
      "user_id_required": "Der Benutzer fehlt.",
      "invalid_user_action": "Die angeforderte Aktion ist ungültig.",
      "block_reason_required": "Geben Sie den Grund für die Sperrung ein.",
      "self_account_action_forbidden": "Sie können Ihr eigenes Konto mit dieser Aktion nicht ändern.",
      "user_not_found": "Das Benutzerprofil wurde nicht gefunden.",
      "manager_privileged_target_forbidden": "Manager können Administratoren oder andere Manager nicht ändern.",
      "manager_action_forbidden": "Manager dürfen Benutzer nur sperren oder reaktivieren.",
      "doctor_applicant_required": "Nur Arztbewerber können aktiviert werden.",
      "doctor_applicant_blocked": "Das Bewerberkonto ist gesperrt. Entsperren Sie es vor der Aktivierung.",
      "doctor_auth_account_not_found": "Das Authentifizierungskonto des Bewerbers wurde nicht gefunden.",
      "doctor_email_unverified": "Der Bewerber muss seine E-Mail-Adresse vor der Aktivierung bestätigen.",
      "doctor_subscription_check_failed": "Das Abonnement des Bewerbers konnte nicht geprüft werden.",
      "doctor_subscription_missing": "Der Bewerber hat kein Arztabonnement.",
      "doctor_subscription_inactive": "Der Bewerber hat kein aktives Abonnement und befindet sich nicht im Testzeitraum.",
      "doctor_profile_check_failed": "Das vorhandene Arztprofil konnte nicht geprüft werden.",
      "doctor_slug_failed": "Der Slug des Arztprofils konnte nicht erstellt werden.",
      "doctor_profile_create_failed": "Das Arztprofil konnte nicht erstellt werden.",
      "doctor_profile_activate_failed": "Das vorhandene Arztprofil konnte nicht aktiviert werden.",
      "doctor_profile_not_identified": "Das Arztprofil konnte nicht identifiziert werden.",
      "doctor_subscription_link_failed": "Das Abonnement konnte nicht mit dem Arztprofil verknüpft werden.",
      "doctor_role_activation_failed": "Die Arztrolle konnte nicht vergeben werden. Die Änderungen wurden zurückgesetzt.",
      "doctor_activated": "Der Bewerber wurde als Arzt aktiviert.",
      "admin_account_protected": "Administratorkonten können auf dieser Seite nicht gesperrt werden.",
      "manager_account_protected": "Managerkonten werden auf der dafür vorgesehenen Manager-Seite verwaltet.",
      "account_already_blocked": "Das Konto ist bereits gesperrt.",
      "account_already_active": "Das Konto ist bereits aktiv.",
      "auth_block_failed": "Das Authentifizierungskonto konnte nicht gesperrt werden.",
      "profile_block_failed": "Das Profil konnte nicht gesperrt werden. Die Authentifizierungsänderung wurde zurückgesetzt.",
      "user_blocked": "Der Benutzer wurde gesperrt.",
      "auth_unblock_failed": "Das Authentifizierungskonto konnte nicht entsperrt werden.",
      "profile_unblock_failed": "Das Profil konnte nicht entsperrt werden. Die Authentifizierungsänderung wurde zurückgesetzt.",
      "user_unblocked": "Der Benutzer wurde entsperrt.",
      "managers_load_failed": "Die Manager konnten nicht geladen werden.",
      "manager_auth_load_failed": "Die Authentifizierungsdaten der Manager konnten nicht geladen werden.",
      "invalid_request_data": "Die übermittelten Daten sind ungültig.",
      "invalid_email": "Geben Sie eine gültige E-Mail-Adresse ein.",
      "manager_invitation_exists": "Für diese Adresse besteht bereits eine aktive Einladung.",
      "existing_account_requires_separate_flow": "Die Adresse gehört bereits zu einem Konto. Die Rolle muss über einen separaten administrativen Ablauf vergeben werden.",
      "manager_invitation_link_failed": "Der Einladungslink konnte nicht erstellt werden.",
      "manager_profile_create_failed": "Das Managerprofil konnte nicht erstellt werden.",
      "accounting_permission_grant_failed": "Die Abrechnungsberechtigung konnte nicht vergeben werden.",
      "manager_invitation_email_failed": "Die Einladungs-E-Mail konnte nicht gesendet werden.",
      "manager_invitation_record_failed": "Die Einladung wurde gesendet, der interne Datensatz konnte jedoch nicht erstellt werden.",
      "manager_invited": "Die Manager-Einladung wurde gesendet.",
      "manager_id_required": "Der Manager fehlt.",
      "self_permission_change_forbidden": "Sie können Ihre eigenen Berechtigungen auf dieser Seite nicht ändern.",
      "manager_not_found": "Der Manager wurde nicht gefunden.",
      "accounting_permission_update_failed": "Die Abrechnungsberechtigung konnte nicht aktualisiert werden.",
      "accounting_permission_granted": "Die Abrechnungsberechtigung wurde vergeben.",
      "accounting_permission_revoked": "Die Abrechnungsberechtigung wurde entfernt.",
      "self_manager_account_change_forbidden": "Sie können Ihr eigenes Konto auf dieser Seite nicht ändern.",
      "manager_delete_failed": "Der Manager konnte nicht entfernt werden.",
      "manager_deleted": "Der Manager wurde aus der Managerliste entfernt und der operative Zugriff wurde gesperrt.",
      "manager_update_failed": "Der Manager konnte nicht aktualisiert werden.",
      "manager_suspended": "Der Manager wurde suspendiert.",
      "manager_activated": "Der Manager wurde aktiviert.",
      "invitation_id_required": "Die Einladung fehlt.",
      "invitation_revoke_failed": "Die Einladung konnte nicht widerrufen werden.",
      "invitation_revoked": "Die Einladung wurde widerrufen.",
      "invalid_manager_action": "Die angeforderte Aktion ist ungültig."
    }
  }
} as const;

export function getPlatformOperatorAccess(
  locale: AppLocale
) {
  return accessMessages[locale];
}

export function getPlatformOperatorAccessApiMessage(
  locale: AppLocale,
  code: string | null | undefined,
  fallback: string
) {
  if (!code) {
    return fallback;
  }

  const messages =
    accessMessages[locale].api as Record<string, string>;

  return messages[code] ?? fallback;
}

export function getPlatformOperatorRoleLabel(
  locale: AppLocale,
  role: string
) {
  const labels =
    accessMessages[locale].roles as Record<string, string>;

  return labels[role] ?? labels.unknown;
}

export function getPlatformOperatorAccountStatusLabel(
  locale: AppLocale,
  status: string
) {
  const labels =
    accessMessages[locale].accountStatuses as Record<string, string>;

  return labels[status] ?? labels.unknown;
}

export function getManagerInvitationStatusLabel(
  locale: AppLocale,
  status: string
) {
  const labels =
    accessMessages[locale].managers.invitationStatuses as Record<string, string>;

  return labels[status] ?? labels.unknown;
}
