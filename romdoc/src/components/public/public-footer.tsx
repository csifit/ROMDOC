import Link from "next/link";

const platformLinks = [
  {
    href: "/",
    label: "Acasă",
  },
  {
    href: "/medici",
    label: "Medici",
  },
  {
    href: "/#specialitati",
    label: "Specialități",
  },
  {
    href: "/#orase",
    label: "Orașe",
  },
  {
    href: "/register",
    label: "Creează cont",
  },
  {
    href: "/login",
    label: "Autentificare",
  },
];

const doctorLinks = [
  {
    href: "/register?role=doctor",
    label: "Înscrie-te ca medic",
  },
  {
    href: "/doctor-application",
    label: "Abonament medic",
  },
  {
    href: "/login",
    label: "Autentificare medic",
  },
  {
    href: "/informatii-legale#verificare-profesionala",
    label: "Verificare profesională",
  },
];

const legalLinks = [
  {
    href: "/termeni-si-conditii",
    label: "Termeni și condiții",
  },
  {
    href: "/confidentialitate",
    label: "Politica de confidențialitate",
  },
  {
    href: "/cookies",
    label: "Politica de cookies",
  },
  {
    href: "/informatii-legale",
    label: "Informații legale",
  },
];

const supportLinks = [
  {
    href: "/contact",
    label: "Contact",
  },
  {
    href: "/contact#suport",
    label: "Suport",
  },
  {
    href: "/contact#raporteaza-problema",
    label: "Raportează o problemă",
  },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{
    href: string;
    label: string;
  }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-900">
        {title}
      </h2>

      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="romdoc-focus-ring rounded-sm text-sm text-gray-600 transition hover:text-[#036661]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link
              href="/"
              className="romdoc-focus-ring inline-flex rounded-sm text-2xl font-bold tracking-tight text-[#036661]"
            >
              RomDoc
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">
              Platformă multilingvă pentru descoperirea medicilor, clinicilor și programărilor medicale.
            </p>

            <p className="mt-4 max-w-sm text-xs leading-5 text-gray-500">
              RomDoc facilitează căutarea și programarea. Informațiile publicate nu înlocuiesc consultația, diagnosticul sau tratamentul medical.
            </p>
          </div>

          <FooterColumn
            title="Platformă"
            links={platformLinks}
          />

          <FooterColumn
            title="Pentru medici"
            links={doctorLinks}
          />

          <FooterColumn
            title="Legal"
            links={legalLinks}
          />

          <FooterColumn
            title="Contact"
            links={supportLinks}
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 RomDoc. Toate drepturile rezervate.
          </p>

          <p>
            Serviciu digital de intermediere a programărilor medicale.
          </p>
        </div>
      </div>
    </footer>
  );
}
