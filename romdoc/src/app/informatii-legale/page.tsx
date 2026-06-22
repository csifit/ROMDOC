import type {
  Metadata,
} from "next";
import LegalPageShell from "@/components/public/legal-page-shell";

export const metadata: Metadata = {
  title: "Informații legale",
  description:
    "Informații juridice și operaționale despre RomDoc.",
};

export default function LegalInformationPage() {
  return (
    <LegalPageShell
      eyebrow="Informații legale"
      title="Informații despre RomDoc"
      description="Detalii generale despre rolul platformei, verificarea profesioniștilor și responsabilitățile participanților."
      updatedAt="22 iunie 2026"
      notice={
        <>
          Datele complete ale entității care operează RomDoc, adresa sediului, identificatorii fiscali și datele autorităților relevante vor fi adăugate înainte de lansare.
        </>
      }
      sections={[
        {
          id: "operator",
          title: "1. Operatorul platformei",
          content: (
            <p>
              RomDoc este denumirea comercială a platformei. Datele juridice complete ale operatorului vor fi publicate aici înainte de începerea activității comerciale.
            </p>
          ),
        },
        {
          id: "rolul-platformei",
          title: "2. Rolul platformei",
          content: (
            <p>
              RomDoc este un serviciu digital de listare, descoperire și intermediere a solicitărilor de programare. Platforma nu furnizează consultații și nu intervine în deciziile medicale.
            </p>
          ),
        },
        {
          id: "verificare-profesionala",
          title: "3. Verificarea profesională",
          content: (
            <>
              <p>
                Un medic poate primi insigna „Medic verificat de RomDoc” după verificarea informațiilor profesionale disponibile.
              </p>
              <p>
                Insigna nu reprezintă emiterea unei licențe de către RomDoc și nu înlocuiește verificările pe care pacientul le consideră necesare.
              </p>
            </>
          ),
        },
        {
          id: "informatii-publice",
          title: "4. Informații publice",
          content: (
            <p>
              Medicii și clinicile sunt responsabili pentru menținerea informațiilor publice corecte, inclusiv specialități, adrese, tarife și disponibilitate.
            </p>
          ),
        },
        {
          id: "urgente",
          title: "5. Urgențe medicale",
          content: (
            <p>
              RomDoc nu este un serviciu de urgență. Într-o situație urgentă, utilizatorii trebuie să contacteze imediat serviciile locale de urgență.
            </p>
          ),
        },
        {
          id: "sesizari",
          title: "6. Sesizări",
          content: (
            <p>
              Informațiile incorecte, profilurile suspecte sau problemele tehnice pot fi raportate prin pagina de contact.
            </p>
          ),
        },
      ]}
    />
  );
}
