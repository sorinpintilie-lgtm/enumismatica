import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface MintProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
  link: string;
}

export default function MintProductCard({ product }: { product: MintProduct }) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-white/95 border border-[#e7b73c]/30 rounded-2xl shadow-[0_18px_55px_rgba(0,0,0,0.65)] p-4 backdrop-blur-sm hover:shadow-[0_25px_75px_rgba(0,0,0,0.8)] transition-all duration-300 group relative">
      <Link href={product.link} className="block">
        <div className="aspect-square relative mb-4 overflow-hidden rounded-xl bg-gray-100">
          {!imageError ? (
            <Image
              src={product.image || '/placeholder.jpg'}
              alt={product.title}
              fill
              quality={75}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="space-y-2 min-h-[3rem]">
          <h3 className="font-semibold text-[#000940] text-sm line-clamp-2 group-hover:text-[#e7b73c] transition-colors leading-tight">
            {product.title}
          </h3>
          <p className="text-lg font-bold text-[#e7b73c]">
            {product.price}
          </p>
        </div>
      </Link>
      <button
        type="button"
        className="absolute bottom-4 right-4 bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] p-2 rounded-full shadow-lg transition-colors opacity-0 group-hover:opacity-100"
        title="Adaugă în coș"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h10a2 2 0 002-2v-3" />
        </svg>
      </button>
    </div>
  );
}