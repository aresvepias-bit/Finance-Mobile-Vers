import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Endpoint yang boleh diakses tanpa login
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/auth/session"];

/** Semua API data wajib punya sesi yang valid (token bertanda tangan). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_API.includes(pathname)) return NextResponse.next();

  const username = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!username) {
    return NextResponse.json({ status: "error", message: "Sesi berakhir, silakan login ulang." }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
