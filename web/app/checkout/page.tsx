'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { createDirectOrderForProduct } from 'shared/orderService';
import { formatRON } from '../utils/currency';
import { useToast } from '../components/ToastProvider';

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
              ? 'Ai cumpărat 1 produs din coș. Comanda este înregistrată.'
              : `Ai cumpărat ${successCount} produse din coș. Comenzile sunt înregistrate.`,
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
              <p className="mt-2 text-[11px] text-slate-400">
                Fiecare produs din coș este tratat ca piesă unică, cu cantitate 1. Momentan plata nu este
                procesată online; comenzile sunt înregistrate intern.
              </p>
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