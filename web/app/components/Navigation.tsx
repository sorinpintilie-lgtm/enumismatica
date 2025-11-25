'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdmin } from 'shared/adminService';
import NotificationCenter from './NotificationCenter';

export default function Navigation() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);

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
    router.push('/login');
  };

  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-4 sm:px-6 py-3 shadow-[0_12px_50px_rgba(15,23,42,0.12)]">
          <div className="flex items-center gap-3">
            <img
              src="/alese_rev4_bt_individual_BT_Q_BRONZE_GOLD.png"
              alt="E-numismatica Logo"
              className="h-20 w-20 object-contain"
            />
            <div className="flex flex-col leading-tight">
              <Link href="/" className="text-lg font-semibold text-slate-900 hover:text-amber-700 transition-colors">
                E-numismatica
              </Link>
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">de colectie.</span>
            </div>
            <div className="hidden sm:flex sm:items-center sm:gap-2 sm:ml-6">
              <span className="h-6 w-px bg-slate-200" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Experienta moderna
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <Link href="/products" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Magazin
            </Link>
            <Link href="/auctions" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Licitatii
            </Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Contact
            </Link>
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Despre noi
            </Link>
            {user && isAdminUser && (
              <Link href="/admin" className="text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors">
                Administrare
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && <NotificationCenter />}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors"
                  title="Panou"
                >
                  Cont
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition duration-200 hover:bg-slate-800"
                >
                  Deconectare
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="h-9 inline-flex items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors"
                >
                  Autentificare
                </Link>
                <Link
                  href="/register"
                  className="h-9 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 text-sm font-semibold text-slate-900 shadow-[0_10px_35px_rgba(201,161,74,0.35)] hover:from-amber-500 hover:to-amber-700 transition-colors"
                >
                  Inregistrare
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
