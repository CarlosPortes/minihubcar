/**
 * Resolves media URLs for miniature catalog and user uploads.
 * In production or under reverse proxies (Nginx / Next.js rewrites),
 * relative paths like /catalog-media/... and /uploads/... are served
 * directly from the current domain, preventing Mixed Content and
 * broken localhost:3333 requests in the user's browser.
 */
export function getMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // External full URL or base64 data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Ensure standard leading slash
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If NEXT_PUBLIC_BACKEND_URL is explicitly set to an absolute URL,
  // prepend it only if not creating a Mixed Content conflict in the browser
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && backendUrl.startsWith('http://')) {
      return path;
    }
    return `${backendUrl.replace(/\/$/, '')}${path}`;
  }

  // Default to relative path on the same host (e.g. /catalog-media/... or /uploads/...)
  return path;
}

