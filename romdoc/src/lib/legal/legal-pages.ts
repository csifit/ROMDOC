export const LEGAL_PAGE_KEYS = [
  "terms",
  "privacy",
  "cookies",
  "legal_information",
] as const;

export type LegalPageKey =
  (typeof LEGAL_PAGE_KEYS)[number];

export type LegalPageDefinition = {
  key: LegalPageKey;
  title: string;
  route: string;
  eyebrow: string;
  description: string;
  notice: string;
  defaultContent: string;
  fallbackUpdatedAt: string;
};

export type LegalContentBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

export type ParsedLegalSection = {
  id: string;
  title: string;
  blocks: LegalContentBlock[];
};

const FALLBACK_UPDATED_AT =
  "2026-06-22T00:00:00.000Z";

export const LEGAL_PAGE_DEFINITIONS: Record<
  LegalPageKey,
  LegalPageDefinition
> = {
  terms: {
    key: "terms",
    title: "Termeni și condiții",
    route: "/termeni-si-conditii",
    eyebrow: "Document legal",
    description:
      "Această pagină prezintă regulile generale pentru accesarea și utilizarea platformei RomDoc.",
    notice:
      "Vă rugăm, să citiți cu atenție.",
    fallbackUpdatedAt:
      FALLBACK_UPDATED_AT,
    defaultContent: `## 1. Despre platformă

RomDoc este o platformă digitală care permite utilizatorilor să descopere medici și clinici, să consulte informații publice și să trimită solicitări de programare.

RomDoc nu furnizează servicii medicale și nu stabilește diagnostice sau tratamente.

## 2. Conturi și eligibilitate

Unele funcții sunt publice, iar altele necesită un cont valid și o adresă de e-mail verificată.

Utilizatorii sunt responsabili pentru corectitudinea datelor introduse și pentru păstrarea confidențialității datelor de autentificare.

## 3. Programări

O solicitare transmisă prin RomDoc nu reprezintă confirmarea automată a unei consultații. Confirmarea depinde de medic sau clinică.

Modificarea, anularea și finalizarea unei programări sunt gestionate conform fluxului afișat în contul pacientului și în profilul medicului.

## 4. Conținut și informații medicale

Informațiile publice despre medici și clinici sunt oferite în scop informativ și nu trebuie considerate recomandare medicală personalizată.

În caz de urgență medicală, utilizatorii trebuie să contacteze serviciile de urgență corespunzătoare.

## 5. Obligațiile medicilor

Medicii sunt responsabili pentru exactitatea informațiilor profesionale, a serviciilor, tarifelor, clinicilor și disponibilității publicate.

Insigna de verificare indică faptul că RomDoc a verificat informații profesionale existente; RomDoc nu emite licențe medicale.

## 6. Limitarea răspunderii

RomDoc depune eforturi rezonabile pentru disponibilitatea platformei, dar nu garantează funcționarea neîntreruptă sau lipsa totală a erorilor.

Relația medicală se stabilește direct între pacient și profesionistul sau furnizorul medical ales.

## 7. Modificarea termenilor

Termenii pot fi actualizați pentru a reflecta modificări funcționale, comerciale sau juridice. Data ultimei actualizări va fi afișată pe această pagină.`,
  },
  privacy: {
    key: "privacy",
    title:
      "Politica de confidențialitate",
    route: "/confidentialitate",
    eyebrow: "Confidențialitate",
    description:
      "Această pagină descrie categoriile de date folosite de RomDoc și scopurile principale ale prelucrării.",
    notice:
      "Vă rugăm sa citiți cu atenție și să considerați Politicile de confidențilitate. ",
    fallbackUpdatedAt:
      FALLBACK_UPDATED_AT,
    defaultContent: `## 1. Date pe care le putem colecta

Date de cont, precum numele, adresa de e-mail, rolul utilizatorului și informațiile de autentificare gestionate prin Supabase Auth.

Date de programare, precum medicul, clinica, data, ora, numărul de telefon și mesajele asociate solicitării.

Date profesionale pentru medici și date tehnice necesare funcționării și securității platformei.

## 2. Scopurile prelucrării

Folosim datele pentru administrarea conturilor, procesarea programărilor, comunicări tranzacționale, securitate, suport și îmbunătățirea serviciului.

Nu utilizăm datele medicale pentru publicitate comportamentală.

## 3. Furnizori tehnici

RomDoc poate utiliza furnizori precum Supabase, Vercel, Resend, Stripe și Google Maps pentru autentificare, găzduire, e-mailuri, plăți și servicii de localizare.

## 4. Păstrarea datelor

Datele sunt păstrate numai atât cât este necesar pentru funcționarea serviciului, respectarea obligațiilor aplicabile, soluționarea disputelor și menținerea securității.

## 5. Drepturile persoanelor vizate

În funcție de situație, utilizatorii pot solicita accesul, rectificarea, ștergerea, restricționarea, portabilitatea sau opoziția față de anumite prelucrări.

## 6. Securitatea datelor

Aplicăm măsuri tehnice și organizatorice rezonabile, inclusiv controlul accesului, separarea rolurilor și politici de securitate la nivelul bazei de date.

## 7. Contact pentru confidențialitate

Solicitările privind datele personale pot fi transmise prin pagina de contact. Adresa dedicată va fi publicată înainte de lansarea comercială.`,
  },
  cookies: {
    key: "cookies",
    title: "Politica de cookies",
    route: "/cookies",
    eyebrow: "Cookies",
    description:
      "Această pagină explică rolul cookie-urilor și al tehnologiilor similare utilizate de platformă.",
    notice:
      "Lista exactă a cookie-urilor se modifică în funcție de serviciile introduse pentru inbunatațire.",
    fallbackUpdatedAt:
      FALLBACK_UPDATED_AT,
    defaultContent: `## 1. Ce sunt cookie-urile

Cookie-urile sunt fișiere mici stocate de browser pentru a păstra informații necesare funcționării, securității și preferințelor unui serviciu online.

## 2. Cookie-uri strict necesare

Pot fi folosite pentru autentificare, menținerea sesiunii, protecția împotriva abuzului și funcționarea formularelor. Acestea sunt necesare pentru furnizarea funcțiilor solicitate.

## 3. Preferințe

Cookie-urile de preferințe pot reține limba, aspectul sau alte opțiuni alese de utilizator.

## 4. Analiză și performanță

Dacă vor fi activate instrumente de analiză neesențiale, acestea vor fi documentate și controlate printr-un mecanism de consimțământ adecvat.

## 5. Servicii terțe

Componente precum Google Maps, Stripe sau alte servicii integrate pot folosi propriile tehnologii de stocare, în funcție de modul în care sunt încărcate și utilizate.

## 6. Controlul cookie-urilor

Utilizatorii pot controla cookie-urile din setările browserului. Dezactivarea celor strict necesare poate împiedica autentificarea sau utilizarea anumitor funcții.`,
  },
  legal_information: {
    key: "legal_information",
    title: "Informații legale",
    route: "/informatii-legale",
    eyebrow: "Informații legale",
    description:
      "Detalii generale despre rolul platformei, verificarea profesioniștilor și responsabilitățile participanților.",
    notice:
      "Datele complete ale entității care operează RomDoc, adresa sediului, identificatorii fiscali și datele autorităților relevante.",
    fallbackUpdatedAt:
      FALLBACK_UPDATED_AT,
    defaultContent: `## 1. Operatorul platformei

RomDoc este denumirea comercială a platformei. Datele juridice complete ale operatorului vor fi publicate aici înainte de începerea activității comerciale.

## 2. Rolul platformei

RomDoc este un serviciu digital de listare, descoperire și intermediere a solicitărilor de programare. Platforma nu furnizează consultații și nu intervine în deciziile medicale.

## 3. Verificarea profesională

Un medic poate primi insigna „Medic verificat de RomDoc” după verificarea informațiilor profesionale disponibile.

Insigna nu reprezintă emiterea unei licențe de către RomDoc și nu înlocuiește verificările pe care pacientul le consideră necesare.

## 4. Informații publice

Medicii și clinicile sunt responsabili pentru menținerea informațiilor publice corecte, inclusiv specialități, adrese, tarife și disponibilitate.

## 5. Urgențe medicale

RomDoc nu este un serviciu de urgență. Într-o situație urgentă, utilizatorii trebuie să contacteze imediat serviciile locale de urgență.

## 6. Sesizări

Informațiile incorecte, profilurile suspecte sau problemele tehnice pot fi raportate prin pagina de contact.`,
  },
};

export function isLegalPageKey(
  value: unknown
): value is LegalPageKey {
  return (
    typeof value === "string" &&
    LEGAL_PAGE_KEYS.includes(
      value as LegalPageKey
    )
  );
}

export function getLegalPageDefinition(
  key: LegalPageKey
) {
  return LEGAL_PAGE_DEFINITIONS[key];
}

function createSectionId(
  title: string,
  usedIds: Set<string>
) {
  const baseId =
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "sectiune";

  let id = baseId;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function parseBlocks(
  value: string
): LegalContentBlock[] {
  return value
    .trim()
    .split(/\n\s*\n/g)
    .map((rawBlock) =>
      rawBlock
        .split("\n")
        .map((line) =>
          line.trim()
        )
        .filter(Boolean)
    )
    .filter(
      (lines) =>
        lines.length > 0
    )
    .map((lines) => {
      const isList =
        lines.every((line) =>
          line.startsWith("- ")
        );

      if (isList) {
        return {
          type: "list" as const,
          items: lines.map((line) =>
            line.slice(2).trim()
          ),
        };
      }

      return {
        type: "paragraph" as const,
        text: lines.join("\n"),
      };
    });
}

export function parseLegalContent(
  content: string
): ParsedLegalSection[] {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const sections: ParsedLegalSection[] = [];
  const usedIds = new Set<string>();
  let currentTitle = "Introducere";
  let currentLines: string[] = [];
  let hasExplicitHeading = false;

  const flushSection = () => {
    const body = currentLines
      .join("\n")
      .trim();

    if (!body) {
      currentLines = [];
      return;
    }

    sections.push({
      id: createSectionId(
        currentTitle,
        usedIds
      ),
      title: currentTitle,
      blocks: parseBlocks(body),
    });

    currentLines = [];
  };

  for (const line of normalized.split("\n")) {
    const headingMatch =
      line.match(/^\s*##\s+(.+?)\s*$/);

    if (headingMatch) {
      flushSection();
      currentTitle =
        headingMatch[1].trim();
      hasExplicitHeading = true;
      continue;
    }

    currentLines.push(line);
  }

  flushSection();

  if (
    !hasExplicitHeading &&
    sections.length === 1
  ) {
    sections[0] = {
      ...sections[0],
      id: "continut",
      title: "Conținut",
    };
  }

  return sections;
}

export function formatLegalDate(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(date);
}
