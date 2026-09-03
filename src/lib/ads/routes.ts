/**
 * Client-safe route matching and path constants for AdSense visibility
 */

// Routes where platform ads are strictly and permanently prohibited
export const PERMANENTLY_EXCLUDED_ROUTES: string[] = [
  "/admin",
  "/dashboard",
  "/api",
  "/login",
  "/signup",
  "/register",
  "/onboarding",
  "/checkout",
  "/domain-pending",
];

// Routes considered client-facing wedding galleries (protected by default)
export const CLIENT_GALLERY_ROUTES: string[] = [
  "/gallery",
  "/client",
];

/**
 * Normalizes a pathname string to lowercase and strips trailing slashes
 */
export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  let clean = pathname.toLowerCase().trim();
  if (clean.length > 1 && clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Checks if a pathname matches any pattern in a given list
 */
export function matchesRoutePattern(pathname: string, patterns: string[]): boolean {
  const norm = normalizePathname(pathname);
  for (const pattern of patterns) {
    const cleanPattern = normalizePathname(pattern);
    if (norm === cleanPattern) return true;
    if (norm.startsWith(`${cleanPattern}/`)) return true;
  }
  return false;
}

export function isPermanentlyExcludedRoute(pathname: string): boolean {
  return matchesRoutePattern(pathname, PERMANENTLY_EXCLUDED_ROUTES);
}

export function isClientGalleryRoute(pathname: string): boolean {
  return matchesRoutePattern(pathname, CLIENT_GALLERY_ROUTES);
}

