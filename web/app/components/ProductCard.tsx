import Link from 'next/link'
import { memo } from 'react'
import { Product } from '../../../shared/types'
import LazyImage from './LazyImage'
import { formatRON } from '../utils/currency'

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group panel h-full flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-slate-100">
        {product.images.length > 0 ? (
          <LazyImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            placeholder="Loading..."
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            Fara imagine
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-slate-900/5" />
        <div className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-md backdrop-blur">
          Curated
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-xl font-semibold text-slate-900">
            {formatRON(product.price)}
          </span>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Vezi detalii
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)
