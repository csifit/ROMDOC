import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);
const projectRoot = path.resolve(
  scriptDirectory,
  ".."
);

const translations = {
  ro: {
    checkoutSuccess:
      "Plata a fost transmisă către Stripe. Activarea finală este realizată automat după confirmarea webhookului securizat.",
    checkoutCancelled:
      "Plata a fost anulată. Poți selecta din nou planul dorit când ești pregătit.",
    eyebrow: "Cont medic RomDoc",
    applicant: "Candidat",
    nameUnavailable: "Nume indisponibil",
    applicationSubmitted: "Cerere trimisă",
    applicationStatus: "Status cerere: {status}",
    invitationAccepted: "momentul acceptării invitației",
    clinicCoverageNotice:
      "Abonamentul tău este acoperit de clinică din {date}. Nu este necesară plata individuală prin Stripe.",
    currentPlan: "Plan curent",
    yearlyPlan: "Abonament anual",
    monthlyPlan: "Abonament lunar",
    yearlyBilling: "Facturare o dată pe an",
    monthlyBilling: "Facturare în fiecare lună",
    subscriptionStatus: "Status abonament",
    currentPeriodEnds:
      "Perioada curentă se încheie la {date}.",
    nextBillingUnavailable:
      "Data următoarei facturări nu este disponibilă.",
    cancellationScheduled:
      "Abonamentul este programat pentru anulare la sfârșitul perioadei curente.",
    clinicCoveredTitle:
      "Abonament acoperit de clinică",
    clinicCoveredDescription:
      "Clinica gestionează plata abonamentului tău RomDoc. Următorul pas pentru tine este să finalizezi datele profesionale și verificarea profilului de medic.",
    manageTitle: "Administrarea abonamentului",
    manageDescription:
      "În portalul Stripe poți schimba planul lunar sau anual, metoda de plată și informațiile de facturare.",
    choosePlanTitle:
      "Alege planul de abonament",
    choosePlanDescription:
      "Selectează facturarea lunară sau anuală. Accesul la platforma medicilor este activat după confirmarea plății Stripe.",
    openDoctorDashboard:
      "Deschide panoul medicului",
    status: {
      clinicCovered: {
        title:
          "Abonamentul este acoperit de clinică",
        description:
          "Contul tău de medic a fost creat printr-o invitație de clinică. Plata abonamentului RomDoc este gestionată de clinică.",
        badge: "Plătit de clinică",
      },
      active: {
        title: "Abonamentul este activ",
        description:
          "Contul tău de medic este activ și ai acces la serviciile platformei.",
        badge: "Activ",
      },
      pastDue: {
        title:
          "Plata abonamentului necesită atenție",
        description:
          "Actualizează metoda de plată în portalul de facturare.",
        badge: "Plată restantă",
      },
      inactive: {
        title: "Abonamentul nu este activ",
        description:
          "Abonamentul trebuie reactivat pentru acces complet la serviciile de medic.",
        badge: "Inactiv",
      },
      processing: {
        title:
          "Plata este în curs de procesare",
        description:
          "Așteptăm confirmarea securizată de la Stripe. Pagina se va actualiza după procesarea webhookului.",
        badge: "În procesare",
      },
      approved: {
        title: "Contul de medic este activ",
        description:
          "Plata a fost confirmată și contul a fost activat.",
        badge: "Activ",
      },
      rejected: {
        title: "Cererea nu poate continua",
        description:
          "Contactează echipa RomDoc pentru informații suplimentare.",
        badge: "Respinsă",
      },
      cancelled: {
        title: "Cererea a fost anulată",
        description:
          "Poți contacta echipa RomDoc pentru reactivarea procesului.",
        badge: "Anulată",
      },
      pending: {
        title: "Activează abonamentul RomDoc",
        description:
          "Adresa de e-mail a fost confirmată. Următorul pas este activarea abonamentului de medic.",
        badge: "Plată necesară",
      },
    },
    subscriptionStatuses: {
      active: "Activ",
      trialing: "Perioadă de probă",
      pastDue: "Plată restantă",
      canceled: "Anulat",
      unpaid: "Neplătit",
      incomplete: "Plată incompletă",
      incompleteExpired: "Plată expirată",
      paused: "Suspendat",
    },
    applicationStatuses: {
      pendingPayment: "Plată necesară",
      paymentProcessing: "Plată în procesare",
      paid: "Plătită",
      approved: "Aprobată",
      rejected: "Respinsă",
      cancelled: "Anulată",
    },
    checkout: {
      monthlyTitle: "Abonament lunar",
      monthlyPrice: "{price} + TVA / lună",
      monthlyDescription:
        "Facturare lunară recurentă. Poți administra abonamentul ulterior din portalul Stripe.",
      monthlyButton:
        "Activează abonamentul lunar",
      yearlyTitle: "Abonament anual",
      yearlyPrice: "{price} + TVA / an",
      yearlyDescription:
        "Facturare anuală recurentă, cu un cost mai avantajos decât plata lunară.",
      yearlyButton:
        "Activează abonamentul anual",
      openingCheckout:
        "Se deschide pagina de plată...",
      genericError:
        "Pagina de plată nu a putut fi deschisă.",
    },
    manage: {
      button: "Administrează abonamentul",
      opening: "Se deschide...",
      genericError:
        "Portalul de facturare nu a putut fi deschis.",
    },
  },
  en: {
    checkoutSuccess:
      "The payment was submitted to Stripe. Final activation happens automatically after the secure webhook is confirmed.",
    checkoutCancelled:
      "The payment was cancelled. You can select a plan again whenever you are ready.",
    eyebrow: "RomDoc Doctor account",
    applicant: "Applicant",
    nameUnavailable: "Name unavailable",
    applicationSubmitted: "Application submitted",
    applicationStatus: "Application status: {status}",
    invitationAccepted:
      "the moment the invitation was accepted",
    clinicCoverageNotice:
      "Your subscription has been covered by the clinic since {date}. An individual Stripe payment is not required.",
    currentPlan: "Current plan",
    yearlyPlan: "Yearly subscription",
    monthlyPlan: "Monthly subscription",
    yearlyBilling: "Billed once per year",
    monthlyBilling: "Billed every month",
    subscriptionStatus: "Subscription status",
    currentPeriodEnds:
      "The current period ends on {date}.",
    nextBillingUnavailable:
      "The next billing date is unavailable.",
    cancellationScheduled:
      "The subscription is scheduled to cancel at the end of the current period.",
    clinicCoveredTitle:
      "Subscription covered by the clinic",
    clinicCoveredDescription:
      "The clinic manages payment for your RomDoc subscription. Your next step is to complete your professional details and Doctor profile verification.",
    manageTitle: "Manage subscription",
    manageDescription:
      "In the Stripe portal you can change the monthly or yearly plan, payment method and billing information.",
    choosePlanTitle:
      "Choose a subscription plan",
    choosePlanDescription:
      "Select monthly or yearly billing. Access to the Doctor platform is activated after Stripe confirms the payment.",
    openDoctorDashboard:
      "Open Doctor dashboard",
    status: {
      clinicCovered: {
        title:
          "The subscription is covered by the clinic",
        description:
          "Your Doctor account was created through a clinic invitation. The clinic manages payment for the RomDoc subscription.",
        badge: "Clinic-paid",
      },
      active: {
        title: "The subscription is active",
        description:
          "Your Doctor account is active and you have access to the platform services.",
        badge: "Active",
      },
      pastDue: {
        title:
          "The subscription payment needs attention",
        description:
          "Update the payment method in the billing portal.",
        badge: "Past due",
      },
      inactive: {
        title: "The subscription is inactive",
        description:
          "The subscription must be reactivated for full access to Doctor services.",
        badge: "Inactive",
      },
      processing: {
        title: "The payment is processing",
        description:
          "We are waiting for Stripe's secure confirmation. The page will update after the webhook is processed.",
        badge: "Processing",
      },
      approved: {
        title: "The Doctor account is active",
        description:
          "The payment was confirmed and the account was activated.",
        badge: "Active",
      },
      rejected: {
        title: "The application cannot continue",
        description:
          "Contact the RomDoc team for additional information.",
        badge: "Rejected",
      },
      cancelled: {
        title: "The application was cancelled",
        description:
          "You can contact the RomDoc team to reactivate the process.",
        badge: "Cancelled",
      },
      pending: {
        title:
          "Activate your RomDoc subscription",
        description:
          "Your email address has been confirmed. The next step is to activate the Doctor subscription.",
        badge: "Payment required",
      },
    },
    subscriptionStatuses: {
      active: "Active",
      trialing: "Trial period",
      pastDue: "Past due",
      canceled: "Cancelled",
      unpaid: "Unpaid",
      incomplete: "Incomplete payment",
      incompleteExpired: "Payment expired",
      paused: "Paused",
    },
    applicationStatuses: {
      pendingPayment: "Payment required",
      paymentProcessing: "Payment processing",
      paid: "Paid",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    },
    checkout: {
      monthlyTitle: "Monthly subscription",
      monthlyPrice: "{price} + VAT / month",
      monthlyDescription:
        "Recurring monthly billing. You can manage the subscription later from the Stripe portal.",
      monthlyButton:
        "Activate monthly subscription",
      yearlyTitle: "Yearly subscription",
      yearlyPrice: "{price} + VAT / year",
      yearlyDescription:
        "Recurring yearly billing at a lower cost than paying monthly.",
      yearlyButton:
        "Activate yearly subscription",
      openingCheckout:
        "Opening the payment page...",
      genericError:
        "The payment page could not be opened.",
    },
    manage: {
      button: "Manage subscription",
      opening: "Opening...",
      genericError:
        "The billing portal could not be opened.",
    },
  },
  de: {
    checkoutSuccess:
      "Die Zahlung wurde an Stripe übermittelt. Die endgültige Aktivierung erfolgt automatisch nach Bestätigung des sicheren Webhooks.",
    checkoutCancelled:
      "Die Zahlung wurde abgebrochen. Sie können den gewünschten Tarif erneut auswählen, sobald Sie bereit sind.",
    eyebrow: "RomDoc-Arztkonto",
    applicant: "Antragsteller",
    nameUnavailable: "Name nicht verfügbar",
    applicationSubmitted: "Antrag eingereicht",
    applicationStatus: "Antragsstatus: {status}",
    invitationAccepted:
      "dem Zeitpunkt der Annahme der Einladung",
    clinicCoverageNotice:
      "Ihr Abonnement wird seit {date} von der Klinik übernommen. Eine individuelle Zahlung über Stripe ist nicht erforderlich.",
    currentPlan: "Aktueller Tarif",
    yearlyPlan: "Jahresabonnement",
    monthlyPlan: "Monatsabonnement",
    yearlyBilling: "Jährliche Abrechnung",
    monthlyBilling: "Monatliche Abrechnung",
    subscriptionStatus: "Abonnementstatus",
    currentPeriodEnds:
      "Der aktuelle Zeitraum endet am {date}.",
    nextBillingUnavailable:
      "Das nächste Abrechnungsdatum ist nicht verfügbar.",
    cancellationScheduled:
      "Das Abonnement wird zum Ende des aktuellen Zeitraums gekündigt.",
    clinicCoveredTitle:
      "Abonnement wird von der Klinik übernommen",
    clinicCoveredDescription:
      "Die Klinik verwaltet die Zahlung Ihres RomDoc-Abonnements. Als Nächstes vervollständigen Sie Ihre beruflichen Angaben und die Verifizierung Ihres Arztprofils.",
    manageTitle: "Abonnement verwalten",
    manageDescription:
      "Im Stripe-Portal können Sie zwischen Monats- und Jahrestarif wechseln sowie Zahlungsmethode und Rechnungsdaten bearbeiten.",
    choosePlanTitle:
      "Abonnement auswählen",
    choosePlanDescription:
      "Wählen Sie monatliche oder jährliche Abrechnung. Der Zugang zur Ärzteplattform wird nach Bestätigung der Zahlung durch Stripe aktiviert.",
    openDoctorDashboard:
      "Ärzte-Dashboard öffnen",
    status: {
      clinicCovered: {
        title:
          "Das Abonnement wird von der Klinik übernommen",
        description:
          "Ihr Arztkonto wurde über eine Klinikeinladung erstellt. Die Klinik verwaltet die Zahlung des RomDoc-Abonnements.",
        badge: "Von Klinik bezahlt",
      },
      active: {
        title: "Das Abonnement ist aktiv",
        description:
          "Ihr Arztkonto ist aktiv und Sie haben Zugang zu den Plattformdiensten.",
        badge: "Aktiv",
      },
      pastDue: {
        title:
          "Die Abonnementzahlung erfordert Aufmerksamkeit",
        description:
          "Aktualisieren Sie die Zahlungsmethode im Abrechnungsportal.",
        badge: "Überfällig",
      },
      inactive: {
        title: "Das Abonnement ist nicht aktiv",
        description:
          "Das Abonnement muss für den vollständigen Zugang zu den Arztdiensten reaktiviert werden.",
        badge: "Inaktiv",
      },
      processing: {
        title: "Die Zahlung wird verarbeitet",
        description:
          "Wir warten auf die sichere Bestätigung von Stripe. Die Seite wird nach Verarbeitung des Webhooks aktualisiert.",
        badge: "In Bearbeitung",
      },
      approved: {
        title: "Das Arztkonto ist aktiv",
        description:
          "Die Zahlung wurde bestätigt und das Konto aktiviert.",
        badge: "Aktiv",
      },
      rejected: {
        title: "Der Antrag kann nicht fortgesetzt werden",
        description:
          "Kontaktieren Sie das RomDoc-Team für weitere Informationen.",
        badge: "Abgelehnt",
      },
      cancelled: {
        title: "Der Antrag wurde storniert",
        description:
          "Sie können das RomDoc-Team kontaktieren, um den Vorgang wieder zu aktivieren.",
        badge: "Storniert",
      },
      pending: {
        title:
          "RomDoc-Abonnement aktivieren",
        description:
          "Ihre E-Mail-Adresse wurde bestätigt. Als Nächstes aktivieren Sie das Arztabonnement.",
        badge: "Zahlung erforderlich",
      },
    },
    subscriptionStatuses: {
      active: "Aktiv",
      trialing: "Testzeitraum",
      pastDue: "Überfällig",
      canceled: "Gekündigt",
      unpaid: "Unbezahlt",
      incomplete: "Unvollständige Zahlung",
      incompleteExpired: "Zahlung abgelaufen",
      paused: "Pausiert",
    },
    applicationStatuses: {
      pendingPayment: "Zahlung erforderlich",
      paymentProcessing: "Zahlung wird verarbeitet",
      paid: "Bezahlt",
      approved: "Genehmigt",
      rejected: "Abgelehnt",
      cancelled: "Storniert",
    },
    checkout: {
      monthlyTitle: "Monatsabonnement",
      monthlyPrice:
        "{price} zzgl. MwSt. / Monat",
      monthlyDescription:
        "Wiederkehrende monatliche Abrechnung. Das Abonnement kann später im Stripe-Portal verwaltet werden.",
      monthlyButton:
        "Monatsabonnement aktivieren",
      yearlyTitle: "Jahresabonnement",
      yearlyPrice:
        "{price} zzgl. MwSt. / Jahr",
      yearlyDescription:
        "Wiederkehrende jährliche Abrechnung zu niedrigeren Gesamtkosten als bei monatlicher Zahlung.",
      yearlyButton:
        "Jahresabonnement aktivieren",
      openingCheckout:
        "Zahlungsseite wird geöffnet...",
      genericError:
        "Die Zahlungsseite konnte nicht geöffnet werden.",
    },
    manage: {
      button: "Abonnement verwalten",
      opening: "Wird geöffnet...",
      genericError:
        "Das Abrechnungsportal konnte nicht geöffnet werden.",
    },
  },
};

for (const [locale, dictionary] of Object.entries(translations)) {
  const filePath = path.join(
    projectRoot,
    "messages",
    `${locale}.json`
  );

  const source = await fs.readFile(
    filePath,
    "utf8"
  );
  const messages = JSON.parse(source);

  messages.DoctorApplication = dictionary;

  await fs.writeFile(
    filePath,
    `${JSON.stringify(messages, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Updated messages/${locale}.json`
  );
}
