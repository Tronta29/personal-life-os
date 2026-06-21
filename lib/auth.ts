// Tek kullanıcı için basit, imzalı cookie tabanlı oturum.
// Şifre `APP_PASSWORD` ile karşılaştırılır; doğruysa HMAC imzalı bir cookie set edilir.
// Edge (proxy) ve Node (route/layout) ortamlarının ikisinde de çalışır → sadece Web Crypto kullanır.

export const COOKIE_NAME = "plos_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

const PAYLOAD = "authenticated";
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tanımlı değil");
  return secret;
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Login başarılıysa set edilecek cookie değerini üretir */
export async function createSessionToken(): Promise<string> {
  const sig = await hmacHex(getSecret(), PAYLOAD);
  return `${PAYLOAD}.${sig}`;
}

/** Sabit zamanlı string karşılaştırma */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Cookie değerinin geçerli olup olmadığını doğrular */
export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (payload !== PAYLOAD || !sig) return false;
  try {
    const expected = await hmacHex(getSecret(), PAYLOAD);
    return safeEqual(sig, expected);
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
