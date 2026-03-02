"use client";

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-bold text-gold-400 mb-4">Contactează-ne</h3>
            <div className="space-y-4">
              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Adresă</h4>
                  <p className="text-gray-300">Strada Drumul Dealu Crisului, Nr34, Sector 4, Bucuresti</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <a
                    href="mailto:contact@enumismatica.ro"
                    className="text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    contact@enumismatica.ro
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Telefon</h4>
                  <a
                    href="tel:+40735223025"
                    className="text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    0735 223 025
                  </a>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Program</h4>
                  <p className="text-gray-300 text-sm">
                    Luni - Vineri: 9:00 - 18:00<br />
                    Sâmbătă: 10:00 - 16:00<br />
                    Duminică: Închis
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-gold-400 mb-4">Link-uri rapide</h3>
            <ul className="space-y-2">
              <li><a href="/products" className="text-gray-300 hover:text-gold-400 transition-colors">E-shop</a></li>
              <li><a href="/auctions" className="text-gray-300 hover:text-gold-400 transition-colors">Licitații</a></li>
              <li><a href="/monetaria-statului" className="text-gray-300 hover:text-gold-400 transition-colors">Monetaria Statului</a></li>
              <li><a href="/about" className="text-gray-300 hover:text-gold-400 transition-colors">Despre noi</a></li>
              <li><Link href="/terms" className="text-gray-300 hover:text-gold-400 transition-colors">Termeni și Condiții</Link></li>
              <li><Link href="/privacy" className="text-gray-300 hover:text-gold-400 transition-colors">Politica de Confidențialitate</Link></li>
              <li><Link href="/gdpr" className="text-gray-300 hover:text-gold-400 transition-colors">GDPR</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xl font-bold text-gold-400 mb-4">Despre noi</h3>
            <p className="text-gray-300 text-sm">
              eNumismatica.ro este platforma lider în numismatică din România,
              oferind colecții rare și piese de colecție de cea mai înaltă calitate.
            </p>
          </div>
        </div>

        {/* Partners */}
        <div className="mt-10 border-t border-navy-700 pt-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gold-400 mb-2">Parteneri</h3>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            {/* Monetaria Statului */}
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-300 mb-2">Monetaria Statului</div>
              <a
                href="https://www.monetariastatului.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block group"
              >
                <div className="relative h-16 w-32 mx-auto">
                  <Image
                    src="/logomonetaria statului.png"
                    alt="Monetaria Statului"
                    fill
                    className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </a>
            </div>

            {/* Pronumismatica */}
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-300 mb-2">Pronumismatica</div>
              <a
                href="https://www.pronumismatica.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block group"
              >
                <div className="relative h-16 w-32 mx-auto">
                  <Image
                    src="/pronumilogo.png"
                    alt="Asociația PRONUMISMATICA"
                    fill
                    className="object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-navy-700 mt-6 pt-4 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            © 2026 eNumismatica.ro. Toate drepturile rezervate.
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-400 text-xs">Powered by</span>
            <a
              href="https://sky.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              <Image
                src="/skyrologo.png"
                alt="Skyro"
                width={80}
                height={20}
                className="object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
