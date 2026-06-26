begin;

create table if not exists public.legal_pages (
  page_key text primary key,
  title text not null,
  content text not null,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint legal_pages_page_key_check
    check (
      page_key in (
        'terms',
        'privacy',
        'cookies',
        'legal_information'
      )
    ),
  constraint legal_pages_title_length_check
    check (
      char_length(title) between 2 and 200
    ),
  constraint legal_pages_content_length_check
    check (
      char_length(content) between 20 and 100000
    )
);

comment on table public.legal_pages is
  'Public legal documents edited by administrators through the RomDoc admin dashboard.';

comment on column public.legal_pages.page_key is
  'Stable application identifier for one of the four public legal pages.';

comment on column public.legal_pages.content is
  'Safe plain-text legal content. Lines beginning with ## are rendered as section headings; HTML is not rendered.';

comment on column public.legal_pages.updated_by_profile_id is
  'Administrator profile that last saved the document.';

alter table public.legal_pages
  enable row level security;

revoke all on table public.legal_pages
  from anon,
       authenticated;

grant select on table public.legal_pages
  to anon,
     authenticated;

drop policy if exists
  "Public can read published legal pages"
  on public.legal_pages;

create policy
  "Public can read published legal pages"
  on public.legal_pages
  for select
  to anon,
     authenticated
  using (is_published = true);

insert into public.legal_pages (
  page_key,
  title,
  content,
  is_published,
  updated_at,
  updated_by_profile_id
)
values
  (
    'terms',
    'Termeni și condiții',
    $terms$## 1. Despre platformă

RomDoc este o platformă digitală care permite utilizatorilor să descopere medici și clinici, să consulte informații publice și să trimită solicitări de programare.

RomDoc nu furnizează servicii medicale și nu stabilește diagnostice sau tratamente.

## 2. Conturi și eligibilitate

Unele funcții sunt publice, iar altele necesită un cont valid și o adresă de e-mail verificată.

Utilizatorii sunt responsabili pentru corectitudinea datelor introduse și pentru păstrarea confidențialității datelor de autentificare.

## 3. Programări

O solicitare transmisă prin RomDoc nu reprezintă confirmarea automată a unei consultații. Confirmarea depinde de medic sau clinică.

Modificarea, anularea și finalizarea unei programări sunt gestionate conform fluxului afișat în contul pacientului și în profilul medicului.

## 4. Conținut și informații medicale

Informațiile publice despre medici și clinici sunt oferite în scop informativ și nu trebuie considerate recomandare medicală personalizată.

În caz de urgență medicală, utilizatorii trebuie să contacteze serviciile de urgență corespunzătoare.

## 5. Obligațiile medicilor

Medicii sunt responsabili pentru exactitatea informațiilor profesionale, a serviciilor, tarifelor, clinicilor și disponibilității publicate.

Insigna de verificare indică faptul că RomDoc a verificat informații profesionale existente; RomDoc nu emite licențe medicale.

## 6. Limitarea răspunderii

RomDoc depune eforturi rezonabile pentru disponibilitatea platformei, dar nu garantează funcționarea neîntreruptă sau lipsa totală a erorilor.

Relația medicală se stabilește direct între pacient și profesionistul sau furnizorul medical ales.

## 7. Modificarea termenilor

Termenii pot fi actualizați pentru a reflecta modificări funcționale, comerciale sau juridice. Data ultimei actualizări va fi afișată pe această pagină.$terms$,
    true,
    timestamptz '2026-06-22 00:00:00+00',
    null
  ),
  (
    'privacy',
    'Politica de confidențialitate',
    $privacy$## 1. Date pe care le putem colecta

Date de cont, precum numele, adresa de e-mail, rolul utilizatorului și informațiile de autentificare gestionate prin Supabase Auth.

Date de programare, precum medicul, clinica, data, ora, numărul de telefon și mesajele asociate solicitării.

Date profesionale pentru medici și date tehnice necesare funcționării și securității platformei.

## 2. Scopurile prelucrării

Folosim datele pentru administrarea conturilor, procesarea programărilor, comunicări tranzacționale, securitate, suport și îmbunătățirea serviciului.

Nu utilizăm datele medicale pentru publicitate comportamentală.

## 3. Furnizori tehnici

RomDoc poate utiliza furnizori precum Supabase, Vercel, Resend, Stripe și Google Maps pentru autentificare, găzduire, e-mailuri, plăți și servicii de localizare.

## 4. Păstrarea datelor

Datele sunt păstrate numai atât cât este necesar pentru funcționarea serviciului, respectarea obligațiilor aplicabile, soluționarea disputelor și menținerea securității.

## 5. Drepturile persoanelor vizate

În funcție de situație, utilizatorii pot solicita accesul, rectificarea, ștergerea, restricționarea, portabilitatea sau opoziția față de anumite prelucrări.

## 6. Securitatea datelor

Aplicăm măsuri tehnice și organizatorice rezonabile, inclusiv controlul accesului, separarea rolurilor și politici de securitate la nivelul bazei de date.

## 7. Contact pentru confidențialitate

Solicitările privind datele personale pot fi transmise prin pagina de contact. Adresa dedicată va fi publicată înainte de lansarea comercială.$privacy$,
    true,
    timestamptz '2026-06-22 00:00:00+00',
    null
  ),
  (
    'cookies',
    'Politica de cookies',
    $cookies$## 1. Ce sunt cookie-urile

Cookie-urile sunt fișiere mici stocate de browser pentru a păstra informații necesare funcționării, securității și preferințelor unui serviciu online.

## 2. Cookie-uri strict necesare

Pot fi folosite pentru autentificare, menținerea sesiunii, protecția împotriva abuzului și funcționarea formularelor. Acestea sunt necesare pentru furnizarea funcțiilor solicitate.

## 3. Preferințe

Cookie-urile de preferințe pot reține limba, aspectul sau alte opțiuni alese de utilizator.

## 4. Analiză și performanță

Dacă vor fi activate instrumente de analiză neesențiale, acestea vor fi documentate și controlate printr-un mecanism de consimțământ adecvat.

## 5. Servicii terțe

Componente precum Google Maps, Stripe sau alte servicii integrate pot folosi propriile tehnologii de stocare, în funcție de modul în care sunt încărcate și utilizate.

## 6. Controlul cookie-urilor

Utilizatorii pot controla cookie-urile din setările browserului. Dezactivarea celor strict necesare poate împiedica autentificarea sau utilizarea anumitor funcții.$cookies$,
    true,
    timestamptz '2026-06-22 00:00:00+00',
    null
  ),
  (
    'legal_information',
    'Informații legale',
    $legal$## 1. Operatorul platformei

RomDoc este denumirea comercială a platformei. Datele juridice complete ale operatorului vor fi publicate aici înainte de începerea activității comerciale.

## 2. Rolul platformei

RomDoc este un serviciu digital de listare, descoperire și intermediere a solicitărilor de programare. Platforma nu furnizează consultații și nu intervine în deciziile medicale.

## 3. Verificarea profesională

Un medic poate primi insigna „Medic verificat de RomDoc” după verificarea informațiilor profesionale disponibile.

Insigna nu reprezintă emiterea unei licențe de către RomDoc și nu înlocuiește verificările pe care pacientul le consideră necesare.

## 4. Informații publice

Medicii și clinicile sunt responsabili pentru menținerea informațiilor publice corecte, inclusiv specialități, adrese, tarife și disponibilitate.

## 5. Urgențe medicale

RomDoc nu este un serviciu de urgență. Într-o situație urgentă, utilizatorii trebuie să contacteze imediat serviciile locale de urgență.

## 6. Sesizări

Informațiile incorecte, profilurile suspecte sau problemele tehnice pot fi raportate prin pagina de contact.$legal$,
    true,
    timestamptz '2026-06-22 00:00:00+00',
    null
  )
on conflict (page_key) do nothing;

commit;
