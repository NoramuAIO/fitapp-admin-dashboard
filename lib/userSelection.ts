'use client';

import { invalidateApiCache } from '@/lib/clientCache';
import { ISTANBUL_TZ, getLocalDateString } from '@/lib/fitnessCalculations';

export const USER_SELECTED_EVENT = 'userSelected';

export function getStoredSelectedUserId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('selectedUserId');
  if (!raw || raw === 'all' || raw === 'null' || raw === 'undefined') return null;
  const parsed = Number(raw.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function setStoredSelectedUserId(userId: number | null): void {
  if (typeof window === 'undefined') return;
  if (userId !== null && Number.isInteger(userId) && userId > 0) {
    window.localStorage.setItem('selectedUserId', String(userId));
  } else {
    window.localStorage.removeItem('selectedUserId');
  }
  invalidateApiCache();
  window.dispatchEvent(new CustomEvent(USER_SELECTED_EVENT, { detail: { userId } }));
}

export function subscribeUserSelected(handler: (userId: number | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = () => {
    handler(getStoredSelectedUserId());
  };
  window.addEventListener(USER_SELECTED_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(USER_SELECTED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function formatIstanbulLocaleDate(
  rawDate: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!rawDate) return '-';
  const ymd = getLocalDateString(rawDate);
  if (!ymd) return '-';
  const parsed = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('tr-TR', {
    ...options,
    timeZone: ISTANBUL_TZ,
  });
}
