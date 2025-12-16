'use client';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { createDirectOrderForProduct } from 'shared/orderService';
import { formatRON } from '../utils/currency';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function CartPage() {
  const { user } = useAuth();
  const { items, loading, error, removeItem, clearCart } = useCart(user?.uid);
  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    200,
  );

  const [placingOrderFor, setPlacingOrderFor] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      items.map((item) => {
        let product = products.find((p) => p.id === item.productId) || null;
        if (!product && item.isMintProduct && item.mintProductData) {
          // For mint products, create a pseudo-product object
          product = {
            id: item.productId,
            name: item.mintProductData.title || 'Produs Monetaria Statului',
            price: parseFloat(item.mintProductData.price.replace(' Lei', '').replace(',', '')),
            images: [`/Monetaria_statului/romanian_mint_products/${item.mintProductData.category_slug}/${item.mintProductData.image_files}`],
          } as any;
        }
        return { item, product };
      }),
    [items, products],
  );

  const totalValue = useMemo(
    () =>
      lines.reduce((sum, { product }) => {
        if (!product || typeof product.price !== 'number') return sum;
        return sum + product.price;
      }, 0),
    [lines],
  );

  const handleCheckoutItem = async (productId: string, cartItemId: string, isMintProduct?: boolean, mintProductData?: any) => {
    if (!user) {
      alert('Trebuie să fii autentificat pentru a cumpăra.');
      return;
    }

    try {
      setPlacingOrderFor(productId);
      await createDirectOrderForProduct(productId, user.uid, isMintProduct, mintProductData);
      await removeItem(cartItemId);

      alert('Comanda a fost înregistrată. O poți vedea în istoricul comenzilor.');
    } catch (err: any) {
      console.error('Failed to create order from cart', err);
      alert(`Eroare la cumpărare: ${err?.message || 'Încearcă din nou.'}`);
    } finally {
      setPlacingOrderFor(null);
    }
  };

  const handleClearCart = () => {
    if (!items.length) return;
    if (confirm('Ești sigur că vrei să golești întregul coș?')) {
      clearCart();
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
            <h1 className="text-2xl font-bold text-white mb-3">
              Coșul este disponibil doar pentru utilizatori autentificați
            </h1>
            <p className="text-sm text-slate-300 mb-5">
              Autentifică-te pentru a accesa coșul tău de cumpărături.
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
      </div>
    );
  }

  const isEmpty = !loading && lines.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Coșul meu</h1>
          {loading ? (
            <p className="text-slate-300">Se încarcă...</p>
          ) : isEmpty ? (
            <p className="text-slate-300">Coșul tău este gol.</p>
          ) : (
            <p className="text-slate-300">
              Ai {lines.length} {lines.length === 1 ? 'produs' : 'produse'} în coș.
            </p>
          )}
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la cont
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 mb-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Eroare la încărcarea coșului
          </h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {!isEmpty && !loading && (
        <div className="bg-navy-900/80 rounded-2xl border border-gold-500/30 p-6 mb-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
          <div className="mb-4">
            <p className="text-slate-300 mb-1">
              Total estimat:{' '}
              <span className="font-semibold text-[#e7b73c]">
                {formatRON(totalValue)}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            {lines.map(({ item, product }) => {
              const label = product?.name || `Produs ${item.productId}`;
              const price =
                product && typeof product.price === 'number'
                  ? formatRON(product.price)
                  : 'Preț indisponibil';

              return (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row gap-4 rounded-2xl border border-gold-500/30 bg-navy-950 p-4"
                >
                  <div className="flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">
                        {label}
                      </h2>
                      <p className="text-xs text-slate-400">
                        ID produs: {item.productId}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm font-semibold text-green-400">
                        {price}
                      </p>
                      <div className="flex gap-2">
                        <Link
                          href={item.isMintProduct ? `/monetaria-statului/${item.productId}` : `/products/${item.productId}`}
                          className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-3 py-1 text-xs font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
                        >
                          Vezi produsul
                        </Link>
                        <button
                          disabled={placingOrderFor === item.productId}
                          onClick={() => handleCheckoutItem(item.productId, item.id, item.isMintProduct, item.mintProductData)}
                          className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-3 py-1 text-xs font-semibold text-[#000940] hover:bg-[#f0c955] transition-colors disabled:opacity-50"
                        >
                          {placingOrderFor === item.productId ? 'Se procesează...' : 'Cumpără acum'}
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleClearCart}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Golește coșul
            </button>
          </div>
        </div>
      )}

      <div className="bg-navy-900/80 rounded-2xl border border-gold-500/30 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
        <h3 className="text-lg font-semibold text-white mb-3">Continuă cumpărăturile</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Mergi la catalog
          </Link>
          <Link
            href="/auctions"
            className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
          >
            Vezi licitațiile
          </Link>
        </div>
      </div>
    </div>
  );
}