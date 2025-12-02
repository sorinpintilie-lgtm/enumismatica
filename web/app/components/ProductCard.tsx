import Link from 'next/link'
import { memo } from 'react'
import { Product } from 'shared/types'
import LazyImage from './LazyImage'
import { formatRON } from '../utils/currency'
import { WatchlistButton } from './WatchlistButton'

interface ProductCardProps {
  product: Product
  showWatchlistButton?: boolean
}

function ProductCard({ product, showWatchlistButton = true }: ProductCardProps) {
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
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-xl font-semibold text-[#e7b73c]">
            {formatRON(product.price)}
          </span>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition hover:-translate-y-0.5 hover:bg-[#f0c955]"
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
    </div>
  )
}

export default memo(ProductCard)
