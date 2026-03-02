import Link from 'next/link';

export const metadata = {
  title: 'Politica de Confidențialitate | eNumismatica',
  description:
    'Politica de confidențialitate pentru website-ul și aplicația mobilă eNumismatica.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black text-slate-100">
      <section className="border-b border-gold-500/30 bg-navy-900/60">
        <div className="container mx-auto px-4 py-14">
          <p className="text-xs uppercase tracking-[0.22em] text-gold-300/90">Document legal</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-gold-300">
            Politica de Confidențialitate
          </h1>
          <p className="mt-4 max-w-3xl text-slate-200">
            Această politică se aplică platformei eNumismatica (website și aplicație mobilă iOS/Android)
            și explică modul în care colectăm, folosim și protejăm datele cu caracter personal.
          </p>
          <p className="mt-3 text-sm text-slate-300">Ultima actualizare: 02.03.2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">1. Operatorul datelor</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Operatorul datelor este eNumismatica.ro. Pentru solicitări legate de prelucrarea datelor,
              ne poți contacta la adresa <a className="text-gold-300 hover:text-gold-200" href="mailto:contact@enumismatica.ro">contact@enumismatica.ro</a>{' '}
              sau la numărul de telefon <a className="text-gold-300 hover:text-gold-200" href="tel:+40735223025">0735 223 025</a>.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">2. Ce date colectăm</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              În funcție de modul în care folosești platforma (website sau aplicație mobilă), putem
              colecta următoarele categorii de date:
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/70 p-4">
                <p className="font-semibold text-gold-200">Date de contact</p>
                <ul className="mt-2 list-disc pl-5 text-slate-200 space-y-1">
                  <li>Nume și prenume</li>
                  <li>Adresă de email</li>
                  <li>Număr de telefon</li>
                  <li>Adresă fizică (livrare/facturare)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gold-500/20 bg-navy-950/70 p-4">
                <p className="font-semibold text-gold-200">Conținut furnizat de utilizator</p>
                <ul className="mt-2 list-disc pl-5 text-slate-200 space-y-1">
                  <li>Fotografii sau videoclipuri încărcate</li>
                  <li>Mesaje trimise către suport</li>
                  <li>Documente de identitate încărcate pentru verificare (dacă alegi verificarea)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gold-500/20 bg-navy-950/70 p-4">
                <p className="font-semibold text-gold-200">Identificatori</p>
                <ul className="mt-2 list-disc pl-5 text-slate-200 space-y-1">
                  <li>ID utilizator (User ID)</li>
                  <li>Identificatori tehnici de sesiune/autentificare</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gold-500/20 bg-navy-950/70 p-4">
                <p className="font-semibold text-gold-200">Date tehnice și de diagnostic</p>
                <ul className="mt-2 list-disc pl-5 text-slate-200 space-y-1">
                  <li>Date de performanță</li>
                  <li>Date despre erori și crash-uri</li>
                  <li>Date de analiză pentru funcționarea și îmbunătățirea aplicației</li>
                </ul>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Conform configurărilor App Store iOS, anumite date (nume, adresă, telefon, email,
              conținut furnizat, User ID și performanță) pot fi asociate identității tale, în scopurile
              declarate de funcționalitate și analiză.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">3. Scopurile prelucrării</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Crearea și administrarea contului de utilizator;</li>
              <li>Procesarea comenzilor, livrărilor și tranzacțiilor;</li>
              <li>Comunicarea cu tine (email, telefon, notificări relevante);</li>
              <li>Verificarea identității, atunci când soliciți acest proces;</li>
              <li>Asistență clienți și răspuns la solicitări de suport;</li>
              <li>
                Analiză, securitate, prevenirea abuzurilor și îmbunătățirea performanței website-ului și
                aplicației mobile.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">4. Temeiul legal al prelucrării</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Executarea contractului (furnizarea serviciilor și procesarea comenzilor);</li>
              <li>Respectarea obligațiilor legale (fiscale, contabile, de securitate);</li>
              <li>Interes legitim (securitate, prevenție fraudă, optimizare servicii);</li>
              <li>Consimțământ, acolo unde este necesar în mod legal.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">5. Cui divulgăm datele</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Putem transmite date către furnizori de servicii strict necesari operării platformei (de
              exemplu: hosting, infrastructură cloud, servicii de autentificare, procesatori de plăți,
              curierat, suport tehnic), precum și către autorități publice atunci când legea impune.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">6. Durata stocării</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Stocăm datele doar pe perioada necesară scopurilor menționate sau conform obligațiilor legale.
              Datele asociate contului pot fi păstrate cât timp contul este activ și, după închidere,
              conform termenelor legale aplicabile.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">7. Drepturile tale</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Dreptul de acces la date;</li>
              <li>Dreptul la rectificare;</li>
              <li>Dreptul la ștergere („dreptul de a fi uitat”), în limitele legii;</li>
              <li>Dreptul la restricționarea prelucrării;</li>
              <li>Dreptul la portabilitatea datelor;</li>
              <li>Dreptul de opoziție;</li>
              <li>Dreptul de a depune plângere la ANSPDCP.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">8. Securitatea datelor</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Aplicăm măsuri tehnice și organizatorice rezonabile pentru protejarea datelor, inclusiv
              control al accesului, monitorizare și măsuri de prevenire a utilizării neautorizate.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">9. Date despre minori</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Serviciile noastre nu sunt destinate minorilor fără acordul reprezentantului legal. Dacă
              identificăm date colectate necorespunzător, vom lua măsuri pentru ștergerea acestora.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">10. Modificări ale politicii</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Putem actualiza această politică periodic. Versiunea curentă va fi publicată pe website,
              iar utilizarea continuă a serviciilor reprezintă acceptarea modificărilor.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/70 p-6 text-sm">
            <p className="text-slate-200">
              Pentru detalii suplimentare despre condițiile de utilizare a platformei, consultă{' '}
              <Link href="/terms" className="text-gold-300 hover:text-gold-200 underline">
                Termenii și Condițiile
              </Link>
              {' '}și informațiile despre{' '}
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
