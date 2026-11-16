import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyAdminSessionToken, verifyUserToken } from '@/lib/auth';

export interface ApiAuthContext {
  isAdmin: boolean;
  userId: number | null;
  email: string;
}

function readCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Verifies admin cookie or mobile Bearer token for API route handlers.
 */
export async function requireApiAuth(
  request: Request,
  options: { requireAdmin?: boolean } = {}
): Promise<{ ok: true; auth: ApiAuthContext } | { ok: false; response: NextResponse }> {
  let adminCookie = readCookieFromHeader(request.headers.get('cookie'), 'admin-auth');
  if (!adminCookie) {
    try {
      const store = await cookies();
      adminCookie = store.get('admin-auth')?.value || null;
    } catch {
      // Ignore outside request store context
    }
  }

  if (adminCookie && (await verifyAdminSessionToken(adminCookie))) {
    return {
      ok: true,
      auth: { isAdmin: true, userId: null, email: process.env.ADMIN_EMAIL || 'admin' },
    };
  }

  if (options.requireAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Bu işlem için admin oturumu gereklidir' },
        { status: adminCookie ? 403 : 401 }
      ),
    };
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const tokenUser = await verifyUserToken(token);
    if (!tokenUser) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Geçersiz veya süresi dolmuş oturum belirteci' }, { status: 401 }),
      };
    }
    return {
      ok: true,
      auth: { isAdmin: false, userId: tokenUser.userId, email: tokenUser.email },
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: 'Yetkisiz erişim (Oturum gerekli)' }, { status: 401 }),
  };
}

/**
 * Resolves the authorized userId for queries and mutations.
 * Non-admin tokens are pinned to their own token userId and rejected on cross-user access.
 */
export function resolveScopedUserId(
  auth: ApiAuthContext,
  requestedUserId: number | null
): { ok: true; userId: number | null } | { ok: false; response: NextResponse } {
  if (auth.isAdmin) {
    return { ok: true, userId: requestedUserId };
  }
  if (!auth.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Kullanıcı kimliği doğrulanamadı' }, { status: 401 }),
    };
  }
  if (requestedUserId !== null && requestedUserId !== auth.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Başka bir kullanıcının verisine erişilemez' }, { status: 403 }),
    };
  }
  return { ok: true, userId: auth.userId };
}

export function parsePositiveInt(raw: unknown): number | null {
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  const str = String(raw).trim();
  if (!/^\d+$/.test(str)) return null;
  const num = Number(str);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

export function parseNonNegativeInt(raw: unknown): number | null {
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  const str = String(raw).trim();
  if (!/^\d+$/.test(str)) return null;
  const num = Number(str);
  return Number.isSafeInteger(num) && num >= 0 ? num : null;
}

export function parseLocaleDecimal(raw: unknown): number | null {
  if (raw === null || raw === undefined || typeof raw === 'boolean') return null;
  const normalized = String(raw).trim().replace(',', '.');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export function isValidYmdDate(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function escapeIlikePattern(raw: string): string {
  return String(raw).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Safely detaches exercises that have historical exercise_completions (preserving PR/tonnage logs),
 * and deletes only exercises with zero completion history.
 */
export async function detachOrDeleteExercises(exerciseIds: number[]): Promise<void> {
  const uniqueIds = Array.from(new Set(exerciseIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) return;

  const { data: completionRefs, error: refErr } = await supabase
    .from('exercise_completions')
    .select('exerciseId')
    .in('exerciseId', uniqueIds);

  if (refErr) {
    throw refErr;
  }

  const protectedIds = new Set(
    (completionRefs || []).map((row: any) => Number(row.exerciseId)).filter((id) => Number.isInteger(id) && id > 0)
  );
  const toDetach = uniqueIds.filter((id) => protectedIds.has(id));
  const toDelete = uniqueIds.filter((id) => !protectedIds.has(id));

  if (toDetach.length > 0) {
    const { error: detachErr } = await supabase
      .from('exercises')
      .update({ dayId: null, programId: null, orderIndex: -1 })
      .in('id', toDetach);
    if (detachErr) throw detachErr;
  }

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('exercises')
      .delete()
      .in('id', toDelete);
    if (delErr) throw delErr;
  }
}
