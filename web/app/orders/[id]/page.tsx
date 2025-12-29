'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Order } from 'shared/types';
import { formatRON } from '../../utils/currency';
import { TransactionDetailsModal } from '../../components/TransactionDetailsModal';

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const userId = user?.uid || null;
  const isSeller = !!userId && order?.sellerId === userId;
  const isBuyer = !!userId && order?.buyerId === userId;
  const canView = !!userId && (isSeller || isBuyer);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!db || !orderId) return;
      setLoading(true);
      setError(null);
      try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (!orderSnap.exists()) {
          throw new Error('Comanda nu există.');
        }

        const data = orderSnap.data() as any;
        const mapped: Order = {
          id: orderSnap.id,
          productId: data.productId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          buyerName: data.buyerName,
          sellerName: data.sellerName,
          conversationId: data.conversationId,
          price: data.price,
          currency: data.currency,
          status: data.status,
          paymentProvider: data.paymentProvider,
          paymentReference: data.paymentReference ?? null,
          isMintProduct: data.isMintProduct,
          mintProductData: data.mintProductData ?? null,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        };

        if (cancelled) return;
        setOrder(mapped);

        // Load product details if available
        if (mapped.productId) {
          try {
            const pSnap = await getDoc(doc(db, 'products', mapped.productId));
            if (pSnap.exists()) {
              const p = pSnap.data() as any;
              if (!cancelled) {
                setProduct({
                  id: pSnap.id,
                  name: p.name,
                  images: p.images || [],
                  ownerId: p.ownerId,
                });
              }
            }
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Nu s-au putut încărca detaliile comenzii.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă detaliile comenzii...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">Autentificare necesară</h1>
          <p className="text-sm text-slate-300 mb-5">Autentifică-te pentru a vedea detaliile comenzii.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/50 hover:bg-[#f0c955] transition"
          >
            Autentificare
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">Eroare</h3>
          <p className="text-red-300">{error}</p>
          <div className="mt-4">
            <Link
              href="/orders"
              className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
            >
              ← Înapoi la comenzi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/80 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Acces restricționat</h1>
          <p className="text-slate-300">Această comandă nu aparține contului tău.</p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
            >
              ← Înapoi la cont
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date();
  const productName = product?.name || `Piesă ${order.productId}`;
  const img = product?.images?.[0] || null;

  return (
    <div className="container mx-auto px-4 py-8">
      <TransactionDetailsModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        orderId={order.id}
        currentUserId={userId || ''}
        isBuyer={isBuyer}
        isSeller={isSeller}
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Detalii comandă</h1>
            <p className="text-slate-300 text-sm">
              {isBuyer ? 'Cumpărare' : 'Vânzare'} • ID <span className="font-mono">{order.id}</span>
            </p>
          </div>
          <Link
            href={isBuyer ? '/orders' : '/sales'}
            className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
          >
            ← Înapoi
          </Link>
        </div>

        <div className="rounded-2xl border border-gold-500/30 bg-navy-900/80 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="w-full md:w-36 h-36 rounded-xl bg-navy-950 flex items-center justify-center overflow-hidden border border-gold-500/20 md:flex-shrink-0">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={productName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-500 text-center px-2">Imagine indisponibilă</span>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-1">{productName}</h2>
              <p className="text-sm text-slate-300">
                {isBuyer ? 'Ai cumpărat de la' : 'Ai vândut către'} 
                {order.sellerId === 'monetaria-statului' || order.buyerId === 'monetaria-statului' ? (
                  <span className="font-semibold text-slate-100">Monetaria Statului</span>
                ) : (
                  <Link href={`/seller/${isBuyer ? order.sellerId : order.buyerId}`} className="font-semibold text-gold-300 hover:text-gold-200">
                    {isBuyer ? (order.sellerName || `Vânzător #${order.sellerId.slice(-6)}`) : (order.buyerName || `Cumpărător #${order.buyerId.slice(-6)}`)}
                  </Link>
                )}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-3">
                  <p className="text-xs text-slate-400">Valoare</p>
                  <p className="text-lg font-bold text-gold-300">{formatRON(order.price)}</p>
                </div>
                <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-3">
                  <p className="text-xs text-slate-400">Data</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2 text-sm font-semibold text-[#000940] shadow hover:bg-[#f0c955]"
                >
                  Detalii tranzacție
                </button>

                {product?.id && (
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-5 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
                  >
                    Vezi piesa
                  </Link>
                )}

                <Link
                  href="/messages"
                  className="inline-flex items-center justify-center rounded-full border border-slate-500/50 px-5 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-500/10 transition-colors"
                >
                  Toate conversațiile
                </Link>
              </div>

              <p className="mt-5 text-xs text-slate-400">
                Apasă "Detalii tranzacție" pentru a vedea toate opțiunile: chat, detalii bancare, adresă expediere, confirmare plată și informații de livrare.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
