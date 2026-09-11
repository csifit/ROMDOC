"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type RoleKey =
  | "admin"
  | "accountingManager"
  | "manager"
  | "clinicOrganisation"
  | "clinicDoctor"
  | "independentDoctor"
  | "patient"
  | "doctorStaff";

type CapabilityKey =
  | "capabilityAdministration"
  | "managerAdministration"
  | "userAdministration"
  | "usageAccounting"
  | "doctorAdministration"
  | "professionalVerification"
  | "clinicAdministration"
  | "clinicOrganisationAdministration"
  | "contentModeration"
  | "appointmentSupport"
  | "contractAdministration"
  | "privacyContent"
  | "platformSettings"
  | "telehealthRestrictions"
  | "appointments"
  | "professionalProfile"
  | "organisationBilling"
  | "medicalFolder";

type Scope =
  | "platform"
  | "organisation"
  | "own"
  | "doctor"
  | "denied";

type MatrixCell = {
  scope: Scope;
  locked: boolean;
};

type CapabilityRow = {
  key: CapabilityKey;
  group: "platform" | "operational" | "personal";
  defaults: Record<RoleKey, MatrixCell>;
};

type PendingChange = {
  id: string;
  capability: CapabilityKey;
  role: RoleKey;
  previousScope: Scope;
  nextScope: Scope;
  changedAt: Date;
};

const ROLES: RoleKey[] = [
  "admin",
  "accountingManager",
  "manager",
  "clinicOrganisation",
  "clinicDoctor",
  "independentDoctor",
  "patient",
  "doctorStaff",
];

function cell(
  scope: Scope,
  locked = true
): MatrixCell {
  return {
    scope,
    locked,
  };
}

const MATRIX: CapabilityRow[] = [
  {
    key: "capabilityAdministration",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "managerAdministration",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "userAdministration",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "usageAccounting",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("denied", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("own"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "doctorAdministration",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "professionalVerification",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "clinicAdministration",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("own"),
      patient: cell("denied"),
      doctorStaff: cell("doctor"),
    },
  },
  {
    key: "clinicOrganisationAdministration",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "contentModeration",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "appointmentSupport",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("platform", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("own"),
      independentDoctor: cell("own"),
      patient: cell("own"),
      doctorStaff: cell("doctor"),
    },
  },
  {
    key: "contractAdministration",
    group: "operational",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("platform", false),
      manager: cell("denied", false),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("own"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "privacyContent",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied", false),
      manager: cell("denied", false),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "platformSettings",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "telehealthRestrictions",
    group: "platform",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("denied"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "appointments",
    group: "personal",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("own"),
      independentDoctor: cell("own"),
      patient: cell("own"),
      doctorStaff: cell("doctor"),
    },
  },
  {
    key: "professionalProfile",
    group: "personal",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("own"),
      independentDoctor: cell("own"),
      patient: cell("own"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "organisationBilling",
    group: "personal",
    defaults: {
      admin: cell("platform"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("organisation"),
      clinicDoctor: cell("denied"),
      independentDoctor: cell("own"),
      patient: cell("denied"),
      doctorStaff: cell("denied"),
    },
  },
  {
    key: "medicalFolder",
    group: "personal",
    defaults: {
      admin: cell("denied"),
      accountingManager: cell("denied"),
      manager: cell("denied"),
      clinicOrganisation: cell("denied"),
      clinicDoctor: cell("own"),
      independentDoctor: cell("own"),
      patient: cell("own"),
      doctorStaff: cell("doctor"),
    },
  },
];

const COPY = {
  ro: {
    eyebrow: "Administrare acces",
    title: "Matrice de capabilități",
    description:
      "Simulare vizuală a accesului implicit pe roluri și domenii. Doar Administratorii pot modifica celulele configurabile.",
    simulation: "SIMULARE",
    simulationNotice:
      "Această pagină nu salvează nimic. Modificările se pierd la reîncărcare și nu afectează utilizatorii sau baza de date.",
    capability: "Capabilitate platformă",
    legend: "Legendă",
    platform: "Platformă",
    organisation: "Organizație",
    own: "Propriu",
    doctor: "Pentru medic",
    denied: "Interzis",
    locked: "Regulă fixă",
    configurable: "Configurabil",
    groups: {
      platform: "Guvernanță platformă",
      operational: "Operațiuni și suport",
      personal: "Acces în limita proprietății",
    },
    roles: {
      admin: "Administrator",
      accountingManager: "Manager cu contabilitate",
      manager: "Manager",
      clinicOrganisation: "Organizație clinică",
      clinicDoctor: "Medic al clinicii",
      independentDoctor: "Medic independent",
      patient: "Pacient",
      doctorStaff: "Personal medical",
    },
    roleNotes: {
      admin: "Acces complet, blocat",
      accountingManager: "Manager + vizualizare contabilă",
      manager: "Capabilități delegate",
      clinicOrganisation: "Limitat la organizație",
      clinicDoctor: "Limitat la activitatea proprie",
      independentDoctor: "Limitat la practica proprie",
      patient: "Limitat la propriul cont",
      doctorStaff: "Delegat de medic",
    },
    capabilities: {
      capabilityAdministration: "Modifică matricea de capabilități",
      managerAdministration: "Administrează Administratorii și Managerii",
      userAdministration: "Administrează conturile utilizatorilor",
      usageAccounting: "Vizualizează utilizarea și informațiile contabile",
      doctorAdministration: "Administrează conturile medicilor",
      professionalVerification: "Procesează verificarea profesională",
      clinicAdministration: "Administrează clinicile",
      clinicOrganisationAdministration: "Administrează organizațiile de clinică",
      contentModeration: "Moderează recenzii și conținut",
      appointmentSupport: "Oferă suport pentru programări",
      contractAdministration: "Administrează contractele",
      privacyContent: "Editează conținutul juridic și de confidențialitate",
      platformSettings: "Administrează setările platformei și AI",
      telehealthRestrictions: "Restricționează telemedicina pentru un medic",
      appointments: "Gestionează programările",
      professionalProfile: "Gestionează profilul profesional/personal",
      organisationBilling: "Vizualizează abonamentul și facturarea proprie",
      medicalFolder: "Accesează dosarul medical autorizat",
    },
    pendingTitle: "Previzualizare audit",
    pendingDescription:
      "În versiunea reală, fiecare modificare ar fi salvată cu Administratorul, ora, valoarea anterioară, valoarea nouă și motivul.",
    noChanges: "Nu există modificări în simulare.",
    changedBy: "Modificat de",
    sampleAdmin: "Administrator curent",
    from: "De la",
    to: "la",
    reason: "Motivul modificării",
    reasonPlaceholder: "Ex.: responsabilități operaționale actualizate",
    reset: "Resetează simularea",
    review: "Vezi modificările",
    pendingCount: "modificări nesalvate",
    lockedHelp:
      "Celulele blocate protejează limitele de securitate, proprietate și organizație.",
    editableHelp:
      "Comutatoarele sunt doar demonstrative. Într-o implementare reală, numai Administratorii le-ar putea salva.",
    allowedLabel: "Permite {scope}",
    deniedLabel: "Interzice accesul",
  },
  en: {
    eyebrow: "Access administration",
    title: "Capability matrix",
    description:
      "A visual simulation of default access by role and scope. Only Administrators can modify configurable cells.",
    simulation: "SIMULATION",
    simulationNotice:
      "This page saves nothing. Changes reset on refresh and do not affect users or the database.",
    capability: "Platform capability",
    legend: "Legend",
    platform: "Platform",
    organisation: "Organisation",
    own: "Own",
    doctor: "For doctor",
    denied: "Denied",
    locked: "Fixed rule",
    configurable: "Configurable",
    groups: {
      platform: "Platform governance",
      operational: "Operations and support",
      personal: "Ownership-scoped access",
    },
    roles: {
      admin: "Administrator",
      accountingManager: "Manager with accounting",
      manager: "Manager",
      clinicOrganisation: "Clinic organisation",
      clinicDoctor: "Clinic doctor",
      independentDoctor: "Independent doctor",
      patient: "Patient",
      doctorStaff: "Doctor staff",
    },
    roleNotes: {
      admin: "Full access, locked",
      accountingManager: "Manager + accounting view",
      manager: "Delegated capabilities",
      clinicOrganisation: "Organisation-scoped",
      clinicDoctor: "Own clinical work",
      independentDoctor: "Own practice",
      patient: "Own account only",
      doctorStaff: "Delegated by doctor",
    },
    capabilities: {
      capabilityAdministration: "Change the capability matrix",
      managerAdministration: "Manage Administrators and Managers",
      userAdministration: "Manage user accounts",
      usageAccounting: "View usage and accounting information",
      doctorAdministration: "Manage doctor accounts",
      professionalVerification: "Process professional verification",
      clinicAdministration: "Manage clinics",
      clinicOrganisationAdministration: "Manage clinic organisations",
      contentModeration: "Moderate reviews and content",
      appointmentSupport: "Provide appointment support",
      contractAdministration: "Manage contracts",
      privacyContent: "Edit legal and privacy content",
      platformSettings: "Manage platform and AI settings",
      telehealthRestrictions: "Restrict telehealth for a Doctor",
      appointments: "Manage appointments",
      professionalProfile: "Manage professional/personal profile",
      organisationBilling: "View own subscription and billing",
      medicalFolder: "Access an authorised medical folder",
    },
    pendingTitle: "Audit preview",
    pendingDescription:
      "In the real version, every change would record the Administrator, time, previous value, new value and reason.",
    noChanges: "There are no simulated changes.",
    changedBy: "Changed by",
    sampleAdmin: "Current Administrator",
    from: "From",
    to: "to",
    reason: "Reason for change",
    reasonPlaceholder: "Example: updated operational responsibilities",
    reset: "Reset simulation",
    review: "Review changes",
    pendingCount: "unsaved changes",
    lockedHelp:
      "Locked cells preserve security, ownership and organisation boundaries.",
    editableHelp:
      "Switches are demonstrative only. In a real implementation, only Administrators could save them.",
    allowedLabel: "Allow {scope}",
    deniedLabel: "Deny access",
  },
  de: {
    eyebrow: "Zugriffsverwaltung",
    title: "Berechtigungsmatrix",
    description:
      "Eine visuelle Simulation des Standardzugriffs nach Rolle und Umfang. Nur Administratoren können konfigurierbare Zellen ändern.",
    simulation: "SIMULATION",
    simulationNotice:
      "Diese Seite speichert nichts. Änderungen werden beim Neuladen zurückgesetzt und wirken sich weder auf Benutzer noch auf die Datenbank aus.",
    capability: "Plattformberechtigung",
    legend: "Legende",
    platform: "Plattform",
    organisation: "Organisation",
    own: "Eigene",
    doctor: "Für Arzt",
    denied: "Verweigert",
    locked: "Feste Regel",
    configurable: "Konfigurierbar",
    groups: {
      platform: "Plattform-Governance",
      operational: "Betrieb und Support",
      personal: "Eigentumsgebundener Zugriff",
    },
    roles: {
      admin: "Administrator",
      accountingManager: "Manager mit Buchhaltung",
      manager: "Manager",
      clinicOrganisation: "Klinikorganisation",
      clinicDoctor: "Klinikarzt",
      independentDoctor: "Unabhängiger Arzt",
      patient: "Patient",
      doctorStaff: "Arztpersonal",
    },
    roleNotes: {
      admin: "Vollzugriff, gesperrt",
      accountingManager: "Manager + Buchhaltungsansicht",
      manager: "Delegierte Berechtigungen",
      clinicOrganisation: "Auf Organisation begrenzt",
      clinicDoctor: "Eigene klinische Arbeit",
      independentDoctor: "Eigene Praxis",
      patient: "Nur eigenes Konto",
      doctorStaff: "Vom Arzt delegiert",
    },
    capabilities: {
      capabilityAdministration: "Berechtigungsmatrix ändern",
      managerAdministration: "Administratoren und Manager verwalten",
      userAdministration: "Benutzerkonten verwalten",
      usageAccounting: "Nutzung und Buchhaltungsinformationen anzeigen",
      doctorAdministration: "Arztkonten verwalten",
      professionalVerification: "Berufliche Verifizierung bearbeiten",
      clinicAdministration: "Kliniken verwalten",
      clinicOrganisationAdministration: "Klinikorganisationen verwalten",
      contentModeration: "Bewertungen und Inhalte moderieren",
      appointmentSupport: "Support für Termine leisten",
      contractAdministration: "Verträge verwalten",
      privacyContent: "Rechts- und Datenschutzinhalte bearbeiten",
      platformSettings: "Plattform- und KI-Einstellungen verwalten",
      telehealthRestrictions: "Telemedizin für einen Arzt einschränken",
      appointments: "Termine verwalten",
      professionalProfile: "Berufliches/persönliches Profil verwalten",
      organisationBilling: "Eigenes Abonnement und Abrechnung anzeigen",
      medicalFolder: "Autorisierte Patientenakte aufrufen",
    },
    pendingTitle: "Audit-Vorschau",
    pendingDescription:
      "In der realen Version würde jede Änderung Administrator, Zeitpunkt, alten Wert, neuen Wert und Begründung protokollieren.",
    noChanges: "Es gibt keine simulierten Änderungen.",
    changedBy: "Geändert von",
    sampleAdmin: "Aktueller Administrator",
    from: "Von",
    to: "zu",
    reason: "Begründung der Änderung",
    reasonPlaceholder: "Beispiel: aktualisierte operative Zuständigkeiten",
    reset: "Simulation zurücksetzen",
    review: "Änderungen prüfen",
    pendingCount: "ungespeicherte Änderungen",
    lockedHelp:
      "Gesperrte Zellen schützen Sicherheits-, Eigentums- und Organisationsgrenzen.",
    editableHelp:
      "Schalter dienen nur zur Demonstration. In einer realen Umsetzung könnten nur Administratoren sie speichern.",
    allowedLabel: "{scope} erlauben",
    deniedLabel: "Zugriff verweigern",
  },
} as const;

function scopeClasses(
  scope: Scope
) {
  switch (scope) {
    case "platform":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "organisation":
      return "bg-sky-100 text-sky-800 ring-sky-200";
    case "own":
      return "bg-violet-100 text-violet-800 ring-violet-200";
    case "doctor":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "denied":
      return "bg-gray-100 text-gray-500 ring-gray-200";
  }
}

function ScopeDot({
  scope,
}: {
  scope: Scope;
}) {
  if (
    scope === "denied"
  ) {
    return (
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="10" cy="10" r="7" />
        <path d="m5 5 10 10" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 10 4 4 8-9"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="8" width="12" height="9" rx="2" />
      <path d="M7 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function CapabilityMatrixSimulation({
  locale,
}: {
  locale: AppLocale;
}) {
  const copy =
    COPY[
      locale
    ];

  const [overrides, setOverrides] =
    useState<Record<string, Scope>>({});

  const [changes, setChanges] =
    useState<PendingChange[]>([]);

  const [reason, setReason] =
    useState("");

  const auditRef =
    useRef<HTMLElement>(null);

  const dateLocale =
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-GB";

  const scopeLabels: Record<Scope, string> = {
    platform: copy.platform,
    organisation: copy.organisation,
    own: copy.own,
    doctor: copy.doctor,
    denied: copy.denied,
  };

  const groupedRows =
    useMemo(
      () =>
        ([
          "platform",
          "operational",
          "personal",
        ] as const).map(
          (
            group
          ) => ({
            group,
            rows: MATRIX.filter(
              (
                row
              ) =>
                row.group ===
                group
            ),
          })
        ),
      []
    );

  function cellId(
    capability: CapabilityKey,
    role: RoleKey
  ) {
    return `${capability}:${role}`;
  }

  function getScope(
    row: CapabilityRow,
    role: RoleKey
  ) {
    return (
      overrides[
        cellId(
          row.key,
          role
        )
      ] ??
      row.defaults[
        role
      ].scope
    );
  }

  function toggleCell(
    row: CapabilityRow,
    role: RoleKey
  ) {
    const definition =
      row.defaults[
        role
      ];

    if (
      definition.locked
    ) {
      return;
    }

    const id =
      cellId(
        row.key,
        role
      );

    const currentScope =
      getScope(
        row,
        role
      );

    const allowedScope =
      definition.scope ===
      "denied"
        ? "platform"
        : definition.scope;

    const nextScope =
      currentScope ===
      "denied"
        ? allowedScope
        : "denied";

    setOverrides(
      (
        current
      ) => ({
        ...current,
        [id]: nextScope,
      })
    );

    setChanges(
      (
        current
      ) => {
        const withoutCell =
          current.filter(
            (
              change
            ) =>
              change.id !==
              id
          );

        if (
          nextScope ===
          definition.scope
        ) {
          return withoutCell;
        }

        return [
          ...withoutCell,
          {
            id,
            capability:
              row.key,
            role,
            previousScope:
              definition.scope,
            nextScope,
            changedAt:
              new Date(),
          },
        ];
      }
    );
  }

  function resetSimulation() {
    setOverrides({});
    setChanges([]);
    setReason("");
  }

  return (
    <div className="space-y-7 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {
                copy.eyebrow
              }
            </p>

            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] text-amber-900 ring-1 ring-inset ring-amber-200">
              {
                copy.simulation
              }
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            {
              copy.title
            }
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {
              copy.description
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {changes.length >
            0 && (
            <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
              {changes.length}{" "}
              {
                copy.pendingCount
              }
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              auditRef.current?.scrollIntoView({
                behavior:
                  "smooth",
                block:
                  "start",
              })
            }
            className="romdoc-button romdoc-button-primary romdoc-button-sm"
          >
            {
              copy.review
            }
          </button>
        </div>
      </header>

      <section
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-950"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 10v6M12 7h.01" />
        </svg>

        <p className="text-sm leading-6">
          {
            copy.simulationNotice
          }
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-950">
              {
                copy.legend
              }
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  "platform",
                  "organisation",
                  "own",
                  "doctor",
                  "denied",
                ] as Scope[]
              ).map(
                (
                  scope
                ) => (
                  <span
                    key={
                      scope
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${scopeClasses(
                      scope
                    )}`}
                  >
                    <ScopeDot
                      scope={
                        scope
                      }
                    />
                    {
                      scopeLabels[
                        scope
                      ]
                    }
                  </span>
                )
              )}
            </div>
          </div>

          <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2 xl:max-w-2xl">
            <p className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 leading-5">
              <span className="mt-0.5 text-gray-400">
                <LockIcon />
              </span>
              {
                copy.lockedHelp
              }
            </p>

            <p className="rounded-xl bg-[#036661]/5 p-3 leading-5 text-[#024f4b]">
              {
                copy.editableHelp
              }
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1240px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/90">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-64 min-w-64 border-r border-gray-200 bg-gray-50 px-4 py-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500"
                >
                  {
                    copy.capability
                  }
                </th>

                {ROLES.map(
                  (
                    role
                  ) => (
                    <th
                      key={
                        role
                      }
                      scope="col"
                      className="min-w-32 px-3 py-4 text-center align-top"
                    >
                      <span className="block text-xs font-bold leading-4 text-gray-900">
                        {
                          copy.roles[
                            role
                          ]
                        }
                      </span>

                      <span className="mt-1.5 block text-[10px] font-medium leading-4 text-gray-500">
                        {
                          copy.roleNotes[
                            role
                          ]
                        }
                      </span>
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {groupedRows.map(
                (
                  section
                ) => (
                  <FragmentRows
                    key={
                      section.group
                    }
                    groupLabel={
                      copy.groups[
                        section.group
                      ]
                    }
                    rows={
                      section.rows
                    }
                    roles={
                      ROLES
                    }
                    capabilityLabels={
                      copy.capabilities
                    }
                    scopeLabels={
                      scopeLabels
                    }
                    allowedLabel={
                      copy.allowedLabel
                    }
                    deniedLabel={
                      copy.deniedLabel
                    }
                    getScope={
                      getScope
                    }
                    onToggle={
                      toggleCell
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        ref={
          auditRef
        }
        className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              {
                copy.pendingTitle
              }
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {
                copy.pendingDescription
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              resetSimulation
            }
            disabled={
              changes.length ===
              0
            }
            className="romdoc-button romdoc-button-secondary romdoc-button-sm shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {
              copy.reset
            }
          </button>
        </div>

        <label className="mt-5 block max-w-2xl">
          <span className="text-sm font-semibold text-gray-800">
            {
              copy.reason
            }
          </span>

          <input
            value={
              reason
            }
            onChange={(
              event
            ) =>
              setReason(
                event.target.value
              )
            }
            placeholder={
              copy.reasonPlaceholder
            }
            className="romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </label>

        {changes.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {
              copy.noChanges
            }
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
            {changes.map(
              (
                change
              ) => (
                <div
                  key={
                    change.id
                  }
                  className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-950">
                      {
                        copy.capabilities[
                          change.capability
                        ]
                      }
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {
                        copy.roles[
                          change.role
                        ]
                      }
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-2.5 py-1 ring-1 ring-inset ${scopeClasses(
                      change.previousScope
                    )}`}>
                      {
                        scopeLabels[
                          change.previousScope
                        ]
                      }
                    </span>

                    <span className="text-gray-400">
                      →
                    </span>

                    <span className={`rounded-full px-2.5 py-1 ring-1 ring-inset ${scopeClasses(
                      change.nextScope
                    )}`}>
                      {
                        scopeLabels[
                          change.nextScope
                        ]
                      }
                    </span>
                  </div>

                  <div className="text-xs leading-5 text-gray-500 lg:text-right">
                    <p>
                      {
                        copy.changedBy
                      }:{" "}
                      <span className="font-semibold text-gray-700">
                        {
                          copy.sampleAdmin
                        }
                      </span>
                    </p>

                    <p>
                      {new Intl.DateTimeFormat(
                        dateLocale,
                        {
                          dateStyle:
                            "medium",
                          timeStyle:
                            "short",
                        }
                      ).format(
                        change.changedAt
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FragmentRows({
  groupLabel,
  rows,
  roles,
  capabilityLabels,
  scopeLabels,
  allowedLabel,
  deniedLabel,
  getScope,
  onToggle,
}: {
  groupLabel: string;
  rows: CapabilityRow[];
  roles: RoleKey[];
  capabilityLabels: Record<CapabilityKey, string>;
  scopeLabels: Record<Scope, string>;
  allowedLabel: string;
  deniedLabel: string;
  getScope: (
    row: CapabilityRow,
    role: RoleKey
  ) => Scope;
  onToggle: (
    row: CapabilityRow,
    role: RoleKey
  ) => void;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={
            roles.length +
            1
          }
          className="border-y border-gray-200 bg-[#036661]/5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#036661]"
        >
          {
            groupLabel
          }
        </th>
      </tr>

      {rows.map(
        (
          row
        ) => (
          <tr
            key={
              row.key
            }
            className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60"
          >
            <th
              scope="row"
              className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold leading-5 text-gray-900"
            >
              {
                capabilityLabels[
                  row.key
                ]
              }
            </th>

            {roles.map(
              (
                role
              ) => {
                const definition =
                  row.defaults[
                    role
                  ];

                const scope =
                  getScope(
                    row,
                    role
                  );

                const enabled =
                  scope !==
                  "denied";

                const ariaLabel =
                  enabled
                    ? allowedLabel.replace(
                        "{scope}",
                        scopeLabels[
                          scope
                        ]
                      )
                    : deniedLabel;

                return (
                  <td
                    key={
                      role
                    }
                    className="px-2 py-3 text-center"
                  >
                    {definition.locked ? (
                      <span
                        title={
                          scopeLabels[
                            scope
                          ]
                        }
                        className={`mx-auto inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset ${scopeClasses(
                          scope
                        )}`}
                      >
                        <ScopeDot
                          scope={
                            scope
                          }
                        />
                        {
                          scopeLabels[
                            scope
                          ]
                        }
                        <span className="opacity-60">
                          <LockIcon />
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={
                          enabled
                        }
                        aria-label={
                          ariaLabel
                        }
                        title={
                          scopeLabels[
                            scope
                          ]
                        }
                        onClick={() =>
                          onToggle(
                            row,
                            role
                          )
                        }
                        className={`romdoc-focus-ring relative mx-auto flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${
                          enabled
                            ? "bg-[#07966f]"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                            enabled
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                  </td>
                );
              }
            )}
          </tr>
        )
      )}
    </>
  );
}
