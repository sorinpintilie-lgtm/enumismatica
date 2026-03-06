const DEFAULT_SITE_URL = 'https://enumismatica.ro';

function normalizeSiteUrl(rawUrl: string): string {
  const withProtocol = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`;

  return withProtocol.replace(/\/$/, '');
}

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.URL ||
    DEFAULT_SITE_URL;

  return normalizeSiteUrl(raw);
}

export function buildAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

