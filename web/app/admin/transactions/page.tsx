'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { formatRON } from '../../utils/currency';
import type { Order, Auction } from 'shared/types';
import { createOrGetConversation } from 'shared/chatService';
import { isAdmin as checkIsAdmin } from 'shared/adminService';
import { useRouter } from 'next/navigation';

export default function AdminTransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdminUser(false);
          setCheckingAdmin(false);
        }
        return;
      }
      try {
        const ok = await checkIsAdmin(user.uid);
        if (!cancelled) {
          setIsAdminUser(ok);
          setCheckingAdmin(false);
        }
      } catch (err) {
        console.error('Failed to check admin status', err);
        if (!cancelled) {
          setIsAdminUser(false);
          setCheckingAdmin(false);
        }
      }
    };
    if (!authLoading) check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [productById, setProductById] = useState<Record<string, any>>({});
  const [openingChatKey, setOpeningChatKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !isAdminUser) return;
      setLoading(true);
      setError(null);
      try {
        const ordersSnap = await getDocs(
          query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200)),
        );

        const mappedOrders: Order[] = ordersSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
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
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          } as Order;
        });

        const auctionsSnap = await getDocs(
          query(collection(db, 'auctions'), orderBy('updatedAt', 'desc'), limit(200)),
        );

        const mappedAuctions: Auction[] = auctionsSnap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              ...data,
              startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(),
              endTime: data.endTime?.toDate ? data.endTime.toDate() : new Date(),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            } as Auction;
          })
          .filter((a) => a.status === 'ended' && !!a.winnerId && a.didMeetMinimum);

        // Product cache
        const ids = new Set<string>();
        mappedOrders.forEach((o) => o.productId && ids.add(o.productId));
        mappedAuctions.forEach((a) => a.productId && ids.add(a.productId));
        const entries = await Promise.all(
          Array.from(ids).map(async (id) => {
            try {
              const snap = await getDoc(doc(db, 'products', id));
              if (!snap.exists()) return [id, null] as const;
              const p = snap.data() as any;
              return [id, { id, name: p.name }] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (cancelled) return;

        const pMap: Record<string, any> = {};
        for (const [id, value] of entries) {
          if (value) pMap[id] = value;
        }

        setOrders(mappedOrders);
        setAuctions(mappedAuctions);
        setProductById(pMap);
      } catch (err: any) {
        console.error('Failed to load admin transactions', err);
        if (!cancelled) setError(err?.message || 'Nu s-au putut încărca tranzacțiile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminUser]);

  const filterLower = filter.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    if (!filterLower) return orders;
    return orders.filter((o) => {
      const p = productById[o.productId];
      return (
        o.id.toLowerCase().includes(filterLower) ||
        o.productId.toLowerCase().includes(filterLower) ||
        o.buyerId.toLowerCase().includes(filterLower) ||
        o.sellerId.toLowerCase().includes(filterLower) ||
        (o.buyerName || '').toLowerCase().includes(filterLower) ||
        (o.sellerName || '').toLowerCase().includes(filterLower) ||
        (p?.name || '').toLowerCase().includes(filterLower)
      );
    });
  }, [orders, productById, filterLower]);

  const filteredAuctions = useMemo(() => {
    if (!filterLower) return auctions;
    return auctions.filter((a) => {
      const p = productById[a.productId];
      return (
        a.id.toLowerCase().includes(filterLower) ||
        a.productId.toLowerCase().includes(filterLower) ||
        (a.ownerId || '').toLowerCase().includes(filterLower) ||
        (a.winnerId || '').toLowerCase().includes(filterLower) ||
        (a.sellerName || '').toLowerCase().includes(filterLower) ||
        (a.winnerName || '').toLowerCase().includes(filterLower) ||
        (p?.name || '').toLowerCase().includes(filterLower)
      );
    });
  }, [auctions, productById, filterLower]);

  const openOrderChat = async (o: Order) => {
    try {
      setOpeningChatKey(`order-${o.id}`);
      const conversationId =
        o.conversationId || (await createOrGetConversation(o.buyerId, o.sellerId, undefined, o.productId, false));
      window.open(`/messages?conversation=${conversationId}`, '_blank');
    } finally {
      setOpeningChatKey(null);
    }
  };

  const openAuctionChat = async (a: Auction) => {
    if (!a.ownerId || !a.winnerId) return;
    try {
      setOpeningChatKey(`auction-${a.id}`);
      const conversationId =
        a.winnerConversationId || (await createOrGetConversation(a.winnerId, a.ownerId, a.id, a.productId, false));
      window.open(`/messages?conversation=${conversationId}`, '_blank');
    } finally {
      setOpeningChatKey(null);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-slate-200">Se încarcă...</p>
      </div>
    );
  }

  if (!user || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-gold-500/30 bg-navy-900/80 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Acces restricționat</h1>
          <p className="text-slate-300">Doar administratorii pot vedea această pagină.</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2 text-sm font-semibold text-[#000940] hover:bg-[#f0c955]"
            >
              Înapoi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c]">Tranzacții (Admin)</h1>
          <p className="text-slate-300 text-sm">Comenzi magazin + licitații încheiate (ultimele 200).</p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Caută (user id, nume, produs, order id...)"
          className="w-full sm:w-96 rounded-xl border border-gold-500/30 bg-navy-900/70 px-4 py-2 text-sm text-slate-50 placeholder-slate-400"
        />
      </div>

      {error && (
        <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-200">Se încarcă tranzacțiile...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Comenzi magazin</h2>
            <div className="overflow-x-auto rounded-2xl border border-gold-500/20">
              <table className="min-w-full text-sm">
                <thead className="bg-navy-900/80 text-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3">Produs</th>
                    <th className="text-left px-4 py-3">Buyer</th>
                    <th className="text-left px-4 py-3">Seller</th>
                    <th className="text-left px-4 py-3">Valoare</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-navy-950/40">
                  {filteredOrders.slice(0, 200).map((o) => {
                    const p = productById[o.productId];
                    const title = p?.name || o.productId;
                    const buyer = o.buyerName || o.buyerId.slice(-6);
                    const seller = o.sellerName || o.sellerId.slice(-6);
                    return (
                      <tr key={o.id} className="border-t border-gold-500/10">
                        <td className="px-4 py-3">
                          <div className="text-slate-50 font-semibold line-clamp-1">{title}</div>
                          <div className="text-xs text-slate-400 font-mono">{o.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{buyer}</td>
                        <td className="px-4 py-3 text-slate-200">{seller}</td>
                        <td className="px-4 py-3 text-gold-300 font-semibold">{formatRON(o.price)}</td>
                        <td className="px-4 py-3 text-slate-200">{o.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openOrderChat(o)}
                              disabled={openingChatKey === `order-${o.id}`}
                              className="rounded-full bg-[#e7b73c] px-3 py-1 text-[11px] font-semibold text-[#000940] disabled:opacity-60"
                            >
                              {openingChatKey === `order-${o.id}` ? '...' : 'Chat'}
                            </button>
                            <Link
                              href={`/orders/${o.id}`}
                              className="rounded-full border border-[#e7b73c]/60 px-3 py-1 text-[11px] font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10"
                            >
                              Detalii
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Licitații încheiate (cu câștigător)</h2>
            <div className="overflow-x-auto rounded-2xl border border-gold-500/20">
              <table className="min-w-full text-sm">
                <thead className="bg-navy-900/80 text-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3">Produs</th>
                    <th className="text-left px-4 py-3">Winner</th>
                    <th className="text-left px-4 py-3">Seller</th>
                    <th className="text-left px-4 py-3">Final</th>
                    <th className="text-left px-4 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-navy-950/40">
                  {filteredAuctions.slice(0, 200).map((a) => {
                    const p = productById[a.productId];
                    const title = p?.name || a.productId;
                    const winner = a.winnerName || (a.winnerId ? a.winnerId.slice(-6) : '');
                    const seller = a.sellerName || (a.ownerId ? a.ownerId.slice(-6) : '');
                    return (
                      <tr key={a.id} className="border-t border-gold-500/10">
                        <td className="px-4 py-3">
                          <div className="text-slate-50 font-semibold line-clamp-1">{title}</div>
                          <div className="text-xs text-slate-400 font-mono">{a.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{winner}</td>
                        <td className="px-4 py-3 text-slate-200">{seller}</td>
                        <td className="px-4 py-3 text-gold-300 font-semibold">{formatRON(a.currentBid ?? 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openAuctionChat(a)}
                              disabled={openingChatKey === `auction-${a.id}`}
                              className="rounded-full bg-[#e7b73c] px-3 py-1 text-[11px] font-semibold text-[#000940] disabled:opacity-60"
                            >
                              {openingChatKey === `auction-${a.id}` ? '...' : 'Chat'}
                            </button>
                            <Link
                              href={`/auctions/${a.id}`}
                              className="text-[11px] font-semibold text-gold-300 hover:text-gold-200"
                            >
                              Vezi
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

