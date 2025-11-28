'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white py-20 border-b border-[#e7b73c]/40 shadow-[0_35px_120px_rgba(0,0,0,0.9)]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-[#e7b73c] drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]">
            Despre E-numismatica
          </h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto">
            Partenerul tău de încredere în colecționarea numismatică din 2020
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 text-slate-100">
        {/* Our Story */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-navy-900/70 border border-[#e7b73c]/20 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-8 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-[#e7b73c] mb-6">Povestea noastră</h2>
            <div className="prose prose-lg max-w-none text-slate-200 space-y-4">
              <p>
                E-numismatica a fost fondată cu pasiunea de a păstra istoria prin monede și valută.
                Ceea ce a început ca o colecție mică a crescut până la a deveni platforma numismatică de top din România,
                conectând colecționari, entuziaști și istorici din întreaga lume.
              </p>
              <p>
                Platforma noastră combină expertiza numismatică tradițională cu tehnologia modernă, oferind atât
                un magazin selectat, cât și oportunități interesante de licitație. Fie că ești un colecționar experimentat
                sau abia începi călătoria în fascinanta lume a monedelor, suntem aici să te ajutăm să
                descoperi, să achiziționezi și să apreciezi aceste piese tangibile de istorie.
              </p>
              <p>
                Fiecare monedă spune o poveste—despre imperii ridicate și căzute, despre revoluții economice, despre realizări
                artistice și despre civilizația umană însăși. La E-numismatica, suntem dedicați să te ajutăm să
                descoperi aceste povești și să construiești o colecție care reflectă pasiunea și interesele tale.
              </p>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#e7b73c] text-center mb-12">Valorile noastre</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-8 text-center">
              <div className="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Autenticitate</h3>
              <p className="text-slate-200">
                Fiecare articol din colecția noastră este verificat și autentificat cu atenție de echipa noastră de experți.
                Garantăm autenticitatea tuturor monedelor și valutelor pe care le oferim.
              </p>
            </div>

            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-8 text-center">
              <div className="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Educație</h3>
              <p className="text-slate-200">
                Credem în împuternicirea colecționarilor cu cunoștințe. Platforma noastră oferă informații detaliate,
                context istoric și perspective de expert pentru fiecare piesă.
              </p>
            </div>

            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-8 text-center">
              <div className="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Comunitate</h3>
              <p className="text-slate-200">
                Construim o comunitate vibrantă de colecționari care împărtășesc cunoștințe, fac schimb corect
                și celebrează împreună arta și istoria numismaticii.
              </p>
            </div>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#e7b73c] text-center mb-12">Ce oferim</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-6 flex gap-4">
              <div className="w-12 h-12 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Magazin selectat</h3>
                <p className="text-slate-200">
                  Răsfoiește colecția noastră extinsă de monede autentificate din întreaga lume,
                  de la antichitate până în timpurile moderne.
                </p>
              </div>
            </div>

            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-6 flex gap-4">
              <div className="w-12 h-12 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Licitații live</h3>
                <p className="text-slate-200">
                  Participă la licitații interesante pentru piese rare și valoroase, cu licitare în timp real
                  și procese transparente.
                </p>
              </div>
            </div>

            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-6 flex gap-4">
              <div className="w-12 h-12 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Evaluări de experți</h3>
                <p className="text-slate-200">
                  Obține evaluări profesionale și certificări pentru colecția ta de la echipa noastră
                  de numismați experimentați.
                </p>
              </div>
            </div>

            <div className="bg-navy-900/70 rounded-2xl border border-[#e7b73c]/20 shadow-[0_22px_60px_rgba(0,0,0,0.8)] p-6 flex gap-4">
              <div className="w-12 h-12 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#e7b73c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Resurse educaționale</h3>
                <p className="text-slate-200">
                  Accesează biblioteca noastră de articole, ghiduri și informații istorice pentru a-ți aprofunda
                  înțelegerea numismaticii.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-gradient-to-br from-[#e7b73c] via-[#f0c955] to-[#e7b73c] rounded-2xl p-12 mb-16 shadow-[0_28px_80px_rgba(231,183,60,0.7)] border border-[#f5e4b3]/60">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-[#000940] font-semibold">
            <div>
              <div className="text-4xl font-extrabold mb-2">5000+</div>
              <div className="text-[#3b2b05]/80">Monede listate</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-2">2000+</div>
              <div className="text-[#3b2b05]/80">Colecționari fericiți</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-2">50+</div>
              <div className="text-[#3b2b05]/80">Țări</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold mb-2">100%</div>
              <div className="text-[#3b2b05]/80">Autentificate</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Gata să începi colecția ta?</h2>
          <p className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto">
            Alătură-te miilor de colecționari care au încredere în E-numismatica pentru nevoile lor numismatice.
            Răsfoiește colecția noastră sau participă la următoarea noastră licitație.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-[0_0_25px_rgba(231,183,60,0.7)]"
            >
              Răsfoiește colecția
            </Link>
            <Link
              href="/auctions"
              className="bg-navy-800 hover:bg-navy-700 border border-[#e7b73c]/50 text-slate-100 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Vezi licitațiile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
