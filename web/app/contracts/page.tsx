'use client';

import { useState } from 'react';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { functions } from '../lib/firebase';

export default function ContractsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Descărcarea contractelor este disponibilă doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a vedea și descărca contractele semnate pentru tranzacțiile tale.
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
      </div>
    );
  }

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedId = transactionId.trim();
    if (!trimmedId) {
      setError('Introdu un ID de tranzacție valid.');
      return;
    }

    try {
      setLoading(true);
      const callable = httpsCallable(functions, 'getCompletedContract');
      const result = await callable({ transactionId: trimmedId });
      const data = result.data as any;

      if (data && data.downloadUrl) {
        if (typeof window !== 'undefined') {
          window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
        }
        setSuccessMessage('Contractul a fost găsit. Fișierul s-a deschis într-o filă nouă.');
      } else {
        setError('Nu s-a putut obține linkul de descărcare pentru acest contract.');
      }
    } catch (err: any) {
      console.error('Failed to get completed contract:', err);

      // Try to surface a meaningful error message
      const message =
        err?.message ||
        err?.code === 'functions/failed-precondition'
          ? 'Contractul nu este încă finalizat sau nu este disponibil pentru descărcare.'
          : 'Nu s-a putut descărca contractul. Încearcă din nou mai târziu.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Contractele mele</h1>
          <p className="text-slate-300">
            Introdu ID-ul tranzacției pentru a descărca contractul final semnat prin eSemneaza.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la cont
        </Link>
      </div>

      <form
        onSubmit={handleDownload}
        className="max-w-xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/80 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]"
      >
        <label className="block text-sm font-medium text-slate-200 mb-2">
          ID tranzacție
        </label>
        <input
          type="text"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="ex: abc123..."
          className="w-full rounded-xl border border-slate-600 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
        />

        <p className="mt-2 text-xs text-slate-400">
          Găsești ID-ul tranzacției în detaliile tranzacției sau îl poți primi de la administratorul
          platformei.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Se verifică și se pregătește descărcarea...' : 'Descarcă contractul semnat'}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-900/40 px-3 py-2 text-xs text-emerald-100">
            {successMessage}
          </div>
        )}
      </form>
    </div>
  );
}
