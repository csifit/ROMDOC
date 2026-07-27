import type { AppLocale } from "@/lib/i18n/app-locale";

export type ContractClientType =
  | "independent_doctor"
  | "clinic_organization";

export type ContractAcceptanceCopy = {
  checkboxText: string;
  representativeCapacity: Record<string, string>;
};

const COPY: Record<
  AppLocale,
  Record<ContractClientType, ContractAcceptanceCopy>
> = {
  ro: {
    independent_doctor: {
      checkboxText:
        "Am citit și accept Contractul de furnizare a serviciilor RomDoc și toate anexele indicate în pachetul contractual, inclusiv condițiile de tarifare și termenul de plată. Confirm că informațiile profesionale și de facturare sunt corecte și că am dreptul de a angaja contractual entitatea profesională indicată.",
      representativeCapacity: {
        srl: "Reprezentant autorizat al societății",
        pfa: "Titular PFA",
        ii: "Titular întreprindere individuală",
        cabinet_medical: "Medic titular al cabinetului medical",
        individual: "Medic titular",
        other: "Reprezentant autorizat",
      },
    },
    clinic_organization: {
      checkboxText:
        "Am citit și accept, în numele Organizației de clinică pe care o reprezint, Contractul de furnizare a serviciilor RomDoc și toate anexele indicate în pachetul contractual, inclusiv condițiile de tarifare și termenul de plată. Declar că informațiile organizației sunt corecte și că am autoritatea necesară pentru a angaja contractual Organizația de clinică indicată.",
      representativeCapacity: {
        owner: "Proprietar / reprezentant autorizat",
        manager: "Manager autorizat",
        billing_manager: "Manager de facturare autorizat",
      },
    },
  },
  en: {
    independent_doctor: {
      checkboxText:
        "I have read and accept the RomDoc Services Agreement and all annexes identified in the contract package, including the pricing terms and payment deadline. I confirm that the professional and billing information is correct and that I am authorised to bind the stated professional entity.",
      representativeCapacity: {
        srl: "Authorised company representative",
        pfa: "Sole trader",
        ii: "Individual enterprise owner",
        cabinet_medical: "Medical practice owner",
        individual: "Doctor acting personally",
        other: "Authorised representative",
      },
    },
    clinic_organization: {
      checkboxText:
        "I have read and accept, on behalf of the Clinic Organisation I represent, the RomDoc Services Agreement and all annexes identified in the contract package, including the pricing terms and payment deadline. I confirm that the organisation information is correct and that I have authority to bind the stated Clinic Organisation.",
      representativeCapacity: {
        owner: "Owner / authorised representative",
        manager: "Authorised manager",
        billing_manager: "Authorised billing manager",
      },
    },
  },
  de: {
    independent_doctor: {
      checkboxText:
        "Ich habe den RomDoc-Dienstleistungsvertrag und alle im Vertragspaket bezeichneten Anlagen einschließlich der Preisbedingungen und Zahlungsfrist gelesen und akzeptiere sie. Ich bestätige, dass die Berufs- und Rechnungsdaten richtig sind und dass ich berechtigt bin, die angegebene berufliche Einheit vertraglich zu verpflichten.",
      representativeCapacity: {
        srl: "Bevollmächtigte Unternehmensvertretung",
        pfa: "Inhaber des Einzelunternehmens",
        ii: "Inhaber des Einzelbetriebs",
        cabinet_medical: "Inhaber der Arztpraxis",
        individual: "Arzt in eigenem Namen",
        other: "Bevollmächtigte Vertretung",
      },
    },
    clinic_organization: {
      checkboxText:
        "Ich habe im Namen der von mir vertretenen Klinikorganisation den RomDoc-Dienstleistungsvertrag und alle im Vertragspaket bezeichneten Anlagen einschließlich der Preisbedingungen und Zahlungsfrist gelesen und akzeptiere sie. Ich bestätige, dass die Organisationsdaten richtig sind und dass ich berechtigt bin, die angegebene Klinikorganisation vertraglich zu verpflichten.",
      representativeCapacity: {
        owner: "Inhaber / bevollmächtigte Vertretung",
        manager: "Bevollmächtigter Manager",
        billing_manager: "Bevollmächtigter Abrechnungsmanager",
      },
    },
  },
};

export function getContractAcceptanceCopy(
  locale: AppLocale,
  clientType: ContractClientType
) {
  return COPY[locale][clientType];
}

export function getContractAcceptanceCheckboxText(
  locale: AppLocale,
  clientType: ContractClientType
) {
  return getContractAcceptanceCopy(locale, clientType).checkboxText;
}

export function getContractRepresentativeCapacity(
  locale: AppLocale,
  clientType: ContractClientType,
  roleOrEntityType: string | null | undefined
) {
  const copy = getContractAcceptanceCopy(locale, clientType);
  const key = roleOrEntityType?.trim() ?? "";

  return (
    copy.representativeCapacity[key] ??
    (clientType === "independent_doctor"
      ? copy.representativeCapacity.other
      : copy.representativeCapacity.manager)
  );
}
