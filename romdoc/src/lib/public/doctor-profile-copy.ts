import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

export const DOCTOR_PROFILE_COPY = {
  ro: {
    photoAlt: "Fotografie de profil pentru {doctorName}",
    profileEyebrow: "Profil medical",
    ratingLabel: "Evaluare {rating} din 5",
    reviewSingular: "recenzie",
    reviewPlural: "recenzii",
    yearsExperience: "{years} ani experiență",
    priceFrom: "De la {price} RON",
    verifiedDescription: "RomDoc a verificat informațiile profesionale și documentele transmise de acest medic. Insigna nu înseamnă că RomDoc a emis licența medicală.",
    servicesEyebrow: "Servicii",
    servicesTitle: "Servicii și tarife",
    servicesDescription: "Tarifele afișate sunt orientative. Clinica poate confirma prețul final în funcție de serviciul selectat.",
    clinicsEyebrow: "Clinici",
    clinicsTitle: "Locații disponibile",
    openMaps: "Deschide în Google Maps",
    clinicWebsite: "Website clinică",
    clinicsEmpty: "Locațiile aprobate ale acestui medic nu sunt încă disponibile.",
    aboutEyebrow: "Despre medic",
    aboutTitle: "Experiență profesională",
    biographyFallback: "Informațiile despre acest medic vor fi disponibile în curând.",
    contactEyebrow: "Contact",
    contactTitle: "Date de contact",
    phone: "Telefon",
    email: "E-mail"
  },
  en: {
    photoAlt: "Profile photo for {doctorName}",
    profileEyebrow: "Medical profile",
    ratingLabel: "Rating {rating} out of 5",
    reviewSingular: "review",
    reviewPlural: "reviews",
    yearsExperience: "{years} years of experience",
    priceFrom: "From {price} RON",
    verifiedDescription: "RomDoc has reviewed the professional information and documents submitted by this doctor. The badge does not mean that RomDoc issued the medical licence.",
    servicesEyebrow: "Services",
    servicesTitle: "Services and fees",
    servicesDescription: "Displayed fees are indicative. The clinic can confirm the final price based on the selected service.",
    clinicsEyebrow: "Clinics",
    clinicsTitle: "Available locations",
    openMaps: "Open in Google Maps",
    clinicWebsite: "Clinic website",
    clinicsEmpty: "This doctor’s approved locations are not available yet.",
    aboutEyebrow: "About the doctor",
    aboutTitle: "Professional experience",
    biographyFallback: "Information about this doctor will be available soon.",
    contactEyebrow: "Contact",
    contactTitle: "Contact details",
    phone: "Phone",
    email: "Email"
  },
  de: {
    photoAlt: "Profilfoto von {doctorName}",
    profileEyebrow: "Medizinisches Profil",
    ratingLabel: "Bewertung {rating} von 5",
    reviewSingular: "Bewertung",
    reviewPlural: "Bewertungen",
    yearsExperience: "{years} Jahre Erfahrung",
    priceFrom: "Ab {price} RON",
    verifiedDescription: "RomDoc hat die beruflichen Angaben und die vom Arzt eingereichten Dokumente geprüft. Das Abzeichen bedeutet nicht, dass RomDoc die ärztliche Zulassung erteilt hat.",
    servicesEyebrow: "Leistungen",
    servicesTitle: "Leistungen und Preise",
    servicesDescription: "Die angezeigten Preise sind Richtwerte. Die Klinik kann den endgültigen Preis je nach ausgewählter Leistung bestätigen.",
    clinicsEyebrow: "Kliniken",
    clinicsTitle: "Verfügbare Standorte",
    openMaps: "In Google Maps öffnen",
    clinicWebsite: "Klinik-Website",
    clinicsEmpty: "Die genehmigten Standorte dieses Arztes sind noch nicht verfügbar.",
    aboutEyebrow: "Über den Arzt",
    aboutTitle: "Berufserfahrung",
    biographyFallback: "Informationen über diesen Arzt werden in Kürze verfügbar sein.",
    contactEyebrow: "Kontakt",
    contactTitle: "Kontaktdaten",
    phone: "Telefon",
    email: "E-Mail"
  }
} as const satisfies Record<AppLocale, Record<string, string>>;

export function interpolatePublicCopy(
  template: string,
  values: Record<string, string>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, value),
    template
  );
}
