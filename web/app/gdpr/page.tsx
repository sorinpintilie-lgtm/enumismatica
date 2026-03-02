import Link from 'next/link';

export const metadata = {
  title: 'GDPR | eNumismatica',
  description:
    'Informare GDPR privind drepturile persoanelor vizate și exercitarea acestora pe eNumismatica.',
};

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black text-slate-100">
      <section className="border-b border-gold-500/30 bg-navy-900/60">
        <div className="container mx-auto px-4 py-14">
          <p className="text-xs uppercase tracking-[0.22em] text-gold-300/90">Conformitate UE 2016/679</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-gold-300">
            Informare GDPR
          </h1>
          <p className="mt-4 max-w-3xl text-slate-200">
            Această pagină explică, pe scurt, drepturile tale conform Regulamentului (UE) 2016/679
            („GDPR”) și procedura prin care poți transmite solicitări privind datele tale personale în
            cadrul eNumismatica (website + aplicație mobilă).
          </p>
          <p className="mt-3 text-sm text-slate-300">Ultima actualizare: 02.03.2026</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">1. Cine este operatorul</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Operatorul datelor este eNumismatica.ro. Pentru solicitări GDPR ne poți contacta la{' '}
              <a className="text-gold-300 hover:text-gold-200" href="mailto:contact@enumismatica.ro">
                contact@enumismatica.ro
              </a>{' '}
              sau telefonic la{' '}
              <a className="text-gold-300 hover:text-gold-200" href="tel:+40735223025">
                0735 223 025
              </a>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">2. Ce drepturi ai conform GDPR</h2>
            <ul className="mt-3 list-disc pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>Dreptul de acces la datele personale prelucrate;</li>
              <li>Dreptul la rectificarea datelor inexacte sau incomplete;</li>
              <li>Dreptul la ștergerea datelor („dreptul de a fi uitat”), în limitele legii;</li>
              <li>Dreptul la restricționarea prelucrării;</li>
              <li>Dreptul la portabilitatea datelor;</li>
              <li>Dreptul de opoziție la anumite prelucrări;</li>
              <li>Dreptul de a nu fi supus unei decizii exclusiv automate, dacă este cazul;</li>
              <li>Dreptul de a depune plângere la ANSPDCP.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">3. Cum exerciți drepturile</h2>
            <ol className="mt-3 list-decimal pl-6 text-slate-200 leading-relaxed space-y-2">
              <li>
                Trimite o solicitare la{' '}
                <a className="text-gold-300 hover:text-gold-200" href="mailto:contact@enumismatica.ro">
                  contact@enumismatica.ro
                </a>{' '}
                cu subiectul „Solicitare GDPR”.
              </li>
              <li>
                Menționează clar ce drept dorești să exerciți (acces, rectificare, ștergere, portare etc.).
              </li>
              <li>
                Pentru protecția datelor, putem solicita informații suplimentare pentru verificarea
                identității.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">4. Termene de răspuns</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              În mod normal răspundem solicitărilor GDPR în maximum 30 de zile calendaristice de la
              primire. În situații complexe, termenul poate fi extins conform legii, cu informarea
              prealabilă a solicitantului.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">5. Datele prelucrate în platformă</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              În eNumismatica prelucrăm date de cont și de tranzacționare (ex.: nume, email, telefon,
              adresă, ID utilizator), conținut furnizat de utilizator (fotografii/video, mesaje de suport),
              precum și date tehnice (performanță, erori/crash), strict pentru funcționarea serviciilor,
              securitate și îmbunătățire.
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/50 p-6">
            <h2 className="text-2xl font-bold text-gold-300">6. Plângeri și autoritatea competentă</h2>
            <p className="mt-3 text-slate-200 leading-relaxed">
              Dacă consideri că drepturile tale au fost încălcate, ai dreptul să depui plângere la
              Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).
            </p>
          </div>

          <div className="rounded-2xl border border-gold-500/25 bg-navy-900/70 p-6 text-sm">
            <p className="text-slate-200">
              Informații detaliate despre prelucrarea datelor și utilizarea platformei sunt disponibile în{' '}
              <Link href="/privacy" className="text-gold-300 hover:text-gold-200 underline">
                Politica de Confidențialitate
              </Link>{' '}
              și{' '}
              <Link href="/terms" className="text-gold-300 hover:text-gold-200 underline">
                Termenii și Condițiile
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
