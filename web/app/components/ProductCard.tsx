import Link from 'next/link'
import { memo, useState } from 'react'
import { Product } from 'shared/types'
import LazyImage from './LazyImage'
import { formatRON } from '../utils/currency'
import { WatchlistButton } from './WatchlistButton'
import { useAuth } from '../context/AuthContext'
import OfferModal from './OfferModal'

interface ProductCardProps {
  product: Product
  showWatchlistButton?: boolean
  variant?: 'grid' | 'list'
}

function ProductCard({ product, showWatchlistButton = true, variant = 'grid' }: ProductCardProps) {
  const { user } = useAuth();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const now = new Date();

  const isBoostActive =
    product.boostExpiresAt instanceof Date
      ? product.boostExpiresAt.getTime() > now.getTime()
      : false;

  const isPromoActive =
    product.promotionExpiresAt instanceof Date
      ? product.promotionExpiresAt.getTime() > now.getTime()
      : false;

  const estePromovat = isBoostActive || isPromoActive;

  if (variant === 'list') {
    return (
      <div className="relative group flex gap-4 p-4 rounded-xl border border-[#e7b73c]/40 bg-gradient-to-r from-navy-600 to-navy-800 shadow-[0_8px_25px_rgba(231,183,60,0.2)] hover:border-[#e7b73c] hover:shadow-[0_12px_35px_rgba(231,183,60,0.35)] transition-all duration-300 w-full">
        {/* Image */}
        <div className="relative w-32 h-24 flex-shrink-0 bg-white rounded-lg overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <LazyImage
              src={product.images[0]}
              alt={product.name || 'Produs'}
              className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
              placeholder="Loading..."
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              Fără imagine
            </div>
          )}
          {estePromovat && (
            <span className="absolute top-1 left-1 z-10 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-navy-900 shadow-md">
              Promovat
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-white line-clamp-1 pr-4" title={product.name}>
              {product.name}
            </h3>
            <span className="text-xl font-bold text-[#e7b73c] flex-shrink-0">
              {formatRON(product.price)}
            </span>
          </div>
          
          <p className="text-sm text-slate-300 line-clamp-2 mb-3">
            {product.description}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {product.country && <span>📍 {product.country}</span>}
              {product.year && <span>📅 {product.year}</span>}
              {product.metal && <span>🥇 {product.metal}</span>}
            </div>

            <div className="flex gap-2">
              {user && user.uid !== product.ownerId && !product.isSold && (
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  Fă o ofertă
                </button>
              )}
              <Link
                href={`/products/${product.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#e7b73c] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[0_0_15px_rgba(231,183,60,0.6)] transition hover:-translate-y-0.5 hover:bg-[#f0c955]"
              >
                Vezi detalii
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
        
        {showWatchlistButton !== false && (
          <div className="absolute top-2 right-2 z-10">
            <WatchlistButton
              itemType="product"
              itemId={product.id}
              size="small"
            />
          </div>
        )}
      </div>
    )
  }

  // Grid variant (original layout)
  return (
    <div className="relative group h-full flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 rounded-2xl border border-[#e7b73c]/70 bg-gradient-to-br from-navy-500 to-navy-600 shadow-[0_10px_35px_rgba(231,183,60,0.3)] hover:border-[#e7b73c] hover:shadow-[0_15px_45px_rgba(231,183,60,0.45)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-white rounded-t-2xl">
        {product.images && product.images.length > 0 ? (
          <LazyImage
            src={product.images[0]}
            alt={product.name || 'Produs'}
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
            placeholder="Loading..."
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            Fara imagine
          </div>
        )}
        {estePromovat && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-900 shadow-md">
            Promovat
          </span>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gold-500/10" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-300 line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="mt-auto space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xl font-semibold text-[#e7b73c]">
               {formatRON(product.price)}
             </span>
             {user && user.uid !== product.ownerId && !product.isSold && (
               <button
                 onClick={() => setShowOfferModal(true)}
                 className="inline-flex items-center gap-1 rounded-full bg-blue-500 hover:bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
               >
                 Fă o ofertă
               </button>
             )}
           </div>
           <Link
             href={`/products/${product.id}`}
             className="inline-flex items-center justify-center w-full gap-2 rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition hover:-translate-y-0.5 hover:bg-[#f0c955]"
           >
             Vezi detalii
             <span aria-hidden>→</span>
           </Link>
         </div>
        {showWatchlistButton !== false && (
          <div className="absolute top-2 right-2 z-10">
            <WatchlistButton
              itemType="product"
              itemId={product.id}
              size="small"
            />
          </div>
        )}
      </div>

      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        itemType="product"
        itemId={product.id}
        itemName={product.name}
        currentPrice={product.price}
        buyerId={user?.uid || ''}
      />
    </div>
  )
}

export default memo(ProductCard)
