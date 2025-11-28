'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdmin } from 'shared/adminService';
import NotificationCenter from './NotificationCenter';
import { useSiteAsset } from '../hooks/useSiteAsset';

export default function Navigation() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { data: logoAsset, isLoading: logoLoading } = useSiteAsset('logo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isAdmin(user.uid);
        setIsAdminUser(adminStatus);
      } else {
        setIsAdminUser(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    router.push('/login');
  };

  return (
    <>
      <div className="sticky top-4 z-50 flex justify-center px-4 pointer-events-none">
        <div className="max-w-7xl w-full sm:w-auto pointer-events-auto">
          <nav className="relative flex items-center justify-between rounded-full border border-gold-500/30 bg-navy-500/90 px-4 sm:px-6 py-3 shadow-[0_12px_50px_rgba(231,183,60,0.25)] backdrop-blur-md">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            {logoLoading ? (
              <div className="h-20 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ) : logoAsset ? (
              <Image
                src={logoAsset.imageUrl}
                alt={logoAsset.altText}
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
                priority
              />
            ) : (
              <Image
                src="/assets/eNumismatica.ro_logo.png"
                alt="eNumismatica Logo"
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
                priority
              />
            )}
            <div className="flex flex-col leading-tight">
              <Link href="/" className="text-lg font-semibold text-white hover:text-gold-400 transition-colors">
                eNumismatica
              </Link>
              <span className="text-xs uppercase tracking-[0.24em] text-gold-400">de colectie.</span>
            </div>
          </div>

          {/* Divider between logo/title and menu */}
          <div className="hidden sm:block h-8 w-px bg-[#e7b73c]/35 mx-2" />

          {/* Center: menu items */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-gold-400 transition-colors">
              Magazin
            </Link>
            <Link href="/auctions" className="text-sm font-medium text-slate-300 hover:text-gold-400 transition-colors">
              Licitatii
            </Link>
            <Link href="/contact" className="text-sm font-medium text-slate-300 hover:text-gold-400 transition-colors">
              Contact
            </Link>
            <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-gold-400 transition-colors">
              Despre noi
            </Link>
            {user && isAdminUser && (
              <Link href="/admin" className="text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors">
                Administrare
              </Link>
            )}
          </div>

          {/* Divider between menu and right-side actions */}
          <div className="hidden sm:block h-8 w-px bg-[#e7b73c]/35 mx-2" />

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-gold-500/50 p-2 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400 transition-colors sm:hidden mr-2"
            aria-label="Deschide meniul"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {/* Right: notifications + account / auth buttons (desktop / tablet only) */}
          <div className="hidden sm:flex items-center gap-3">
            {user && <NotificationCenter />}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-full border border-gold-500/50 px-3 text-sm font-medium text-gold-400 hover:border-gold-400 hover:bg-gold-500/10 transition-colors"
                  title="Panou"
                >
                  Cont
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#e7b73c] px-4 text-sm font-semibold text-white shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition duration-200 hover:bg-[#f0c955]"
                >
                  Deconectare
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="h-9 inline-flex items-center justify-center rounded-full border border-gold-500/50 px-3 text-sm font-medium text-gold-400 hover:border-gold-400 hover:bg-gold-500/10 transition-colors"
                >
                  Autentificare
                </Link>
                <Link
                  href="/register"
                  className="h-9 inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(231,183,60,0.6)] hover:bg-[#f0c955] transition-colors"
                >
                  Inregistrare
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu panel - positioned outside nav to blur page content */}
      {mobileMenuOpen && (
        <div className="fixed top-[7.5rem] left-0 right-0 z-40 px-4 sm:hidden pointer-events-auto">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-gold-500/30 bg-navy-500/90 px-4 py-4 shadow-[0_12px_50px_rgba(231,183,60,0.25)] backdrop-blur-md space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Link
                    href="/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Magazin
                  </Link>
                  <Link
                    href="/auctions"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Licitații
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Contact
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Despre noi
                  </Link>
                  {user && isAdminUser && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors col-span-2"
                    >
                      Administrare
                    </Link>
                  )}
                </div>

                <div className="h-px bg-gold-500/30 my-1" />

                {user ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-gold-500/60 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                    >
                      Contul meu
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-3 py-2 font-semibold text-navy-900 shadow-lg shadow-[0_0_22px_rgba(231,183,60,0.7)] hover:bg-[#f0c955] transition-colors"
                    >
                      Deconectare
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-gold-500/60 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                    >
                      Autentificare
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-3 py-2 font-semibold text-navy-900 shadow-lg shadow-[0_0_22px_rgba(231,183,60,0.7)] hover:bg-[#f0c955] transition-colors"
                    >
                      Înregistrare
                    </Link>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
