'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

type PaymentStatusResponse = {
  orderId: string;
  status: string;
  creditsApplied: boolean;
  creditedAmount: number;
  amountRON: number;
  netopiaStatus: string | null;
};

function CreditsSuccessContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentStatusResponse | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!orderId || !user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/payments/netopia/status?orderId=${encodeURIComponent(orderId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || 'Nu s-a putut verifica statusul plății.');
        }
        setData(body);
      } catch (err: any) {
        setError(err?.message || 'A apărut o eroare la verificarea plății.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId, user]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/70 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
        <h1 className="text-2xl font-bold text-white">Status plată credite</h1>

        {loading ? (
          <p className="mt-4 text-slate-300">Verificăm statusul tranzacției...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : !data ? (
          <p className="mt-4 text-slate-300">Nu există detalii pentru această tranzacție.</p>
        ) : (
          <div className="mt-4 space-y-3 text-slate-200">
            <p>
              Comandă: <span className="font-mono text-gold-300">{data.orderId}</span>
            </p>
            <p>Status intern: <span className="font-semibold text-gold-300">{data.status}</span></p>
            <p>Status NETOPIA: <span className="font-semibold text-gold-300">{data.netopiaStatus || 'n/a'}</span></p>
            <p>Suma: <span className="font-semibold text-gold-300">{data.amountRON} RON</span></p>
            <p>
              Credite acordate:{' '}
              <span className="font-semibold text-gold-300">{data.creditsApplied ? data.creditedAmount : 0}</span>
            </p>

            {data.creditsApplied ? (
              <p className="text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-2">
                Plata a fost confirmată și creditele au fost adăugate în cont.
              </p>
            ) : (
              <p className="text-yellow-100 border border-yellow-500/30 bg-yellow-500/10 rounded-lg px-3 py-2">
                Plata este încă în curs de confirmare. Reîncarcă pagina în câteva momente.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2 text-sm font-semibold text-navy-900 hover:bg-[#f0c955]"
          >
            Înapoi la cont
          </Link>
          <Link
            href="/credits"
            className="inline-flex items-center justify-center rounded-full border border-gold-500/60 px-5 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-500/10"
          >
            Cumpără alte credite
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CreditsSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-2xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/70 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
            <h1 className="text-2xl font-bold text-white">Status plată credite</h1>
            <p className="mt-4 text-slate-300">Se încarcă...</p>
          </div>
        </div>
      }
    >
      <CreditsSuccessContent />
    </Suspense>
  );
}

