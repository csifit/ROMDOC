import {
  OverviewAccordion,
  OverviewActionCard,
  OverviewActionLink,
} from "@/components/dashboard/platform-operator-overview-ui";
import {
  getPlatformOperatorOverview,
} from "@/lib/i18n/platform-operator-overview";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  requireClinicInvoiceAccess,
} from "@/lib/invoices/require-clinic-invoice-access";

export default async function ManagerDashboardPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    getPlatformOperatorOverview(
      locale
    );

  const invoiceAccess =
    await requireClinicInvoiceAccess();

  const canManageBilling =
    invoiceAccess.ok &&
    invoiceAccess.actor.role ===
      "manager";

  const coreSections = [
    {
      href:
        "/manager-dashboard/users",
      title:
        copy.manager
          .users.title,
      description:
        copy.manager
          .users
          .description,
    },
    {
      href:
        "/manager-dashboard/doctors",
      title:
        copy.manager
          .doctors.title,
      description:
        copy.manager
          .doctors
          .description,
    },
    {
      href:
        "/manager-dashboard/verifications",
      title:
        copy.manager
          .verifications
          .title,
      description:
        copy.manager
          .verifications
          .description,
    },
    {
      href:
        "/manager-dashboard/clinics",
      title:
        copy.manager
          .clinics.title,
      description:
        copy.manager
          .clinics
          .description,
    },
  ] as const;

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {
            copy.manager
              .eyebrow
          }
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-950 sm:text-4xl">
          {
            copy.manager
              .title
          }
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-[1.6] text-gray-600">
          {
            copy.manager
              .description
          }
        </p>
      </header>

      <section className="space-y-[13px]">
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            {
              copy.manager
                .coreOperations
                .title
            }
          </h2>

          <p className="mt-[5px] text-sm text-gray-600">
            {
              copy.manager
                .coreOperations
                .description
            }
          </p>
        </div>

        <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          {coreSections.map(
            (
              section
            ) => (
              <OverviewActionCard
                key={
                  section.href
                }
                href={
                  section.href
                }
                title={
                  section.title
                }
                description={
                  section.description
                }
                actionLabel={
                  copy.common
                    .openSection
                }
              />
            )
          )}
        </div>
      </section>

      <OverviewAccordion
        title={
          copy.manager
            .directoryAndModeration
            .title
        }
        description={
          copy.manager
            .directoryAndModeration
            .description
        }
      >
        <div className="grid gap-[13px] lg:grid-cols-2">
          <OverviewActionLink
            href="/manager-dashboard/cities"
            title={
              copy.manager
                .cities.title
            }
            description={
              copy.manager
                .cities
                .description
            }
            actionLabel={
              copy.common
                .openSection
            }
          />

          <OverviewActionLink
            href="/manager-dashboard/reviews"
            title={
              copy.manager
                .reviews.title
            }
            description={
              copy.manager
                .reviews
                .description
            }
            actionLabel={
              copy.common
                .openSection
            }
          />
        </div>
      </OverviewAccordion>

      <OverviewAccordion
        title={
          copy.manager
            .billing.title
        }
        description={
          copy.manager
            .billing
            .description
        }
        attention={
          !canManageBilling
        }
      >
        {canManageBilling ? (
          <div className="grid gap-[13px] lg:grid-cols-3">
            <OverviewActionLink
              href="/manager-dashboard/invoices"
              title={
                copy.manager
                  .invoices.title
              }
              description={
                copy.manager
                  .invoices
                  .description
              }
              actionLabel={
                copy.common
                  .openSection
              }
            />

            <OverviewActionLink
              href="/manager-dashboard/clinic-sms"
              title={
                copy.manager
                  .clinicSms.title
              }
              description={
                copy.manager
                  .clinicSms
                  .description
              }
              actionLabel={
                copy.common
                  .openSection
              }
            />

            <OverviewActionLink
              href="/manager-dashboard/doctor-sms"
              title={
                copy.manager
                  .doctorSms.title
              }
              description={
                copy.manager
                  .doctorSms
                  .description
              }
              actionLabel={
                copy.common
                  .openSection
              }
            />
          </div>
        ) : (
          <div className="rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-amber-950">
            <h3 className="font-bold">
              {
                copy.manager
                  .billing
                  .noAccessTitle
              }
            </h3>

            <p className="mt-[8px] text-sm leading-[1.55]">
              {
                copy.manager
                  .billing
                  .noAccessDescription
              }
            </p>
          </div>
        )}
      </OverviewAccordion>

      <div className="grid gap-[13px] xl:grid-cols-2">
        <OverviewAccordion
          title={
            copy.manager
              .account.title
          }
          description={
            copy.manager
              .account
              .description
          }
        >
          <OverviewActionLink
            href="/manager-dashboard/security"
            title={
              copy.manager
                .security.title
            }
            description={
              copy.manager
                .security
                .description
            }
            actionLabel={
              copy.common
                .openSection
            }
          />
        </OverviewAccordion>

        <OverviewAccordion
          title={
            copy.manager
              .rules.title
          }
          description={
            copy.manager
              .rules
              .description
          }
        >
          <p className="text-sm leading-[1.6] text-gray-600">
            {
              copy.manager
                .rules
                .description
            }
          </p>
        </OverviewAccordion>
      </div>
    </div>
  );
}
