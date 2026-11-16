const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 100_000;
const ADMIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecretKey(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Constant-time string equality check using SHA-256 digests so length is never leaked.
 */
export async function constantTimeStringEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    globalThis.crypto.subtle.digest('SHA-256', encoder.encode(a)),
    globalThis.crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  return constantTimeEqual(new Uint8Array(hashA), new Uint8Array(hashB));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function getHmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const secretBytes = encoder.encode(getSecretKey());
  return globalThis.crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

async function signPayload(payload: object): Promise<string> {
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);
  const key = await getHmacKey('sign');
  const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuffer));
  return `${payloadB64}.${sigB64}`;
}

async function verifySignedToken<T extends { exp?: number }>(token?: string | null): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64 || sigB64.includes('.')) return null;

  const sigBytes = fromBase64Url(sigB64);
  const payloadBytes = fromBase64Url(payloadB64);
  if (!sigBytes || !payloadBytes) return null;

  try {
    const key = await getHmacKey('sign');
    const expectedSigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
    const expectedSig = new Uint8Array(expectedSigBuffer);
    if (!constantTimeEqual(sigBytes, expectedSig)) {
      return null;
    }

    const parsed = JSON.parse(decoder.decode(payloadBytes)) as T;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function createAdminSessionToken(email: string): Promise<string> {
  return signPayload({
    role: 'admin',
    email,
    exp: Date.now() + ADMIN_TOKEN_TTL_MS,
  });
}

export async function verifyAdminSessionToken(token?: string | null): Promise<boolean> {
  const payload = await verifySignedToken<{ role?: string; email?: string; exp?: number }>(token);
  return Boolean(payload && payload.role === 'admin');
}

export async function createUserToken(userId: number, email: string): Promise<string> {
  return signPayload({
    role: 'user',
    userId,
    email,
    exp: Date.now() + USER_TOKEN_TTL_MS,
  });
}

export async function verifyUserToken(
  token?: string | null
): Promise<{ userId: number; email: string } | null> {
  const payload = await verifySignedToken<{
    role?: string;
    userId?: number;
    email?: string;
    exp?: number;
  }>(token);
  if (!payload || payload.role !== 'user' || typeof payload.userId !== 'number') {
    return null;
  }
  return { userId: payload.userId, email: String(payload.email || '') };
}

async function derivePbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored || typeof stored !== 'string') {
    return { valid: false, needsRehash: false };
  }

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) {
      return { valid: false, needsRehash: false };
    }
    const iterations = parseInt(parts[1], 10);
    const salt = fromHex(parts[2]);
    const expectedHash = fromHex(parts[3]);
    if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHash) {
      return { valid: false, needsRehash: false };
    }
    const derived = await derivePbkdf2(password, salt, iterations);
    return {
      valid: constantTimeEqual(derived, expectedHash),
      needsRehash: false,
    };
  }

  // Legacy plaintext password comparison using constant-time byte check
  const pwBytes = encoder.encode(password);
  const storedBytes = encoder.encode(stored);
  const isMatch = constantTimeEqual(pwBytes, storedBytes);
  return {
    valid: isMatch,
    needsRehash: isMatch,
  };
}
