'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { formatRON } from '../utils/currency';
import { getWonAuctionsForUser } from 'shared/auctionService';
import { createOrGetConversation } from 'shared/chatService';
import type { Auction } from 'shared/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { ContactDetailsModal } from '../components/ContactDetailsModal';

export default function WonAuctionsPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || null;
  const router = useRouter();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [auctionsError, setAuctionsError] = useState<string | null>(null);

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
      if (!db || auctions.length === 0) {
        if (!cancelled) setProductById({});
        return;
      }

      const ids = Array.from(new Set(auctions.map((a) => a.productId).filter(Boolean)));
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
  }, [auctions]);

  useEffect(() => {
    let isMounted = true;

    const loadAuctions = async () => {
      if (!userId) {
        if (isMounted) {
          setAuctions([]);
          setAuctionsError(null);
        }
        return;
      }

      setLoadingAuctions(true);
      setAuctionsError(null);
      try {
        const data = await getWonAuctionsForUser(userId);
        if (isMounted) {
          setAuctions(data);
        }
      } catch (err: any) {
        console.error('Failed to load won auctions for user', err);
        if (isMounted) {
          setAuctionsError(err?.message || 'Nu s-au putut încărca licitațiile câștigate.');
        }
      } finally {
        if (isMounted) {
          setLoadingAuctions(false);
        }
      }
    };

    loadAuctions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const loading = authLoading || loadingAuctions;

  const lines = useMemo(
    () =>
      auctions.map((auction) => {
        const product = productById[auction.productId] || null;
        return { auction, product };
      }),
    [auctions, productById],
  );

  const handleOpenChat = async (auction: Auction) => {
    if (!userId) return;
    if (auction.ownerId === 'monetaria-statului') {
      router.push('/contact');
      return;
    }

    try {
      setOpeningConversationFor(auction.id);
      const conversationId =
        auction.winnerConversationId ||
        (await createOrGetConversation(userId, auction.ownerId, auction.id, auction.productId, false));
      router.push(`/messages?conversation=${conversationId}`);
    } catch (err: any) {
      console.error('Failed to open conversation for auction', err);
      alert(err?.message || 'Nu s-a putut deschide conversația.');
    } finally {
      setOpeningConversationFor(null);
    }
  };

  const handleShowContact = async (auction: Auction) => {
    if (!userId) return;
    if (auction.ownerId === 'monetaria-statului') {
      router.push('/contact');
      return;
    }

    try {
      setOpeningConversationFor(auction.id);
      const conversationId =
        auction.winnerConversationId ||
        (await createOrGetConversation(userId, auction.ownerId, auction.id, auction.productId, false));
      setContactContext({
        conversationId,
        buyerId: auction.winnerId || userId,
        sellerId: auction.ownerId || '',
        buyerName: auction.winnerName,
        sellerName: auction.sellerName,
      });
      setContactModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load contact details', err);
      alert(err?.message || 'Nu s-au putut încărca detaliile de contact.');
    } finally {
      setOpeningConversationFor(null);
    }
  };

  const statusLabel = (auction: Auction) => {
    if (auction.buyNowUsed) {
      return 'Cumpărat imediat';
    }
    return 'Câștigată';
  };

  const statusClasses = (auction: Auction) => {
    if (auction.buyNowUsed) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
    }
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă licitațiile câștigate...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">
            Istoricul licitațiilor câștigate este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a vedea licitațiile câștigate.
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

  if (auctionsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Eroare la încărcarea licitațiilor câștigate
          </h3>
          <p className="text-red-300">{auctionsError}</p>
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
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Licitațiile mele câștigate</h1>
          <p className="text-slate-300">
            {isEmpty
              ? 'Nu ai încă nicio licitație câștigată.'
              : `Ai câștigat ${lines.length} ${lines.length === 1 ? 'licitație' : 'licitații'}.`}
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
            Nu ai câștigat încă nicio licitație.
          </p>
          <Link
            href="/auctions"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Vezi licitațiile active
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lines.map(({ auction, product }) => {
            const endedAt = auction.updatedAt instanceof Date ? auction.updatedAt : new Date();
            const productName = product?.name || `Licitație #${auction.id.slice(-6)}`;
            const productImage =
              product && product.images && product.images.length > 0
                ? buildImageUrlWithWidth(product.images[0], 200)
                : null;

            const sellerLabel = auction.ownerId === 'monetaria-statului'
              ? 'Monetaria Statului'
              : auction.sellerName || (auction.ownerId ? `Vânzător #${auction.ownerId.slice(-6)}` : 'Vânzător');

            return (
              <div
                key={auction.id}
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
                        Ai câștigat de la{' '}
                        {auction.ownerId === 'monetaria-statului' ? (
                          <span className="font-semibold text-slate-100">Monetaria Statului</span>
                        ) : (
                          <Link
                            href={`/seller/${auction.ownerId}`}
                            className="font-semibold text-gold-300 hover:text-gold-200"
                          >
                            {sellerLabel}
                          </Link>
                        )}
                        {auction.ownerId !== 'monetaria-statului' && (
                          <button
                            type="button"
                            onClick={() => handleShowContact(auction)}
                            className="ml-2 inline-flex items-center justify-center rounded-full border border-gold-500/30 bg-navy-950/30 px-2 py-0.5 text-[10px] font-semibold text-gold-200 hover:bg-navy-950/60"
                            title="Detalii contact"
                          >
                            Contact
                          </button>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Licitație ID:{' '}
                        <span className="font-mono text-slate-200 text-[11px]">
                          {auction.id}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Încheiată la{' '}
                        <span className="font-semibold text-slate-200">
                          {endedAt.toLocaleDateString()} {endedAt.toLocaleTimeString()}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(
                          auction,
                        )}`}
                      >
                        {statusLabel(auction)}
                      </span>
                      <p className="text-xs text-slate-400">
                        Valoare:{' '}
                        <span className="font-semibold text-[#e7b73c]">
                          {formatRON(auction.currentBid ?? 0)}
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
                        href={`/auctions/${auction.id}`}
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