import Link from "next/link";

const currentYear =
  new Date().getFullYear();

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
];

const doctorLinks = [
  {
    href: "/register",
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
    label: "Politica privind cookie-urile",
  },
  {
    href: "/informatii-legale",
    label: "Informații legale",
  },
];

const contactLinks = [
  {
    href: "/contact",
    label: "Contact",
  },
  {
    href: "/contact",
    label: "Asistență",
  },
  {
    href: "/contact",
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
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        {title}
      </h2>

      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="romdoc-focus-ring rounded-sm text-sm text-gray-600 transition hover:text-[#036661]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        <section className="sm:col-span-2 lg:col-span-1">
          <Link
            href="/"
            className="romdoc-focus-ring rounded-md text-2xl font-bold tracking-tight text-gray-900"
          >
            RomDoc
          </Link>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            Platformă medicală pentru găsirea medicilor,
            clinicilor și programărilor online în România.
          </p>
        </section>

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
          links={contactLinks}
        />
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            © {currentYear} RomDoc. Toate drepturile rezervate.
          </p>

          <p>
            Informațiile publicate nu înlocuiesc un consult medical.
          </p>
        </div>
      </div>
    </footer>
  );
}
