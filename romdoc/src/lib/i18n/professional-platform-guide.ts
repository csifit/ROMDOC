import type { AppLocale } from "@/i18n/routing";

export type ProfessionalGuideItem = {
  title: string;
  body: string;
  bullets: string[];
};

export type ProfessionalGuideCategory = {
  id: string;
  title: string;
  summary: string;
  items: ProfessionalGuideItem[];
  note?: string;
};

export type ProfessionalGuideAudience = {
  id: "doctors" | "clinics";
  navigationLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  quickStartTitle: string;
  quickStart: string[];
  categories: ProfessionalGuideCategory[];
};

export type ProfessionalPlatformGuideCopy = {
  metadataTitle: string;
  metadataDescription: string;
  eyebrow: string;
  title: string;
  introduction: string;
  chooseGuide: string;
  chooseGuideDescription: string;
  accordionHint: string;
  actions: {
    signIn: string;
    joinDoctor: string;
    clinicOffer: string;
    contact: string;
  };
  importantTitle: string;
  importantBody: string;
  supportTitle: string;
  supportBody: string;
  audiences: ProfessionalGuideAudience[];
};

export const professionalPlatformGuideCopy: Record<
  AppLocale,
  ProfessionalPlatformGuideCopy
> = {
  ro: {
    metadataTitle: "Ghid RomDoc pentru medici și organizații clinice",
    metadataDescription:
      "Instrucțiuni practice pentru utilizarea profilului de medic, calendarului, programărilor, SMS-urilor și funcțiilor organizațiilor clinice în RomDoc.",
    eyebrow: "Ghid de utilizare a platformei",
    title: "RomDoc pentru medici și organizații clinice",
    introduction:
      "Acest ghid explică funcțiile profesionale RomDoc, grupate pe categorii. Alegeți tipul de cont și deschideți secțiunea care corespunde acțiunii pe care doriți să o realizați.",
    chooseGuide: "Alegeți ghidul",
    chooseGuideDescription:
      "Medicii și organizațiile clinice au dashboard-uri și drepturi diferite. Instrucțiunile de mai jos păstrează aceste responsabilități separate.",
    accordionHint: "Selectați o categorie pentru a vedea instrucțiunile.",
    actions: {
      signIn: "Autentificare",
      joinDoctor: "Înscriere medic",
      clinicOffer: "Ofertă pentru clinici",
      contact: "Contact și suport",
    },
    importantTitle: "Limită importantă de confidențialitate",
    importantBody:
      "Administratorii platformei și managerii organizațiilor clinice nu primesc acces la Dosarul Medical al pacientului. Accesul medical rămâne separat de administrarea platformei, facturare și raportarea utilizării.",
    supportTitle: "Aveți nevoie de ajutor?",
    supportBody:
      "Pentru o problemă tehnică sau o întrebare despre utilizarea RomDoc, folosiți pagina de contact și descrieți rolul contului, pagina și acțiunea care nu funcționează.",
    audiences: [
      {
        id: "doctors",
        navigationLabel: "Medici și personal",
        eyebrow: "Cont profesional",
        title: "Ghid pentru medici și personal",
        description:
          "Instrucțiuni pentru profilul public, servicii, locații, disponibilitate, calendar, programări, SMS, personal și abonament.",
        quickStartTitle: "Pornire rapidă pentru medic",
        quickStart: [
          "Creați contul de medic și confirmați adresa de e-mail.",
          "Finalizați abonamentul aplicabil contului independent.",
          "Completați profilul public, serviciile și locațiile de lucru.",
          "Configurați disponibilitatea și verificați calendarul.",
          "Gestionați toate programările din același flux, inclusiv cele primite telefonic.",
        ],
        categories: [
          {
            id: "acces",
            title: "Cont, autentificare și securitate",
            summary:
              "Accesarea dashboard-ului profesional și protejarea contului.",
            items: [
              {
                title: "Accesarea contului",
                body:
                  "Folosiți adresa de e-mail asociată contului profesional. După autentificare, RomDoc vă direcționează către dashboard-ul corespunzător rolului.",
                bullets: [
                  "Nu utilizați contul unui coleg și nu transmiteți parola personalului.",
                  "Verificați că lucrați în profilul medicului corect înainte de modificări.",
                  "Deconectați-vă de pe dispozitivele comune sau publice.",
                ],
              },
              {
                title: "Roluri separate",
                body:
                  "Medicul, personalul, managerul clinicii și Administratorul platformei au drepturi diferite. Fiecare persoană trebuie să folosească propriul cont.",
                bullets: [
                  "Medicul controlează profilul și activitatea medicală proprie.",
                  "Personalul folosește numai funcțiile administrative atribuite.",
                  "Managerul organizației gestionează organizația, nu datele medicale ale pacientului.",
                ],
              },
            ],
          },
          {
            id: "profil-servicii",
            title: "Profil public, servicii și prețuri",
            summary:
              "Actualizarea informațiilor afișate pacienților.",
            items: [
              {
                title: "Profilul medicului",
                body:
                  "Completați informațiile profesionale care ajută pacientul să identifice medicul potrivit. Verificați periodic datele publice după salvare.",
                bullets: [
                  "Păstrați numele, specialitatea și datele profesionale corecte.",
                  "Folosiți o fotografie profesională clară, dacă este disponibilă opțiunea.",
                  "Nu publicați date sensibile sau informații despre pacienți în descriere.",
                ],
              },
              {
                title: "Servicii și tarife",
                body:
                  "Adăugați serviciile oferite și tarifele orientative. Pacientul trebuie să înțeleagă ce poate solicita înainte de programare.",
                bullets: [
                  "Folosiți denumiri scurte și clare pentru servicii.",
                  "Actualizați tarifele când se modifică practica.",
                  "Eliminați serviciile care nu mai sunt disponibile.",
                ],
              },
            ],
          },
          {
            id: "locatii-disponibilitate",
            title: "Locații, disponibilitate și calendar",
            summary:
              "Stabilirea locului și intervalelor în care pot fi primite programări.",
            items: [
              {
                title: "Locațiile de lucru",
                body:
                  "Asociați activitatea medicului cu locațiile corecte. Locațiile care necesită verificare sau aprobare devin publice numai după finalizarea fluxului aplicabil.",
                bullets: [
                  "Verificați adresa și denumirea clinicii înainte de salvare.",
                  "Nu creați duplicate pentru aceeași locație.",
                  "Alegeți locația corectă atunci când creați o programare manuală.",
                ],
              },
              {
                title: "Disponibilitatea",
                body:
                  "Configurați zilele de lucru, orele, durata consultației, pauzele și zilele indisponibile. Aceste reguli controlează intervalele oferite pacientului.",
                bullets: [
                  "Evitați intervalele suprapuse.",
                  "Actualizați concediile și excepțiile înainte ca pacienții să solicite programări.",
                  "Verificați rezultatul în vizualizarea zilnică, săptămânală sau lunară.",
                ],
              },
            ],
          },
          {
            id: "programari",
            title: "Programări și acțiuni de calendar",
            summary:
              "Gestionarea programărilor online, telefonice și introduse de personal.",
            items: [
              {
                title: "Un singur calendar",
                body:
                  "Introduceți în același calendar programările primite online, telefonic, la recepție sau prin alte canale. Astfel se reduce riscul rezervărilor duble.",
                bullets: [
                  "Completați numele pacientului și numărul de telefon necesar notificărilor.",
                  "Selectați medicul, locația, data și ora corectă.",
                  "Verificați suprapunerile înainte de salvare.",
                ],
              },
              {
                title: "Stările programării",
                body:
                  "Folosiți acțiunea care descrie real situația programării. Istoricul trebuie să rămână clar pentru medic și personal.",
                bullets: [
                  "Confirmați cererile acceptate.",
                  "Reprogramați atunci când data sau ora se schimbă.",
                  "Marcați programarea ca finalizată, neprezentată sau anulată, după caz.",
                ],
              },
            ],
          },
          {
            id: "creare-programare",
            title: "Crearea manuală a unei programări",
            summary:
              "Înregistrarea programărilor primite la telefon sau la recepție.",
            items: [
              {
                title: "Date obligatorii",
                body:
                  "Introduceți suficiente informații pentru identificarea programării și trimiterea notificărilor. Evitați notele medicale în câmpurile administrative.",
                bullets: [
                  "Numele pacientului și numărul de telefon.",
                  "Data, ora, locația și durata programării.",
                  "Sursa programării și observații administrative strict necesare.",
                ],
              },
              {
                title: "După salvare",
                body:
                  "Verificați programarea în calendar și confirmați-o conform fluxului practicii. Corectați imediat o dată sau o locație introdusă greșit.",
                bullets: [
                  "Nu creați o a doua programare pentru aceeași solicitare.",
                  "Folosiți reprogramarea, nu anularea urmată de duplicare, când este posibil.",
                  "Informați pacientul despre schimbările importante.",
                ],
              },
            ],
          },
          {
            id: "sms",
            title: "SMS de confirmare și reamintire",
            summary:
              "Cum sunt trimise și facturate notificările SMS.",
            items: [
              {
                title: "Trimiterea SMS-urilor",
                body:
                  "RomDoc poate trimite SMS la confirmarea programării și o reamintire cu aproximativ 24 de ore înainte, atunci când serviciul și tipul de notificare sunt active.",
                bullets: [
                  "Numărul pacientului trebuie să fie valid.",
                  "Același eveniment nu trebuie trimis de mai multe ori pentru aceeași programare.",
                  "Mesajele omise sau eșuate nu sunt tratate ca SMS trimise cu succes.",
                ],
              },
              {
                title: "Costul SMS",
                body:
                  "SMS-urile trimise cu succes sunt urmărite separat de abonamentul medicului. Costul aplicabil este afișat în zonele de facturare și raportare.",
                bullets: [
                  "Verificați lunar numărul SMS-urilor trimise.",
                  "Confirmările și reamintirile sunt prezentate separat în raportare.",
                  "Contactați suportul dacă un mesaj trimis nu apare în raport.",
                ],
              },
            ],
          },
          {
            id: "personal",
            title: "Personal și delegarea activităților",
            summary:
              "Oferirea accesului administrativ fără partajarea contului medicului.",
            items: [
              {
                title: "Conturi separate pentru personal",
                body:
                  "Adăugați personalul prin funcția dedicată și atribuiți accesul necesar. Nu comunicați parola medicului unei alte persoane.",
                bullets: [
                  "Fiecare membru al personalului folosește propriul cont.",
                  "Accesul este limitat la medicul și activitatea atribuită.",
                  "Eliminați accesul când colaborarea se încheie.",
                ],
              },
              {
                title: "Responsabilitatea medicului",
                body:
                  "Medicul rămâne responsabil pentru corectitudinea profilului, disponibilității și acțiunilor realizate în numele practicii.",
                bullets: [
                  "Revizuiți periodic programările și accesul personalului.",
                  "Corectați imediat o acțiune administrativă greșită.",
                  "Raportați accesul suspect către suport.",
                ],
              },
            ],
          },
          {
            id: "abonament",
            title: "Abonament, plată și facturare",
            summary:
              "Diferența dintre abonamentul medicului independent și acoperirea prin clinică.",
            items: [
              {
                title: "Medic independent",
                body:
                  "Contul independent folosește abonamentul RomDoc disponibil la înregistrare. Plata abonamentului și utilizarea SMS sunt fluxuri comerciale distincte.",
                bullets: [
                  "Abonamentul public este 60 RON/lună sau 600 RON/an, plus TVA aplicabilă.",
                  "Plata abonamentului este procesată prin fluxul de plată disponibil în cont.",
                  "SMS-urile trimise sunt calculate separat.",
                ],
              },
              {
                title: "Medic invitat de organizație",
                body:
                  "Pentru un cont creat prin invitația unei organizații clinice, responsabilitatea comercială poate aparține organizației, conform relației configurate.",
                bullets: [
                  "Nu creați un al doilea cont independent pentru aceeași colaborare.",
                  "Solicitați managerului clinicii corectarea locației sau acoperirii.",
                  "Contactați suportul dacă tipul contului nu corespunde invitației acceptate.",
                ],
              },
            ],
          },
          {
            id: "dosar-medical-securitate",
            title: "Dosar Medical, confidențialitate și suport",
            summary:
              "Folosirea datelor medicale numai în contextul autorizat.",
            items: [
              {
                title: "Acces medical autorizat",
                body:
                  "Folosiți informațiile din Dosarul Medical numai pentru pacientul și contextul pentru care aveți acces autorizat. Nu copiați datele în câmpuri publice sau administrative.",
                bullets: [
                  "Accesați numai informațiile necesare actului medical.",
                  "Nu distribuiți documente prin canale nesecurizate.",
                  "Respectați revocarea sau expirarea accesului pacientului.",
                ],
              },
              {
                title: "Probleme și incidente",
                body:
                  "Pentru erori tehnice, acces neobișnuit sau informații afișate incorect, folosiți pagina de contact și furnizați detalii administrative, fără a include date medicale în mesajul inițial.",
                bullets: [
                  "Menționați pagina și acțiunea efectuată.",
                  "Includeți data și ora aproximativă a problemei.",
                  "Nu trimiteți parole, coduri de acces sau documente medicale prin formularul general.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "clinics",
        navigationLabel: "Organizații clinice",
        eyebrow: "Administrare organizație",
        title: "Ghid pentru organizații clinice",
        description:
          "Instrucțiuni pentru manageri privind locațiile, invitațiile medicilor, acoperirea abonamentelor, facturarea, SMS și securitatea organizației.",
        quickStartTitle: "Pornire rapidă pentru organizație",
        quickStart: [
          "Accesați contul de manager asociat organizației corecte.",
          "Verificați locațiile organizației și datele de facturare.",
          "Invitați medicii cu adresa de e-mail corectă.",
          "Asociați medicii acceptați cu locațiile și acoperirea comercială aplicabilă.",
          "Verificați lunar abonamentele și utilizarea SMS.",
        ],
        categories: [
          {
            id: "organizatie-acces",
            title: "Accesul organizației și securitatea contului",
            summary:
              "Utilizarea contului de manager pentru organizația corectă.",
            items: [
              {
                title: "Dashboard-ul organizației",
                body:
                  "După autentificare, managerul vede numai organizațiile și funcțiile pentru care are acces activ. Verificați numele organizației înainte de modificări.",
                bullets: [
                  "Nu folosiți un cont comun pentru mai mulți manageri.",
                  "Păstrați separat accesul de manager și accesul personal de medic.",
                  "Raportați imediat un cont sau o organizație necunoscută.",
                ],
              },
              {
                title: "Drepturi administrative",
                body:
                  "Managerul gestionează structura organizației, medicii, locațiile și informațiile comerciale disponibile. Rolul nu oferă acces medical general la pacienți.",
                bullets: [
                  "Folosiți funcțiile de invitație și asociere, nu contul medicului.",
                  "Verificați periodic membrii și accesul organizației.",
                  "Eliminați accesul persoanelor care nu mai reprezintă organizația.",
                ],
              },
            ],
          },
          {
            id: "locatii-clinica",
            title: "Locațiile organizației",
            summary:
              "Administrarea clinicilor și adreselor asociate organizației.",
            items: [
              {
                title: "Adăugarea și asocierea locațiilor",
                body:
                  "Folosiți secțiunea Locații pentru a conecta organizația la clinicile în care activează. O locație publică trebuie să aibă o adresă corectă și starea necesară publicării.",
                bullets: [
                  "Căutați locația existentă înainte de a propune una nouă.",
                  "Verificați denumirea, adresa și datele de contact.",
                  "Evitați înregistrările duplicate ale aceleiași clinici.",
                ],
              },
              {
                title: "Asocierea medicilor",
                body:
                  "După acceptarea invitației, atribuiți medicul locației corecte. Această asociere ajută profilul public, programările și raportarea organizației.",
                bullets: [
                  "Nu atribuiți un medic unei locații în care nu lucrează.",
                  "Actualizați asocierea când colaborarea se schimbă.",
                  "Verificați locația înainte de activarea acoperirii comerciale.",
                ],
              },
            ],
          },
          {
            id: "medici-invitatii",
            title: "Invitații și conturi de medic",
            summary:
              "Invitarea medicilor și urmărirea acceptării conturilor.",
            items: [
              {
                title: "Trimiterea invitației",
                body:
                  "Introduceți adresa de e-mail pe care medicul o va folosi pentru contul RomDoc și selectați organizația și locația potrivite.",
                bullets: [
                  "Confirmați adresa cu medicul înainte de trimitere.",
                  "Nu trimiteți invitații repetate pentru același cont.",
                  "Verificați starea invitației înainte de a crea una nouă.",
                ],
              },
              {
                title: "După acceptare",
                body:
                  "Medicul își creează sau conectează propriul cont. Managerul poate apoi verifica relația, locația și responsabilitatea de plată, fără a modifica identitatea contului medicului.",
                bullets: [
                  "Contul clinic-invitat rămâne legat de organizația care l-a creat.",
                  "Nu transformați un cont independent existent într-un cont invitat prin modificări manuale.",
                  "Pentru o asociere greșită, contactați suportul înainte de a crea conturi suplimentare.",
                ],
              },
            ],
          },
          {
            id: "acoperire-abonamente",
            title: "Medici gestionați și acoperirea abonamentelor",
            summary:
              "Stabilirea medicilor pentru care organizația suportă costurile.",
            items: [
              {
                title: "Acoperirea clinicii",
                body:
                  "O relație activă cu responsabilitate de plată a clinicii este inclusă în numărul de abonamente gestionate al organizației.",
                bullets: [
                  "Verificați lista medicilor activi în fiecare lună.",
                  "Încheiați sau întrerupeți acoperirea când colaborarea se termină.",
                  "Nu mențineți acoperire pentru invitații neacceptate sau conturi greșite.",
                ],
              },
              {
                title: "Separarea conturilor",
                body:
                  "Medicii invitați de clinică nu trebuie să dețină simultan un abonament direct de medic independent pentru același cont.",
                bullets: [
                  "Responsabilitatea de plată se stabilește prin relația organizației.",
                  "Identitatea contului nu se schimbă după creare.",
                  "O altă structură comercială poate necesita un cont nou configurat corect.",
                ],
              },
            ],
          },
          {
            id: "facturare-organizatie",
            title: "Date de facturare și costuri",
            summary:
              "Verificarea abonamentelor, SMS-urilor și informațiilor de facturare.",
            items: [
              {
                title: "Datele organizației",
                body:
                  "Completați și mențineți corecte denumirea juridică, identificarea fiscală, adresa și e-mailul de facturare.",
                bullets: [
                  "Folosiți datele entității care primește factura.",
                  "Actualizați informațiile înainte de închiderea lunii.",
                  "Verificați tratamentul TVA aplicabil împreună cu persoana responsabilă de contabilitate.",
                ],
              },
              {
                title: "Estimarea lunară",
                body:
                  "Zona de facturare prezintă numărul medicilor gestionați, utilizarea SMS și estimarea costurilor. Factura oficială este înregistrată separat de Administratorul sau operatorul contabil RomDoc.",
                bullets: [
                  "Comparați lista medicilor cu colaborările active.",
                  "Verificați numărul SMS înainte de facturare.",
                  "Raportați diferențele înainte de emiterea facturii.",
                ],
              },
            ],
          },
          {
            id: "sms-clinica",
            title: "Utilizarea SMS a organizației",
            summary:
              "Vizualizarea mesajelor facturabile fără expunerea datelor medicale.",
            items: [
              {
                title: "Ce poate vedea managerul",
                body:
                  "Raportul SMS prezintă metadate de livrare și facturare pentru medicii acoperiți de organizație.",
                bullets: [
                  "Numărul SMS-urilor de confirmare și reamintire.",
                  "Starea de trimitere și perioada de facturare.",
                  "Costul estimat conform tarifului aplicabil.",
                ],
              },
              {
                title: "Ce nu este afișat",
                body:
                  "Pentru protejarea pacientului, raportarea organizației nu trebuie să ofere conținutul SMS, numărul complet de telefon, note medicale sau documente din Dosarul Medical.",
                bullets: [
                  "Datele de contact pot fi mascate.",
                  "Managerul verifică utilizarea, nu informația clinică.",
                  "O investigație tehnică se realizează prin suport, cu acces controlat.",
                ],
              },
            ],
          },
          {
            id: "confidentialitate-organizatie",
            title: "Confidențialitate, limite și suport",
            summary:
              "Separarea administrării organizației de datele medicale ale pacientului.",
            items: [
              {
                title: "Fără acces la Dosarul Medical",
                body:
                  "Rolul de manager al organizației nu oferă acces la Dosarul Medical, diagnostice, note clinice sau documente medicale ale pacientului.",
                bullets: [
                  "Nu solicitați medicilor să partajeze contul sau accesul medical.",
                  "Folosiți numai rapoartele administrative și comerciale disponibile.",
                  "Respectați principiul accesului minim necesar.",
                ],
              },
              {
                title: "Solicitarea de suport",
                body:
                  "Pentru probleme cu invitațiile, locațiile, acoperirea sau facturarea, transmiteți identificatorii administrativi relevanți și evitați includerea informațiilor medicale despre pacient.",
                bullets: [
                  "Menționați organizația și secțiunea dashboard-ului.",
                  "Descrieți pașii efectuați și rezultatul observat.",
                  "Nu transmiteți parole sau documente medicale prin mesajul inițial.",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  en: {
    metadataTitle: "RomDoc guide for Doctors and Clinic Organisations",
    metadataDescription:
      "Practical instructions for Doctor profiles, calendars, appointments, SMS and Clinic Organisation functions in RomDoc.",
    eyebrow: "Platform user guide",
    title: "RomDoc for Doctors and Clinic Organisations",
    introduction:
      "This guide explains RomDoc professional functions by category. Choose the account type and open the section matching the action you need to perform.",
    chooseGuide: "Choose a guide",
    chooseGuideDescription:
      "Doctors and Clinic Organisations use different dashboards and permissions. The instructions below keep those responsibilities separate.",
    accordionHint: "Select a category to view its instructions.",
    actions: {
      signIn: "Sign in",
      joinDoctor: "Join as a Doctor",
      clinicOffer: "Clinic offer",
      contact: "Contact and support",
    },
    importantTitle: "Important privacy boundary",
    importantBody:
      "Platform Administrators and Clinic Organisation Managers do not receive access to a patient's Medical Folder. Medical access remains separate from platform administration, billing and usage reporting.",
    supportTitle: "Need help?",
    supportBody:
      "For a technical problem or a question about using RomDoc, use the contact page and describe the account role, page and action that is not working.",
    audiences: [
      {
        id: "doctors",
        navigationLabel: "Doctors and staff",
        eyebrow: "Professional account",
        title: "Guide for Doctors and staff",
        description:
          "Instructions for the public profile, services, locations, availability, calendar, appointments, SMS, staff and subscription.",
        quickStartTitle: "Doctor quick start",
        quickStart: [
          "Create the Doctor account and confirm the email address.",
          "Complete the subscription applicable to an Independent Doctor account.",
          "Complete the public profile, services and work locations.",
          "Configure availability and review the calendar.",
          "Manage every appointment in one flow, including telephone bookings.",
        ],
        categories: [
          {
            id: "acces",
            title: "Account, sign-in and security",
            summary:
              "Accessing the professional dashboard and protecting the account.",
            items: [
              {
                title: "Accessing the account",
                body:
                  "Use the email address associated with the professional account. After sign-in, RomDoc directs you to the dashboard matching your role.",
                bullets: [
                  "Do not use a colleague's account or give your password to staff.",
                  "Confirm that you are working in the correct Doctor profile before making changes.",
                  "Sign out on shared or public devices.",
                ],
              },
              {
                title: "Separate roles",
                body:
                  "The Doctor, staff member, Clinic Manager and platform Administrator have different permissions. Every person should use a separate account.",
                bullets: [
                  "The Doctor controls their own profile and professional activity.",
                  "Staff use only the assigned administrative functions.",
                  "A Clinic Manager manages the organisation, not a patient's medical information.",
                ],
              },
            ],
          },
          {
            id: "profil-servicii",
            title: "Public profile, services and prices",
            summary:
              "Updating the information displayed to patients.",
            items: [
              {
                title: "Doctor profile",
                body:
                  "Complete the professional information that helps a patient identify the appropriate Doctor. Review the public page after saving.",
                bullets: [
                  "Keep the name, specialty and professional details accurate.",
                  "Use a clear professional photograph when the option is available.",
                  "Do not publish sensitive information or patient data in the description.",
                ],
              },
              {
                title: "Services and fees",
                body:
                  "Add the services offered and their indicative fees. A patient should understand what may be requested before booking.",
                bullets: [
                  "Use short, clear service names.",
                  "Update fees when the practice changes.",
                  "Remove services that are no longer available.",
                ],
              },
            ],
          },
          {
            id: "locatii-disponibilitate",
            title: "Locations, availability and calendar",
            summary:
              "Defining where and when appointments can be accepted.",
            items: [
              {
                title: "Work locations",
                body:
                  "Associate the Doctor with the correct work locations. Locations requiring verification or approval become public only after the relevant process is completed.",
                bullets: [
                  "Check the clinic name and address before saving.",
                  "Do not create duplicate records for the same location.",
                  "Choose the correct location when creating a manual appointment.",
                ],
              },
              {
                title: "Availability",
                body:
                  "Configure working days, hours, appointment duration, breaks and unavailable days. These rules control the slots offered to patients.",
                bullets: [
                  "Avoid overlapping ranges.",
                  "Update leave and exceptions before patients request appointments.",
                  "Review the result in daily, weekly or monthly calendar views.",
                ],
              },
            ],
          },
          {
            id: "programari",
            title: "Appointments and calendar actions",
            summary:
              "Managing online, telephone and staff-entered appointments.",
            items: [
              {
                title: "One calendar",
                body:
                  "Enter online, telephone, reception and other appointments into the same calendar. This reduces the risk of double-booking.",
                bullets: [
                  "Enter the patient name and the phone number required for notifications.",
                  "Select the correct Doctor, location, date and time.",
                  "Check for overlaps before saving.",
                ],
              },
              {
                title: "Appointment statuses",
                body:
                  "Use the action that accurately describes the appointment. The history should remain clear for the Doctor and staff.",
                bullets: [
                  "Confirm accepted requests.",
                  "Reschedule when the date or time changes.",
                  "Mark the appointment completed, no-show or cancelled as appropriate.",
                ],
              },
            ],
          },
          {
            id: "creare-programare",
            title: "Creating a manual appointment",
            summary:
              "Recording appointments received by telephone or at reception.",
            items: [
              {
                title: "Required information",
                body:
                  "Enter enough information to identify the appointment and send notifications. Do not place medical notes in administrative fields.",
                bullets: [
                  "Patient name and phone number.",
                  "Appointment date, time, location and duration.",
                  "Booking source and only the necessary administrative comments.",
                ],
              },
              {
                title: "After saving",
                body:
                  "Review the appointment in the calendar and confirm it according to the practice workflow. Correct a wrong date or location immediately.",
                bullets: [
                  "Do not create a second appointment for the same request.",
                  "Use rescheduling rather than cancel-and-duplicate when possible.",
                  "Inform the patient about important changes.",
                ],
              },
            ],
          },
          {
            id: "sms",
            title: "Confirmation and reminder SMS",
            summary:
              "How appointment notifications are sent and billed.",
            items: [
              {
                title: "Sending SMS",
                body:
                  "RomDoc can send an SMS when an appointment is confirmed and a reminder approximately 24 hours before it, when the service and notification type are enabled.",
                bullets: [
                  "The patient's phone number must be valid.",
                  "The same event should not be sent repeatedly for one appointment.",
                  "Skipped or failed messages are not treated as successfully sent SMS.",
                ],
              },
              {
                title: "SMS cost",
                body:
                  "Successfully sent SMS are tracked separately from the Doctor subscription. The applicable cost is displayed in billing and usage reports.",
                bullets: [
                  "Review the number of sent SMS each month.",
                  "Confirmations and reminders are reported separately.",
                  "Contact support if a sent message does not appear in the report.",
                ],
              },
            ],
          },
          {
            id: "personal",
            title: "Staff and delegated tasks",
            summary:
              "Providing administrative access without sharing the Doctor account.",
            items: [
              {
                title: "Separate staff accounts",
                body:
                  "Add staff through the dedicated function and assign the required access. Do not give another person the Doctor's password.",
                bullets: [
                  "Every staff member uses a separate account.",
                  "Access is limited to the assigned Doctor and activity.",
                  "Remove access when the working relationship ends.",
                ],
              },
              {
                title: "Doctor responsibility",
                body:
                  "The Doctor remains responsible for the accuracy of the profile, availability and actions performed for the practice.",
                bullets: [
                  "Review appointments and staff access regularly.",
                  "Correct an incorrect administrative action promptly.",
                  "Report suspicious access to support.",
                ],
              },
            ],
          },
          {
            id: "abonament",
            title: "Subscription, payment and billing",
            summary:
              "The difference between an Independent Doctor subscription and clinic-funded coverage.",
            items: [
              {
                title: "Independent Doctor",
                body:
                  "An Independent Doctor account uses the RomDoc subscription offered during registration. Subscription payment and SMS usage are separate commercial flows.",
                bullets: [
                  "The public subscription is RON 60/month or RON 600/year, plus applicable VAT.",
                  "Subscription payment is processed through the payment flow available in the account.",
                  "Successfully sent SMS are calculated separately.",
                ],
              },
              {
                title: "Clinic-invited Doctor",
                body:
                  "For an account created through a Clinic Organisation invitation, commercial responsibility may belong to the organisation according to the configured relationship.",
                bullets: [
                  "Do not create a second Independent Doctor account for the same collaboration.",
                  "Ask the Clinic Manager to correct the location or coverage.",
                  "Contact support if the account type does not match the accepted invitation.",
                ],
              },
            ],
          },
          {
            id: "dosar-medical-securitate",
            title: "Medical Folder, privacy and support",
            summary:
              "Using medical information only in an authorised context.",
            items: [
              {
                title: "Authorised medical access",
                body:
                  "Use Medical Folder information only for the patient and context for which access is authorised. Do not copy medical information into public or administrative fields.",
                bullets: [
                  "Access only information required for care.",
                  "Do not distribute documents through insecure channels.",
                  "Respect patient revocation or access expiry.",
                ],
              },
              {
                title: "Problems and incidents",
                body:
                  "For technical errors, unusual access or incorrect information, use the contact page and provide administrative details without placing medical information in the initial message.",
                bullets: [
                  "Mention the page and action performed.",
                  "Include the approximate date and time of the problem.",
                  "Do not send passwords, access codes or medical documents through the general form.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "clinics",
        navigationLabel: "Clinic Organisations",
        eyebrow: "Organisation administration",
        title: "Guide for Clinic Organisations",
        description:
          "Instructions for Managers covering locations, Doctor invitations, subscription coverage, billing, SMS and organisation security.",
        quickStartTitle: "Organisation quick start",
        quickStart: [
          "Access the Manager account associated with the correct organisation.",
          "Review organisation locations and billing details.",
          "Invite Doctors using the correct email address.",
          "Associate accepted Doctors with locations and the applicable commercial coverage.",
          "Review subscriptions and SMS usage each month.",
        ],
        categories: [
          {
            id: "organizatie-acces",
            title: "Organisation access and account security",
            summary:
              "Using the Manager account for the correct organisation.",
            items: [
              {
                title: "Organisation dashboard",
                body:
                  "After sign-in, a Manager sees only organisations and functions for which they have active access. Check the organisation name before making changes.",
                bullets: [
                  "Do not use one shared account for several Managers.",
                  "Keep Manager access separate from a personal Doctor account.",
                  "Report an unknown account or organisation immediately.",
                ],
              },
              {
                title: "Administrative permissions",
                body:
                  "A Manager administers the organisation structure, Doctors, locations and available commercial information. The role does not provide general medical access to patients.",
                bullets: [
                  "Use invitation and association functions, not the Doctor's account.",
                  "Review organisation members and access regularly.",
                  "Remove people who no longer represent the organisation.",
                ],
              },
            ],
          },
          {
            id: "locatii-clinica",
            title: "Organisation locations",
            summary:
              "Managing clinics and addresses associated with the organisation.",
            items: [
              {
                title: "Adding and associating locations",
                body:
                  "Use Locations to connect the organisation with clinics where it operates. A public location requires a correct address and the status required for publication.",
                bullets: [
                  "Search for an existing location before proposing a new one.",
                  "Check the name, address and contact information.",
                  "Avoid duplicate records for the same clinic.",
                ],
              },
              {
                title: "Associating Doctors",
                body:
                  "After an invitation is accepted, assign the Doctor to the correct location. This association supports the public profile, appointments and organisation reporting.",
                bullets: [
                  "Do not assign a Doctor to a location where they do not work.",
                  "Update the association when the collaboration changes.",
                  "Check the location before enabling commercial coverage.",
                ],
              },
            ],
          },
          {
            id: "medici-invitatii",
            title: "Doctor invitations and accounts",
            summary:
              "Inviting Doctors and tracking account acceptance.",
            items: [
              {
                title: "Sending an invitation",
                body:
                  "Enter the email address the Doctor will use for RomDoc and select the appropriate organisation and location.",
                bullets: [
                  "Confirm the address with the Doctor before sending.",
                  "Do not send repeated invitations for the same account.",
                  "Check invitation status before creating another one.",
                ],
              },
              {
                title: "After acceptance",
                body:
                  "The Doctor creates or connects their own account. The Manager can then review the relationship, location and payment responsibility without changing the Doctor account identity.",
                bullets: [
                  "The clinic-invited account remains linked to the organisation that created it.",
                  "Do not convert an existing Independent Doctor account through manual edits.",
                  "For an incorrect association, contact support before creating additional accounts.",
                ],
              },
            ],
          },
          {
            id: "acoperire-abonamente",
            title: "Managed Doctors and subscription coverage",
            summary:
              "Defining the Doctors whose costs are covered by the organisation.",
            items: [
              {
                title: "Clinic-funded coverage",
                body:
                  "An active relationship with clinic payment responsibility is included in the organisation's managed subscription count.",
                bullets: [
                  "Review the active Doctor list each month.",
                  "End or pause coverage when a collaboration ends.",
                  "Do not retain coverage for unaccepted invitations or incorrect accounts.",
                ],
              },
              {
                title: "Separate account models",
                body:
                  "Clinic-invited Doctors should not simultaneously hold a direct Independent Doctor subscription for the same account.",
                bullets: [
                  "Payment responsibility is defined by the organisation relationship.",
                  "Account identity does not change after creation.",
                  "A different commercial structure may require a new correctly configured account.",
                ],
              },
            ],
          },
          {
            id: "facturare-organizatie",
            title: "Billing details and costs",
            summary:
              "Reviewing subscriptions, SMS and invoicing information.",
            items: [
              {
                title: "Organisation details",
                body:
                  "Keep the legal name, tax identification, address and billing email accurate.",
                bullets: [
                  "Use the details of the entity receiving the invoice.",
                  "Update information before the month is closed.",
                  "Review the applicable VAT treatment with the accounting contact.",
                ],
              },
              {
                title: "Monthly estimate",
                body:
                  "Billing shows the managed Doctor count, SMS usage and estimated costs. The official invoice is recorded separately by a RomDoc Administrator or accounting operator.",
                bullets: [
                  "Compare the Doctor list with active collaborations.",
                  "Review the SMS count before invoicing.",
                  "Report discrepancies before the invoice is issued.",
                ],
              },
            ],
          },
          {
            id: "sms-clinica",
            title: "Organisation SMS usage",
            summary:
              "Viewing billable messages without exposing medical information.",
            items: [
              {
                title: "What a Manager can see",
                body:
                  "The SMS report shows delivery and billing metadata for Doctors covered by the organisation.",
                bullets: [
                  "Confirmation and reminder SMS counts.",
                  "Sending status and billing period.",
                  "Estimated cost under the applicable rate.",
                ],
              },
              {
                title: "What is not displayed",
                body:
                  "To protect patients, organisation reporting must not expose SMS content, the full phone number, medical notes or Medical Folder documents.",
                bullets: [
                  "Contact details may be masked.",
                  "The Manager reviews usage, not clinical information.",
                  "A technical investigation is handled through support with controlled access.",
                ],
              },
            ],
          },
          {
            id: "confidentialitate-organizatie",
            title: "Privacy, boundaries and support",
            summary:
              "Separating organisation administration from patient medical information.",
            items: [
              {
                title: "No Medical Folder access",
                body:
                  "The Clinic Organisation Manager role does not provide access to a patient's Medical Folder, diagnoses, clinical notes or medical documents.",
                bullets: [
                  "Do not ask Doctors to share their account or medical access.",
                  "Use only the available administrative and commercial reports.",
                  "Follow the principle of minimum necessary access.",
                ],
              },
              {
                title: "Requesting support",
                body:
                  "For invitation, location, coverage or billing problems, provide the relevant administrative identifiers and avoid including patient medical information.",
                bullets: [
                  "Mention the organisation and dashboard section.",
                  "Describe the steps taken and the result observed.",
                  "Do not send passwords or medical documents in the initial message.",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  de: {
    metadataTitle: "RomDoc-Leitfaden für Ärzte und Klinikorganisationen",
    metadataDescription:
      "Praktische Anleitungen für Arztprofile, Kalender, Termine, SMS und Funktionen von Klinikorganisationen in RomDoc.",
    eyebrow: "Leitfaden zur Plattformnutzung",
    title: "RomDoc für Ärzte und Klinikorganisationen",
    introduction:
      "Dieser Leitfaden erklärt die professionellen RomDoc-Funktionen nach Kategorien. Wählen Sie den Kontotyp und öffnen Sie den Abschnitt für die gewünschte Aktion.",
    chooseGuide: "Leitfaden auswählen",
    chooseGuideDescription:
      "Ärzte und Klinikorganisationen verwenden unterschiedliche Dashboards und Berechtigungen. Die folgenden Anleitungen trennen diese Verantwortlichkeiten.",
    accordionHint: "Wählen Sie eine Kategorie, um die Anleitungen zu sehen.",
    actions: {
      signIn: "Anmelden",
      joinDoctor: "Als Arzt registrieren",
      clinicOffer: "Angebot für Kliniken",
      contact: "Kontakt und Support",
    },
    importantTitle: "Wichtige Datenschutzgrenze",
    importantBody:
      "Plattformadministratoren und Manager von Klinikorganisationen erhalten keinen Zugriff auf die Medizinische Akte eines Patienten. Medizinischer Zugriff bleibt von Plattformverwaltung, Abrechnung und Nutzungsberichten getrennt.",
    supportTitle: "Benötigen Sie Hilfe?",
    supportBody:
      "Verwenden Sie bei technischen Problemen oder Fragen zur RomDoc-Nutzung die Kontaktseite und beschreiben Sie Kontorolle, Seite und nicht funktionierende Aktion.",
    audiences: [
      {
        id: "doctors",
        navigationLabel: "Ärzte und Personal",
        eyebrow: "Professionelles Konto",
        title: "Leitfaden für Ärzte und Personal",
        description:
          "Anleitungen zu öffentlichem Profil, Leistungen, Standorten, Verfügbarkeit, Kalender, Terminen, SMS, Personal und Abonnement.",
        quickStartTitle: "Schnellstart für Ärzte",
        quickStart: [
          "Arztkonto erstellen und E-Mail-Adresse bestätigen.",
          "Das für ein unabhängiges Arztkonto geltende Abonnement abschließen.",
          "Öffentliches Profil, Leistungen und Arbeitsorte vervollständigen.",
          "Verfügbarkeit konfigurieren und Kalender prüfen.",
          "Alle Termine in einem Ablauf verwalten, einschließlich telefonischer Buchungen.",
        ],
        categories: [
          {
            id: "acces",
            title: "Konto, Anmeldung und Sicherheit",
            summary:
              "Zugriff auf das professionelle Dashboard und Schutz des Kontos.",
            items: [
              {
                title: "Kontozugriff",
                body:
                  "Verwenden Sie die E-Mail-Adresse des professionellen Kontos. Nach der Anmeldung leitet RomDoc zum Dashboard der jeweiligen Rolle weiter.",
                bullets: [
                  "Kein Konto eines Kollegen verwenden und das Passwort nicht an Personal weitergeben.",
                  "Vor Änderungen prüfen, ob das richtige Arztprofil geöffnet ist.",
                  "Auf gemeinsam genutzten oder öffentlichen Geräten abmelden.",
                ],
              },
              {
                title: "Getrennte Rollen",
                body:
                  "Arzt, Personal, Klinikmanager und Plattformadministrator haben unterschiedliche Berechtigungen. Jede Person sollte ein eigenes Konto verwenden.",
                bullets: [
                  "Der Arzt kontrolliert sein eigenes Profil und seine berufliche Tätigkeit.",
                  "Personal nutzt nur die zugewiesenen administrativen Funktionen.",
                  "Ein Klinikmanager verwaltet die Organisation, nicht die medizinischen Daten des Patienten.",
                ],
              },
            ],
          },
          {
            id: "profil-servicii",
            title: "Öffentliches Profil, Leistungen und Preise",
            summary:
              "Aktualisierung der für Patienten angezeigten Informationen.",
            items: [
              {
                title: "Arztprofil",
                body:
                  "Vervollständigen Sie die beruflichen Informationen, die Patienten bei der Auswahl helfen. Prüfen Sie die öffentliche Seite nach dem Speichern.",
                bullets: [
                  "Name, Fachrichtung und berufliche Angaben korrekt halten.",
                  "Wenn verfügbar, ein klares professionelles Foto verwenden.",
                  "Keine sensiblen Informationen oder Patientendaten in der Beschreibung veröffentlichen.",
                ],
              },
              {
                title: "Leistungen und Honorare",
                body:
                  "Fügen Sie angebotene Leistungen und Richtpreise hinzu. Patienten sollten vor der Buchung verstehen, was angefragt werden kann.",
                bullets: [
                  "Kurze und klare Leistungsbezeichnungen verwenden.",
                  "Honorare bei Änderungen der Praxis aktualisieren.",
                  "Nicht mehr verfügbare Leistungen entfernen.",
                ],
              },
            ],
          },
          {
            id: "locatii-disponibilitate",
            title: "Standorte, Verfügbarkeit und Kalender",
            summary:
              "Festlegen, wo und wann Termine angenommen werden können.",
            items: [
              {
                title: "Arbeitsorte",
                body:
                  "Ordnen Sie den Arzt den richtigen Arbeitsorten zu. Standorte mit Prüf- oder Genehmigungspflicht werden erst nach Abschluss des entsprechenden Ablaufs öffentlich.",
                bullets: [
                  "Klinikname und Adresse vor dem Speichern prüfen.",
                  "Keine doppelten Einträge für denselben Standort erstellen.",
                  "Bei manuellen Terminen den richtigen Standort auswählen.",
                ],
              },
              {
                title: "Verfügbarkeit",
                body:
                  "Konfigurieren Sie Arbeitstage, Zeiten, Termindauer, Pausen und Abwesenheitstage. Diese Regeln steuern die angebotenen Zeitfenster.",
                bullets: [
                  "Überlappende Zeiträume vermeiden.",
                  "Urlaub und Ausnahmen vor neuen Terminanfragen aktualisieren.",
                  "Das Ergebnis in Tages-, Wochen- oder Monatsansicht prüfen.",
                ],
              },
            ],
          },
          {
            id: "programari",
            title: "Termine und Kalenderaktionen",
            summary:
              "Verwaltung von Online-, Telefon- und durch Personal erfassten Terminen.",
            items: [
              {
                title: "Ein gemeinsamer Kalender",
                body:
                  "Online-, Telefon-, Empfangs- und andere Termine gehören in denselben Kalender. Das reduziert Doppelbuchungen.",
                bullets: [
                  "Patientenname und für Benachrichtigungen erforderliche Telefonnummer eintragen.",
                  "Arzt, Standort, Datum und Uhrzeit korrekt auswählen.",
                  "Vor dem Speichern Überschneidungen prüfen.",
                ],
              },
              {
                title: "Terminstatus",
                body:
                  "Verwenden Sie die Aktion, die den tatsächlichen Terminstatus beschreibt. Der Verlauf soll für Arzt und Personal klar bleiben.",
                bullets: [
                  "Angenommene Anfragen bestätigen.",
                  "Bei Änderung von Datum oder Uhrzeit neu planen.",
                  "Termin entsprechend als abgeschlossen, nicht erschienen oder storniert markieren.",
                ],
              },
            ],
          },
          {
            id: "creare-programare",
            title: "Manuellen Termin erstellen",
            summary:
              "Telefonisch oder am Empfang vereinbarte Termine erfassen.",
            items: [
              {
                title: "Erforderliche Angaben",
                body:
                  "Erfassen Sie genügend Informationen zur Identifikation und Benachrichtigung. Medizinische Notizen gehören nicht in administrative Felder.",
                bullets: [
                  "Patientenname und Telefonnummer.",
                  "Datum, Uhrzeit, Standort und Dauer.",
                  "Buchungsquelle und nur notwendige administrative Hinweise.",
                ],
              },
              {
                title: "Nach dem Speichern",
                body:
                  "Prüfen Sie den Termin im Kalender und bestätigen Sie ihn nach dem Praxisablauf. Falsche Daten oder Standorte sofort korrigieren.",
                bullets: [
                  "Keinen zweiten Termin für dieselbe Anfrage anlegen.",
                  "Wenn möglich neu planen statt stornieren und duplizieren.",
                  "Patienten über wichtige Änderungen informieren.",
                ],
              },
            ],
          },
          {
            id: "sms",
            title: "Bestätigungs- und Erinnerungs-SMS",
            summary:
              "Wie Terminbenachrichtigungen versendet und abgerechnet werden.",
            items: [
              {
                title: "SMS-Versand",
                body:
                  "RomDoc kann bei Terminbestätigung und etwa 24 Stunden vorher eine Erinnerung senden, wenn Dienst und Benachrichtigungstyp aktiviert sind.",
                bullets: [
                  "Die Telefonnummer des Patienten muss gültig sein.",
                  "Dasselbe Ereignis nicht mehrfach für einen Termin senden.",
                  "Übersprungene oder fehlgeschlagene Nachrichten gelten nicht als erfolgreich versendet.",
                ],
              },
              {
                title: "SMS-Kosten",
                body:
                  "Erfolgreich versendete SMS werden getrennt vom Arzt-Abonnement erfasst. Die geltenden Kosten erscheinen in Abrechnung und Nutzungsbericht.",
                bullets: [
                  "Die Zahl der versendeten SMS monatlich prüfen.",
                  "Bestätigungen und Erinnerungen werden getrennt ausgewiesen.",
                  "Support kontaktieren, wenn eine gesendete Nachricht im Bericht fehlt.",
                ],
              },
            ],
          },
          {
            id: "personal",
            title: "Personal und delegierte Aufgaben",
            summary:
              "Administrativen Zugriff ohne Weitergabe des Arztkontos bereitstellen.",
            items: [
              {
                title: "Getrennte Personalkonten",
                body:
                  "Fügen Sie Personal über die vorgesehene Funktion hinzu und vergeben Sie den benötigten Zugriff. Das Arztpasswort darf nicht weitergegeben werden.",
                bullets: [
                  "Jede Person verwendet ein eigenes Konto.",
                  "Zugriff ist auf den zugewiesenen Arzt und die Tätigkeit begrenzt.",
                  "Zugriff nach Ende der Zusammenarbeit entfernen.",
                ],
              },
              {
                title: "Verantwortung des Arztes",
                body:
                  "Der Arzt bleibt für die Richtigkeit von Profil, Verfügbarkeit und Handlungen der Praxis verantwortlich.",
                bullets: [
                  "Termine und Personalzugriffe regelmäßig prüfen.",
                  "Falsche administrative Aktionen zeitnah korrigieren.",
                  "Verdächtige Zugriffe dem Support melden.",
                ],
              },
            ],
          },
          {
            id: "abonament",
            title: "Abonnement, Zahlung und Abrechnung",
            summary:
              "Unterschied zwischen unabhängigem Arzt-Abonnement und Klinikfinanzierung.",
            items: [
              {
                title: "Unabhängiger Arzt",
                body:
                  "Ein unabhängiges Arztkonto nutzt das bei der Registrierung angebotene RomDoc-Abonnement. Abonnementzahlung und SMS-Nutzung sind getrennte kommerzielle Abläufe.",
                bullets: [
                  "Das öffentliche Abonnement kostet 60 RON/Monat oder 600 RON/Jahr zuzüglich anwendbarer MwSt.",
                  "Die Zahlung erfolgt über den im Konto verfügbaren Zahlungsablauf.",
                  "Erfolgreich versendete SMS werden separat berechnet.",
                ],
              },
              {
                title: "Von Klinik eingeladener Arzt",
                body:
                  "Bei einem durch eine Klinikorganisation eingeladenen Konto kann die kommerzielle Verantwortung gemäß der konfigurierten Beziehung bei der Organisation liegen.",
                bullets: [
                  "Kein zweites unabhängiges Konto für dieselbe Zusammenarbeit erstellen.",
                  "Klinikmanager um Korrektur von Standort oder Kostenübernahme bitten.",
                  "Support kontaktieren, wenn der Kontotyp nicht zur angenommenen Einladung passt.",
                ],
              },
            ],
          },
          {
            id: "dosar-medical-securitate",
            title: "Medizinische Akte, Datenschutz und Support",
            summary:
              "Medizinische Informationen nur im autorisierten Kontext verwenden.",
            items: [
              {
                title: "Autorisierter medizinischer Zugriff",
                body:
                  "Informationen der Medizinischen Akte nur für den Patienten und Kontext verwenden, für den Zugriff autorisiert ist. Keine medizinischen Daten in öffentliche oder administrative Felder kopieren.",
                bullets: [
                  "Nur für die Behandlung notwendige Informationen öffnen.",
                  "Dokumente nicht über unsichere Kanäle verteilen.",
                  "Widerruf oder Ablauf des Patientenzugriffs respektieren.",
                ],
              },
              {
                title: "Probleme und Vorfälle",
                body:
                  "Bei technischen Fehlern, ungewöhnlichem Zugriff oder falschen Informationen die Kontaktseite verwenden und administrative Angaben ohne medizinische Daten übermitteln.",
                bullets: [
                  "Seite und ausgeführte Aktion nennen.",
                  "Ungefähres Datum und Uhrzeit des Problems angeben.",
                  "Keine Passwörter, Zugangscodes oder medizinischen Dokumente über das allgemeine Formular senden.",
                ],
              },
            ],
          },
        ],
      },
      {
        id: "clinics",
        navigationLabel: "Klinikorganisationen",
        eyebrow: "Organisationsverwaltung",
        title: "Leitfaden für Klinikorganisationen",
        description:
          "Anleitungen für Manager zu Standorten, Arzteinladungen, Abonnementübernahme, Abrechnung, SMS und Organisationssicherheit.",
        quickStartTitle: "Schnellstart für Organisationen",
        quickStart: [
          "Managerkonto der richtigen Organisation öffnen.",
          "Standorte und Rechnungsdaten der Organisation prüfen.",
          "Ärzte mit der korrekten E-Mail-Adresse einladen.",
          "Angenommene Ärzte Standorten und der geltenden Kostenübernahme zuordnen.",
          "Abonnements und SMS-Nutzung monatlich prüfen.",
        ],
        categories: [
          {
            id: "organizatie-acces",
            title: "Organisationszugriff und Kontosicherheit",
            summary:
              "Das Managerkonto für die richtige Organisation verwenden.",
            items: [
              {
                title: "Organisations-Dashboard",
                body:
                  "Nach der Anmeldung sieht ein Manager nur Organisationen und Funktionen mit aktivem Zugriff. Vor Änderungen den Organisationsnamen prüfen.",
                bullets: [
                  "Kein gemeinsames Konto für mehrere Manager verwenden.",
                  "Managerzugriff vom persönlichen Arztkonto trennen.",
                  "Unbekannte Konten oder Organisationen sofort melden.",
                ],
              },
              {
                title: "Administrative Berechtigungen",
                body:
                  "Ein Manager verwaltet Organisationsstruktur, Ärzte, Standorte und verfügbare kommerzielle Informationen. Die Rolle gewährt keinen allgemeinen medizinischen Patientenzugriff.",
                bullets: [
                  "Einladungs- und Zuordnungsfunktionen statt Arztkonto verwenden.",
                  "Mitglieder und Zugriffe regelmäßig prüfen.",
                  "Personen entfernen, die die Organisation nicht mehr vertreten.",
                ],
              },
            ],
          },
          {
            id: "locatii-clinica",
            title: "Standorte der Organisation",
            summary:
              "Kliniken und Adressen der Organisation verwalten.",
            items: [
              {
                title: "Standorte hinzufügen und zuordnen",
                body:
                  "Verwenden Sie Standorte, um die Organisation mit ihren Kliniken zu verbinden. Ein öffentlicher Standort benötigt eine korrekte Adresse und den erforderlichen Veröffentlichungsstatus.",
                bullets: [
                  "Vor einem neuen Vorschlag nach einem bestehenden Standort suchen.",
                  "Name, Adresse und Kontaktdaten prüfen.",
                  "Doppelte Einträge derselben Klinik vermeiden.",
                ],
              },
              {
                title: "Ärzte zuordnen",
                body:
                  "Nach Annahme einer Einladung den Arzt dem richtigen Standort zuordnen. Dies unterstützt öffentliches Profil, Termine und Organisationsberichte.",
                bullets: [
                  "Arzt nicht einem Standort zuordnen, an dem er nicht arbeitet.",
                  "Zuordnung bei Änderung der Zusammenarbeit aktualisieren.",
                  "Standort vor Aktivierung der Kostenübernahme prüfen.",
                ],
              },
            ],
          },
          {
            id: "medici-invitatii",
            title: "Arzteinladungen und Konten",
            summary:
              "Ärzte einladen und Kontoannahme verfolgen.",
            items: [
              {
                title: "Einladung senden",
                body:
                  "Geben Sie die E-Mail-Adresse ein, die der Arzt für RomDoc verwendet, und wählen Sie Organisation und Standort.",
                bullets: [
                  "Adresse vor dem Senden mit dem Arzt bestätigen.",
                  "Keine wiederholten Einladungen für dasselbe Konto senden.",
                  "Einladungsstatus vor einer neuen Einladung prüfen.",
                ],
              },
              {
                title: "Nach der Annahme",
                body:
                  "Der Arzt erstellt oder verbindet sein eigenes Konto. Der Manager kann Beziehung, Standort und Zahlungsverantwortung prüfen, ohne die Identität des Arztkontos zu ändern.",
                bullets: [
                  "Das eingeladene Konto bleibt mit der einladenden Organisation verbunden.",
                  "Ein bestehendes unabhängiges Konto nicht manuell umwandeln.",
                  "Bei falscher Zuordnung vor weiteren Konten den Support kontaktieren.",
                ],
              },
            ],
          },
          {
            id: "acoperire-abonamente",
            title: "Verwaltete Ärzte und Abonnementübernahme",
            summary:
              "Festlegen, für welche Ärzte die Organisation Kosten übernimmt.",
            items: [
              {
                title: "Klinikfinanzierte Übernahme",
                body:
                  "Eine aktive Beziehung mit Zahlungsverantwortung der Klinik wird in die Zahl der verwalteten Abonnements aufgenommen.",
                bullets: [
                  "Liste aktiver Ärzte monatlich prüfen.",
                  "Übernahme bei Ende der Zusammenarbeit beenden oder pausieren.",
                  "Keine Übernahme für nicht angenommene Einladungen oder falsche Konten behalten.",
                ],
              },
              {
                title: "Getrennte Kontomodelle",
                body:
                  "Von Kliniken eingeladene Ärzte sollten nicht gleichzeitig ein direktes unabhängiges Abonnement für dasselbe Konto haben.",
                bullets: [
                  "Zahlungsverantwortung wird durch die Organisationsbeziehung festgelegt.",
                  "Kontoinidentität ändert sich nach Erstellung nicht.",
                  "Eine andere kommerzielle Struktur kann ein korrekt neu eingerichtetes Konto erfordern.",
                ],
              },
            ],
          },
          {
            id: "facturare-organizatie",
            title: "Rechnungsdaten und Kosten",
            summary:
              "Abonnements, SMS und Rechnungsinformationen prüfen.",
            items: [
              {
                title: "Organisationsdaten",
                body:
                  "Halten Sie Firmenname, Steueridentifikation, Adresse und Rechnungs-E-Mail korrekt.",
                bullets: [
                  "Daten der rechnungsempfangenden Einheit verwenden.",
                  "Informationen vor Monatsabschluss aktualisieren.",
                  "Anwendbare MwSt.-Behandlung mit der Buchhaltung prüfen.",
                ],
              },
              {
                title: "Monatliche Schätzung",
                body:
                  "Die Abrechnung zeigt verwaltete Ärzte, SMS-Nutzung und geschätzte Kosten. Die offizielle Rechnung wird separat durch RomDoc-Administrator oder Buchhaltungsoperator erfasst.",
                bullets: [
                  "Arztliste mit aktiven Kooperationen vergleichen.",
                  "SMS-Zahl vor Rechnungsstellung prüfen.",
                  "Abweichungen vor Ausstellung der Rechnung melden.",
                ],
              },
            ],
          },
          {
            id: "sms-clinica",
            title: "SMS-Nutzung der Organisation",
            summary:
              "Abrechenbare Nachrichten ohne Offenlegung medizinischer Daten anzeigen.",
            items: [
              {
                title: "Was Manager sehen können",
                body:
                  "Der SMS-Bericht zeigt Zustell- und Abrechnungsmetadaten für von der Organisation finanzierte Ärzte.",
                bullets: [
                  "Anzahl der Bestätigungs- und Erinnerungs-SMS.",
                  "Sendestatus und Abrechnungszeitraum.",
                  "Geschätzte Kosten gemäß geltendem Tarif.",
                ],
              },
              {
                title: "Was nicht angezeigt wird",
                body:
                  "Zum Schutz der Patienten dürfen Organisationsberichte weder SMS-Inhalt, vollständige Telefonnummer, medizinische Notizen noch Dokumente der Medizinischen Akte anzeigen.",
                bullets: [
                  "Kontaktdaten können maskiert sein.",
                  "Manager prüfen Nutzung, nicht klinische Inhalte.",
                  "Technische Untersuchungen erfolgen kontrolliert über den Support.",
                ],
              },
            ],
          },
          {
            id: "confidentialitate-organizatie",
            title: "Datenschutz, Grenzen und Support",
            summary:
              "Organisationsverwaltung von medizinischen Patientendaten trennen.",
            items: [
              {
                title: "Kein Zugriff auf die Medizinische Akte",
                body:
                  "Die Rolle des Klinikorganisations-Managers gewährt keinen Zugriff auf Medizinische Akte, Diagnosen, klinische Notizen oder medizinische Dokumente.",
                bullets: [
                  "Ärzte nicht zur Weitergabe ihres Kontos oder medizinischen Zugriffs auffordern.",
                  "Nur verfügbare administrative und kommerzielle Berichte verwenden.",
                  "Prinzip des minimal notwendigen Zugriffs befolgen.",
                ],
              },
              {
                title: "Support anfordern",
                body:
                  "Bei Problemen mit Einladungen, Standorten, Kostenübernahme oder Abrechnung relevante administrative Kennungen angeben und medizinische Patientendaten vermeiden.",
                bullets: [
                  "Organisation und Dashboard-Bereich nennen.",
                  "Durchgeführte Schritte und beobachtetes Ergebnis beschreiben.",
                  "Keine Passwörter oder medizinischen Dokumente in der ersten Nachricht senden.",
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
