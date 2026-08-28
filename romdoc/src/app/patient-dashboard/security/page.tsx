import SharedAccountSecuritySettings from "@/components/security/shared-account-security-settings";
import {
  getAccountSecurityCopy,
} from "@/lib/i18n/account-security";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";

export default async function PatientSecurityPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    getAccountSecurityCopy(
      locale
    );

  return (
    <div className="px-[13px] py-[21px] sm:px-[21px] sm:py-[34px] lg:px-[34px]">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
            {copy.pageEyebrow}
          </p>

          <h1 className="mt-[8px] text-3xl font-bold tracking-tight text-gray-900">
            {copy.pageTitle}
          </h1>

          <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.pageDescription}
          </p>
        </header>

        <div className="mt-[34px]">
          <SharedAccountSecuritySettings
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
