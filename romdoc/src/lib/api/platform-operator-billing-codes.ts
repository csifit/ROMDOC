export const PLATFORM_OPERATOR_BILLING_CODES = {
  authenticationRequired: "authentication_required",
  accountingRequired: "accounting_permission_required",
  administratorRequired: "administrator_required",
  invalidJson: "invalid_json",
  invalidPrices: "invalid_billing_prices",
  settingsLoaded: "billing_settings_loaded",
  settingsLoadFailed: "billing_settings_load_failed",
  settingsSaved: "billing_settings_saved",
  settingsSaveFailed: "billing_settings_save_failed",
} as const;

export type PlatformOperatorBillingCode =
  (typeof PLATFORM_OPERATOR_BILLING_CODES)[keyof typeof PLATFORM_OPERATOR_BILLING_CODES];
