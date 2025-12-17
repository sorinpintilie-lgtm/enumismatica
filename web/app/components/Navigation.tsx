'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdmin } from 'shared/adminService';
import NotificationCenter from './NotificationCenter';
import { useCart } from '../hooks/useCart';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Navigation() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { items: cartItems } = useCart(user?.uid);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isAdmin(user.uid);
        setIsAdminUser(adminStatus);

        // Check verification status
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsVerified(userData.verificationStatus === 'verified');
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      } else {
        setIsAdminUser(false);
        setIsVerified(false);
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
          <div className="flex items-center gap-2">
            <Image
              src="/assets/eNumismatica.ro_logo.png"
              alt="eNumismatica Logo"
              width={60}
              height={60}
              className="h-15 w-15 object-contain"
              priority
            />
            <Link href="/" className="text-base font-semibold text-white hover:text-gold-400 transition-colors whitespace-nowrap">
              eNumismatica <span className="text-xs uppercase tracking-[0.18em] text-gold-400">de colectie.</span>
            </Link>
          </div>

          {/* Divider between logo/title and menu */}
          <div className="hidden sm:block h-8 w-px bg-[#e7b73c]/35 mx-2" />

          {/* Center: menu items with separators */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300">
            <Link href="/products" className="hover:text-gold-400 transition-colors whitespace-nowrap">
              E-shop
            </Link>
            <span className="text-gold-400/80">|</span>
            <Link href="/monetaria-statului" className="hover:text-gold-400 transition-colors whitespace-nowrap">
              Monetăria Statului
            </Link>
            <span className="text-gold-400/80">|</span>
            <Link href="/auctions" className="hover:text-gold-400 transition-colors whitespace-nowrap">
              Licitații
            </Link>
            <span className="text-gold-400/80">|</span>
            <Link href="/pronumismatica" className="hover:text-gold-400 transition-colors whitespace-nowrap">
              PRONUMISMATICA
            </Link>
            <span className="text-gold-400/80">|</span>
            <Link href="/about" className="hover:text-gold-400 transition-colors whitespace-nowrap">
              Despre noi
            </Link>
            {user && isAdminUser && (
              <>
                <span className="text-gold-400/80">|</span>
                <Link
                  href="/admin"
                  className="text-gold-400 font-semibold hover:text-gold-300 transition-colors"
                >
                  Administrare
                </Link>
              </>
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

          {/* Right: notifications + cart + watchlist + account / auth buttons (desktop / tablet only) */}
          <div className="hidden sm:flex items-center gap-3">
            {user && (
              <>
                <NotificationCenter />
                {/* Cart icon */}
                <Link
                  href="/cart"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/60 bg-navy-900/70 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  title="Coș"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.6 13.4a1 1 0 0 0 1 .8H19a1 1 0 0 0 .98-.8L22 6H6" />
                  </svg>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg">
                      {cartItems.length > 99 ? '99+' : cartItems.length}
                    </span>
                  )}
                </Link>
                {/* Watchlist icon */}
                <Link
                  href="/watchlist"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/60 bg-navy-900/70 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  title="Lista de urmărit"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" />
                  </svg>
                </Link>
              </>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-full border border-gold-500/50 px-3 text-sm font-medium text-gold-400 hover:border-gold-400 hover:bg-gold-500/10 transition-colors"
                  title="Panou"
                >
                  <div className="flex items-center gap-1">
                    Cont
                    {isVerified && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verificat
                      </span>
                    )}
                  </div>
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
                    E-shop
                  </Link>
                  <Link
                    href="/monetaria-statului"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Monetăria Statului
                  </Link>
                  <Link
                    href="/auctions"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    Licitații
                  </Link>
                  <Link
                    href="/pronumismatica"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/70 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                  >
                    PRONUMISMATICA
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
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/cart"
                        onClick={() => setMobileMenuOpen(false)}
                        className="relative inline-flex items-center justify-center rounded-full border border-gold-500/60 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                      >
                        Coș
                        {cartItems.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {cartItems.length > 9 ? '9+' : cartItems.length}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/watchlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="inline-flex items-center justify-center rounded-full border border-gold-500/60 bg-navy-800 px-3 py-2 font-semibold text-gold-200 hover:bg-gold-500/10 hover:border-gold-400 transition-colors"
                      >
                        Watchlist
                      </Link>
                    </div>
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
