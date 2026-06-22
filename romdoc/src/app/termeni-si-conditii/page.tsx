import type {
  Metadata,
} from "next";
import LegalPageShell from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description:
    "Termenii generali de utilizare ai platformei RomDoc.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Document legal"
      title="Termeni și condiții"
      description="Această pagină prezintă regulile generale pentru accesarea și utilizarea platformei RomDoc."
      updatedAt="22 iunie 2026"
      notice={
        <>
          Acesta este un text de lucru pentru structura tehnică a platformei. Înainte de lansarea comercială, documentul trebuie completat cu datele operatorului și revizuit de un specialist juridic.
        </>
      }
      sections={[
        {
          id: "despre-platforma",
          title: "1. Despre platformă",
          content: (
            <>
              <p>
                RomDoc este o platformă digitală care permite utilizatorilor să descopere medici și clinici, să consulte informații publice și să trimită solicitări de programare.
              </p>
              <p>
                RomDoc nu furnizează servicii medicale și nu stabilește diagnostice sau tratamente.
              </p>
            </>
          ),
        },
        {
          id: "conturi",
          title: "2. Conturi și eligibilitate",
          content: (
            <>
              <p>
                Unele funcții sunt publice, iar altele necesită un cont valid și o adresă de e-mail verificată.
              </p>
              <p>
                Utilizatorii sunt responsabili pentru corectitudinea datelor introduse și pentru păstrarea confidențialității datelor de autentificare.
              </p>
            </>
          ),
        },
        {
          id: "programari",
          title: "3. Programări",
          content: (
            <>
              <p>
                O solicitare transmisă prin RomDoc nu reprezintă confirmarea automată a unei consultații. Confirmarea depinde de medic sau clinică.
              </p>
              <p>
                Modificarea, anularea și finalizarea unei programări sunt gestionate conform fluxului afișat în contul pacientului și în profilul medicului.
              </p>
            </>
          ),
        },
        {
          id: "continut-medical",
          title: "4. Conținut și informații medicale",
          content: (
            <>
              <p>
                Informațiile publice despre medici și clinici sunt oferite în scop informativ și nu trebuie considerate recomandare medicală personalizată.
              </p>
              <p>
                În caz de urgență medicală, utilizatorii trebuie să contacteze serviciile de urgență corespunzătoare.
              </p>
            </>
          ),
        },
        {
          id: "medici",
          title: "5. Obligațiile medicilor",
          content: (
            <>
              <p>
                Medicii sunt responsabili pentru exactitatea informațiilor profesionale, a serviciilor, tarifelor, clinicilor și disponibilității publicate.
              </p>
              <p>
                Insigna de verificare indică faptul că RomDoc a verificat informații profesionale existente; RomDoc nu emite licențe medicale.
              </p>
            </>
          ),
        },
        {
          id: "limitarea-raspunderii",
          title: "6. Limitarea răspunderii",
          content: (
            <>
              <p>
                RomDoc depune eforturi rezonabile pentru disponibilitatea platformei, dar nu garantează funcționarea neîntreruptă sau lipsa totală a erorilor.
              </p>
              <p>
                Relația medicală se stabilește direct între pacient și profesionistul sau furnizorul medical ales.
              </p>
            </>
          ),
        },
        {
          id: "modificari",
          title: "7. Modificarea termenilor",
          content: (
            <p>
              Termenii pot fi actualizați pentru a reflecta modificări funcționale, comerciale sau juridice. Data ultimei actualizări va fi afișată pe această pagină.
            </p>
          ),
        },
      ]}
    />
  );
}
