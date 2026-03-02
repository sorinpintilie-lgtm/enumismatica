import Link from 'next/link';

export const metadata = {
  title: 'Termeni și Condiții | eNumismatica',
  description:
    'Termeni și condiții de utilizare pentru website-ul și aplicația mobilă eNumismatica.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black text-slate-100">
      <section className="border-b border-gold-500/30 bg-navy-900/60">
        <div className="container mx-auto px-4 py-14">
          <p className="text-xs uppercase tracking-[0.22em] text-gold-300/90">Document legal</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-gold-300">Termeni și Condiții</h1>
          <p className="mt-4 max-w-3xl text-slate-200">
            Acești termeni reglementează utilizarea platformei eNumismatica (website și aplicație
            mobilă), precum și relația dintre utilizatori și operatorul platformei.
          </p>
          <p className="mt-3 text-sm text-slate-300">Ultima actualizare: 02.03.2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">1. Definiții și acceptare</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Prin accesarea sau utilizarea eNumismatica.ro și/sau a aplicației mobile eNumismatica,
              confirmi că ai citit, înțeles și acceptat acești termeni. Dacă nu ești de acord cu
              prevederile de mai jos, te rugăm să nu utilizezi serviciile noastre.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">2. Descrierea serviciilor</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Cont utilizator pentru cumpărare, vânzare și participare la licitații;</li>
              <li>Listarea produselor numismatice și administrarea anunțurilor;</li>
              <li>Coș de cumpărături, comenzi, istoric tranzacții;</li>
              <li>Funcționalități de comunicare între utilizatori și suport;</li>
              <li>Servicii complementare, inclusiv verificare identitate, unde este disponibilă.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">3. Condiții de eligibilitate</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Utilizatorul declară că are capacitate legală pentru a încheia acte juridice. Este
              responsabilitatea utilizatorului să furnizeze date corecte, complete și actualizate la
              crearea contului și în procesul de tranzacționare.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">4. Contul de utilizator</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Ești responsabil pentru confidențialitatea datelor de autentificare;</li>
              <li>Ești responsabil pentru activitățile realizate prin contul tău;</li>
              <li>
                Nu este permisă folosirea contului pentru activități ilegale, frauduloase sau
                înșelătoare.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">5. Reguli privind listările și tranzacțiile</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>
                Vânzătorii trebuie să descrie corect produsele (stare, autenticitate, proveniență,
                preț);
              </li>
              <li>Cumpărătorii au obligația să finalizeze comenzile asumate;</li>
              <li>
                eNumismatica poate suspenda sau elimina listări care încalcă legea ori regulile
                platformei;
              </li>
              <li>
                În cazul litigiilor între utilizatori, platforma poate oferi asistență procedurală,
                fără a deveni parte contractuală directă între părți.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">6. Licitații</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Oferta plasată într-o licitație reprezintă o intenție fermă de cumpărare;</li>
              <li>
                Utilizarea abuzivă a licitării (ex. manipulare, oferte fictive, comportament fraudulos)
                este interzisă;
              </li>
              <li>
                Platforma poate anula, suspenda sau revizui tranzacții în caz de suspiciuni de fraudă,
                erori evidente ori încălcări ale regulamentului.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">7. Proprietate intelectuală</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Conținutul platformei (design, logo, texte, cod, elemente grafice) aparține
              eNumismatica sau partenerilor săi și este protejat de legislația aplicabilă. Copierea,
              distribuirea sau reutilizarea fără acord scris este interzisă.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">8. Limitarea răspunderii</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Serviciile sunt furnizate „ca atare”, în limitele legii. eNumismatica nu garantează
              disponibilitate neîntreruptă și nu răspunde pentru prejudicii indirecte generate de
              întreruperi tehnice, erori operaționale sau utilizarea necorespunzătoare a platformei de
              către utilizatori.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">9. Suspendarea sau închiderea contului</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Putem restricționa, suspenda sau închide conturi care încalcă legea, acești termeni sau
              securitatea platformei. Utilizatorul poate solicita închiderea contului conform procedurilor
              disponibile în platformă.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">10. Legea aplicabilă și jurisdicție</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Acești termeni sunt guvernați de legea română. Orice litigiu va fi soluționat pe cale
              amiabilă, iar în lipsa unei soluții, de instanțele competente din România, conform
              dispozițiilor legale aplicabile.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">11. Contact</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Pentru întrebări juridice sau comerciale ne poți scrie la{' '}
              <a className="text-gold-300 hover:text-gold-200" href="mailto:contact@enumismatica.ro">
                contact@enumismatica.ro
              </a>{' '}
              sau ne poți apela la{' '}
              <a className="text-gold-300 hover:text-gold-200" href="tel:+40735223025">
                0735 223 025
              </a>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/70 p-6 text-sm">
            <p className="text-slate-200">
              Modul în care prelucrăm datele personale este descris în{' '}
              <Link href="/privacy" className="text-gold-300 hover:text-gold-200 underline">
                Politica de Confidențialitate
              </Link>
              {' '}și în informarea noastră despre{' '}
              <Link href="/gdpr" className="text-gold-300 hover:text-gold-200 underline">
                GDPR
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
