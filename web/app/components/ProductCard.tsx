import Link from 'next/link'
import { memo } from 'react'
import { Product } from 'shared/types'
import LazyImage from './LazyImage'
import { formatRON } from '../utils/currency'

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group panel h-full flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
        {product.images.length > 0 ? (
          <LazyImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
            placeholder="Loading..."
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            Fara imagine
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-slate-900/5" />
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
