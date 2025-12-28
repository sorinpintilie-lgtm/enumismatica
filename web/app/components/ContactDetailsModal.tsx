'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ContactDetails = {
  displayName?: string;
  email?: string;
  phone?: string;
  userId: string;
};

export function ContactDetailsModal(props: {
  open: boolean;
  onClose: () => void;
  conversationId?: string | null;
  currentUserId: string;
  buyerId?: string;
  sellerId?: string;
  buyerName?: string;
  sellerName?: string;
}) {
  const { open, onClose, conversationId, currentUserId, buyerId, sellerId, buyerName, sellerName } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ContactDetails | null>(null);

  const otherRole = useMemo(() => {
    if (!buyerId || !sellerId) return null;
    if (currentUserId === buyerId) return 'seller' as const;
    if (currentUserId === sellerId) return 'buyer' as const;
    return null;
  }, [buyerId, sellerId, currentUserId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) return;
      if (!conversationId || !db) {
        setError('Detaliile de contact sunt disponibile după ce conversația este creată.');
        setDetails(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'conversations', conversationId));
        if (!snap.exists()) {
          throw new Error('Conversația nu există.');
        }

        const data = snap.data() as any;
        const otherId = (data.participants || []).find((p: string) => p !== currentUserId) as string | undefined;
        const short = otherId ? otherId.slice(-4) : '????';

        const name =
          otherRole === 'seller'
            ? (data.sellerName || sellerName)
            : otherRole === 'buyer'
              ? (data.buyerName || buyerName)
              : undefined;

        const email =
          otherRole === 'seller'
            ? data.sellerEmail
            : otherRole === 'buyer'
              ? data.buyerEmail
              : undefined;

        const phone =
          otherRole === 'seller'
            ? data.sellerPhone
            : otherRole === 'buyer'
              ? data.buyerPhone
              : undefined;

        // Fallback for older conversations: try to read the other user's doc
        // (may fail depending on Firestore rules; that's OK).
        let fallbackEmail = email;
        let fallbackPhone = phone;
        if ((!fallbackEmail || !fallbackPhone) && otherId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', otherId));
            if (userSnap.exists()) {
              const u = userSnap.data() as any;
              fallbackEmail = fallbackEmail || u.email;
              fallbackPhone = fallbackPhone || u.personalDetails?.phone;
            }
          } catch {
            // ignore
          }
        }

        if (cancelled) return;
        setDetails({
          userId: otherId || '',
          displayName: name ? `${name} (${short})` : otherId ? `Utilizator (${short})` : 'Utilizator',
          email: fallbackEmail,
          phone: fallbackPhone,
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Nu s-au putut încărca detaliile de contact.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, currentUserId, otherRole, buyerName, sellerName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-gold-500/30 bg-navy-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Detalii contact</h3>
            <p className="text-xs text-slate-400">Folosește aceste date doar pentru tranzacția curentă.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="Închide"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-200 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500"></div>
              <span>Se încarcă...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          ) : details ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-3">
                <p className="text-xs text-slate-400">Utilizator</p>
                <p className="text-sm font-semibold text-slate-100">{details.displayName}</p>
              </div>

              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-3">
                <p className="text-xs text-slate-400">Email</p>
                {details.email ? (
                  <a
                    href={`mailto:${details.email}`}
                    className="text-sm font-semibold text-gold-300 hover:text-gold-200 break-all"
                  >
                    {details.email}
                  </a>
                ) : (
                  <p className="text-sm text-slate-300">Indisponibil</p>
                )}
              </div>

              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-3">
                <p className="text-xs text-slate-400">Telefon</p>
                {details.phone ? (
                  <a
                    href={`tel:${details.phone}`}
                    className="text-sm font-semibold text-gold-300 hover:text-gold-200"
                  >
                    {details.phone}
                  </a>
                ) : (
                  <p className="text-sm text-slate-300">Indisponibil</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-5 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

