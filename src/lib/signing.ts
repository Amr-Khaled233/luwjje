/**
 * HMAC-SHA256 helpers built on Web Crypto, so the same code verifies in Node
 * and in Edge middleware.
 */

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short — set it in .env');
  }
  return value;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function sign(payload: string) {
  const key = await hmacKey();
  const buffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Length-safe comparison so a mismatch cannot be timed. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** `payload.signature`, where payload must not contain the final separator. */
export async function signToken(payload: string) {
  return `${payload}.${await sign(payload)}`;
}

/** Returns the payload if the signature checks out, otherwise null. */
export async function readToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    return safeEqual(signature, await sign(payload)) ? payload : null;
  } catch {
    return null;
  }
}
