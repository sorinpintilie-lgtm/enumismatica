'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PASSWORD = 'Enum1sm@tic4';
const STORAGE_KEY = 'enumismatica_access_granted';

export default function PasswordProtection({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Check if current path should be protected
  const isProtectedRoute = !pathname.startsWith('/event');

  useEffect(() => {
    // Check if user has already been granted access
    const accessGranted = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsAuthenticated(accessGranted);
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Parolă incorectă');
      setPassword('');
    }
  };

  // If not a protected route, show content directly
  if (!isProtectedRoute) {
    return <>{children}</>;
  }

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  // If authenticated, show content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900 p-4">
      <div className="max-w-md w-full rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-2">eNumismatica.ro</h1>
          <p className="text-slate-300 text-sm">
            Acces restricționat. Introduceți parola pentru a continua.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduceți parola"
              className="w-full px-4 py-3 bg-navy-800 border border-[#e7b73c]/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c]/50 focus:border-[#e7b73c]"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-[#e7b73c]/30"
          >
            Accesează
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#e7b73c]/20">
          <p className="text-xs text-slate-400">
            Pentru informații despre evenimente, accesați{' '}
            <a href="/event" className="text-[#e7b73c] hover:underline">
              pagina evenimentelor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}