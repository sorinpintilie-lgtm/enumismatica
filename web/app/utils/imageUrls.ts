import type { Product } from 'shared/types';
import { 
  isValidImageUrl, 
  validateImageUrls, 
  getAllDisplayImages,
  buildImageUrlWithWidth as buildImageUrlWithWidthShared,
  getPlaceholderImageUrl 
} from 'shared/utils/productNormalization';

/**
 * Append a width query parameter without breaking existing query strings.
 *
 * Firebase Storage download URLs already include query params like `?alt=media&token=...`.
 * 
 * @deprecated Use buildImageUrlWithWidthNew instead for better validation
 */
export function buildImageUrlWithWidth(url: string | undefined | null, width: number): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}`;
}

/**
 * New version of buildImageUrlWithWidth with proper validation.
 * Returns empty string for invalid URLs.
 */
export function buildImageUrlWithWidthNew(url: string | undefined | null, width: number): string {
  return buildImageUrlWithWidthShared(url, width);
}

/**
 * Determine which image URLs should be displayed for a product.
 *
 * When async/background compression is used:
 * - `product.images` may be empty or contain placeholders (''),
 * - `product.imagesRaw` may already contain working URLs.
 *
 * This merges both arrays by index and filters empty/invalid values.
 */
export function getDisplayProductImages(product: Partial<Product> | null | undefined): string[] {
  return getAllDisplayImages(product);
}

/**
 * Get the primary image URL for a product.
 * Returns the first valid image URL or an empty string if none exist.
 */
export function getPrimaryImageUrl(product: Partial<Product> | null | undefined): string {
  const images = getDisplayProductImages(product);
  return images.length > 0 ? images[0] : '';
}

/**
 * Check if a product has any valid images.
 */
export function hasProductImages(product: Partial<Product> | null | undefined): boolean {
  return getDisplayProductImages(product).length > 0;
}

/**
 * Get a display-ready image URL with width parameter.
 * Returns a placeholder if no valid images are available.
 */
export function getDisplayImageWithWidth(
  product: Partial<Product> | null | undefined, 
  width: number = 400
): string {
  const images = getDisplayProductImages(product);
  
  if (images.length > 0) {
    return buildImageUrlWithWidthNew(images[0], width);
  }

  return getPlaceholderImageUrl(width);
}

/**
 * Get all image URLs with width parameters applied.
 */
export function getDisplayImagesWithWidth(
  product: Partial<Product> | null | undefined,
  width: number = 400
): string[] {
  return getDisplayProductImages(product).map(url => 
    buildImageUrlWithWidthNew(url, width)
  );
}

/**
 * Validate an image URL and return true if it's valid.
 */
export function isValidProductImage(url: string | null | undefined): boolean {
  return isValidImageUrl(url);
}

/**
 * Get the number of valid images for a product.
 */
export function getProductImageCount(product: Partial<Product> | null | undefined): number {
  return getDisplayProductImages(product).length;
}

/**
 * Get image URLs for a specific thumbnail size.
 */
export function getThumbnailImages(
  product: Partial<Product> | null | undefined,
  size: number = 150
): string[] {
  return getDisplayImagesWithWidth(product, size);
}

/**
 * Get the main hero image URL for product detail views.
 */
export function getHeroImageUrl(product: Partial<Product> | null | undefined): string {
  return getDisplayImageWithWidth(product, 800);
}

/**
 * Validate and return only valid image URLs from an array.
 */
export function filterValidImageUrls(urls: (string | null | undefined)[]): string[] {
  return validateImageUrls(urls);
}
