'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { formatRON } from '../utils/currency';
import { getOrdersForBuyer } from 'shared/orderService';
import { createOrGetConversation } from 'shared/chatService';
import type { Order } from 'shared/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { ContactDetailsModal } from '../components/ContactDetailsModal';

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || null;
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [productById, setProductById] = useState<Record<string, any>>({});
  const [openingConversationFor, setOpeningConversationFor] = useState<string | null>(null);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactContext, setContactContext] = useState<{
    conversationId?: string;
    buyerId: string;
    sellerId: string;
    buyerName?: string;
    sellerName?: string;
  } | null>(null);

  const buildImageUrlWithWidth = (url: string, width: number): string => {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}`;
  };

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      if (!db || orders.length === 0) {
        if (!cancelled) setProductById({});
        return;
      }

      const ids = Array.from(new Set(orders.map((o) => o.productId).filter(Boolean)));
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'products', id));
            if (!snap.exists()) return [id, null] as const;
            const data = snap.data() as any;
            return [id, { id, name: data.name, images: data.images || [] }] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );

      if (cancelled) return;

      const next: Record<string, any> = {};
      for (const [id, value] of entries) {
        if (value) next[id] = value;
      }
      setProductById(next);
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [orders]);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!userId) {
        if (isMounted) {
          setOrders([]);
          setOrdersError(null);
        }
        return;
      }

      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const data = await getOrdersForBuyer(userId);
        if (isMounted) {
          setOrders(data);
        }
      } catch (err: any) {
        console.error('Failed to load orders for buyer', err);
        if (isMounted) {
          setOrdersError(err?.message || 'Nu s-au putut încărca comenzile tale.');
        }
      } finally {
        if (isMounted) {
          setLoadingOrders(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const loading = authLoading || loadingOrders;

  const lines = useMemo(
    () =>
      orders.map((order) => {
        const product = productById[order.productId] || null;
        return { order, product };
      }),
    [orders, productById],
  );

  const handleOpenChat = async (order: Order) => {
    if (!userId) return;
    if (order.sellerId === 'monetaria-statului') {
      router.push('/contact');
      return;
    }

    try {
      setOpeningConversationFor(order.id);
      const conversationId =
        order.conversationId ||
        (await createOrGetConversation(userId, order.sellerId, undefined, order.productId, false));
      router.push(`/messages?conversation=${conversationId}`);
    } catch (err: any) {
      console.error('Failed to open conversation for order', err);
      alert(err?.message || 'Nu s-a putut deschide conversația.');
    } finally {
      setOpeningConversationFor(null);
    }
  };

  const handleShowContact = async (order: Order) => {
    if (!userId) return;
    if (order.sellerId === 'monetaria-statului') {
      router.push('/contact');
      return;
    }

    try {
      setOpeningConversationFor(order.id);
      const conversationId =
        order.conversationId ||
        (await createOrGetConversation(userId, order.sellerId, undefined, order.productId, false));
      setContactContext({
        conversationId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        buyerName: order.buyerName,
        sellerName: order.sellerName,
      });
      setContactModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load contact details', err);
      alert(err?.message || 'Nu s-au putut încărca detaliile de contact.');
    } finally {
      setOpeningConversationFor(null);
    }
  };

  const statusLabel = (status: Order['status']) => {
    switch (status) {
      case 'paid':
        return 'Plătită';
      case 'pending':
        return 'În așteptare';
      case 'cancelled':
        return 'Anulată';
      case 'failed':
        return 'Eșuată';
      case 'refunded':
        return 'Rambursată';
      default:
        return status;
    }
  };

  const statusClasses = (status: Order['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
      case 'pending':
        return 'bg-amber-500/15 text-amber-200 border-amber-400/40';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/15 text-red-200 border-red-400/40';
      case 'refunded':
        return 'bg-sky-500/15 text-sky-200 border-sky-400/40';
      default:
        return 'bg-slate-500/15 text-slate-200 border-slate-400/40';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă comenzile tale...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Istoricul comenzilor este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a vedea comenzile plasate în magazin.
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

  if (ordersError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Eroare la încărcarea comenzilor
          </h3>
          <p className="text-red-300">{ordersError}</p>
        </div>
      </div>
    );
  }

  const isEmpty = lines.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <ContactDetailsModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        conversationId={contactContext?.conversationId}
        currentUserId={userId || ''}
        buyerId={contactContext?.buyerId}
        sellerId={contactContext?.sellerId}
        buyerName={contactContext?.buyerName}
        sellerName={contactContext?.sellerName}
      />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Comenzile mele</h1>
          <p className="text-slate-300">
            {isEmpty
              ? 'Nu ai încă nicio comandă înregistrată.'
              : `Ai plasat ${lines.length} ${lines.length === 1 ? 'comandă' : 'comenzi'} în magazin.`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la cont
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-16">
          <p className="text-slate-300 mb-4">
            Nu ai cumpărat încă nicio piesă din magazin.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Mergi la catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lines.map(({ order, product }) => {
            const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date();
            const productName = product?.name || `Piesă ${order.productId}`;
            const productImage =
              product && product.images && product.images.length > 0
                ? buildImageUrlWithWidth(product.images[0], 200)
                : null;

            const sellerLabel =
              order.sellerId === 'monetaria-statului'
                ? 'Monetaria Statului'
                : order.sellerName || `Vânzător #${order.sellerId.slice(-6)}`;

            return (
              <div
                key={order.id}
                className="flex flex-col md:flex-row gap-4 rounded-2xl border border-gold-500/30 bg-navy-900/80 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)]"
              >
                <div className="w-full md:w-24 h-24 rounded-xl bg-navy-950 flex items-center justify-center overflow-hidden border border-gold-500/20 md:flex-shrink-0">
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500 text-center px-2">
                      Imagine indisponibilă
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between gap-2">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">
                        {productName}
                      </h2>
                          <p className="text-xs text-slate-300">
                            Ai cumpărat de la{' '}
                            {order.sellerId === 'monetaria-statului' ? (
                              <span className="font-semibold text-slate-100">Monetaria Statului</span>
                            ) : (
                              <Link
                                href={`/seller/${order.sellerId}`}
                                className="font-semibold text-gold-300 hover:text-gold-200"
                              >
                                {sellerLabel}
                              </Link>
                            )}
                            {order.sellerId !== 'monetaria-statului' && (
                              <button
                                type="button"
                                onClick={() => handleShowContact(order)}
                                className="ml-2 inline-flex items-center justify-center rounded-full border border-gold-500/30 bg-navy-950/30 px-2 py-0.5 text-[10px] font-semibold text-gold-200 hover:bg-navy-950/60"
                                title="Detalii contact"
                              >
                                Contact
                              </button>
                            )}
                          </p>
                      <p className="text-xs text-slate-400">
                        Comandă ID:{' '}
                        <span className="font-mono text-slate-200 text-[11px]">
                          {order.id}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Plasată la{' '}
                        <span className="font-semibold text-slate-200">
                          {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(
                          order.status,
                        )}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                      <p className="text-xs text-slate-400">
                        Valoare:{' '}
                        <span className="font-semibold text-[#e7b73c]">
                          {formatRON(order.price)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gold-500/20">
                    <p className="text-[11px] text-slate-400">
                      Folosește chatul intern pentru a coordona livrarea și detaliile tranzacției.
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-3 py-1 text-[11px] font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
                      >
                        Detalii
                      </Link>
                      {product && (
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/40 px-3 py-1 text-[11px] font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
                        >
                          Vezi piesa
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
