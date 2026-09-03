import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

export function getClientSessionId(request: NextRequest, accessCode: string): string {
  const code = (accessCode || "").toUpperCase();
  
  // 1. Check custom client session header
  const headerSession = request.headers.get("x-client-session-id");
  if (headerSession && headerSession.trim()) {
    return headerSession.trim();
  }

  // 2. Check cookie for this specific access code
  const cookieName = `wvg_session_${code}`;
  const cookieVal = request.cookies.get(cookieName)?.value;
  if (cookieVal && cookieVal.trim()) {
    return cookieVal.trim();
  }

  // 3. Check query param fallback
  const queryVal = request.nextUrl.searchParams.get("sessionId");
  if (queryVal && queryVal.trim()) {
    return queryVal.trim();
  }

  // 4. Default to standard client session token or generate
  return uuidv4();
}
