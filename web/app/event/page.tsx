'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { createEventRegistration } from 'shared/eventRegistrationService'

export default function EventPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Te rugăm să introduci o adresă de email validă.')
      return
    }

    setIsSubmitting(true)
    try {
      await createEventRegistration({
        email: trimmedEmail,
        fullName: fullName.trim() || undefined,
        eventKey: 'app-launch-2025',
        source: 'qr-event',
        marketingOptIn,
      })
      setSuccess(true)
      setFullName('')
      setEmail('')
    } catch (err: any) {
      console.error('Failed to register for event', err)
      setError('A apărut o eroare la înregistrare. Încearcă din nou în câteva momente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-black to-navy-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full rounded-3xl border border-[#e7b73c]/40 bg-navy-900/90 shadow-[0_28px_80px_rgba(0,0,0,0.9)] px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e7b73c]/60 bg-[#e7b73c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#e7b73c]">
            Invitație specială
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            Lansarea oficială eNumismatica
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto">
            Suntem aproape gata să lansăm noua aplicație mobilă și platforma web eNumismatica.
            Dacă ai scanat acest cod QR, ești printre primii invitați să îți rezervi locul și să primești acces prioritar.
          </p>
        </div>

        {!success ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#e7b73c]" />
                <p className="text-slate-200">
                  Primești <span className="font-semibold text-[#e7b73c]">acces anticipat</span> la aplicația
                  mobilă și la funcționalitățile noi.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#e7b73c]" />
                <p className="text-slate-200">
                  Vei fi anunțat când <span className="font-semibold text-[#e7b73c]">deschidem înscrierile</span>{' '}
                  și când are loc evenimentul oficial.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#e7b73c]" />
                <p className="text-slate-200">
                  Emailul tău va fi folosit ca{' '}
                  <span className="font-semibold text-[#e7b73c]">utilizator de logare</span> în aplicație la lansare.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/60 bg-red-900/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-100">
                  Nume complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Ion Popescu"
                  className="w-full rounded-xl border border-[#e7b73c]/30 bg-navy-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-100">
                  Adresă de email
                  <span className="ml-1 text-[#e7b73c]">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplu@domeniu.ro"
                  className="w-full rounded-xl border border-[#e7b73c]/30 bg-navy-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <input
                  id="marketingOptIn"
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#e7b73c]/60 bg-navy-950 text-[#e7b73c] focus:ring-[#e7b73c]"
                />
                <label htmlFor="marketingOptIn">
                  Da, vreau să primesc pe email noutăți despre lansare, actualizări și oferte speciale pentru
                  colecționari. Nu trimitem spam și îți poți retrage acordul oricând.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[#e7b73c] px-6 py-3 text-sm font-semibold text-[#000940] shadow-[0_0_28px_rgba(231,183,60,0.8)] transition hover:bg-[#f0c955] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Se înregistrează...' : 'Rezervă-mi locul la lansare'}
              </button>
            </form>

            <p className="mt-4 text-[11px] sm:text-xs text-slate-400 text-center">
              Datele tale sunt folosite exclusiv pentru comunicări legate de lansarea aplicației și a platformei
              eNumismatica. Nu le vom vinde sau partaja cu terți.
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#e7b73c]/50 bg-navy-950/80 px-6 py-8 text-center shadow-[0_0_30px_rgba(231,183,60,0.5)]">
            <h2 className="text-2xl font-bold text-white mb-2">Îți mulțumim!</h2>
            <p className="text-sm sm:text-base text-slate-200 mb-4">
              Ți-am înregistrat adresa de email pentru lansarea oficială eNumismatica. Când aplicația și platforma
              vor fi gata, vei primi un email cu pașii pentru activarea contului tău.
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Poți închide această pagină în siguranță. Dacă nu găsești emailul nostru în zilele de dinainte de
              lansare, verifică și folderele „Spam” / „Promotions”.
            </p>
          </div>
        )}

        <div className="mt-6 text-center text-[11px] sm:text-xs text-slate-500">
          © {new Date().getFullYear()} eNumismatica.ro — Platformă modernă pentru colecționari de monede.
        </div>
      </div>
    </div>
  )
}