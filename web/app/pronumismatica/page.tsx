'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseCnp, validCnp } from '../../lib/validatorsRo/cnp';

type Step = 1 | 2 | 3 | 4 | 5;

interface PronumismaticaForm {
  lastName: string;
  firstName: string;
  cnp: string;
  country: string;
  county: string;
  city: string;
  address: string;
  idType: 'CI' | 'BI' | 'Pasaport' | '';
  idSeries: string;
  phone: string;
  email: string;
}

const initialForm: PronumismaticaForm = {
  lastName: '',
  firstName: '',
  cnp: '',
  country: '',
  county: '',
  city: '',
  address: '',
  idType: '',
  idSeries: '',
  phone: '',
  email: '',
};

export default function PronumismaticaPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<PronumismaticaForm>(initialForm);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'cnp' ? value.replace(/\D+/g, '') : value;
    setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const cnpStatus = form.cnp.trim().length > 0 ? parseCnp(form.cnp) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Fișierul trebuie să fie o imagine.');
      return;
    }
    const maxSize = 7 * 1024 * 1024; // 7MB (kept in sync with the API)
    if (file.size > maxSize) {
      setError('Imaginea este prea mare (maxim 7MB).');
      return;
    }
    setError(null);
    if (name === 'idFront') setIdFront(file);
    if (name === 'idBack') setIdBack(file);
  };

  const canGoNext = () => {
    if (step === 1) {
      return (
        form.lastName.trim() !== '' &&
        form.firstName.trim() !== '' &&
        validCnp(form.cnp)
      );
    }
    if (step === 2) {
      return (
        form.country.trim() !== '' &&
        form.county.trim() !== '' &&
        form.city.trim() !== '' &&
        form.address.trim() !== ''
      );
    }
    if (step === 3) {
      return form.idType !== '' && form.idSeries.trim() !== '';
    }
    if (step === 4) {
      return form.phone.trim() !== '' && form.email.trim() !== '';
    }
    if (step === 5) {
      return !!idFront && !!idBack;
    }
    return false;
  };

  const nextStep = () => {
    if (step < 5 && canGoNext()) {
      if (step === 1) {
        const parsed = parseCnp(form.cnp);
        if (parsed.valid) {
          // Avoid logging the raw CNP; only log the parsed fields.
          console.log('Parsed CNP:', parsed.parsed);
        }
      }
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canGoNext() || step !== 5) {
      setError('Te rugăm să completezi toate câmpurile obligatorii.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      (Object.keys(form) as Array<keyof PronumismaticaForm>).forEach((key) => {
        payload.append(key, String(form[key] ?? ''));
      });
      if (idFront) payload.append('idFront', idFront, idFront.name);
      if (idBack) payload.append('idBack', idBack, idBack.name);

      const response = await fetch('/api/pronumismatica', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        throw new Error('Cererea nu a putut fi trimisă. Încearcă din nou mai târziu.');
      }

      setSuccess('Formularul a fost trimis cu succes. Vei fi contactat în curând.');
      setForm(initialForm);
      setIdFront(null);
      setIdBack(null);
      setStep(1);
    } catch (err: any) {
      console.error('Pronumismatica form submit error:', err);
      setError(
        err?.message ||
          'A apărut o eroare la trimiterea formularului. Te rugăm să încerci din nou.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-2">Asociația Pronumismatica</h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Asociația Pronumismatica este o organizație dedicată promovării, conservării și
            valorificării patrimoniului numismatic al României.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la pagina principală
        </Link>
      </div>

      <div className="grid gap-6 md:gap-8 md:grid-cols-2 items-start">
        <section className="space-y-4 text-sm text-slate-200 leading-relaxed">
          <p>
            Asociația Pronumismatica este o organizație dedicată promovării, conservării și
            valorificării patrimoniului numismatic al României. Prin activitatea sa, asociația
            susține educația culturală și stimulează interesul pentru monede, medalii și artefacte
            numismatice, adresându-se atât colecționarilor, cât și publicului larg. Numismatica
            este privită ca un instrument de transmitere a valorilor naționale și a identității
            culturale între generații.
          </p>
          <div>
            <h2 className="text-lg font-semibold text-[#e7b73c] mb-2">
              Direcții și obiective principale
            </h2>
            <ul className="list-disc list-inside space-y-1 text-slate-200">
              <li>
                promovarea numismaticii ca parte integrantă a patrimoniului cultural;
              </li>
              <li>
                organizarea de expoziții, evenimente și inițiative educaționale;
              </li>
              <li>colaborarea cu instituții culturale de prestigiu;</li>
              <li>
                conservarea și documentarea colecțiilor numismatice, inclusiv prin tehnologii
                moderne;
              </li>
              <li>
                realizarea de medalii și obiecte comemorative dedicate personalităților și
                momentelor istorice;
              </li>
              <li>susținerea și dezvoltarea comunității numismatice.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#e7b73c] mb-2">Parteneriat</h2>
            <p>
              eNumismatica.ro are plăcerea de a colabora cu Asociația Pronumismatica, susținând
              prin acest parteneriat inițiative dedicate promovării și protejării patrimoniului
              numismatic românesc.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gold-500/30 bg-navy-900/80 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
          <h2 className="text-xl font-semibold text-[#e7b73c] mb-1">
            Formular de înscriere
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Completează formularul de mai jos pentru a te înscrie în Asociația Pronumismatica. Datele tale ajung direct la asociație.
          </p>

          {/* Stepper indicator */}
          <div className="mb-6">
            {/* Mobile: Current step display */}
            <div className="block sm:hidden text-center mb-4">
              <div className="text-sm text-slate-200 font-medium">
                 Pasul {step} din 5: {['Identitate', 'Adresă', 'Act de identitate', 'Contact', 'Încarcă acte'][step - 1]}
               </div>
               <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                 <div
                   className="bg-[#e7b73c] h-2 rounded-full transition-all duration-300"
                   style={{ width: `${(step / 5) * 100}%` }}
                 />
               </div>
             </div>

            {/* Desktop: Full stepper */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between text-xs text-slate-200 mb-4">
                {['Identitate', 'Adresă', 'Act identitate', 'Contact', 'Încarcă acte'].map((label, index) => {
                  const currentStep = (index + 1) as Step;
                  const isActive = step === currentStep;
                  const isCompleted = step > currentStep;
                  return (
                    <div key={label} className="flex flex-col items-center text-center">
                      <div
                        className={`flex items-center justify-center h-6 w-6 rounded-full border text-[10px] font-semibold mb-1 ${
                          isCompleted
                            ? 'bg-[#e7b73c] border-[#e7b73c] text-navy-900'
                            : isActive
                            ? 'bg-navy-800 border-[#e7b73c] text-[#e7b73c]'
                            : 'bg-navy-950 border-slate-600 text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-[10px] leading-tight whitespace-nowrap">{label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Progress line */}
              <div className="relative">
                <div className="absolute top-3 left-0 right-0 h-px bg-slate-700" />
                <div 
                  className="absolute top-3 left-0 h-px bg-[#e7b73c] transition-all duration-300"
                  style={{ width: `${((step - 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Nume
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Prenume
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    CNP
                  </label>
                  <input
                    type="text"
                    name="cnp"
                    value={form.cnp}
                    onChange={handleChange}
                    maxLength={13}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                  {form.cnp.trim().length > 0 && form.cnp.trim().length < 13 && (
                    <p className="mt-1 text-[11px] text-slate-300">
                      CNP trebuie să conțină 13 cifre.
                    </p>
                  )}
                  {form.cnp.trim().length === 13 && cnpStatus && !cnpStatus.valid && (
                    <p className="mt-1 text-[11px] text-red-200">
                      CNP invalid.
                    </p>
                  )}
                  {form.cnp.trim().length === 13 && cnpStatus && cnpStatus.valid && (
                    <p className="mt-1 text-[11px] text-emerald-200">
                      CNP valid • Născut(ă): {cnpStatus.parsed.date_of_birth} • Județ: {cnpStatus.parsed.county_of_birth}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Țara
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Județ
                  </label>
                  <input
                    type="text"
                    name="county"
                    value={form.county}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Oraș
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Adresă
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Tip act de identitate
                  </label>
                  <select
                    name="idType"
                    value={form.idType}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  >
                    <option value="">Selectează...</option>
                    <option value="CI">CI</option>
                    <option value="BI">BI</option>
                    <option value="Pasaport">Pașaport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Serie / număr document identitate
                  </label>
                  <input
                    type="text"
                    name="idSeries"
                    value={form.idSeries}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Număr de telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-gold-500/30 bg-navy-950/60 px-3 py-2 text-xs text-slate-200">
                  Încarcă poze clare ale actului selectat ({form.idType || 'act'}): <strong>față</strong> și <strong>verso</strong>.
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">Act identitate - Față *</label>
                  <input
                    type="file"
                    name="idFront"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900"
                    required
                  />
                  {idFront && (
                    <p className="mt-1 text-xs text-slate-300">Selectat: {idFront.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 text-xs font-semibold">Act identitate - Verso *</label>
                  <input
                    type="file"
                    name="idBack"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-slate-600 bg-white/95 px-3 py-2 text-sm text-slate-900"
                    required
                  />
                  {idBack && (
                    <p className="mt-1 text-xs text-slate-300">Selectat: {idBack.name}</p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-900/40 px-3 py-2 text-xs text-emerald-100">
                {success}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1 || submitting}
                className="inline-flex items-center rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Înapoi
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext() || submitting}
                  className="inline-flex items-center rounded-full bg-[#e7b73c] px-5 py-1.5 text-xs font-semibold text-[#000940] shadow-[0_0_18px_rgba(231,183,60,0.6)] hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Următorul pas
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canGoNext() || submitting}
                  className="inline-flex items-center rounded-full bg-[#e7b73c] px-5 py-1.5 text-xs font-semibold text-[#000940] shadow-[0_0_18px_rgba(231,183,60,0.6)] hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Se trimite...' : 'Trimite formularul'}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

