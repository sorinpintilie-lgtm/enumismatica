'use client';

import { Suspense, useState } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { signUpWithEmail, signInWithGoogle } from 'shared/auth';

const registerSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: z.string().min(6, 'Parola trebuie să aibă cel puțin 6 caractere'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parolele nu se potrivesc",
  path: ["confirmPassword"],
});

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialReferral = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      registerSchema.parse({ email, password, confirmPassword });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.issues[0].message);
      }
      setLoading(false);
      return;
    }

    const { user, error } = await signUpWithEmail(email, password, referralCode || undefined);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (user) {
      router.push('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const { user, error } = await signInWithGoogle(referralCode || undefined);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (user) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-500 via-navy-600 to-navy-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm rounded-3xl border border-gold-500/30 p-8 shadow-[0_20px_60px_rgba(231,183,60,0.2)]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-500">
            Creează-ți contul
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Alătură-te comunității de colecționari E-numismatica
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleEmailRegister}>
          <div className="rounded-xl shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-500 mb-1">
                Adresă de email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-navy-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                placeholder="nume@exemplu.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-500 mb-1">
                Parolă
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-navy-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                placeholder="Minim 6 caractere"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy-500 mb-1">
                Confirmă parola
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-navy-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                placeholder="Confirmă parola"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="referral" className="block text-sm font-medium text-navy-500 mb-1">
                Cod de invitație (opțional)
              </label>
              <input
                id="referral"
                name="referral"
                type="text"
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-navy-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 focus:z-10 sm:text-sm"
                placeholder="Introdu codul de invitație sau lasă gol"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-lg shadow-gold-500/30 transition-all duration-200"
            >
              {loading ? 'Se înregistrează...' : 'Înregistrare'}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-slate-300 text-sm font-semibold rounded-xl text-navy-500 bg-white hover:bg-slate-50 hover:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 transition-all duration-200"
            >
              Înregistrare cu Google
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-gold-600 hover:text-gold-700 transition-colors"
            >
              Ai deja cont? Autentifică-te
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-500 via-navy-600 to-navy-900">
        <div className="text-white text-lg">Se încarcă...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
