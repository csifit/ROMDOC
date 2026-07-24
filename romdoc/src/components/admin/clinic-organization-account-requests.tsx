import ClinicOrganizationRequestActions from "@/components/admin/clinic-organization-request-actions";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

type Props = {
  locale: AppLocale;
};

type OrganizationRequest = {
  id: string;
  name: string;
  contact_name:
    | string
    | null;
  contact_email:
    | string
    | null;
  contact_phone:
    | string
    | null;
  website:
    | string
    | null;
  registration_city:
    | string
    | null;
  application_message:
    | string
    | null;
  created_at: string;
};

type BillingProfile = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  trade_register_number:
    | string
    | null;
  billing_address: string;
  billing_city: string;
  billing_county: string;
  billing_country: string;
  billing_email: string;
  is_vat_payer: boolean;
  vat_number:
    | string
    | null;
};

const DATE_LOCALE = {
  ro:
    "ro-RO",
  en:
    "en-GB",
  de:
    "de-DE",
} as const;

const COPY = {
  ro: {
    eyebrow:
      "Necesită aprobare",
    title:
      "Cereri noi pentru conturi de organizații medicale",
    description:
      "Verifică datele juridice și de contact înainte de activarea organizației.",
    empty:
      "Nu există cereri noi pentru conturi de organizații medicale.",
    loadFailed:
      "Cererile pentru organizații medicale nu au putut fi încărcate.",
    requested:
      "Cerere trimisă",
    contact:
      "Persoană de contact",
    email:
      "E-mail",
    phone:
      "Telefon",
    city:
      "Oraș",
    website:
      "Website",
    company:
      "Date de facturare",
    taxId:
      "Cod fiscal",
    tradeRegister:
      "Registrul Comerțului",
    billingAddress:
      "Adresă de facturare",
    billingEmail:
      "E-mail de facturare",
    vat:
      "Plătitor TVA",
    vatNumber:
      "Cod TVA",
    yes:
      "Da",
    no:
      "Nu",
    message:
      "Mesajul solicitantului",
    pending:
      "În așteptare",
    none:
      "Nespecificat",
  },
  en: {
    eyebrow:
      "Approval required",
    title:
      "New clinic organisation account requests",
    description:
      "Review the legal and contact details before activating the organisation.",
    empty:
      "There are no new clinic organisation account requests.",
    loadFailed:
      "Clinic organisation account requests could not be loaded.",
    requested:
      "Requested",
    contact:
      "Contact person",
    email:
      "Email",
    phone:
      "Phone",
    city:
      "City",
    website:
      "Website",
    company:
      "Billing details",
    taxId:
      "Tax ID",
    tradeRegister:
      "Trade register",
    billingAddress:
      "Billing address",
    billingEmail:
      "Billing email",
    vat:
      "VAT payer",
    vatNumber:
      "VAT number",
    yes:
      "Yes",
    no:
      "No",
    message:
      "Applicant message",
    pending:
      "Pending",
    none:
      "Not provided",
  },
  de: {
    eyebrow:
      "Genehmigung erforderlich",
    title:
      "Neue Anträge für Klinikorganisationskonten",
    description:
      "Prüfen Sie die rechtlichen Angaben und Kontaktdaten, bevor Sie die Organisation aktivieren.",
    empty:
      "Es gibt keine neuen Anträge für Klinikorganisationskonten.",
    loadFailed:
      "Die Anträge für Klinikorganisationskonten konnten nicht geladen werden.",
    requested:
      "Beantragt",
    contact:
      "Kontaktperson",
    email:
      "E-Mail",
    phone:
      "Telefon",
    city:
      "Stadt",
    website:
      "Website",
    company:
      "Rechnungsdaten",
    taxId:
      "Steuernummer",
    tradeRegister:
      "Handelsregister",
    billingAddress:
      "Rechnungsadresse",
    billingEmail:
      "Rechnungs-E-Mail",
    vat:
      "Mehrwertsteuerpflichtig",
    vatNumber:
      "USt-IdNr.",
    yes:
      "Ja",
    no:
      "Nein",
    message:
      "Nachricht des Antragstellers",
    pending:
      "Ausstehend",
    none:
      "Nicht angegeben",
  },
} satisfies
  Record<
    AppLocale,
    Record<string, string>
  >;

function formatDate(
  value: string,
  locale: AppLocale
) {
  return new Intl
    .DateTimeFormat(
      DATE_LOCALE[
        locale
      ],
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
        timeZone:
          "Europe/Bucharest",
      }
    )
    .format(
      new Date(
        value
      )
    );
}

export default async function
ClinicOrganizationAccountRequests({
  locale,
}: Props) {
  const copy =
    COPY[locale];

  const admin =
    createAdminClient();

  const {
    data:
      organizationData,
    error:
      organizationsError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .select(`
        id,
        name,
        contact_name,
        contact_email,
        contact_phone,
        website,
        registration_city,
        application_message,
        created_at
      `)
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    organizationsError
  ) {
    console.error(
      "Pending Clinic Organisation account requests query failed:",
      organizationsError
    );

    return (
      <section className="rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-red-800 shadow-sm">
        <h2 className="font-bold">
          {copy.title}
        </h2>

        <p className="mt-[8px] text-sm">
          {copy.loadFailed}
        </p>
      </section>
    );
  }

  const organizations =
    (
      organizationData ??
      []
    ) as
      OrganizationRequest[];

  const organizationIds =
    organizations.map(
      (
        organization
      ) =>
        organization.id
    );

  const {
    data:
      billingData,
    error:
      billingError,
  } =
    organizationIds.length >
    0
      ? await admin
          .from(
            "clinic_organization_billing_profiles"
          )
          .select(`
            organization_id,
            company_name,
            tax_id,
            trade_register_number,
            billing_address,
            billing_city,
            billing_county,
            billing_country,
            billing_email,
            is_vat_payer,
            vat_number
          `)
          .in(
            "organization_id",
            organizationIds
          )
      : {
          data:
            [],
          error:
            null,
        };

  if (
    billingError
  ) {
    console.error(
      "Pending Clinic Organisation billing query failed:",
      billingError
    );
  }

  const billingByOrganization =
    new Map(
      (
        (
          billingData ??
          []
        ) as
          BillingProfile[]
      ).map(
        (
          billing
        ) => [
          billing.organization_id,
          billing,
        ]
      )
    );

  return (
    <section className="rounded-[21px] border border-amber-200 bg-white p-[21px] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-[13px]">
        <div>
          <p className="text-sm font-semibold text-[#9A4F35]">
            {copy.eyebrow}
          </p>

          <h2 className="mt-[5px] text-xl font-bold text-gray-950">
            {copy.title}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {copy.description}
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-[13px] py-[5px] text-sm font-bold text-amber-950">
          {
            organizations.length
          }
        </span>
      </div>

      {organizations.length ===
      0 ? (
        <p className="mt-[21px] rounded-[13px] bg-gray-50 p-[13px] text-sm text-gray-600">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-[21px] space-y-[13px]">
          {organizations.map(
            (
              organization
            ) => {
              const billing =
                billingByOrganization.get(
                  organization.id
                );

              return (
                <article
                  key={
                    organization.id
                  }
                  className="rounded-[13px] border border-gray-200 bg-white p-[13px]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-[13px]">
                    <div>
                      <h3 className="text-lg font-bold text-gray-950">
                        {organization.name}
                      </h3>

                      <p className="mt-[5px] text-xs text-gray-500">
                        {copy.requested}
                        :{" "}
                        {formatDate(
                          organization.created_at,
                          locale
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-[8px] py-[5px] text-xs font-semibold text-amber-900">
                      {copy.pending}
                    </span>
                  </div>

                  <div className="mt-[13px] grid gap-[13px] md:grid-cols-2">
                    <div className="rounded-[8px] bg-gray-50 p-[13px] text-sm leading-6 text-gray-700">
                      <p className="font-semibold text-gray-950">
                        {copy.contact}
                      </p>

                      <p className="mt-[5px]">
                        {organization.contact_name ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.email}
                          :
                        </span>{" "}
                        {organization.contact_email ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.phone}
                          :
                        </span>{" "}
                        {organization.contact_phone ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.city}
                          :
                        </span>{" "}
                        {organization.registration_city ??
                          copy.none}
                      </p>

                      <p className="mt-[5px] break-all">
                        <span className="font-medium">
                          {copy.website}
                          :
                        </span>{" "}
                        {organization.website ??
                          copy.none}
                      </p>
                    </div>

                    <div className="rounded-[8px] bg-gray-50 p-[13px] text-sm leading-6 text-gray-700">
                      <p className="font-semibold text-gray-950">
                        {copy.company}
                      </p>

                      <p className="mt-[5px]">
                        {billing?.company_name ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.taxId}
                          :
                        </span>{" "}
                        {billing?.tax_id ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.tradeRegister}
                          :
                        </span>{" "}
                        {billing?.trade_register_number ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.billingAddress}
                          :
                        </span>{" "}
                        {billing
                          ? `${billing.billing_address}, ${billing.billing_city}, ${billing.billing_county}, ${billing.billing_country}`
                          : copy.none}
                      </p>

                      <p className="mt-[5px] break-all">
                        <span className="font-medium">
                          {copy.billingEmail}
                          :
                        </span>{" "}
                        {billing?.billing_email ??
                          copy.none}
                      </p>

                      <p className="mt-[5px]">
                        <span className="font-medium">
                          {copy.vat}
                          :
                        </span>{" "}
                        {billing
                          ? billing.is_vat_payer
                            ? copy.yes
                            : copy.no
                          : copy.none}
                      </p>

                      {billing?.vat_number && (
                        <p className="mt-[5px]">
                          <span className="font-medium">
                            {copy.vatNumber}
                            :
                          </span>{" "}
                          {billing.vat_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {organization.application_message && (
                    <div className="mt-[13px] rounded-[8px] border border-gray-200 bg-white p-[13px] text-sm leading-6 text-gray-700">
                      <p className="font-semibold text-gray-950">
                        {copy.message}
                      </p>

                      <p className="mt-[5px] whitespace-pre-wrap">
                        {
                          organization.application_message
                        }
                      </p>
                    </div>
                  )}

                  <ClinicOrganizationRequestActions
                    organizationId={
                      organization.id
                    }
                    organizationName={
                      organization.name
                    }
                    locale={
                      locale
                    }
                  />
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
