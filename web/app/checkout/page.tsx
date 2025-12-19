'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { createDirectOrderForProduct } from 'shared/orderService';
import { formatRON } from '../utils/currency';
import { useToast } from '../components/ToastProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || null;
  const { showToast } = useToast();

  const {
    items,
    loading: cartLoading,
    error: cartError,
    clearCart,
  } = useCart(userId || undefined);

  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    100,
    ['name', 'images', 'price', 'ownerId', 'isSold', 'createdAt', 'updatedAt'],
    !!userId
  );

  const [submitting, setSubmitting] = useState(false);

  // Detalii livrare
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Detalii facturare
  const [billingFullName, setBillingFullName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingAddressLine1, setBillingAddressLine1] = useState('');
  const [billingAddressLine2, setBillingAddressLine2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingCounty, setBillingCounty] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  
  const [notes, setNotes] = useState('');

  // Funcție pentru copierea adresei de livrare la adresa de facturare
  const copyDeliveryToBilling = () => {
    setBillingFullName(fullName);
    setBillingPhone(phone);
    setBillingAddressLine1(addressLine1);
    setBillingAddressLine2(addressLine2);
    setBillingCity(city);
    setBillingCounty(county);
    setBillingPostalCode(postalCode);
    showToast({
      type: 'success',
      title: 'Adresă copiată',
      message: 'Adresa de livrare a fost copiată la adresa de facturare.',
    });
  };

  // Load user's saved personal details to autocomplete the form
  useEffect(() => {
    let mounted = true;
    const loadPersonalDetails = async () => {
      if (!userId) return;
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists() || !mounted) return;
        const data = snap.data() as any;
        const details = (data.personalDetails || {}) as any;
        
        // Autocomplete delivery address
        if (details.firstName && details.lastName) {
          setFullName(`${details.firstName} ${details.lastName}`.trim());
        }
        if (details.phone) setPhone(details.phone);
        if (details.address) setAddressLine1(details.address);
        if (details.county) setCounty(details.county);
        if (details.postalCode) setPostalCode(details.postalCode);
        if (details.country) {
          // Extract city from address or county if available
          // For now, we'll leave city empty as it's not stored separately
        }
        
        // Autocomplete billing address
        if (details.billingAddress) setBillingAddressLine1(details.billingAddress);
        if (details.billingCounty) setBillingCounty(details.billingCounty);
        if (details.billingPostalCode) setBillingPostalCode(details.billingPostalCode);
        if (details.firstName && details.lastName) {
          setBillingFullName(`${details.firstName} ${details.lastName}`.trim());
        }
        if (details.phone) setBillingPhone(details.phone);
      } catch (err) {
        console.error('Failed to load personal details for checkout', err);
      }
    };

    loadPersonalDetails();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const loading = authLoading || cartLoading || productsLoading;

  const lines = useMemo(
    () =>
      items.map((item) => {
        const product = products.find((p) => p.id === item.productId) || null;
        return { item, product };
      }),
    [items, products],
  );

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const price = line.product?.price;
        if (typeof price !== 'number' || price <= 0) return sum;
        // Rare coins: always quantity 1 per entry
        return sum + price;
      }, 0),
    [lines],
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă checkout-ul...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Checkout-ul este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a finaliza cumpărăturile din coș.
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

  if (cartError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Eroare la încărcarea datelor din coș
          </h3>
          <p className="text-red-300">{cartError}</p>
        </div>
      </div>
    );
  }

  const isEmpty = lines.length === 0;

  const handleConfirmOrder = async () => {
    if (!userId) return;

    if (lines.length === 0) {
      showToast({
        type: 'error',
        title: 'Coș gol',
        message: 'Nu există produse în coș pentru a finaliza cumpărarea.',
      });
      return;
    }

    // Validare date livrare
    if (
      !fullName.trim() ||
      !phone.trim() ||
      !addressLine1.trim() ||
      !city.trim() ||
      !county.trim() ||
      !postalCode.trim()
    ) {
      showToast({
        type: 'error',
        title: 'Date de livrare incomplete',
        message: 'Completează numele, telefonul și adresa completă pentru livrare.',
      });
      return;
    }

    // Validare date facturare
    if (
      !billingFullName.trim() ||
      !billingPhone.trim() ||
      !billingAddressLine1.trim() ||
      !billingCity.trim() ||
      !billingCounty.trim() ||
      !billingPostalCode.trim()
    ) {
      showToast({
        type: 'error',
        title: 'Date de facturare incomplete',
        message: 'Completează numele, telefonul și adresa completă pentru facturare.',
      });
      return;
    }

    try {
      setSubmitting(true);

      let successCount = 0;
      let skippedCount = 0;

      for (const line of lines) {
        const product = line.product;
        if (!product) {
          skippedCount++;
          continue;
        }

        // Skip if already sold or if user is owner
        if ((product as any).isSold || product.ownerId === userId) {
          skippedCount++;
          continue;
        }

        try {
          await createDirectOrderForProduct(product.id, userId);
          successCount++;
        } catch (err) {
          console.error('Failed to create order for product in checkout:', err);
          skippedCount++;
        }
      }

      if (successCount > 0) {
        await clearCart();
        showToast({
          type: 'success',
          title: 'Cumpărare finalizată',
          message:
            successCount === 1
              ? 'Ai cumpărat 1 produs din coș. Comanda este înregistrată. Vei fi contactat pentru confirmarea livrării la adresa introdusă.'
              : `Ai cumpărat ${successCount} produse din coș. Comenzile sunt înregistrate. Vei fi contactat pentru confirmarea livrării la adresa introdusă.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Nicio cumpărare efectuată',
          message:
            'Niciun produs din coș nu a putut fi cumpărat (deja vândut sau nu mai este disponibil).',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Checkout</h1>
          <p className="text-slate-300">
            {isEmpty
              ? 'Nu ai produse în coș pentru a finaliza comanda.'
              : 'Verifică produsele din coș înainte de a confirma cumpărarea.'}
          </p>
        </div>
        <Link
          href="/cart"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la coș
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-16">
          <p className="text-slate-300 mb-4">Coșul tău este gol.</p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Mergi la catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {lines.map(({ item, product }) => {
              const price = product?.price;
              const unavailable =
                !product ||
                (product as any).isSold ||
                (userId && product.ownerId === userId);

              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-gold-500/30 bg-navy-900/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)]"
                >
                  <div className="w-24 h-24 rounded-xl bg-navy-950 flex items-center justify-center overflow-hidden border border-gold-500/20">
                    {product && product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-500 text-center px-2">Imagine indisponibilă</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h2 className="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">
                            {product ? product.name : 'Produs indisponibil'}
                          </h2>
                          {product && typeof price === 'number' ? (
                            <p className="text-xs text-slate-400">
                              {formatRON(price)}
                            </p>
                          ) : (
                            <p className="text-xs text-red-300">
                              Produsul nu mai este disponibil.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-slate-400">
                        {unavailable
                          ? 'Nu va fi cumpărat (deja vândut sau indisponibil).'
                          : 'Va fi cumpărat ca produs unic (cantitate 1).'}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Subtotal</p>
                        <p className="text-sm font-semibold text-[#e7b73c]">
                          {product && typeof price === 'number' ? formatRON(price) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Adresă de livrare */}
            <div className="rounded-2xl border border-gold-500/40 bg-navy-900/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg font-semibold text-white mb-3">Adresă de livrare</h2>
              <p className="text-[11px] text-slate-400 mb-4">
                Completează adresa unde dorești să primești produsele comandate.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nume complet *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Numele complet al destinatarului"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Telefon de contact *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: 07xx xxx xxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cod poștal *
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: 010101"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Adresă (stradă, număr, bloc, etc.) *
                    </label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Stradă, număr, bloc, scară, apartament"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Detalii suplimentare adresă (opțional)
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Interfon, etaj, indicații curier, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Oraș / Localitate *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: București"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Județ / Țară *
                    </label>
                    <input
                      type="text"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: Ilfov, România"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Adresă de facturare */}
            <div className="rounded-2xl border border-gold-500/40 bg-navy-900/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Adresă de facturare</h2>
                <button
                  type="button"
                  onClick={copyDeliveryToBilling}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7b73c]/50 bg-[#e7b73c]/10 px-3 py-1.5 text-xs font-medium text-[#e7b73c] hover:bg-[#e7b73c]/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiază din livrare
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Completează adresa pentru facturare. Poți copia datele de livrare folosind butonul de mai sus.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nume complet *
                    </label>
                    <input
                      type="text"
                      value={billingFullName}
                      onChange={(e) => setBillingFullName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Numele complet pentru facturare"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Telefon de contact *
                    </label>
                    <input
                      type="tel"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: 07xx xxx xxx"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cod poștal *
                    </label>
                    <input
                      type="text"
                      value={billingPostalCode}
                      onChange={(e) => setBillingPostalCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: 010101"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Adresă (stradă, număr, bloc, etc.) *
                    </label>
                    <input
                      type="text"
                      value={billingAddressLine1}
                      onChange={(e) => setBillingAddressLine1(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Stradă, număr, bloc, scară, apartament"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Detalii suplimentare adresă (opțional)
                    </label>
                    <input
                      type="text"
                      value={billingAddressLine2}
                      onChange={(e) => setBillingAddressLine2(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Interfon, etaj, indicații, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Oraș / Localitate *
                    </label>
                    <input
                      type="text"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: București"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Județ / Țară *
                    </label>
                    <input
                      type="text"
                      value={billingCounty}
                      onChange={(e) => setBillingCounty(e.target.value)}
                      className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c]"
                      placeholder="Ex: Ilfov, România"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observații pentru vânzător / curier (opțional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700/60 bg-navy-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e7b73c] resize-none"
                    placeholder="Ex: interval preferat de livrare, verificare colet la primire, etc."
                  />
                </div>
              </div>
            </div>

            {/* Rezumat comandă */}
            <div className="rounded-2xl border border-gold-500/40 bg-navy-900/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg font-semibold text-white mb-3">Rezumat comandă</h2>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Articole</span>
                <span className="text-slate-100">{lines.length}</span>
              </div>
              <div className="flex justify-between text-base font-semibold mt-3 pt-3 border-t border-gold-500/20">
                <span className="text-slate-100">Total</span>
                <span className="text-[#e7b73c]">{formatRON(total)}</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-300">
                Prețul este afișat în EUR și poate fi achitat fie în EUR, fie în RON, la cursul BNR din data
                tranzacției.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Fiecare produs din coș este tratat ca piesă unică, cu cantitate 1. Momentan plata nu este
                procesată online; comenzile sunt înregistrate intern și vor fi revizuite de un administrator.
              </p>
              {fullName.trim() && city.trim() && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Livrare către: <span className="font-semibold text-slate-200">{fullName}</span>
                  {', '}
                  {city}
                  {county.trim() ? `, ${county}` : ''}
                </p>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={submitting || isEmpty}
                  className="block w-full text-center rounded-full bg-[#e7b73c] px-4 py-2.5 text-sm font-semibold text-[#000940] shadow-[0_0_22px_rgba(231,183,60,0.8)] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/50 disabled:text-slate-600 transition-colors"
                >
                  {submitting ? 'Se procesează cumpărarea...' : 'Confirmă cumpărarea produselor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
