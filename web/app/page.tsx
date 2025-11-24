'use client';

import Link from 'next/link';
import LazyImage from './components/LazyImage';

const highlights = [
  {
    title: 'Magazin curat si verificat',
    description: 'Selectie de monede autentificate, gata de livrare rapida si prezentate cu descrieri detaliate.',
  },
  {
    title: 'Licitatii transparente',
    description: 'Urmareste pas cu pas ofertele, seteaza alerte si castiga piese rare in timp real.',
  },
  {
    title: 'Expertiza locala',
    description: 'Echipa noastra te ajuta sa evaluezi corect piesele si sa construiesti o colectie solida.',
  },
];

const steps = [
  {
    label: '1. Exploreaza',
    text: 'Cauta monede dupa tara, metal sau perioada si descopera selectii curatoriate.',
  },
  {
    label: '2. Alege ruta potrivita',
    text: 'Cumpara direct din magazin sau intra in licitatii active pentru piese rare.',
  },
  {
    label: '3. Primeste in siguranta',
    text: 'Plati protejate si livrare asigurata, cu verificare la primire.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-amber-50 via-white to-white">
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-inner shadow-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Platforma romaneasca pentru colectionari
            </div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Colecteaza istorie cu E-numismatica
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Gasesti monede autentice, licitatii active si suport local pentru fiecare achizitie. Fie ca vrei sa completezi
              o serie sau sa investesti, iti oferim context, transparenta si o experienta moderna.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              >
                Vezi magazinul
              </Link>
              <Link
                href="/auctions"
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
              >
                Licitatii in desfasurare
              </Link>
              <span className="text-sm text-slate-500">Evaluari rapide si livrare asigurata</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Autentificare rapida
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                Notificari live pentru licitatii
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                Comunitate de colectionari
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-200/60 via-white to-white blur-3xl" aria-hidden />
            <div className="relative rounded-3xl border border-amber-100 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <LazyImage
                src="/20-gouden-munt-double-eagle-coronet-head-achterkant-web_big.png"
                alt="Moneda Double Eagle din colectia noastra"
                className="h-[340px] w-full rounded-2xl object-cover"
                placeholder="Se incarca imaginea colectiei"
              />
              <div className="mt-4 flex items-start justify-between rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Piesa recenta</p>
                  <p className="text-base font-semibold text-slate-900">Double Eagle Coronet Head</p>
                  <p className="text-sm text-slate-600">Disponibila acum in magazin si licitatii</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm shadow-amber-200">
                  Aur 900/1000
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-amber-200 hover:bg-white"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <span className="text-sm font-bold group-hover:scale-110 group-hover:transform">*</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Cum functioneaza</p>
              <h2 className="text-2xl font-bold text-slate-900">De la cautare la livrare, totul in romana</h2>
              <p className="mt-1 text-sm text-slate-600">
                Procese clare si suport local pentru fiecare pas, fie ca alegi magazinul sau licitatiile.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-200 hover:text-amber-800"
            >
              Ai nevoie de ajutor?
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{step.label}</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
