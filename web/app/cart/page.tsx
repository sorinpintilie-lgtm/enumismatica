'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { formatRON } from '../utils/currency';

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;

  const {
    items,
    loading: cartLoading,
    error: cartError,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart(userId);

  // We fetch all approved products and then match those that are in the cart.
  const { products, loading: productsLoading } = useProducts(
    undefined,
    100,
    ['name', 'images', 'price', 'createdAt', 'updatedAt'],
    !!userId
  );

  const loading = authLoading || cartLoading || productsLoading;

  const cartLines = useMemo(() => {
    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      return { item, product };
    });
  }, [items, products]);

  const total = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      if (!line.product) return sum;
      return sum + line.product.price * line.item.quantity;
    }, 0);
  }, [cartLines]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă coșul de cumpărături...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Coșul este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a vedea și gestiona coșul tău de cumpărături.
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
            Eroare la încărcarea coșului
          </h3>
          <p className="text-red-300">{cartError}</p>
        </div>
      </div>
    );
  }

  const isEmpty = cartLines.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Coș de cumpărături</h1>
          <p className="text-slate-300">
            {isEmpty
              ? 'Coșul tău este gol.'
              : `Ai ${cartLines.length} articole în coș.`}
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Continuă cumpărăturile
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-16">
          <p className="text-slate-300 mb-4">
            Nu ai adăugat încă niciun produs în coș.
          </p>
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
            {cartLines.map(({ item, product }) => (
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
                        {product ? (
                          <p className="text-xs text-slate-400">
                            {formatRON(product.price)} / buc.
                          </p>
                        ) : (
                          <p className="text-xs text-red-300">
                            Produsul nu mai este disponibil.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Elimină
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-400">
                      Produs unic (cantitate 1).
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Subtotal</p>
                      <p className="text-sm font-semibold text-[#e7b73c]">
                        {product ? formatRON(product.price) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gold-500/40 bg-navy-900/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg font-semibold text-white mb-3">Rezumat comandă</h2>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Articole</span>
                <span className="text-slate-100">{cartLines.length}</span>
              </div>
              <div className="flex justify-between text-base font-semibold mt-3 pt-3 border-t border-gold-500/20">
                <span className="text-slate-100">Total</span>
                <span className="text-[#e7b73c]">{formatRON(total)}</span>
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href="/checkout"
                  className="block w-full text-center rounded-full bg-[#e7b73c] px-4 py-2.5 text-sm font-semibold text-[#000940] shadow-[0_0_22px_rgba(231,183,60,0.8)] hover:bg-[#f0c955] transition-colors"
                >
                  Continuă la checkout
                </Link>
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="block w-full text-center rounded-full border border-red-500/60 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  Golește coșul
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}