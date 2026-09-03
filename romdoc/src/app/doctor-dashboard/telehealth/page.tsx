import TelehealthSettingsForm from "@/components/telehealth/telehealth-settings-form";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

export default async function DoctorTelehealthPage() {
  const locale = await getStoredAppLocale();
  const copy = locale === "ro"
    ? { eyebrow: "Telehealth", title: "Consultații video", description: "Configurează oferta independentă de consultații video și contul de plată. Verificarea profesională este separată de telehealth." }
    : locale === "de"
      ? { eyebrow: "Telehealth", title: "Videosprechstunden", description: "Konfigurieren Sie Ihr unabhängiges Videoangebot und Zahlungskonto. Die berufliche Verifizierung ist von Telehealth getrennt." }
      : { eyebrow: "Telehealth", title: "Video consultations", description: "Configure your independent video-consultation offer and payment account. Professional verification is separate from telehealth." };
  return <div className="space-y-[21px]">
    <header><p className="text-sm font-semibold text-[#036661]">{copy.eyebrow}</p><h1 className="mt-[8px] text-3xl font-bold text-gray-900">{copy.title}</h1><p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">{copy.description}</p></header>
    <TelehealthSettingsForm />
  </div>;
}
