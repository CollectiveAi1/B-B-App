/**
 * Response headers for the deployed site.
 *
 * vercel.json carries the same values for production, and a test fails if the
 * two ever differ. Keeping them here lets the local preview server apply them
 * too.
 *
 * The policy allows only this origin. The app loads no third-party scripts,
 * styles, or fonts, so there is nothing to allowlist. `blob:` covers the photo
 * thumbnails a cleaner attaches to a checklist.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
