'use client';

import Link from 'next/link';
import LazyImage from './components/LazyImage';
import ProductCard from './components/ProductCard';
import { useCachedProducts } from './hooks/useCachedProducts';
import { useSiteAsset } from './hooks/useSiteAsset';
import { useAuth } from './context/AuthContext';

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
  const { user } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useCachedProducts(undefined, 8, undefined, !!user);
  const { data: heroAsset, isLoading: heroLoading } = useSiteAsset('homepage-hero');

  return (
    <div className="bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
      {/* Hero */}
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e7b73c] bg-white/5 px-3 py-1 text-xs font-semibold text-[#e7b73c] shadow-inner shadow-[#e7b73c]/40">
              <span className="h-2 w-2 rounded-full bg-[#e7b73c]" aria-hidden />
              Platforma romaneasca pentru colectionari
            </div>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              Colecteaza istorie cu eNumismatica
            </h1>
            <p className="max-w-2xl text-lg text-slate-200">
              Gasesti monede autentice, licitatii active si suport local pentru fiecare achizitie. Fie ca vrei sa completezi
              o serie sau sa investesti, iti oferim context, transparenta si o experienta moderna.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/40 transition hover:bg-[#f0c955]"
              >
                Vezi magazinul
              </Link>
              <Link
                href="/auctions"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#e7b73c] px-6 py-3 text-sm font-semibold text-[#e7b73c] transition hover:bg-[#e7b73c]/10"
              >
                Licitatii in desfasurare
              </Link>
            </div>

            {/* Features - Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-gold-500/20 bg-navy-700/30 backdrop-blur-sm">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Autentificare rapida</h3>
                  <p className="text-xs text-slate-300 mt-1">Acces instant la cont si licitatii</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl border border-gold-500/20 bg-navy-700/30 backdrop-blur-sm">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Notificari live pentru licitatii</h3>
                  <p className="text-xs text-slate-300 mt-1">Alerte instant pentru oferte noi</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl border border-gold-500/20 bg-navy-700/30 backdrop-blur-sm">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Comunitate de colectionari</h3>
                  <p className="text-xs text-slate-300 mt-1">Conecteaza-te cu pasionati</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#e7b73c]/40 via-transparent to-transparent blur-3xl"
              aria-hidden
            />
            <div className="relative rounded-3xl border border-[#e7b73c] bg-white/98 backdrop-blur-sm p-4 shadow-[0_20px_60px_rgba(231,183,60,0.35)]">
              {heroLoading ? (
                <div className="h-[340px] w-full rounded-2xl bg-navy-100 animate-pulse" />
              ) : (
                <LazyImage
                  src={
                    heroAsset?.imageUrl ||
                    '/assets/20-gouden-munt-double-eagle-coronet-head-achterkant-web_big.png'
                  }
                  alt={heroAsset?.altText || 'Moneda Double Eagle din colectia noastra'}
                  className="h-[340px] w-full rounded-2xl object-contain bg-white"
                  placeholder="Se incarca imaginea colectiei"
                />
              )}
              <div className="mt-4 flex items-start justify-between rounded-2xl border border-[#e7b73c] bg-[#e7b73c] px-4 py-3 shadow-lg shadow-[#e7b73c]/40">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#000940]">Piesa recenta</p>
                  <p className="text-base font-semibold text-white">Double Eagle Coronet Head</p>
                  <p className="text-sm text-white/90">Disponibila acum in magazin si licitatii</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#e7b73c] shadow-sm">
                  Aur 900/1000
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-gold-500/20 bg-navy-600">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-gold-500/30 bg-navy-500/60 p-6 shadow-[0_10px_35px_rgba(231,183,60,0.15)] transition hover:-translate-y-1 hover:border-gold-400 hover:bg-navy-400/80 backdrop-blur-sm"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-navy-900">
                <span className="text-sm font-bold group-hover:scale-110 group-hover:transform">★</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 bg-navy-700">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-400 mb-2">Catalog</p>
          <h2 className="text-3xl font-bold text-white mb-3">Ultimele Produse</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Monede recent adăugate în catalog, verificate și gata de livrare. Vizualizarea detaliilor și a licitațiilor este
            disponibilă doar utilizatorilor autentificați.
          </p>
        </div>

        {user ? (
          <>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-72 sm:h-80 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-8">
                {products.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            <div className="text-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#e7b73c] bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#e7b73c]/40 transition hover:bg-[#f0c955] hover:border-[#f0c955]"
              >
                Vezi toate produsele
                <span className="ml-2" aria-hidden>→</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/70 p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.8)]">
            <h3 className="text-lg font-semibold text-white mb-2">Autentifică-te pentru a vedea catalogul</h3>
            <p className="text-sm text-slate-300 mb-4">
              Pentru a accesa produsele, licitațiile și detaliile pieselor, este necesar un cont. Fără autentificare poți vedea
              doar pagina de start și informațiile generale.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/50 hover:bg-[#f0c955] transition"
              >
                Autentificare
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition"
              >
                Creează cont
              </Link>
            </div>
          </div>
        )}
      </section>


      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 bg-navy-800">
        <div className="rounded-3xl border border-gold-500/30 bg-navy-600/80 p-8 shadow-[0_18px_50px_rgba(231,183,60,0.2)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">Cum functioneaza</p>
              <h2 className="text-2xl font-bold text-white">De la cautare la livrare, totul in romana</h2>
              <p className="mt-1 text-sm text-slate-300">
                Procese clare si suport local pentru fiecare pas, fie ca alegi magazinul sau licitatiile.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-gold-500 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:border-gold-400 hover:bg-gold-500/10"
            >
              Ai nevoie de ajutor?
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.label} className="rounded-2xl border border-gold-500/20 bg-navy-500/50 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">{step.label}</p>
                <p className="mt-2 text-base font-semibold text-white">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
