import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';
import { buildAbsoluteUrl } from '../../lib/seo';
import { getSeoProductById, listSeoProductEntries } from '../../lib/productSeoData';

export const revalidate = 300;

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

function formatIsoDate(date?: Date): string | undefined {
  if (!date) return undefined;
  try {
    return date.toISOString();
  } catch {
    return undefined;
  }
}

function buildProductJsonLd(product: NonNullable<Awaited<ReturnType<typeof getSeoProductById>>>) {
  const canonicalUrl = buildAbsoluteUrl(`/products/${product.id}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    url: canonicalUrl,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'EUR',
      price: typeof product.price === 'number' ? product.price : undefined,
      availability: product.isSold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
    ...(formatIsoDate(product.createdAt) ? { datePublished: formatIsoDate(product.createdAt) } : {}),
    ...(formatIsoDate(product.updatedAt || product.createdAt)
      ? { dateModified: formatIsoDate(product.updatedAt || product.createdAt) }
      : {}),
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getSeoProductById(id);

  const canonicalUrl = `/products/${id}`;

  if (!product) {
    return {
      title: 'Piesă negăsită | eNumismatica',
      description: 'Piesa solicitată nu este disponibilă sau nu mai există în catalog.',
      alternates: { canonical: canonicalUrl },
      robots: { index: false, follow: false },
    };
  }

  const indexable = product.status === 'approved' && product.listingType === 'direct' && product.isSold !== true;
  const image = product.images[0];

  const title = `${product.name} | eNumismatica`;
  const description =
    product.description?.trim().slice(0, 155) || 'Piesă numismatică disponibilă în catalogul eNumismatica.';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: buildAbsoluteUrl(canonicalUrl),
      title,
      description,
      siteName: 'eNumismatica',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const entries = await listSeoProductEntries(3000);
  return entries.map((entry) => ({ id: entry.id }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const seoProduct = await getSeoProductById(id);
  const jsonLd = seoProduct ? buildProductJsonLd(seoProduct) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailClient />
    </>
  );
}

