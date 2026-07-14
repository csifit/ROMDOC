begin;

alter table public.legal_pages add column if not exists locale text;
update public.legal_pages set locale = 'ro' where locale is null;
alter table public.legal_pages alter column locale set default 'ro';
alter table public.legal_pages alter column locale set not null;

alter table public.legal_pages drop constraint if exists legal_pages_pkey;
alter table public.legal_pages drop constraint if exists legal_pages_locale_check;
alter table public.legal_pages add constraint legal_pages_locale_check check (locale in ('ro', 'en', 'de'));
alter table public.legal_pages add constraint legal_pages_pkey primary key (page_key, locale);

insert into public.legal_pages (page_key, locale, title, content, is_published, updated_at)
values
('terms','en','Terms and Conditions',$$## 1. About the platform

RomDoc is a digital platform for finding doctors and clinics, viewing public information and submitting appointment requests. RomDoc does not provide medical services.

## 2. Accounts and eligibility

Some functions require a valid account and verified email address. Users are responsible for accurate information and confidential credentials.

## 3. Appointments

A request is not an automatic confirmation. Confirmation depends on the doctor or clinic.

## 4. Medical information

Public information is informational and is not personalised medical advice. Contact emergency services in an emergency.

## 5. Responsibilities

Doctors and clinics are responsible for professional information, services, prices, addresses and availability.

## 6. Liability

RomDoc takes reasonable steps to maintain the service but cannot guarantee uninterrupted or error-free operation.

## 7. Changes

These terms may be updated for functional, commercial or legal reasons.$$,true,now()),
('privacy','en','Privacy Policy',$$## 1. Data we collect

We may process account, contact, appointment, professional, uploaded-document and technical security data.

## 2. Purposes

Data is used for accounts, appointments, transactional communications, payments, support, security and legal obligations.

## 3. Health data

Medical data is available only to authorised persons under RomDoc access rules.

## 4. Providers

RomDoc may use Supabase, Vercel, Resend, Stripe and Google Maps.

## 5. Retention

Data is retained only as long as necessary for stated purposes and legal obligations.

## 6. Rights

Users may request access, correction, erasure, restriction, portability or objection where applicable.

## 7. Contact

Privacy requests may be sent to privacy@romdoc.fit.$$,true,now()),
('cookies','en','Cookie Policy',$$## 1. What cookies are

Cookies are small browser files used for operation, security and preferences.

## 2. Strictly necessary cookies

They may support authentication, sessions, security, forms and user-initiated payments.

## 3. Preferences

RomDoc may remember the selected language and requested settings.

## 4. Analytics and marketing

Optional analytics or marketing tools are not activated without an appropriate consent mechanism.

## 5. Third-party services

Google Maps, Stripe and other services may use their own technologies.

## 6. Controls

Users can control cookies in the browser. Disabling necessary cookies may prevent essential functions.$$,true,now()),
('legal_information','en','Legal Information',$$## 1. Platform operator

RomDoc is the commercial name of the platform. Complete operator details will be published before commercial launch.

## 2. Platform role

RomDoc is a listing, discovery and appointment-request service. It does not provide consultations.

## 3. Professional verification

The verification badge means existing professional information was reviewed. RomDoc does not issue medical licences.

## 4. Public information

Doctors and clinics are responsible for accurate public information.

## 5. Emergencies

RomDoc is not an emergency service.

## 6. Reports

Incorrect information or technical issues can be reported through the contact page.$$,true,now()),
('terms','de','Allgemeine Geschäftsbedingungen',$$## 1. Über die Plattform

RomDoc ist eine digitale Plattform zur Suche nach Ärzten und Kliniken sowie zur Übermittlung von Terminanfragen. RomDoc erbringt keine medizinischen Leistungen.

## 2. Konten

Einige Funktionen erfordern ein gültiges Konto und eine bestätigte E-Mail-Adresse. Nutzer sind für richtige Angaben und sichere Zugangsdaten verantwortlich.

## 3. Termine

Eine Anfrage ist keine automatische Bestätigung. Die Bestätigung erfolgt durch den Arzt oder die Klinik.

## 4. Medizinische Informationen

Öffentliche Informationen ersetzen keine individuelle medizinische Beratung. In Notfällen kontaktieren Sie den Rettungsdienst.

## 5. Verantwortlichkeiten

Ärzte und Kliniken sind für berufliche Angaben, Leistungen, Preise, Adressen und Verfügbarkeiten verantwortlich.

## 6. Haftung

RomDoc bemüht sich um einen zuverlässigen Betrieb, garantiert jedoch keinen unterbrechungsfreien oder fehlerfreien Dienst.

## 7. Änderungen

Diese Bedingungen können aus funktionalen, geschäftlichen oder rechtlichen Gründen aktualisiert werden.$$,true,now()),
('privacy','de','Datenschutzerklärung',$$## 1. Verarbeitete Daten

Wir können Konto-, Kontakt-, Termin-, Berufs-, Dokument- und technische Sicherheitsdaten verarbeiten.

## 2. Zwecke

Daten werden für Konten, Termine, Mitteilungen, Zahlungen, Support, Sicherheit und gesetzliche Pflichten verwendet.

## 3. Gesundheitsdaten

Medizinische Daten sind nur für autorisierte Personen nach den RomDoc-Zugriffsregeln verfügbar.

## 4. Dienstleister

RomDoc kann Supabase, Vercel, Resend, Stripe und Google Maps einsetzen.

## 5. Speicherdauer

Daten werden nur so lange gespeichert, wie dies für die genannten Zwecke und gesetzliche Pflichten erforderlich ist.

## 6. Rechte

Nutzer können je nach Rechtslage Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit oder Widerspruch verlangen.

## 7. Kontakt

Datenschutzanfragen können an privacy@romdoc.fit gesendet werden.$$,true,now()),
('cookies','de','Cookie-Richtlinie',$$## 1. Was Cookies sind

Cookies sind kleine Browserdateien für Betrieb, Sicherheit und Einstellungen.

## 2. Unbedingt erforderliche Cookies

Sie können Anmeldung, Sitzung, Sicherheit, Formulare und vom Nutzer gestartete Zahlungen unterstützen.

## 3. Einstellungen

RomDoc kann die gewählte Sprache und gewünschte Einstellungen speichern.

## 4. Analyse und Marketing

Optionale Analyse- oder Marketingdienste werden nicht ohne geeignete Einwilligung aktiviert.

## 5. Dienste Dritter

Google Maps, Stripe und andere Dienste können eigene Technologien verwenden.

## 6. Kontrolle

Cookies können im Browser gesteuert werden. Das Deaktivieren notwendiger Cookies kann wichtige Funktionen verhindern.$$,true,now()),
('legal_information','de','Rechtliche Informationen',$$## 1. Betreiber

RomDoc ist der Handelsname der Plattform. Vollständige Betreiberangaben werden vor dem kommerziellen Start veröffentlicht.

## 2. Rolle der Plattform

RomDoc ist ein Verzeichnis-, Such- und Vermittlungsdienst für Terminanfragen und erbringt keine medizinischen Beratungen.

## 3. Berufliche Verifizierung

Das Abzeichen zeigt die Prüfung vorhandener beruflicher Informationen. RomDoc erteilt keine ärztlichen Zulassungen.

## 4. Öffentliche Informationen

Ärzte und Kliniken sind für richtige öffentliche Angaben verantwortlich.

## 5. Notfälle

RomDoc ist kein Notfalldienst.

## 6. Meldungen

Falsche Angaben oder technische Probleme können über die Kontaktseite gemeldet werden.$$,true,now())
on conflict (page_key, locale) do nothing;

comment on column public.legal_pages.locale is 'Public language of the legal document: ro, en or de.';
commit;
