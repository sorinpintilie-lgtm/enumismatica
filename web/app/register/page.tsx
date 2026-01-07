'use client';

import { Suspense, useState } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { signUpWithEmail, signInWithGoogle } from 'shared/auth';
import { validCnp } from '../../lib/validatorsRo/cnp';

const registerSchema = z.object({
  email: z.string().email('Adresă de email invalidă'),
  password: z.string().min(6, 'Parola trebuie să aibă cel puțin 6 caractere'),
  confirmPassword: z.string(),
  cnp: z
    .string()
    .optional()
    .refine((val) => !val || validCnp(val), {
      message: 'CNP invalid',
    }),
  idDocumentType: z.enum(['ci', 'passport']).optional(),
  idDocumentNumber: z.string().optional(),
  idDocumentSeries: z.string().optional(),
  verifyIdentity: z.boolean().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Trebuie să accepți Termenii și Condițiile',
  }),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolele nu se potrivesc',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => !data.idDocumentNumber || !!data.idDocumentType,
    {
      message: 'Selectează tipul documentului pentru numărul introdus',
      path: ['idDocumentType'],
    },
  )
  .refine(
    (data) => {
      if (data.verifyIdentity) {
        return !!data.cnp && !!data.idDocumentType && !!data.idDocumentNumber && !!data.idDocumentSeries;
      }
      return true;
    },
    {
      message: 'CNP, tip document, număr document și serie document sunt obligatorii pentru verificare identitate',
      path: ['verifyIdentity'],
    },
  );

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialReferral = searchParams.get('ref') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [cnp, setCnp] = useState('');
  const [idDocumentType, setIdDocumentType] = useState<'ci' | 'passport' | ''>('');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [idDocumentSeries, setIdDocumentSeries] = useState('');
  const [idDocumentFrontPhoto, setIdDocumentFrontPhoto] = useState<File | null>(null);
  const [idDocumentBackPhoto, setIdDocumentBackPhoto] = useState<File | null>(null);
  const [verifyIdentity, setVerifyIdentity] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      registerSchema.parse({
        email,
        password,
        confirmPassword,
        cnp: cnp || undefined,
        idDocumentType: idDocumentType || undefined,
        idDocumentNumber: idDocumentNumber || undefined,
        idDocumentSeries: idDocumentSeries || undefined,
        verifyIdentity,
        acceptTerms,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.issues[0].message);
      }
      setLoading(false);
      return;
    }

    // Validate photo uploads if identity verification is requested
    if (verifyIdentity && !idDocumentFrontPhoto) {
      setError('Fotografia față document este obligatorie pentru verificare identitate');
      setLoading(false);
      return;
    }

    const idDocumentPayload = verifyIdentity
      ? {
          type: (idDocumentType || 'ci') as 'ci' | 'passport',
          series: idDocumentSeries,
          number: idDocumentNumber,
          frontPhoto: idDocumentFrontPhoto,
          backPhoto: idDocumentBackPhoto,
        }
      : undefined;

    const { user, error } = await signUpWithEmail(
      email,
      password,
      referralCode || undefined,
      idDocumentPayload,
      cnp || undefined,
    );
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
      <div className="max-w-md w-full space-y-8 bg-navy-900/85 backdrop-blur-sm rounded-3xl border border-gold-500/40 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Creează-ți contul
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Alătură-te comunității de colecționari eNumismatica
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleEmailRegister}>
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
                placeholder="Minim 6 caractere"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-1">
                Confirmă parola
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="Confirmă parola"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="referral" className="block text-sm font-medium text-slate-200 mb-1">
                Cod de invitație (opțional)
              </label>
              <input
                id="referral"
                name="referral"
                type="text"
                className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="Introdu codul de invitație sau lasă gol"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
            <div className="pt-2 border-t border-gold-500/30 mt-2 space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="verifyIdentity"
                    name="verifyIdentity"
                    type="checkbox"
                    checked={verifyIdentity}
                    onChange={(e) => setVerifyIdentity(e.target.checked)}
                    className="w-4 h-4 border border-gold-500/40 rounded bg-navy-900/70 text-gold-500 focus:ring-2 focus:ring-gold-500 focus:ring-offset-0"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="verifyIdentity" className="text-slate-300">
                    Doresc să verific identitatea pentru a obține un cont verificat
                  </label>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Verificare identitate (opțional) – pe platforma enumismatica.ro poți furniza datele din CI sau pașaport pentru obținerea unui cont verificat, crescând încrederea în anunțurile și ofertele tale.
              </p>
              {verifyIdentity && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="cnp" className="block text-sm font-medium text-slate-200 mb-1">
                      CNP <span className="text-red-400">*</span>
                    </label>
                  <input
                    id="cnp"
                    name="cnp"
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                    placeholder="13 cifre"
                    value={cnp}
                    onChange={(e) => setCnp(e.target.value.replace(/\D+/g, ''))}
                  />
                  {cnp.length > 0 && cnp.length < 13 && (
                    <p className="mt-1 text-xs text-slate-400">CNP trebuie să conțină 13 cifre.</p>
                  )}
                  {cnp.length === 13 && !validCnp(cnp) && (
                    <p className="mt-1 text-xs text-red-300">CNP invalid.</p>
                  )}
                  {cnp.length === 13 && validCnp(cnp) && (
                    <p className="mt-1 text-xs text-emerald-300">CNP valid.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Tip document <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="block w-full px-4 py-3 border border-gold-500/40 bg-navy-900/70 text-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    value={idDocumentType}
                    onChange={(e) => setIdDocumentType(e.target.value as 'ci' | 'passport' | '')}
                  >
                    {!verifyIdentity && <option value="">Selectează tipul documentului</option>}
                    <option value="ci">Carte de identitate (CI)</option>
                    <option value="passport">Pașaport</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="idNumber" className="block text-sm font-medium text-slate-200 mb-1">
                    Număr document <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                    placeholder="Ex: RX123456 / 123456789"
                    value={idDocumentNumber}
                    onChange={(e) => setIdDocumentNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="idSeries" className="block text-sm font-medium text-slate-200 mb-1">
                    Serie document <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="idSeries"
                    name="idSeries"
                    type="text"
                    className="appearance-none relative block w-full px-4 py-3 border border-gold-500/40 placeholder-slate-400 text-slate-50 rounded-xl bg-navy-900/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent focus:z-10 sm:text-sm"
                    placeholder="Ex: RX / AB / C"
                    value={idDocumentSeries}
                    onChange={(e) => setIdDocumentSeries(e.target.value)}
                  />
                </div>
                
                {/* ID Document Photo Uploads */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Fotografie față document <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm text-slate-400"
                      onChange={(e) => setIdDocumentFrontPhoto(e.target.files?.[0] || null)}
                      required={verifyIdentity}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Fotografie spate document (opțional)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm text-slate-400"
                      onChange={(e) => setIdDocumentBackPhoto(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 border border-gold-500/40 rounded bg-navy-900/70 text-gold-500 focus:ring-2 focus:ring-gold-500 focus:ring-offset-0"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="text-slate-300">
                Sunt de acord ca datele mele să fie procesate în conformitate cu{' '}
                <Link href="/terms" className="text-gold-400 hover:text-gold-300 underline">
                  Termenii și Condițiile
                </Link>
                {' '}și{' '}
                <Link href="/privacy" className="text-gold-400 hover:text-gold-300 underline">
                  Politica de Confidențialitate
                </Link>
                {' '}ale enumismatica.ro. *
              </label>
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
              {loading ? 'Se înregistrează...' : 'Înregistrare'}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gold-500/60 text-sm font-semibold rounded-xl text-gold-200 bg-navy-900/70 hover:bg-gold-500/10 hover:border-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 transition-all duration-200"
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
