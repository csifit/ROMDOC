import type { AppLocale } from "@/lib/i18n/app-locale";

export const PLATFORM_OPERATOR_DIRECTORY_LOCALE_TAGS = {
  ro: "ro-RO",
  en: "en-GB",
  de: "de-DE",
} as const;

const platformOperatorDirectoryMessages = {
  "ro": {
    "common": {
      "administration": "Administrare",
      "operationalManagement": "Management operațional",
      "loading": "Se încarcă...",
      "saving": "Se salvează...",
      "updating": "Se actualizează...",
      "optional": "Opțional",
      "none": "—",
      "active": "Activ",
      "inactive": "Inactiv",
      "all": "Toate",
      "edit": "Editează",
      "cancel": "Anulează",
      "search": "Caută",
      "status": "Status",
      "actions": "Acțiuni",
      "romanian": "Română",
      "english": "Engleză",
      "german": "Germană",
      "slug": "Slug",
      "icon": "Icon",
      "total": "Total",
      "details": "Detalii",
      "showing": "Se afișează {filtered} din {total}",
      "yes": "Da",
      "no": "Nu"
    },
    "pages": {
      "specialties": {
        "title": "Specialități",
        "description": "Adaugă și administrează specialitățile medicale folosite în directoarele RomDoc. Denumirile în română și engleză sunt obligatorii; germana și câmpurile SEO sunt opționale."
      },
      "cities": {
        "adminTitle": "Orașe",
        "adminDescription": "Administrează orașele utilizate în filtre, directoare SEO și asocierea clinicilor. Crearea este rezervată Administratorului.",
        "managerTitle": "Orașe",
        "managerDescription": "Actualizează orașele utilizate în filtre și directoare. Crearea rămâne rezervată Administratorului."
      },
      "reviews": {
        "adminTitle": "Recenzii",
        "adminDescription": "Moderează recenziile care conțin limbaj nepotrivit, informații personale, spam sau conținut care încalcă regulile platformei.",
        "managerTitle": "Recenzii",
        "managerDescription": "Moderează recenziile care conțin limbaj nepotrivit, spam, informații personale sau alte încălcări ale regulilor RomDoc."
      }
    },
    "specialties": {
      "metrics": {
        "total": "Specialități",
        "active": "Active",
        "inactive": "Inactive",
        "missingGerman": "Fără germană"
      },
      "form": {
        "newEyebrow": "Specialitate nouă",
        "editEyebrow": "Editare",
        "newTitle": "Adaugă o specialitate",
        "editTitle": "Editează specialitatea",
        "description": "Completează denumirile publice, slug-ul și, opțional, metadatele SEO.",
        "cancelEdit": "Anulează editarea",
        "nameRo": "Nume în română",
        "nameEn": "Nume în engleză",
        "nameDe": "Nume în germană",
        "iconPlaceholder": "Exemplu: heart",
        "seoSummary": "Câmpuri SEO",
        "seoHelp": "Traducerea germană și câmpurile SEO sunt opționale. Completează-le manual când sunt disponibile.",
        "metaTitle": "Titlu SEO în {language}",
        "metaDescription": "Descriere SEO în {language}",
        "create": "Adaugă specialitatea",
        "save": "Salvează modificările",
        "saving": "Se salvează...",
        "nameRoRequired": "Introdu numele în limba română.",
        "nameEnRequired": "Introdu numele în limba engleză."
      },
      "list": {
        "title": "Lista specialităților",
        "count": "{count} specialități înregistrate.",
        "searchLabel": "Caută specialitate",
        "searchPlaceholder": "Caută după nume sau slug...",
        "statusLabel": "Filtrează după status",
        "allStatuses": "Toate specialitățile",
        "active": "Active",
        "inactive": "Inactive",
        "loading": "Se încarcă specialitățile...",
        "empty": "Nu există specialități care corespund filtrelor selectate.",
        "romanian": "Română",
        "english": "Engleză",
        "german": "Germană",
        "doctors": "Medici",
        "notTranslated": "Netradusă",
        "edit": "Editează",
        "activate": "Activează",
        "deactivate": "Dezactivează",
        "updating": "Se actualizează...",
        "confirmActivate": "Reactivezi această specialitate?",
        "confirmDeactivate": "Dezactivezi această specialitate?",
        "inUse": "Specialitatea este asociată unor medici și nu poate fi dezactivată."
      },
      "states": {
        "loadFailed": "Specialitățile nu au putut fi încărcate.",
        "saveFailed": "Specialitatea nu a putut fi salvată.",
        "statusFailed": "Statutul nu a putut fi actualizat.",
        "created": "Specialitatea a fost adăugată.",
        "updated": "Specialitatea a fost actualizată.",
        "deactivated": "Specialitatea a fost dezactivată."
      }
    },
    "cities": {
      "metrics": {
        "total": "Orașe",
        "active": "Active",
        "inactive": "Inactive",
        "coordinates": "Cu coordonate"
      },
      "form": {
        "newEyebrow": "Oraș nou",
        "editEyebrow": "Editare",
        "newTitle": "Adaugă un oraș",
        "editTitle": "Editează orașul",
        "description": "Orașele sunt utilizate în directoarele SEO, filtre și asocierea clinicilor cu o localitate internă RomDoc.",
        "adminOnlyTitle": "Crearea orașelor este rezervată Administratorului",
        "adminOnlyDescription": "Managerii pot actualiza orașele existente, dar nu pot crea localități noi.",
        "cancelEdit": "Anulează editarea",
        "nameRo": "Nume în română",
        "nameEn": "Nume în engleză",
        "countryCode": "Cod țară",
        "countryHelp": "Cod ISO din două litere. Pentru România folosește RO.",
        "latitude": "Latitudine",
        "longitude": "Longitudine",
        "create": "Adaugă orașul",
        "save": "Salvează modificările",
        "saving": "Se salvează...",
        "nameRoRequired": "Introdu numele orașului în limba română.",
        "nameEnRequired": "Introdu numele orașului în limba engleză.",
        "countryInvalid": "Codul țării trebuie să conțină exact două litere."
      },
      "list": {
        "title": "Lista orașelor",
        "count": "{count} orașe înregistrate.",
        "statusLabel": "Filtrează după status",
        "allStatuses": "Toate orașele",
        "active": "Active",
        "inactive": "Inactive",
        "searchLabel": "Caută oraș",
        "searchPlaceholder": "Caută după nume, slug sau țară...",
        "loading": "Se încarcă orașele...",
        "empty": "Nu există orașe care corespund filtrelor selectate.",
        "city": "Oraș",
        "english": "Engleză",
        "country": "Țară",
        "coordinates": "Coordonate",
        "clinics": "Clinici",
        "edit": "Editează",
        "activate": "Activează",
        "deactivate": "Dezactivează",
        "updating": "Se actualizează...",
        "confirmActivate": "Reactivezi acest oraș?",
        "confirmDeactivate": "Dezactivezi acest oraș?",
        "inUse": "Orașul este asociat unor clinici și nu poate fi dezactivat.",
        "latitudeShort": "Lat",
        "longitudeShort": "Lng"
      },
      "states": {
        "loadFailed": "Orașele nu au putut fi încărcate.",
        "saveFailed": "Orașul nu a putut fi salvat.",
        "statusFailed": "Statutul orașului nu a putut fi actualizat.",
        "created": "Orașul a fost adăugat.",
        "updated": "Orașul a fost actualizat.",
        "deactivated": "Orașul a fost dezactivat."
      }
    },
    "reviews": {
      "metrics": {
        "published": "Publicate",
        "hidden": "Ascunse",
        "removed": "Eliminate",
        "total": "Total"
      },
      "filters": {
        "published": "Publicate",
        "hidden": "Ascunse",
        "removed": "Eliminate",
        "searchLabel": "Caută recenzie",
        "searchPlaceholder": "Pacient, medic sau textul recenziei..."
      },
      "labels": {
        "forDoctor": "Pentru {doctor}",
        "date": "Publicată la {date}",
        "rating": "Evaluare",
        "comment": "Comentariu",
        "moderationReason": "Motiv moderare",
        "noComment": "Fără comentariu.",
        "doctorUnavailable": "Medic indisponibil",
        "statusPublished": "Publicată",
        "statusHidden": "Ascunsă",
        "statusRemoved": "Eliminată"
      },
      "actions": {
        "hide": "Ascunde",
        "remove": "Elimină",
        "restore": "Republică",
        "processing": "Se actualizează..."
      },
      "prompts": {
        "hide": "Motivul ascunderii recenziei:",
        "remove": "Motivul eliminării recenziei:"
      },
      "confirmations": {
        "restore": "Republici această recenzie?"
      },
      "states": {
        "loading": "Se încarcă recenziile...",
        "empty": "Nu există recenzii în această categorie.",
        "noSearchResults": "Nicio recenzie nu corespunde căutării.",
        "loadFailed": "Recenziile nu au putut fi încărcate.",
        "updateFailed": "Recenzia nu a putut fi actualizată.",
        "updated": "Recenzia a fost actualizată."
      }
    },
    "api": {
      "authentication_required": "Trebuie să fii autentificat.",
      "access_denied": "Nu ai permisiunea necesară.",
      "mfa_required": "Este necesară verificarea Google Authenticator.",
      "admin_required": "Doar administratorii pot efectua această acțiune.",
      "invalid_json": "Cererea nu conține date JSON valide.",
      "specialties_loaded": "Specialitățile au fost încărcate.",
      "specialties_load_failed": "Specialitățile nu au putut fi încărcate.",
      "specialty_name_ro_required": "Introdu numele specialității în limba română.",
      "specialty_name_en_required": "Introdu numele specialității în limba engleză.",
      "specialty_slug_invalid": "Slug-ul specialității nu este valid.",
      "specialty_slug_check_failed": "Slug-ul nu a putut fi verificat.",
      "specialty_slug_duplicate": "Există deja o specialitate cu acest slug.",
      "specialty_name_check_failed": "Numele specialității nu a putut fi verificat.",
      "specialty_name_duplicate": "Există deja o specialitate cu acest nume.",
      "specialty_create_failed": "Specialitatea nu a putut fi creată.",
      "specialty_translation_create_failed": "Traducerile specialității nu au putut fi salvate.",
      "specialty_created": "Specialitatea a fost adăugată.",
      "specialty_id_required": "Specialitatea lipsește.",
      "specialty_not_found": "Specialitatea nu a fost găsită.",
      "specialty_usage_check_failed": "Utilizarea specialității nu a putut fi verificată.",
      "specialty_in_use": "Specialitatea este asociată unor medici și nu poate fi dezactivată.",
      "specialty_update_failed": "Specialitatea nu a putut fi actualizată.",
      "specialty_translation_update_failed": "Traducerile specialității nu au putut fi actualizate.",
      "specialty_updated": "Specialitatea a fost actualizată.",
      "specialty_deactivated": "Specialitatea a fost dezactivată.",
      "cities_loaded": "Orașele au fost încărcate.",
      "cities_load_failed": "Orașele nu au putut fi încărcate.",
      "city_name_ro_required": "Introdu numele orașului în limba română.",
      "city_name_en_required": "Introdu numele orașului în limba engleză.",
      "city_country_code_invalid": "Codul țării trebuie să conțină exact două litere.",
      "city_coordinates_invalid": "Coordonatele nu sunt valide.",
      "city_slug_invalid": "Slug-ul orașului nu este valid.",
      "city_slug_check_failed": "Slug-ul nu a putut fi verificat.",
      "city_slug_duplicate": "Există deja un oraș cu acest slug.",
      "city_name_check_failed": "Numele orașului nu a putut fi verificat.",
      "city_name_duplicate": "Există deja un oraș cu acest nume în țara selectată.",
      "city_create_failed": "Orașul nu a putut fi creat.",
      "city_translation_create_failed": "Traducerile orașului nu au putut fi salvate.",
      "city_created": "Orașul a fost adăugat.",
      "city_id_required": "Orașul lipsește.",
      "city_not_found": "Orașul nu a fost găsit.",
      "city_usage_check_failed": "Utilizarea orașului nu a putut fi verificată.",
      "city_in_use": "Orașul este asociat unor clinici și nu poate fi dezactivat.",
      "city_update_failed": "Orașul nu a putut fi actualizat.",
      "city_translation_update_failed": "Traducerile orașului nu au putut fi actualizate.",
      "city_updated": "Orașul a fost actualizat.",
      "city_deactivated": "Orașul a fost dezactivat.",
      "reviews_loaded": "Recenziile au fost încărcate.",
      "reviews_load_failed": "Recenziile nu au putut fi încărcate.",
      "review_id_required": "Recenzia lipsește.",
      "review_action_invalid": "Acțiunea solicitată nu este validă.",
      "review_reason_required": "Introdu motivul moderării.",
      "review_update_failed": "Recenzia nu a putut fi actualizată.",
      "review_restored": "Recenzia a fost republicată.",
      "review_hidden": "Recenzia a fost ascunsă.",
      "review_removed": "Recenzia a fost eliminată."
    }
  },
  "en": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operational management",
      "loading": "Loading...",
      "saving": "Saving...",
      "updating": "Updating...",
      "optional": "Optional",
      "none": "—",
      "active": "Active",
      "inactive": "Inactive",
      "all": "All",
      "edit": "Edit",
      "cancel": "Cancel",
      "search": "Search",
      "status": "Status",
      "actions": "Actions",
      "romanian": "Romanian",
      "english": "English",
      "german": "German",
      "slug": "Slug",
      "icon": "Icon",
      "total": "Total",
      "details": "Details",
      "showing": "Showing {filtered} of {total}",
      "yes": "Yes",
      "no": "No"
    },
    "pages": {
      "specialties": {
        "title": "Specialties",
        "description": "Add and manage the medical specialties used in RomDoc directories. Romanian and English names are required; German and SEO fields are optional."
      },
      "cities": {
        "adminTitle": "Cities",
        "adminDescription": "Manage the cities used by filters, SEO directories and clinic associations. Creation is reserved for Administrators.",
        "managerTitle": "Cities",
        "managerDescription": "Update the cities used by filters and directories. Creation remains reserved for Administrators."
      },
      "reviews": {
        "adminTitle": "Reviews",
        "adminDescription": "Moderate reviews containing inappropriate language, personal information, spam or content that breaches platform rules.",
        "managerTitle": "Reviews",
        "managerDescription": "Moderate reviews containing inappropriate language, spam, personal information or other RomDoc rule breaches."
      }
    },
    "specialties": {
      "metrics": {
        "total": "Specialties",
        "active": "Active",
        "inactive": "Inactive",
        "missingGerman": "Missing German"
      },
      "form": {
        "newEyebrow": "New specialty",
        "editEyebrow": "Editing",
        "newTitle": "Add a specialty",
        "editTitle": "Edit specialty",
        "description": "Complete the public names, slug and optional SEO metadata.",
        "cancelEdit": "Cancel editing",
        "nameRo": "Romanian name",
        "nameEn": "English name",
        "nameDe": "German name",
        "iconPlaceholder": "Example: heart",
        "seoSummary": "SEO fields",
        "seoHelp": "The German translation and SEO fields are optional. Complete them manually when available.",
        "metaTitle": "SEO title in {language}",
        "metaDescription": "SEO description in {language}",
        "create": "Add specialty",
        "save": "Save changes",
        "saving": "Saving...",
        "nameRoRequired": "Enter the Romanian name.",
        "nameEnRequired": "Enter the English name."
      },
      "list": {
        "title": "Specialty list",
        "count": "{count} specialties registered.",
        "searchLabel": "Search specialties",
        "searchPlaceholder": "Search by name or slug...",
        "statusLabel": "Filter by status",
        "allStatuses": "All specialties",
        "active": "Active",
        "inactive": "Inactive",
        "loading": "Loading specialties...",
        "empty": "No specialties match the selected filters.",
        "romanian": "Romanian",
        "english": "English",
        "german": "German",
        "doctors": "Doctors",
        "notTranslated": "Not translated",
        "edit": "Edit",
        "activate": "Activate",
        "deactivate": "Deactivate",
        "updating": "Updating...",
        "confirmActivate": "Reactivate this specialty?",
        "confirmDeactivate": "Deactivate this specialty?",
        "inUse": "The specialty is assigned to doctors and cannot be deactivated."
      },
      "states": {
        "loadFailed": "Specialties could not be loaded.",
        "saveFailed": "The specialty could not be saved.",
        "statusFailed": "The status could not be updated.",
        "created": "The specialty was added.",
        "updated": "The specialty was updated.",
        "deactivated": "The specialty was deactivated."
      }
    },
    "cities": {
      "metrics": {
        "total": "Cities",
        "active": "Active",
        "inactive": "Inactive",
        "coordinates": "With coordinates"
      },
      "form": {
        "newEyebrow": "New city",
        "editEyebrow": "Editing",
        "newTitle": "Add a city",
        "editTitle": "Edit city",
        "description": "Cities are used in SEO directories, filters and clinic-to-location associations inside RomDoc.",
        "adminOnlyTitle": "City creation is reserved for Administrators",
        "adminOnlyDescription": "Managers may update existing cities but cannot create new locations.",
        "cancelEdit": "Cancel editing",
        "nameRo": "Romanian name",
        "nameEn": "English name",
        "countryCode": "Country code",
        "countryHelp": "Two-letter ISO code. Use RO for Romania.",
        "latitude": "Latitude",
        "longitude": "Longitude",
        "create": "Add city",
        "save": "Save changes",
        "saving": "Saving...",
        "nameRoRequired": "Enter the Romanian city name.",
        "nameEnRequired": "Enter the English city name.",
        "countryInvalid": "The country code must contain exactly two letters."
      },
      "list": {
        "title": "City list",
        "count": "{count} cities registered.",
        "statusLabel": "Filter by status",
        "allStatuses": "All cities",
        "active": "Active",
        "inactive": "Inactive",
        "searchLabel": "Search cities",
        "searchPlaceholder": "Search by name, slug or country...",
        "loading": "Loading cities...",
        "empty": "No cities match the selected filters.",
        "city": "City",
        "english": "English",
        "country": "Country",
        "coordinates": "Coordinates",
        "clinics": "Clinics",
        "edit": "Edit",
        "activate": "Activate",
        "deactivate": "Deactivate",
        "updating": "Updating...",
        "confirmActivate": "Reactivate this city?",
        "confirmDeactivate": "Deactivate this city?",
        "inUse": "The city is assigned to clinics and cannot be deactivated.",
        "latitudeShort": "Lat",
        "longitudeShort": "Lng"
      },
      "states": {
        "loadFailed": "Cities could not be loaded.",
        "saveFailed": "The city could not be saved.",
        "statusFailed": "The city status could not be updated.",
        "created": "The city was added.",
        "updated": "The city was updated.",
        "deactivated": "The city was deactivated."
      }
    },
    "reviews": {
      "metrics": {
        "published": "Published",
        "hidden": "Hidden",
        "removed": "Removed",
        "total": "Total"
      },
      "filters": {
        "published": "Published",
        "hidden": "Hidden",
        "removed": "Removed",
        "searchLabel": "Search reviews",
        "searchPlaceholder": "Patient, doctor or review text..."
      },
      "labels": {
        "forDoctor": "For {doctor}",
        "date": "Published on {date}",
        "rating": "Rating",
        "comment": "Comment",
        "moderationReason": "Moderation reason",
        "noComment": "No comment.",
        "doctorUnavailable": "Doctor unavailable",
        "statusPublished": "Published",
        "statusHidden": "Hidden",
        "statusRemoved": "Removed"
      },
      "actions": {
        "hide": "Hide",
        "remove": "Remove",
        "restore": "Republish",
        "processing": "Updating..."
      },
      "prompts": {
        "hide": "Reason for hiding the review:",
        "remove": "Reason for removing the review:"
      },
      "confirmations": {
        "restore": "Republish this review?"
      },
      "states": {
        "loading": "Loading reviews...",
        "empty": "There are no reviews in this category.",
        "noSearchResults": "No reviews match the search.",
        "loadFailed": "Reviews could not be loaded.",
        "updateFailed": "The review could not be updated.",
        "updated": "The review was updated."
      }
    },
    "api": {
      "authentication_required": "You must be signed in.",
      "access_denied": "You do not have the required permission.",
      "mfa_required": "Google Authenticator verification is required.",
      "admin_required": "Only Administrators may perform this action.",
      "invalid_json": "The request does not contain valid JSON.",
      "specialties_loaded": "Specialties were loaded.",
      "specialties_load_failed": "Specialties could not be loaded.",
      "specialty_name_ro_required": "Enter the Romanian specialty name.",
      "specialty_name_en_required": "Enter the English specialty name.",
      "specialty_slug_invalid": "The specialty slug is invalid.",
      "specialty_slug_check_failed": "The slug could not be checked.",
      "specialty_slug_duplicate": "A specialty with this slug already exists.",
      "specialty_name_check_failed": "The specialty name could not be checked.",
      "specialty_name_duplicate": "A specialty with this name already exists.",
      "specialty_create_failed": "The specialty could not be created.",
      "specialty_translation_create_failed": "The specialty translations could not be saved.",
      "specialty_created": "The specialty was added.",
      "specialty_id_required": "The specialty is missing.",
      "specialty_not_found": "The specialty was not found.",
      "specialty_usage_check_failed": "Specialty usage could not be checked.",
      "specialty_in_use": "The specialty is assigned to doctors and cannot be deactivated.",
      "specialty_update_failed": "The specialty could not be updated.",
      "specialty_translation_update_failed": "The specialty translations could not be updated.",
      "specialty_updated": "The specialty was updated.",
      "specialty_deactivated": "The specialty was deactivated.",
      "cities_loaded": "Cities were loaded.",
      "cities_load_failed": "Cities could not be loaded.",
      "city_name_ro_required": "Enter the Romanian city name.",
      "city_name_en_required": "Enter the English city name.",
      "city_country_code_invalid": "The country code must contain exactly two letters.",
      "city_coordinates_invalid": "The coordinates are invalid.",
      "city_slug_invalid": "The city slug is invalid.",
      "city_slug_check_failed": "The slug could not be checked.",
      "city_slug_duplicate": "A city with this slug already exists.",
      "city_name_check_failed": "The city name could not be checked.",
      "city_name_duplicate": "A city with this name already exists in the selected country.",
      "city_create_failed": "The city could not be created.",
      "city_translation_create_failed": "The city translations could not be saved.",
      "city_created": "The city was added.",
      "city_id_required": "The city is missing.",
      "city_not_found": "The city was not found.",
      "city_usage_check_failed": "City usage could not be checked.",
      "city_in_use": "The city is assigned to clinics and cannot be deactivated.",
      "city_update_failed": "The city could not be updated.",
      "city_translation_update_failed": "The city translations could not be updated.",
      "city_updated": "The city was updated.",
      "city_deactivated": "The city was deactivated.",
      "reviews_loaded": "Reviews were loaded.",
      "reviews_load_failed": "Reviews could not be loaded.",
      "review_id_required": "The review is missing.",
      "review_action_invalid": "The requested action is invalid.",
      "review_reason_required": "Enter the moderation reason.",
      "review_update_failed": "The review could not be updated.",
      "review_restored": "The review was republished.",
      "review_hidden": "The review was hidden.",
      "review_removed": "The review was removed."
    }
  },
  "de": {
    "common": {
      "administration": "Administration",
      "operationalManagement": "Operatives Management",
      "loading": "Wird geladen...",
      "saving": "Wird gespeichert...",
      "updating": "Wird aktualisiert...",
      "optional": "Optional",
      "none": "—",
      "active": "Aktiv",
      "inactive": "Inaktiv",
      "all": "Alle",
      "edit": "Bearbeiten",
      "cancel": "Abbrechen",
      "search": "Suchen",
      "status": "Status",
      "actions": "Aktionen",
      "romanian": "Rumänisch",
      "english": "Englisch",
      "german": "Deutsch",
      "slug": "Slug",
      "icon": "Symbol",
      "total": "Gesamt",
      "details": "Details",
      "showing": "{filtered} von {total} werden angezeigt",
      "yes": "Ja",
      "no": "Nein"
    },
    "pages": {
      "specialties": {
        "title": "Fachrichtungen",
        "description": "Medizinische Fachrichtungen für die RomDoc-Verzeichnisse hinzufügen und verwalten. Rumänische und englische Bezeichnungen sind erforderlich; Deutsch und SEO-Felder sind optional."
      },
      "cities": {
        "adminTitle": "Städte",
        "adminDescription": "Städte für Filter, SEO-Verzeichnisse und Klinikzuordnungen verwalten. Das Erstellen ist Administratoren vorbehalten.",
        "managerTitle": "Städte",
        "managerDescription": "Städte für Filter und Verzeichnisse aktualisieren. Das Erstellen bleibt Administratoren vorbehalten."
      },
      "reviews": {
        "adminTitle": "Bewertungen",
        "adminDescription": "Bewertungen mit unangemessener Sprache, personenbezogenen Angaben, Spam oder Verstößen gegen die Plattformregeln moderieren.",
        "managerTitle": "Bewertungen",
        "managerDescription": "Bewertungen mit unangemessener Sprache, Spam, personenbezogenen Angaben oder anderen Verstößen gegen die RomDoc-Regeln moderieren."
      }
    },
    "specialties": {
      "metrics": {
        "total": "Fachrichtungen",
        "active": "Aktiv",
        "inactive": "Inaktiv",
        "missingGerman": "Ohne Deutsch"
      },
      "form": {
        "newEyebrow": "Neue Fachrichtung",
        "editEyebrow": "Bearbeitung",
        "newTitle": "Fachrichtung hinzufügen",
        "editTitle": "Fachrichtung bearbeiten",
        "description": "Öffentliche Bezeichnungen, Slug und optionale SEO-Metadaten ausfüllen.",
        "cancelEdit": "Bearbeitung abbrechen",
        "nameRo": "Rumänische Bezeichnung",
        "nameEn": "Englische Bezeichnung",
        "nameDe": "Deutsche Bezeichnung",
        "iconPlaceholder": "Beispiel: heart",
        "seoSummary": "SEO-Felder",
        "seoHelp": "Die deutsche Übersetzung und SEO-Felder sind optional. Füllen Sie sie manuell aus, sobald sie verfügbar sind.",
        "metaTitle": "SEO-Titel auf {language}",
        "metaDescription": "SEO-Beschreibung auf {language}",
        "create": "Fachrichtung hinzufügen",
        "save": "Änderungen speichern",
        "saving": "Wird gespeichert...",
        "nameRoRequired": "Rumänische Bezeichnung eingeben.",
        "nameEnRequired": "Englische Bezeichnung eingeben."
      },
      "list": {
        "title": "Liste der Fachrichtungen",
        "count": "{count} Fachrichtungen registriert.",
        "searchLabel": "Fachrichtungen suchen",
        "searchPlaceholder": "Nach Name oder Slug suchen...",
        "statusLabel": "Nach Status filtern",
        "allStatuses": "Alle Fachrichtungen",
        "active": "Aktiv",
        "inactive": "Inaktiv",
        "loading": "Fachrichtungen werden geladen...",
        "empty": "Keine Fachrichtung entspricht den ausgewählten Filtern.",
        "romanian": "Rumänisch",
        "english": "Englisch",
        "german": "Deutsch",
        "doctors": "Ärzte",
        "notTranslated": "Nicht übersetzt",
        "edit": "Bearbeiten",
        "activate": "Aktivieren",
        "deactivate": "Deaktivieren",
        "updating": "Wird aktualisiert...",
        "confirmActivate": "Diese Fachrichtung reaktivieren?",
        "confirmDeactivate": "Diese Fachrichtung deaktivieren?",
        "inUse": "Die Fachrichtung ist Ärzten zugeordnet und kann nicht deaktiviert werden."
      },
      "states": {
        "loadFailed": "Fachrichtungen konnten nicht geladen werden.",
        "saveFailed": "Die Fachrichtung konnte nicht gespeichert werden.",
        "statusFailed": "Der Status konnte nicht aktualisiert werden.",
        "created": "Die Fachrichtung wurde hinzugefügt.",
        "updated": "Die Fachrichtung wurde aktualisiert.",
        "deactivated": "Die Fachrichtung wurde deaktiviert."
      }
    },
    "cities": {
      "metrics": {
        "total": "Städte",
        "active": "Aktiv",
        "inactive": "Inaktiv",
        "coordinates": "Mit Koordinaten"
      },
      "form": {
        "newEyebrow": "Neue Stadt",
        "editEyebrow": "Bearbeitung",
        "newTitle": "Stadt hinzufügen",
        "editTitle": "Stadt bearbeiten",
        "description": "Städte werden in SEO-Verzeichnissen, Filtern und internen RomDoc-Klinikzuordnungen verwendet.",
        "adminOnlyTitle": "Das Erstellen von Städten ist Administratoren vorbehalten",
        "adminOnlyDescription": "Manager dürfen bestehende Städte aktualisieren, aber keine neuen Orte erstellen.",
        "cancelEdit": "Bearbeitung abbrechen",
        "nameRo": "Rumänische Bezeichnung",
        "nameEn": "Englische Bezeichnung",
        "countryCode": "Ländercode",
        "countryHelp": "ISO-Code mit zwei Buchstaben. Für Rumänien RO verwenden.",
        "latitude": "Breitengrad",
        "longitude": "Längengrad",
        "create": "Stadt hinzufügen",
        "save": "Änderungen speichern",
        "saving": "Wird gespeichert...",
        "nameRoRequired": "Rumänischen Stadtnamen eingeben.",
        "nameEnRequired": "Englischen Stadtnamen eingeben.",
        "countryInvalid": "Der Ländercode muss genau zwei Buchstaben enthalten."
      },
      "list": {
        "title": "Städteliste",
        "count": "{count} Städte registriert.",
        "statusLabel": "Nach Status filtern",
        "allStatuses": "Alle Städte",
        "active": "Aktiv",
        "inactive": "Inaktiv",
        "searchLabel": "Städte suchen",
        "searchPlaceholder": "Nach Name, Slug oder Land suchen...",
        "loading": "Städte werden geladen...",
        "empty": "Keine Stadt entspricht den ausgewählten Filtern.",
        "city": "Stadt",
        "english": "Englisch",
        "country": "Land",
        "coordinates": "Koordinaten",
        "clinics": "Kliniken",
        "edit": "Bearbeiten",
        "activate": "Aktivieren",
        "deactivate": "Deaktivieren",
        "updating": "Wird aktualisiert...",
        "confirmActivate": "Diese Stadt reaktivieren?",
        "confirmDeactivate": "Diese Stadt deaktivieren?",
        "inUse": "Die Stadt ist Kliniken zugeordnet und kann nicht deaktiviert werden.",
        "latitudeShort": "Breite",
        "longitudeShort": "Länge"
      },
      "states": {
        "loadFailed": "Städte konnten nicht geladen werden.",
        "saveFailed": "Die Stadt konnte nicht gespeichert werden.",
        "statusFailed": "Der Stadtstatus konnte nicht aktualisiert werden.",
        "created": "Die Stadt wurde hinzugefügt.",
        "updated": "Die Stadt wurde aktualisiert.",
        "deactivated": "Die Stadt wurde deaktiviert."
      }
    },
    "reviews": {
      "metrics": {
        "published": "Veröffentlicht",
        "hidden": "Ausgeblendet",
        "removed": "Entfernt",
        "total": "Gesamt"
      },
      "filters": {
        "published": "Veröffentlicht",
        "hidden": "Ausgeblendet",
        "removed": "Entfernt",
        "searchLabel": "Bewertungen suchen",
        "searchPlaceholder": "Patient, Arzt oder Bewertungstext..."
      },
      "labels": {
        "forDoctor": "Für {doctor}",
        "date": "Veröffentlicht am {date}",
        "rating": "Bewertung",
        "comment": "Kommentar",
        "moderationReason": "Moderationsgrund",
        "noComment": "Kein Kommentar.",
        "doctorUnavailable": "Arzt nicht verfügbar",
        "statusPublished": "Veröffentlicht",
        "statusHidden": "Ausgeblendet",
        "statusRemoved": "Entfernt"
      },
      "actions": {
        "hide": "Ausblenden",
        "remove": "Entfernen",
        "restore": "Erneut veröffentlichen",
        "processing": "Wird aktualisiert..."
      },
      "prompts": {
        "hide": "Grund für das Ausblenden der Bewertung:",
        "remove": "Grund für das Entfernen der Bewertung:"
      },
      "confirmations": {
        "restore": "Diese Bewertung erneut veröffentlichen?"
      },
      "states": {
        "loading": "Bewertungen werden geladen...",
        "empty": "In dieser Kategorie gibt es keine Bewertungen.",
        "noSearchResults": "Keine Bewertung entspricht der Suche.",
        "loadFailed": "Bewertungen konnten nicht geladen werden.",
        "updateFailed": "Die Bewertung konnte nicht aktualisiert werden.",
        "updated": "Die Bewertung wurde aktualisiert."
      }
    },
    "api": {
      "authentication_required": "Sie müssen angemeldet sein.",
      "access_denied": "Sie haben nicht die erforderliche Berechtigung.",
      "mfa_required": "Eine Google-Authenticator-Prüfung ist erforderlich.",
      "admin_required": "Nur Administratoren dürfen diese Aktion ausführen.",
      "invalid_json": "Die Anfrage enthält kein gültiges JSON.",
      "specialties_loaded": "Fachrichtungen wurden geladen.",
      "specialties_load_failed": "Fachrichtungen konnten nicht geladen werden.",
      "specialty_name_ro_required": "Rumänische Bezeichnung der Fachrichtung eingeben.",
      "specialty_name_en_required": "Englische Bezeichnung der Fachrichtung eingeben.",
      "specialty_slug_invalid": "Der Slug der Fachrichtung ist ungültig.",
      "specialty_slug_check_failed": "Der Slug konnte nicht geprüft werden.",
      "specialty_slug_duplicate": "Eine Fachrichtung mit diesem Slug existiert bereits.",
      "specialty_name_check_failed": "Die Bezeichnung der Fachrichtung konnte nicht geprüft werden.",
      "specialty_name_duplicate": "Eine Fachrichtung mit dieser Bezeichnung existiert bereits.",
      "specialty_create_failed": "Die Fachrichtung konnte nicht erstellt werden.",
      "specialty_translation_create_failed": "Die Übersetzungen der Fachrichtung konnten nicht gespeichert werden.",
      "specialty_created": "Die Fachrichtung wurde hinzugefügt.",
      "specialty_id_required": "Die Fachrichtung fehlt.",
      "specialty_not_found": "Die Fachrichtung wurde nicht gefunden.",
      "specialty_usage_check_failed": "Die Verwendung der Fachrichtung konnte nicht geprüft werden.",
      "specialty_in_use": "Die Fachrichtung ist Ärzten zugeordnet und kann nicht deaktiviert werden.",
      "specialty_update_failed": "Die Fachrichtung konnte nicht aktualisiert werden.",
      "specialty_translation_update_failed": "Die Übersetzungen der Fachrichtung konnten nicht aktualisiert werden.",
      "specialty_updated": "Die Fachrichtung wurde aktualisiert.",
      "specialty_deactivated": "Die Fachrichtung wurde deaktiviert.",
      "cities_loaded": "Städte wurden geladen.",
      "cities_load_failed": "Städte konnten nicht geladen werden.",
      "city_name_ro_required": "Rumänischen Stadtnamen eingeben.",
      "city_name_en_required": "Englischen Stadtnamen eingeben.",
      "city_country_code_invalid": "Der Ländercode muss genau zwei Buchstaben enthalten.",
      "city_coordinates_invalid": "Die Koordinaten sind ungültig.",
      "city_slug_invalid": "Der Stadt-Slug ist ungültig.",
      "city_slug_check_failed": "Der Slug konnte nicht geprüft werden.",
      "city_slug_duplicate": "Eine Stadt mit diesem Slug existiert bereits.",
      "city_name_check_failed": "Der Stadtname konnte nicht geprüft werden.",
      "city_name_duplicate": "Eine Stadt mit diesem Namen existiert bereits im ausgewählten Land.",
      "city_create_failed": "Die Stadt konnte nicht erstellt werden.",
      "city_translation_create_failed": "Die Stadtübersetzungen konnten nicht gespeichert werden.",
      "city_created": "Die Stadt wurde hinzugefügt.",
      "city_id_required": "Die Stadt fehlt.",
      "city_not_found": "Die Stadt wurde nicht gefunden.",
      "city_usage_check_failed": "Die Verwendung der Stadt konnte nicht geprüft werden.",
      "city_in_use": "Die Stadt ist Kliniken zugeordnet und kann nicht deaktiviert werden.",
      "city_update_failed": "Die Stadt konnte nicht aktualisiert werden.",
      "city_translation_update_failed": "Die Stadtübersetzungen konnten nicht aktualisiert werden.",
      "city_updated": "Die Stadt wurde aktualisiert.",
      "city_deactivated": "Die Stadt wurde deaktiviert.",
      "reviews_loaded": "Bewertungen wurden geladen.",
      "reviews_load_failed": "Bewertungen konnten nicht geladen werden.",
      "review_id_required": "Die Bewertung fehlt.",
      "review_action_invalid": "Die angeforderte Aktion ist ungültig.",
      "review_reason_required": "Moderationsgrund eingeben.",
      "review_update_failed": "Die Bewertung konnte nicht aktualisiert werden.",
      "review_restored": "Die Bewertung wurde erneut veröffentlicht.",
      "review_hidden": "Die Bewertung wurde ausgeblendet.",
      "review_removed": "Die Bewertung wurde entfernt."
    }
  }
} as const;

export function getPlatformOperatorDirectory(locale: AppLocale) {
  return platformOperatorDirectoryMessages[locale];
}

export function interpolatePlatformDirectoryCopy(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getPlatformDirectoryApiMessage(
  locale: AppLocale,
  code: string | null | undefined,
  fallback: string
) {
  if (!code) return fallback;

  const messages = platformOperatorDirectoryMessages[locale].api as Record<
    string,
    string
  >;

  return messages[code] ?? fallback;
}
