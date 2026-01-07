'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { signInWithEmail, signInWithGoogle } from 'shared/auth';
import { auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const loginSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: z.string().min(6, 'Parola trebuie să aibă cel puțin 6 caractere'),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  
  const router = useRouter();

  const startSessionOnServer = async () => {
    try {
      const current = auth.currentUser;
      if (!current) return;
      const token = await current.getIdToken();

      const res = await fetch('/api/auth/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceLabel: typeof navigator !== 'undefined' ? navigator.platform : 'web',
        }),
      });

      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.sessionId) {
        localStorage.setItem('enumismatica_session_id', String(data.sessionId));
      }
    } catch (err) {
      console.warn('Failed to start session on server:', err);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      loginSchema.parse({ email, password });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.issues[0].message);
      }
      setLoading(false);
      return;
    }

    const { user, error } = await signInWithEmail(email, password);
    setLoading(false);
    
    if (error) {
      setError(error);
      return;
    }
    
    if (user) {
      // Check if user has 2FA enabled
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().twoFactorEnabled) {
          // User has 2FA enabled, show 2FA prompt
          setPendingUserId(user.uid);
          setTwoFactorSecret(userDoc.data().twoFactorSecret);
          setShow2FA(true);
          // Sign out temporarily until 2FA is verified
          await auth.signOut();
        } else {
          // No 2FA, proceed to dashboard
          await startSessionOnServer();
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking 2FA status:', err);
        await startSessionOnServer();
        router.push('/dashboard');
      }
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTwoFactorError('');

    if (!pendingUserId || !twoFactorSecret || !twoFactorCode) {
      setTwoFactorError('Cod invalid');
      setLoading(false);
      return;
    }

    try {
      // Verify the 2FA code
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingUserId,
          code: twoFactorCode,
          secret: twoFactorSecret,
        }),
      });

      if (!res.ok) {
        throw new Error('Cod invalid');
      }

      // 2FA verified, sign in again
      const { user, error } = await signInWithEmail(email, password);
      
      if (error) {
        setTwoFactorError(error);
      } else if (user) {
        await startSessionOnServer();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Cod invalid. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { user, error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setError(error);
    } else if (user) {
      router.push('/dashboard');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail) {
      setResetError('Te rugăm să introduci adresa de email.');
      return;
    }

    try {
      z.string().email().parse(resetEmail);
    } catch {
      setResetError('Adresă de email invalidă.');
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      // For security we treat 200 as success even if the user doesn't exist.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nu s-a putut trimite emailul de resetare.');
      }

      setResetSuccess(
        'Dacă există un cont cu această adresă de email, vei primi un email cu instrucțiuni pentru resetarea parolei.',
      );
      setResetEmail('');
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowResetPassword(false);
        setResetSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError('Nu există niciun cont cu această adresă de email.');
      } else {
        setResetError(err.message || 'Nu s-a putut trimite emailul de resetare.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-500 via-navy-600 to-navy-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-navy-900/85 backdrop-blur-sm rounded-3xl border border-gold-500/40 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Autentificare
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Conectează-te la contul tău eNumismatica
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
          <div className="rounded-xl space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1">
                Adresă de email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="nume@exemplu.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1">
                Parolă
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="Parola ta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/60 text-red-100 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-[#000940] bg-[#e7b73c] hover:bg-[#f0c955] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-lg shadow-[0_0_24px_rgba(231,183,60,0.75)] transition-all duration-200"
            >
              {loading ? 'Se autentifică...' : 'Autentificare'}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gold-500/60 text-sm font-semibold rounded-xl text-gold-200 bg-navy-900/70 hover:bg-gold-500/10 hover:border-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 transition-all duration-200"
            >
              Autentificare cu Google
            </button>
          </div>

          {!show2FA && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="font-medium text-gold-400 hover:text-gold-300 transition-colors"
              >
                Ai uitat parola?
              </button>
              <Link
                href="/register"
                className="font-medium text-gold-400 hover:text-gold-300 transition-colors"
              >
                Înregistrează-te
              </Link>
            </div>
          )}
        </form>

        {/* 2FA Verification */}
        {show2FA && (
          <div className="mt-6 p-6 bg-navy-800/60 rounded-2xl border border-gold-500/40">
            <h3 className="text-lg font-semibold text-white mb-2">Autentificare cu Doi Factori</h3>
            <p className="text-sm text-slate-300 mb-4">
              Introdu codul din aplicația ta de autentificare
            </p>
            
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                  autoFocus
                />
              </div>

              {twoFactorError && (
                <div className="bg-red-900/40 border border-red-500/60 text-red-100 px-4 py-3 rounded-xl text-sm text-center">
                  {twoFactorError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-[#000940] bg-[#e7b73c] hover:bg-[#f0c955] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-lg shadow-[0_0_24px_rgba(231,183,60,0.75)] transition-all duration-200"
              >
                {loading ? 'Se verifică...' : 'Verifică Codul'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode('');
                  setTwoFactorError('');
                  setPendingUserId(null);
                  setTwoFactorSecret(null);
                }}
                className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Anulează
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-navy-900/95 backdrop-blur-sm rounded-3xl border border-gold-500/40 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Resetează Parola</h2>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetError('');
                  setResetSuccess('');
                  setResetEmail('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Introdu adresa ta de email și îți vom trimite instrucțiuni pentru resetarea parolei.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-200 mb-1">
                  Adresă de email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent sm:text-sm"
                  placeholder="nume@exemplu.ro"
                  required
                />
              </div>

              {resetError && (
                <div className="bg-red-900/40 border border-red-500/60 text-red-100 px-4 py-3 rounded-xl text-sm">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-900/40 border border-emerald-500/60 text-emerald-100 px-4 py-3 rounded-xl text-sm">
                  {resetSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-[#000940] bg-[#e7b73c] hover:bg-[#f0c955] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-lg shadow-[0_0_24px_rgba(231,183,60,0.75)] transition-all duration-200"
              >
                {resetLoading ? 'Se trimite...' : 'Trimite Email de Resetare'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
