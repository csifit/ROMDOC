function ClinicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 20h16M6 20V8l6-4 6 4v12M9 11h6M12 8v6"
      />
    </svg>
  );
}

function VerificationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
      />
      <path
        strokeLinecap="round"
        d="M8 3v4M16 3v4M4 10h16"
      />
    </svg>
  );
}

function PatientIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 21a7 7 0 0 1 14 0"
      />
    </svg>
  );
}

const trustItems = [
  {
    title:
      "Clinici aprobate",
    description:
      "Clinicile noi sunt verificate înainte de a deveni vizibile public pe RomDoc.",
    icon:
      <ClinicIcon />,
  },
  {
    title:
      "Medici verificați",
    description:
      "Badge-ul de verificare arată că identitatea și dreptul de practică au fost analizate de RomDoc.",
    icon:
      <VerificationIcon />,
  },
  {
    title:
      "Disponibilitate administrată de medic",
    description:
      "Medicii și personalul autorizat își gestionează programul și cererile de programare.",
    icon:
      <CalendarIcon />,
  },
  {
    title:
      "Cont dedicat pacientului",
    description:
      "Pacienții autentificați își pot urmări programările și istoricul disponibil în cont.",
    icon:
      <PatientIcon />,
  },
];

export default function HomepageTrustSection() {
  return (
    <section
      aria-labelledby="homepage-trust-title"
      className="px-4 pb-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl rounded-3xl bg-[#036661] px-6 py-10 text-white shadow-sm sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
            Încredere și transparență
          </p>

          <h2
            id="homepage-trust-title"
            className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Informații clare pentru alegerea medicului potrivit
          </h2>

          <p className="mt-4 text-base leading-7 text-white/80">
            RomDoc separă accesul la platformă, aprobarea clinicilor și
            verificarea profesională, astfel încât pacienții să înțeleagă
            clar ce înseamnă fiecare indicator.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {trustItems.map(
            (item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#036661]">
                  {item.icon}
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/75">
                  {item.description}
                </p>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}
