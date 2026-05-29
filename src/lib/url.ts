// ABOUTME: URL normalization for archive input — accepts bare hostnames and
// ABOUTME: validates the scheme, returning a canonical URL string or null.
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Only prepend https:// when there's no explicit scheme; an explicit scheme
  // (ftp://, etc.) is preserved so the protocol check below can reject it.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
