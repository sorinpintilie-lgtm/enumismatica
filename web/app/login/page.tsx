'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { signInWithEmail, signInWithGoogle } from 'shared/auth';

const loginSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: z.string().min(6, 'Parola trebuie să aibă cel puțin 6 caractere'),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    } else if (user) {
      router.push('/dashboard');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-500 via-navy-600 to-navy-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm rounded-3xl border border-gold-500/30 p-8 shadow-[0_20px_60px_rgba(231,183,60,0.2)]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-500">
            Autentificare
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Conectează-te la contul tău E-numismatica
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
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
                placeholder="Parola ta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-navy-500 hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 shadow-lg shadow-navy-500/30 transition-all duration-200"
            >
              {loading ? 'Se autentifică...' : 'Autentificare'}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gold-500/50 text-sm font-semibold rounded-xl text-gold-700 bg-gold-50 hover:bg-gold-100 hover:border-gold-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 transition-all duration-200"
            >
              Autentificare cu Google
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/register"
              className="font-medium text-gold-600 hover:text-gold-700 transition-colors"
            >
              Nu ai cont? Înregistrează-te
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
