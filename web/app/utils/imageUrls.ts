import type { Product } from 'shared/types';

/**
 * Append a width query parameter without breaking existing query strings.
 *
 * Firebase Storage download URLs already include query params like `?alt=media&token=...`.
 */
export function buildImageUrlWithWidth(url: string | undefined | null, width: number): string {
	if (!url) return '';
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}width=${width}`;
}

/**
 * Determine which image URLs should be displayed for a product.
 *
 * When async/background compression is used:
 * - `product.images` may be empty or contain placeholders (''),
 * - `product.imagesRaw` may already contain working URLs.
 *
 * This merges both arrays by index and filters empty values.
 */
export function getDisplayProductImages(product: Partial<Product> | null | undefined): string[] {
	const images = Array.isArray(product?.images) ? product!.images : [];
	const imagesRaw = Array.isArray((product as any)?.imagesRaw) ? ((product as any).imagesRaw as string[]) : [];

	const max = Math.max(images.length, imagesRaw.length);
	const merged: string[] = [];
	for (let i = 0; i < max; i++) {
		const primary = typeof images[i] === 'string' ? images[i].trim() : '';
		const fallback = typeof imagesRaw[i] === 'string' ? imagesRaw[i].trim() : '';
		merged.push(primary || fallback);
	}

	return merged.filter(Boolean);
}

