import type {
  Metadata,
} from "next";
import LegalPageShell from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description:
    "Informații despre modul în care RomDoc prelucrează datele personale.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Confidențialitate"
      title="Politica de confidențialitate"
      description="Această pagină descrie categoriile de date folosite de RomDoc și scopurile principale ale prelucrării."
      updatedAt="22 iunie 2026"
      notice={
        <>
          Documentul este un proiect tehnic. Datele operatorului, temeiurile juridice, perioadele exacte de păstrare și procedura completă pentru exercitarea drepturilor trebuie validate înainte de lansare.
        </>
      }
      sections={[
        {
          id: "date-colectate",
          title: "1. Date pe care le putem colecta",
          content: (
            <>
              <p>
                Date de cont, precum numele, adresa de e-mail, rolul utilizatorului și informațiile de autentificare gestionate prin Supabase Auth.
              </p>
              <p>
                Date de programare, precum medicul, clinica, data, ora, numărul de telefon și mesajele asociate solicitării.
              </p>
              <p>
                Date profesionale pentru medici și date tehnice necesare funcționării și securității platformei.
              </p>
            </>
          ),
        },
        {
          id: "scopuri",
          title: "2. Scopurile prelucrării",
          content: (
            <>
              <p>
                Folosim datele pentru administrarea conturilor, procesarea programărilor, comunicări tranzacționale, securitate, suport și îmbunătățirea serviciului.
              </p>
              <p>
                Nu utilizăm datele medicale pentru publicitate comportamentală.
              </p>
            </>
          ),
        },
        {
          id: "furnizori",
          title: "3. Furnizori tehnici",
          content: (
            <p>
              RomDoc poate utiliza furnizori precum Supabase, Vercel, Resend, Stripe și Google Maps pentru autentificare, găzduire, e-mailuri, plăți și servicii de localizare.
            </p>
          ),
        },
        {
          id: "pastrare",
          title: "4. Păstrarea datelor",
          content: (
            <p>
              Datele sunt păstrate numai atât cât este necesar pentru funcționarea serviciului, respectarea obligațiilor aplicabile, soluționarea disputelor și menținerea securității.
            </p>
          ),
        },
        {
          id: "drepturi",
          title: "5. Drepturile persoanelor vizate",
          content: (
            <p>
              În funcție de situație, utilizatorii pot solicita accesul, rectificarea, ștergerea, restricționarea, portabilitatea sau opoziția față de anumite prelucrări.
            </p>
          ),
        },
        {
          id: "securitate",
          title: "6. Securitatea datelor",
          content: (
            <p>
              Aplicăm măsuri tehnice și organizatorice rezonabile, inclusiv controlul accesului, separarea rolurilor și politici de securitate la nivelul bazei de date.
            </p>
          ),
        },
        {
          id: "contact-confidentialitate",
          title: "7. Contact pentru confidențialitate",
          content: (
            <p>
              Solicitările privind datele personale pot fi transmise prin pagina de contact. Adresa dedicată va fi publicată înainte de lansarea comercială.
            </p>
          ),
        },
      ]}
    />
  );
}
