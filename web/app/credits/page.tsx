'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

const CREDIT_PRICE_RON = 1;
const CREDIT_PACKS = [20, 50, 100, 200] as const;

export default function CreditsPurchasePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [ronAmount, setRonAmount] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const estimatedCredits = useMemo(() => {
    if (!ronAmount || ronAmount <= 0) return 0;
    return Math.floor(ronAmount / CREDIT_PRICE_RON);
  }, [ronAmount]);

  const handleCreatePayment = async () => {
    if (!user) return;
    setError(null);

    try {
      setSubmitting(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/payments/netopia/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ronAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Nu s-a putut iniția plata.');
      }

      if (!data?.paymentUrl) {
        throw new Error('NETOPIA nu a returnat un URL de plată.');
      }

      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setError(err?.message || 'A apărut o eroare la inițierea plății.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-slate-200">Se încarcă...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/70 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.8)]">
        <h1 className="text-2xl font-bold text-white">Cumpără credite</h1>
        <p className="mt-2 text-slate-300">
          Plata este procesată prin NETOPIA Payments. 1 credit = {CREDIT_PRICE_RON} RON.
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-200 mb-2">Pachete credite</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CREDIT_PACKS.map((credits) => {
              const selected = ronAmount === credits;
              return (
                <button
                  key={credits}
                  type="button"
                  onClick={() => setRonAmount(credits)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-gold-400 bg-gold-500/20 text-gold-200'
                      : 'border-gold-500/30 bg-navy-950/70 text-slate-200 hover:bg-gold-500/10'
                  }`}
                >
                  {credits} credite
                  <span className="block mt-1 text-xs opacity-80">{credits} RON</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gold-500/20 bg-navy-950/40 px-4 py-3">
          <p className="text-sm text-slate-300">
            Vei primi aproximativ <span className="font-semibold text-gold-300">{estimatedCredits} credite</span>.
          </p>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreatePayment}
          disabled={submitting || !CREDIT_PACKS.includes(ronAmount as (typeof CREDIT_PACKS)[number])}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-navy-900 shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Se inițiază plata...' : 'Continuă către NETOPIA'}
        </button>
      </div>
    </div>
  );
}

