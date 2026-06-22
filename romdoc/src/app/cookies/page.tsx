import type {
  Metadata,
} from "next";
import LegalPageShell from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description:
    "Informații despre cookie-urile și tehnologiile similare folosite de RomDoc.",
};

export default function CookiesPage() {
  return (
    <LegalPageShell
      eyebrow="Cookies"
      title="Politica de cookies"
      description="Această pagină explică rolul cookie-urilor și al tehnologiilor similare utilizate de platformă."
      updatedAt="22 iunie 2026"
      notice={
        <>
          Lista exactă a cookie-urilor trebuie completată după auditarea implementării finale de autentificare, analiză și plăți.
        </>
      }
      sections={[
        {
          id: "ce-sunt",
          title: "1. Ce sunt cookie-urile",
          content: (
            <p>
              Cookie-urile sunt fișiere mici stocate de browser pentru a păstra informații necesare funcționării, securității și preferințelor unui serviciu online.
            </p>
          ),
        },
        {
          id: "necesare",
          title: "2. Cookie-uri strict necesare",
          content: (
            <p>
              Pot fi folosite pentru autentificare, menținerea sesiunii, protecția împotriva abuzului și funcționarea formularelor. Acestea sunt necesare pentru furnizarea funcțiilor solicitate.
            </p>
          ),
        },
        {
          id: "preferinte",
          title: "3. Preferințe",
          content: (
            <p>
              Cookie-urile de preferințe pot reține limba, aspectul sau alte opțiuni alese de utilizator.
            </p>
          ),
        },
        {
          id: "analiza",
          title: "4. Analiză și performanță",
          content: (
            <p>
              Dacă vor fi activate instrumente de analiză neesențiale, acestea vor fi documentate și controlate printr-un mecanism de consimțământ adecvat.
            </p>
          ),
        },
        {
          id: "terti",
          title: "5. Servicii terțe",
          content: (
            <p>
              Componente precum Google Maps, Stripe sau alte servicii integrate pot folosi propriile tehnologii de stocare, în funcție de modul în care sunt încărcate și utilizate.
            </p>
          ),
        },
        {
          id: "control",
          title: "6. Controlul cookie-urilor",
          content: (
            <p>
              Utilizatorii pot controla cookie-urile din setările browserului. Dezactivarea celor strict necesare poate împiedica autentificarea sau utilizarea anumitor funcții.
            </p>
          ),
        },
      ]}
    />
  );
}
