'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { formatRON } from '../utils/currency';
import { createOrGetConversation } from 'shared/chatService';
import { useRouter } from 'next/navigation';

type TransactionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  currentUserId: string;
  isBuyer: boolean;
  isSeller: boolean;
};

export function TransactionDetailsModal(props: TransactionDetailsModalProps) {
  const { open, onClose, orderId, currentUserId, isBuyer, isSeller } = props;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [openingChat, setOpeningChat] = useState(false);

  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofUploading, setPaymentProofUploading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

  const [awbNumber, setAwbNumber] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [courierName, setCourierName] = useState('');
  const [shippingInfoSaving, setShippingInfoSaving] = useState(false);

  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [showShippingAddress, setShowShippingAddress] = useState(false);

  const [bankingDetails, setBankingDetails] = useState<{ bankAccount: string; accountName: string | null } | null>(null);
  const [bankingLoading, setBankingLoading] = useState(false);
  const [bankingError, setBankingError] = useState<string>('');

  const [shippingDetails, setShippingDetails] = useState<any>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string>('');

  const [shareShippingLoading, setShareShippingLoading] = useState(false);
  const [shareShippingMessage, setShareShippingMessage] = useState<string>('');

  const counterpartyId = useMemo(() => {
    if (!order) return null;
    return isBuyer ? order.sellerId : order.buyerId;
  }, [order, isBuyer]);

  const counterpartyLabel = useMemo(() => {
    if (!order || !counterpartyId) return null;
    if (counterpartyId === 'monetaria-statului') return 'Monetaria Statului';

    // Show the name of the *other* party in the transaction:
    // - if current user is buyer, show sellerName
    // - if current user is seller, show buyerName
    // - fallback to a generic identifier based on counterpartyId
    if (isBuyer && typeof order.sellerName === 'string' && order.sellerName.trim()) {
      return order.sellerName;
    }
    if (isSeller && typeof order.buyerName === 'string' && order.buyerName.trim()) {
      return order.buyerName;
    }

    // Fallbacks when one of the names is missing
    if (typeof order.sellerName === 'string' && order.sellerName.trim()) {
      return order.sellerName;
    }
    if (typeof order.buyerName === 'string' && order.buyerName.trim()) {
      return order.buyerName;
    }

    return `Utilizator #${counterpartyId.slice(-6)}`;
  }, [order, counterpartyId, isBuyer, isSeller]);

  useEffect(() => {
    if (!open || !orderId || !currentUserId) return;

    let cancelled = false;

    const loadData = async () => {
      if (!db) {
        setError('Baza de date nu este disponibilă.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Load order
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (!orderSnap.exists()) {
          throw new Error('Comanda nu există.');
        }

        const orderData = orderSnap.data();
        const mappedOrder = {
          id: orderSnap.id,
          productId: orderData.productId,
          buyerId: orderData.buyerId,
          sellerId: orderData.sellerId,
          buyerName: orderData.buyerName,
          sellerName: orderData.sellerName,
          conversationId: orderData.conversationId,
          price: orderData.price,
          currency: orderData.currency,
          status: orderData.status,
          paymentProvider: orderData.paymentProvider,
          paymentReference: orderData.paymentReference,
          isMintProduct: orderData.isMintProduct,
          mintProductData: orderData.mintProductData,
          createdAt: orderData.createdAt?.toDate ? orderData.createdAt.toDate() : new Date(),
          updatedAt: orderData.updatedAt?.toDate ? orderData.updatedAt.toDate() : new Date(),
          paymentDate: orderData.paymentDate?.toDate ? orderData.paymentDate.toDate() : null,
          paymentProofUrl: orderData.paymentProofUrl || null,
          awbNumber: orderData.awbNumber || null,
          shippingDate: orderData.shippingDate?.toDate ? orderData.shippingDate.toDate() : null,
          courierName: orderData.courierName || null,
          sellerConfirmedPayment: orderData.sellerConfirmedPayment || false,
          paymentConfirmationDate: orderData.paymentConfirmationDate?.toDate ? orderData.paymentConfirmationDate.toDate() : null,
          shippingAddressShared: !!orderData.shippingAddressShared,
          shippingAddressSharedAt: orderData.shippingAddressSharedAt?.toDate ? orderData.shippingAddressSharedAt.toDate() : null,
        };

        // Load product
        let productData = null;
        if (mappedOrder.productId) {
          const productSnap = await getDoc(doc(db, 'products', mappedOrder.productId));
          if (productSnap.exists()) {
            productData = {
              id: productSnap.id,
              ...productSnap.data(),
            };
          }
        }

        if (cancelled) return;

        setOrder(mappedOrder);
        setProduct(productData);
        setBankingDetails(null);
        setBankingError('');
        setShippingDetails(null);
        setShippingError('');
        setShareShippingMessage('');

        // Set default payment date to today
        const today = new Date().toISOString().split('T')[0];
        setPaymentDate(today);

        // Load existing payment and shipping info if available
        if (mappedOrder.paymentDate) {
          setPaymentDate(mappedOrder.paymentDate.split('T')[0]);
        }
        if (mappedOrder.paymentProofUrl) {
          setPaymentProofUrl(mappedOrder.paymentProofUrl);
        }
        if (mappedOrder.awbNumber) {
          setAwbNumber(mappedOrder.awbNumber);
        }
        if (mappedOrder.shippingDate) {
          setShippingDate(mappedOrder.shippingDate.split('T')[0]);
        }
        if (mappedOrder.courierName) {
          setCourierName(mappedOrder.courierName);
        }

      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Nu s-au putut încărca detaliile tranzacției.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [open, orderId, currentUserId, isBuyer, isSeller, counterpartyId]);

  const fetchBankingDetails = async () => {
    if (!orderId) return;
    if (!auth.currentUser) return;
    setBankingLoading(true);
    setBankingError('');
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/orders/banking-details?orderId=${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nu s-au putut încărca detaliile bancare.');
      }
      const data = await res.json();
      setBankingDetails({
        bankAccount: String(data.bankAccount),
        accountName: data.accountName ? String(data.accountName) : null,
      });
    } catch (e: any) {
      setBankingError(e?.message || 'Nu s-au putut încărca detaliile bancare.');
    } finally {
      setBankingLoading(false);
    }
  };

  const fetchShippingDetails = async () => {
    if (!orderId) return;
    if (!auth.currentUser) return;
    setShippingLoading(true);
    setShippingError('');
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/orders/shipping-address?orderId=${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Adresa nu este disponibilă încă.');
      }
      const data = await res.json();
      setShippingDetails(data.shippingAddress || null);
    } catch (e: any) {
      setShippingError(e?.message || 'Adresa nu este disponibilă încă.');
    } finally {
      setShippingLoading(false);
    }
  };

  const shareShippingAddress = async () => {
    if (!orderId) return;
    if (!auth.currentUser) return;
    setShareShippingLoading(true);
    setShareShippingMessage('');
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/orders/share-shipping-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Nu s-a putut partaja adresa.');
      }
      setShareShippingMessage('Adresa a fost partajată către vânzător.');
      setOrder((prev: any) => (prev ? { ...prev, shippingAddressShared: true, shippingAddressSharedAt: new Date() } : prev));
    } catch (e: any) {
      setShareShippingMessage(e?.message || 'Nu s-a putut partaja adresa.');
    } finally {
      setShareShippingLoading(false);
    }
  };

  const handleOpenChat = async () => {
    if (!order || !counterpartyId) {
      setError('Nu se pot determina participanții conversației pentru această comandă.');
      return;
    }
    
    if (counterpartyId === 'monetaria-statului') {
      onClose();
      router.push('/contact');
      return;
    }

    try {
      setOpeningChat(true);
      const conversationId =
        order.conversationId ||
        (await createOrGetConversation(order.buyerId, order.sellerId, undefined, order.productId, false));

      // Persist conversationId on the order for future quick-open.
      if (!order.conversationId && db) {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            conversationId,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          // Non-blocking.
          console.warn('Failed to persist conversationId on order:', err);
        }
      }

      const url = `/messages?conversation=${conversationId}`;
      onClose();
      router.push(url);

      // Fallback: if Next router navigation is blocked for any reason, force navigation.
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/messages') {
          window.location.href = url;
        }
      }, 50);
    } catch (err: any) {
      console.error('Failed to open conversation', err);
      setError(err?.message || 'Nu s-a putut deschide conversația.');
    } finally {
      setOpeningChat(false);
    }
  };

  const handlePaymentMade = async () => {
    if (!orderId || !currentUserId || !isBuyer) return;

    try {
      setLoading(true);
      setError(null);

      const orderRef = doc(db, 'orders', orderId);
      
      // Upload payment proof if provided
      let proofUrl = paymentProofUrl;
      if (paymentProof && !paymentProofUrl) {
        setPaymentProofUploading(true);
        // In a real implementation, you would upload the file to storage here
        // For now, we'll simulate it
        await new Promise(resolve => setTimeout(resolve, 1000));
        proofUrl = `https://storage.example.com/payment-proofs/${orderId}-${Date.now()}`;
        setPaymentProofUploading(false);
      }

      await updateDoc(orderRef, {
        status: 'paid',
        paymentDate: new Date(paymentDate),
        paymentProofUrl: proofUrl,
        updatedAt: serverTimestamp(),
      });

      // Refresh order data
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        setOrder({
          id: updatedSnap.id,
          ...updatedSnap.data(),
          createdAt: updatedSnap.data().createdAt?.toDate ? updatedSnap.data().createdAt.toDate() : new Date(),
          updatedAt: updatedSnap.data().updatedAt?.toDate ? updatedSnap.data().updatedAt.toDate() : new Date(),
        });
      }

    } catch (err: any) {
      console.error('Failed to mark payment as made', err);
      setError(err?.message || 'Nu s-a putut marca plata ca efectuată.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPaymentReceived = async () => {
    if (!orderId || !currentUserId || !isSeller) return;

    const confirmed = window.confirm(
      'După confirmarea plății, coletul trebuie expediat către cumpărător în termen de 5 zile.\n' +
      'După expediere, vă rugăm să adăugați AWB-ul în sistem.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        sellerConfirmedPayment: true,
        paymentConfirmationDate: new Date(),
        updatedAt: serverTimestamp(),
      });

      // Refresh order data
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        setOrder({
          id: updatedSnap.id,
          ...updatedSnap.data(),
          createdAt: updatedSnap.data().createdAt?.toDate ? updatedSnap.data().createdAt.toDate() : new Date(),
          updatedAt: updatedSnap.data().updatedAt?.toDate ? updatedSnap.data().updatedAt.toDate() : new Date(),
        });
      }

    } catch (err: any) {
      console.error('Failed to confirm payment received', err);
      setError(err?.message || 'Nu s-a putut confirma primirea plății.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShippingInfo = async () => {
    if (!orderId || !currentUserId || !isSeller) return;

    try {
      setShippingInfoSaving(true);
      setError(null);

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        awbNumber,
        shippingDate: new Date(shippingDate),
        courierName,
        updatedAt: serverTimestamp(),
      });

      // Refresh order data
      const updatedSnap = await getDoc(orderRef);
      if (updatedSnap.exists()) {
        setOrder({
          id: updatedSnap.id,
          ...updatedSnap.data(),
          createdAt: updatedSnap.data().createdAt?.toDate ? updatedSnap.data().createdAt.toDate() : new Date(),
          updatedAt: updatedSnap.data().updatedAt?.toDate ? updatedSnap.data().updatedAt.toDate() : new Date(),
        });
      }

    } catch (err: any) {
      console.error('Failed to save shipping info', err);
      setError(err?.message || 'Nu s-au putut salva informațiile de expediere.');
    } finally {
      setShippingInfoSaving(false);
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  if (!open) return null;

  if (loading && !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-2xl border border-gold-500/30 bg-navy-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 text-slate-200 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500"></div>
            <span>Se încarcă detaliile tranzacției...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-2xl border border-red-500/30 bg-navy-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.9)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-white">Eroare</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white transition-colors"
              aria-label="Închide"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
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

  if (!order) return null;

  const productName = product?.name || `Piesă ${order.productId}`;
  const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-2xl border border-gold-500/30 bg-navy-900/95 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.9)] my-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Detalii tranzacție</h3>
            <p className="text-xs text-slate-400">
              {isBuyer ? 'Cumpărare' : 'Vânzare'} • ID <span className="font-mono">{order.id}</span>
            </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Info */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Informații tranzacție</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Produs</p>
                  <p className="text-sm font-semibold text-slate-100">{productName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Valoare</p>
                  <p className="text-lg font-bold text-gold-300">{formatRON(order.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Data comenzii</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide 
                    ${order.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' : 
                      order.status === 'pending' ? 'bg-amber-500/15 text-amber-200 border-amber-400/40' : 
                      'bg-slate-500/15 text-slate-200 border-slate-400/40'}`}
                  >
                    {order.status === 'paid' ? 'Plătită' : order.status === 'pending' ? 'În așteptare' : order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Counterparty Info */}
            <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">
                {isBuyer ? 'Vânzător' : 'Cumpărător'}
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Nume</p>
                  <p className="text-sm font-semibold text-slate-100">{counterpartyLabel}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenChat}
                  disabled={openingChat}
                  className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-[#000940] shadow hover:bg-[#f0c955] disabled:opacity-60"
                >
                  {openingChat ? 'Se deschide...' : 'Deschide chat'}
                </button>

                {isBuyer && counterpartyId !== 'monetaria-statului' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !showBankingDetails;
                      setShowBankingDetails(next);
                      if (next && !bankingDetails && !bankingLoading) {
                        await fetchBankingDetails();
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-200 hover:bg-navy-950/40 transition-colors"
                  >
                    {showBankingDetails ? 'Ascunde' : 'Detalii bancare'}
                  </button>
                )}

                {isBuyer && counterpartyId !== 'monetaria-statului' && !order.shippingAddressShared && (
                  <button
                    type="button"
                    onClick={shareShippingAddress}
                    disabled={shareShippingLoading}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 transition-colors disabled:opacity-60"
                  >
                    {shareShippingLoading ? 'Se trimite...' : 'Partajează adresa'}
                  </button>
                )}

                {isSeller && counterpartyId !== 'monetaria-statului' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !showShippingAddress;
                      setShowShippingAddress(next);
                      if (next && !shippingDetails && !shippingLoading) {
                        await fetchShippingDetails();
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-200 hover:bg-navy-950/40 transition-colors"
                  >
                    {showShippingAddress ? 'Ascunde' : 'Adresă expediere'}
                  </button>
                )}
              </div>

              {shareShippingMessage && (
                <p className="mt-3 text-xs text-slate-200 border border-gold-500/20 bg-navy-900/30 rounded-lg px-3 py-2">
                  {shareShippingMessage}
                </p>
              )}

              {/* Banking Details Section */}
              {showBankingDetails && (
                <div className="mt-4 pt-4 border-t border-gold-500/20">
                  <h5 className="text-sm font-semibold text-gold-400 mb-2">Detalii bancare</h5>
                  {bankingLoading ? (
                    <p className="text-sm text-slate-300">Se încarcă...</p>
                  ) : bankingError ? (
                    <p className="text-sm text-red-200">{bankingError}</p>
                  ) : bankingDetails ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-400">Cont bancar (IBAN)</p>
                        <p className="text-sm font-mono text-slate-100 break-all">{bankingDetails.bankAccount}</p>
                      </div>
                      {bankingDetails.accountName && (
                        <div>
                          <p className="text-xs text-slate-400">Nume complet</p>
                          <p className="text-sm text-slate-100">{bankingDetails.accountName}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Nu sunt disponibile detalii bancare.</p>
                  )}
                </div>
              )}

              {/* Shipping Address Section */}
              {showShippingAddress && (
                <div className="mt-4 pt-4 border-t border-gold-500/20">
                  <h5 className="text-sm font-semibold text-gold-400 mb-2">Adresă expediere</h5>
                  {shippingLoading ? (
                    <p className="text-sm text-slate-300">Se încarcă...</p>
                  ) : shippingError ? (
                    <p className="text-sm text-red-200">{shippingError}</p>
                  ) : shippingDetails ? (
                    <div className="space-y-2">
                      {shippingDetails.address && (
                        <div>
                          <p className="text-xs text-slate-400">Adresă</p>
                          <p className="text-sm text-slate-100">{shippingDetails.address}</p>
                        </div>
                      )}
                      {shippingDetails.county && (
                        <div>
                          <p className="text-xs text-slate-400">Județ</p>
                          <p className="text-sm text-slate-100">{shippingDetails.county}</p>
                        </div>
                      )}
                      {shippingDetails.postalCode && (
                        <div>
                          <p className="text-xs text-slate-400">Cod poștal</p>
                          <p className="text-sm text-slate-100">{shippingDetails.postalCode}</p>
                        </div>
                      )}
                      {shippingDetails.country && (
                        <div>
                          <p className="text-xs text-slate-400">Țară</p>
                          <p className="text-sm text-slate-100">{shippingDetails.country}</p>
                        </div>
                      )}
                      {shippingDetails.phone && (
                        <div>
                          <p className="text-xs text-slate-400">Telefon</p>
                          <p className="text-sm text-slate-100">{shippingDetails.phone}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Cumpărătorul nu a partajat încă adresa.</p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Section for Buyers */}
            {isBuyer && order.status !== 'paid' && (
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Plată</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Data plății</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dovada plății (opțional)</label>
                    <input
                      type="file"
                      onChange={handlePaymentProofChange}
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                    {paymentProof && (
                      <p className="text-xs text-slate-300 mt-1">
                        Fișier selectat: {paymentProof.name}
                        {paymentProofUploading && ' (se încarcă...)'}
                      </p>
                    )}
                    {paymentProofUrl && (
                      <p className="text-xs text-slate-300 mt-1">
                        Dovada plății încărcată anterior
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePaymentMade}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {loading ? 'Se procesează...' : 'Marchează plata ca efectuată'}
                  </button>
                </div>
              </div>
            )}

            {/* Shipping Section for Sellers */}
            {isSeller && order.status === 'paid' && !order.sellerConfirmedPayment && (
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Confirmare plată</h4>
                <p className="text-xs text-slate-300 mb-3">
                  Cumpărătorul a marcat plata ca efectuată. Vă rugăm să verificați și să confirmați primirea plății.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmPaymentReceived}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-[#000940] shadow hover:bg-[#f0c955] disabled:opacity-60"
                >
                  {loading ? 'Se procesează...' : 'Confirmă primirea plății'}
                </button>
              </div>
            )}

            {isSeller && order.sellerConfirmedPayment && !order.awbNumber && (
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Expediere</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Număr AWB</label>
                    <input
                      type="text"
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      placeholder="Ex: 123456789"
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Data expedierii</label>
                    <input
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nume curier</label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="Ex: Fan Courier, DHL, etc."
                      className="w-full rounded-lg border border-gold-500/30 bg-navy-900/50 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveShippingInfo}
                    disabled={shippingInfoSaving}
                    className="w-full inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-[#000940] shadow hover:bg-[#f0c955] disabled:opacity-60"
                  >
                    {shippingInfoSaving ? 'Se salvează...' : 'Salvează informații expediere'}
                  </button>
                </div>
              </div>
            )}

            {isSeller && order.awbNumber && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4">
                <h4 className="text-sm font-semibold text-emerald-300 mb-3">Informații expediere</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Număr AWB</p>
                    <p className="text-sm font-semibold text-slate-100">{order.awbNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Data expedierii</p>
                    <p className="text-sm text-slate-100">
                      {new Date(order.shippingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Curier</p>
                    <p className="text-sm text-slate-100">{order.courierName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {product && (
              <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Informații produs</h4>
                {product.images && product.images.length > 0 && (
                  <div className="mb-3">
                    <img
                      src={product.images[0]}
                      alt={productName}
                      className="w-full h-48 object-contain rounded-lg border border-gold-500/20"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Nume</p>
                    <p className="text-sm font-semibold text-slate-100">{productName}</p>
                  </div>
                  {product.description && (
                    <div>
                      <p className="text-xs text-slate-400">Descriere</p>
                      <p className="text-sm text-slate-300 line-clamp-3">{product.description}</p>
                    </div>
                  )}
                  {product.country && (
                    <div>
                      <p className="text-xs text-slate-400">Țară</p>
                      <p className="text-sm text-slate-100">{product.country}</p>
                    </div>
                  )}
                  {product.year && (
                    <div>
                      <p className="text-xs text-slate-400">An</p>
                      <p className="text-sm text-slate-100">{product.year}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-xl border border-gold-500/20 bg-navy-950/40 p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Cronologie</h4>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gold-400 mt-1"></div>
                  <div>
                    <p className="text-xs text-slate-400">Comandă creată</p>
                    <p className="text-sm text-slate-100">{createdAt.toLocaleString()}</p>
                  </div>
                </div>
                {order.paymentDate && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1"></div>
                    <div>
                      <p className="text-xs text-slate-400">Plată marcată ca efectuată</p>
                      <p className="text-sm text-slate-100">{new Date(order.paymentDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {order.paymentConfirmationDate && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1"></div>
                    <div>
                      <p className="text-xs text-slate-400">Plată confirmată de vânzător</p>
                      <p className="text-sm text-slate-100">{new Date(order.paymentConfirmationDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {order.shippingDate && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gold-400 mt-1"></div>
                    <div>
                      <p className="text-xs text-slate-400">Colet expediat</p>
                      <p className="text-sm text-slate-100">{new Date(order.shippingDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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
