'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdmin } from 'shared/adminService';

export default function AdminModeratorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(user.uid);
      if (!adminStatus) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Panou Admin (Simplificat)</h1>
          <p className="text-slate-300 max-w-2xl">
            Acesta este panoul pentru administratorii obișnuiți. Poți aproba și gestiona piese și
            licitații, dar nu ai acces la gestionarea utilizatorilor, loguri complete sau analitice
            avansate.
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/products"
            className="bg-navy-800/60 hover:bg-navy-700/70 border border-gold-500/30 hover:border-gold-500/50 rounded-2xl p-6 transition-colors shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-2xl font-semibold text-white mb-2">Piese</h2>
            <p className="text-slate-300 mb-3">
              Vezi și aprobă piesele trimise de utilizatori pentru vânzare directă.
            </p>
            <span className="inline-flex items-center text-gold-400 font-semibold text-sm">
              Mergi la gestionare piese
              <span className="ml-1" aria-hidden>
                →
              </span>
            </span>
          </Link>

          <Link
            href="/admin/auctions"
            className="bg-navy-800/60 hover:bg-navy-700/70 border border-gold-500/30 hover:border-gold-500/50 rounded-2xl p-6 transition-colors shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-2xl font-semibold text-white mb-2">Licitații</h2>
            <p className="text-slate-300 mb-3">
              Vezi, aprobă și gestionează licitațiile active și cele în așteptare.
            </p>
            <span className="inline-flex items-center text-gold-400 font-semibold text-sm">
              Mergi la gestionare licitații
              <span className="ml-1" aria-hidden>
                →
              </span>
            </span>
          </Link>

          <Link
            href="/admin/users"
            className="bg-navy-800/60 hover:bg-navy-700/70 border border-gold-500/30 hover:border-gold-500/50 rounded-2xl p-6 transition-colors shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-2xl font-semibold text-white mb-2">Utilizatori</h2>
            <p className="text-slate-300 mb-3">
              Vezi și gestionează conturile utilizatorilor (roluri de admin / utilizator, ștergere cont).
            </p>
            <span className="inline-flex items-center text-gold-400 font-semibold text-sm">
              Mergi la gestionare utilizatori
              <span className="ml-1" aria-hidden>
                →
              </span>
            </span>
          </Link>
        </div>

        {/* Info box for permissions */}
        <div className="bg-navy-800/50 border border-blue-500/40 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-2">Permisiuni limitate</h3>
          <p className="text-slate-300 text-sm mb-2">
            Ca admin, poți:
          </p>
          <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 mb-4">
            <li>Aproba / respinge piese trimise de utilizatori.</li>
            <li>Aproba / respinge licitații și încheia licitații dacă este necesar.</li>
            <li>Modifica detalii pentru piese și licitații existente.</li>
          </ul>
          <p className="text-slate-400 text-xs">
            Gestionarea utilizatorilor, logurile detaliate de activitate și panoul complet de analitice
            sunt rezervate super-adminului.
          </p>
        </div>
      </div>
    </div>
  );
}

