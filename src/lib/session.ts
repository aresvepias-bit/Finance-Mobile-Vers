// Token sesi bertanda tangan HMAC-SHA256: "<payload base64url>.<signature base64url>".
// Payload berisi username & waktu kedaluwarsa, jadi cookie tidak bisa dipalsukan
// tanpa SESSION_SECRET. Memakai Web Crypto supaya jalan di proxy maupun route handler.

export const SESSION_COOKIE = "wallet_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 hari (detik)

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-change-me-please-32+";
  throw new Error("SESSION_SECRET belum diatur (minimal 32 karakter).");
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey() {
  return crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createSessionToken(username: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE * 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload)));
  return `${payload}.${toBase64Url(sig)}`;
}

/** Username dari token yang valid & belum kedaluwarsa, atau null. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromBase64Url(sig), encoder.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { u?: string; exp?: number };
    if (!data.u || !data.exp || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

/** Baca & verifikasi cookie sesi dari request. */
export async function getSessionUsername(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return verifySessionToken(raw ? decodeURIComponent(raw) : null);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};
