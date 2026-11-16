import {
  getLocalDateString,
  getMondayFirstDayIndex,
  normalizeUtcTimestamp,
  parseDurationToMinutes,
  isRealWorkoutSession,
  calculateCompletionVolume,
} from './fitnessCalculations';

export const REST_DAY_LABEL = 'Dinlenme Günü' as const;

export const MONDAY_FIRST_DAYS = [
  { dayOfWeek: 1, label: 'Pazartesi', short: 'Pzt' },
  { dayOfWeek: 2, label: 'Salı', short: 'Sal' },
  { dayOfWeek: 3, label: 'Çarşamba', short: 'Çar' },
  { dayOfWeek: 4, label: 'Perşembe', short: 'Per' },
  { dayOfWeek: 5, label: 'Cuma', short: 'Cum' },
  { dayOfWeek: 6, label: 'Cumartesi', short: 'Cmt' },
  { dayOfWeek: 0, label: 'Pazar', short: 'Paz' },
] as const;

export interface ScheduledWorkoutItem {
  workoutId?: number | null;
  programId?: number | null;
  workoutName: string;
  programName?: string | null;
}

export interface WeeklyDaySchedule {
  dayOfWeek: number; // 0 = Pazar, 1 = Pazartesi ... 6 = Cumartesi
  isRestDay: boolean;
  isAlternating: boolean;
  workouts: ScheduledWorkoutItem[];
  note?: string | null;
}

export interface ScheduleOverride {
  date: string; // YYYY-MM-DD
  isRestDay: boolean;
  workoutId?: number | null;
  programId?: number | null;
  workoutName?: string | null;
  programName?: string | null;
  note?: string | null;
}

export interface UserWorkoutSchedule {
  userId?: number | null;
  weeklySchedule: WeeklyDaySchedule[];
  overrides: Record<string, ScheduleOverride>;
  updatedAt?: string;
}

export type CalendarDayStatus =
  | 'completed'
  | 'today_planned'
  | 'today_rest'
  | 'planned'
  | 'rest'
  | 'missed';

export interface ResolvedCalendarDay {
  date: string;
  dayNumber: number;
  dayOfWeek: number;
  dayLabel: string;
  dayShort: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  status: CalendarDayStatus;
  statusLabel: string;
  isRestDay: boolean;
  isOverride: boolean;
  isAlternating: boolean;
  plannedWorkout: ScheduledWorkoutItem | null;
  alternatingPool: ScheduledWorkoutItem[];
  note: string | null;
  completedSessions: any[];
  totalVolumeKg: number;
  totalDurationMinutes: number;
  totalSets: number;
  totalReps: number;
}

const DAY_META_BY_INDEX = new Map<number, { label: string; short: string }>(
  MONDAY_FIRST_DAYS.map((d) => [d.dayOfWeek, { label: d.label, short: d.short }])
);

function parseNoonDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(y, mo - 1, d, 12, 0, 0);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== mo - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }
  return parsed;
}

function formatYmdFromLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeLabelText(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function stripParentheticalSuffix(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeWorkoutItem(raw: any): ScheduledWorkoutItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawName = String(raw.workoutName || raw.name || '').trim();
  if (!rawName) return null;
  const workoutId =
    raw.workoutId !== undefined && raw.workoutId !== null && Number(raw.workoutId) > 0
      ? Number(raw.workoutId)
      : null;
  const programId =
    raw.programId !== undefined && raw.programId !== null && Number(raw.programId) > 0
      ? Number(raw.programId)
      : null;
  const programName = raw.programName ? String(raw.programName).trim() : null;
  return {
    workoutId,
    programId,
    workoutName: rawName,
    programName,
  };
}

function getSessionLocalDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  const normalized = normalizeUtcTimestamp(rawDate) || rawDate;
  return getLocalDateString(normalized);
}

function getSessionTimestamp(s: any): number {
  const raw = s?.startTime || s?.endTime || s?.createdAt;
  if (!raw) return 0;
  const trimmed = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const noon = parseNoonDate(trimmed);
    return noon ? noon.getTime() : 0;
  }
  const normalized = normalizeUtcTimestamp(trimmed) || trimmed;
  const t = new Date(normalized).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function doesSessionMatchCandidate(
  session: any,
  candidate: ScheduledWorkoutItem,
  allowProgramFallback = true
): boolean {
  if (!session || !candidate) return false;
  const sWorkoutId =
    session.workoutId !== undefined && session.workoutId !== null && Number(session.workoutId) > 0
      ? Number(session.workoutId)
      : null;
  if (sWorkoutId && candidate.workoutId) {
    return sWorkoutId === candidate.workoutId;
  }

  const sWorkoutName = normalizeLabelText(session.workoutName || session.workout_name);
  const sProgramName = normalizeLabelText(session.programName || session.program_name);
  const cWorkoutName = normalizeLabelText(candidate.workoutName);
  const cProgramName = normalizeLabelText(candidate.programName);

  if (cWorkoutName && sWorkoutName && sWorkoutName === cWorkoutName) {
    return true;
  }
  if (cWorkoutName && sProgramName && sProgramName === cWorkoutName) {
    return true;
  }
  const sCore = stripParentheticalSuffix(sWorkoutName);
  const cCore = stripParentheticalSuffix(cWorkoutName);
  if (cCore && sCore && sCore === cCore) {
    return true;
  }
  if (
    allowProgramFallback &&
    cProgramName &&
    sProgramName &&
    sProgramName === cProgramName &&
    (!sWorkoutName || sWorkoutName === 'antreman' || sWorkoutName === 'antrenman')
  ) {
    if (!candidate.programId || !session.programId || Number(session.programId) === candidate.programId) {
      return true;
    }
  }
  return false;
}

export function createDefaultWeeklySchedule(): WeeklyDaySchedule[] {
  return MONDAY_FIRST_DAYS.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    isRestDay: true,
    isAlternating: false,
    workouts: [],
    note: null,
  }));
}

export function normalizeUserSchedule(
  raw?: any,
  userId?: number | null
): UserWorkoutSchedule {
  const defaults = createDefaultWeeklySchedule();
  const byDay = new Map<number, WeeklyDaySchedule>(
    defaults.map((d) => [d.dayOfWeek, d])
  );

  let rawWeekly = raw?.weeklySchedule;
  if (typeof rawWeekly === 'string') {
    try {
      rawWeekly = JSON.parse(rawWeekly);
    } catch {
      rawWeekly = [];
    }
  }

  if (Array.isArray(rawWeekly)) {
    for (const item of rawWeekly) {
      const dow = Number(item?.dayOfWeek);
      if (Number.isNaN(dow) || dow < 0 || dow > 6) continue;
      const workouts = Array.isArray(item?.workouts)
        ? item.workouts
            .map(sanitizeWorkoutItem)
            .filter((w: ScheduledWorkoutItem | null): w is ScheduledWorkoutItem => w !== null)
        : [];
      const isRestDay =
        item?.isRestDay !== undefined ? Boolean(item.isRestDay) : workouts.length === 0;
      const isAlternating = !isRestDay && workouts.length > 1 && Boolean(item?.isAlternating);
      const note =
        item?.note !== undefined && item?.note !== null && String(item.note).trim()
          ? String(item.note).trim()
          : null;

      byDay.set(dow, {
        dayOfWeek: dow,
        isRestDay: workouts.length === 0 ? true : isRestDay,
        isAlternating,
        workouts,
        note,
      });
    }
  }

  let rawOverrides = raw?.overrides;
  if (typeof rawOverrides === 'string') {
    try {
      rawOverrides = JSON.parse(rawOverrides);
    } catch {
      rawOverrides = {};
    }
  }

  const overrides: Record<string, ScheduleOverride> = {};
  if (rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)) {
    for (const [key, val] of Object.entries(rawOverrides)) {
      if (!parseNoonDate(key) || !val || typeof val !== 'object') continue;
      const v = val as any;
      const isRestDay = Boolean(v.isRestDay);
      const workoutName = isRestDay
        ? REST_DAY_LABEL
        : v.workoutName
          ? String(v.workoutName).trim()
          : null;
      const parsedWId = Number(v.workoutId);
      const parsedPId = Number(v.programId);
      overrides[key] = {
        date: key,
        isRestDay,
        workoutId: !isRestDay && Number.isInteger(parsedWId) && parsedWId > 0 ? parsedWId : null,
        programId: !isRestDay && Number.isInteger(parsedPId) && parsedPId > 0 ? parsedPId : null,
        workoutName,
        programName: !isRestDay && v.programName ? String(v.programName).trim() : null,
        note: v.note !== undefined && v.note !== null && String(v.note).trim()
          ? String(v.note).trim()
          : null,
      };
    }
  }

  return {
    userId: userId ?? (raw?.userId !== undefined && raw?.userId !== null ? Number(raw.userId) : null),
    weeklySchedule: MONDAY_FIRST_DAYS.map((d) => byDay.get(d.dayOfWeek)!),
    overrides,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

/**
 * Picks which workout from an alternating pool should run on targetDateStr
 * by inspecting past workout_sessions and selecting the least recently performed candidate.
 */
export function resolveAlternatingWorkout(
  candidates: ScheduledWorkoutItem[],
  sessions: any[],
  targetDateStr?: string
): { selected: ScheduledWorkoutItem | null; lastCompletedName: string | null } {
  const validCandidates = (candidates || []).filter((c) => Boolean(c?.workoutName));
  if (validCandidates.length === 0) {
    return { selected: null, lastCompletedName: null };
  }
  if (validCandidates.length === 1) {
    return { selected: validCandidates[0], lastCompletedName: null };
  }

  const realSessions = (sessions || []).filter(isRealWorkoutSession);

  // If one of the candidates was already completed on targetDateStr, return it for that date
  if (targetDateStr) {
    const onDate = realSessions.filter((s) => getSessionLocalDate(s.startTime || s.createdAt) === targetDateStr);
    for (const s of onDate) {
      const matched = validCandidates.find((c) => doesSessionMatchCandidate(s, c));
      if (matched) {
        return { selected: matched, lastCompletedName: matched.workoutName };
      }
    }
  }

  // Only inspect sessions strictly before targetDateStr (if provided) so past dates remain consistent
  const eligibleSessions = targetDateStr
    ? realSessions.filter((s) => {
        const sd = getSessionLocalDate(s.startTime || s.createdAt);
        return sd !== '' && sd < targetDateStr;
      })
    : realSessions;

  // Never let an ambiguous program-only match claim multiple alternating workouts from the same program
  const programIdCounts = new Map<number, number>();
  for (const c of validCandidates) {
    if (c.programId) {
      programIdCounts.set(c.programId, (programIdCounts.get(c.programId) || 0) + 1);
    }
  }

  let mostRecentGlobalTs = 0;
  let lastCompletedName: string | null = null;

  const candidateLastTs = validCandidates.map((candidate) => {
    const allowProgramFallback = !candidate.programId || (programIdCounts.get(candidate.programId) || 0) <= 1;
    let latestTs = 0;
    for (const s of eligibleSessions) {
      if (doesSessionMatchCandidate(s, candidate, allowProgramFallback)) {
        const ts = getSessionTimestamp(s);
        if (ts > 0 && ts >= latestTs) {
          latestTs = ts;
        }
        if (ts > 0 && ts > mostRecentGlobalTs) {
          mostRecentGlobalTs = ts;
          lastCompletedName = candidate.workoutName;
        }
      }
    }
    return { candidate, latestTs };
  });

  // Never completed (latestTs === 0) or oldest completed goes next
  candidateLastTs.sort((a, b) => a.latestTs - b.latestTs);

  return {
    selected: candidateLastTs[0]?.candidate || validCandidates[0],
    lastCompletedName,
  };
}

export function resolveCalendarDay(
  dateStr: string,
  schedule: UserWorkoutSchedule,
  sessions: any[] = [],
  completions: any[] = [],
  todayStr: string = getLocalDateString(new Date()),
  currentMonth?: number
): ResolvedCalendarDay {
  const resolvedYmd = getLocalDateString(dateStr) || todayStr;
  const parsed = parseNoonDate(resolvedYmd) || parseNoonDate(todayStr) || new Date();
  const normalizedDate = parseNoonDate(resolvedYmd) ? resolvedYmd : getLocalDateString(parsed);
  const dayOfWeek = parsed.getDay();
  const dayMeta = DAY_META_BY_INDEX.get(dayOfWeek) || { label: 'Pazartesi', short: 'Pzt' };

  const isToday = normalizedDate === todayStr;
  const isPast = normalizedDate < todayStr;
  const isFuture = normalizedDate > todayStr;
  const isCurrentMonth =
    currentMonth !== undefined ? parsed.getMonth() === currentMonth : true;

  const realSessions = (sessions || []).filter(isRealWorkoutSession);
  const completedSessions = realSessions.filter(
    (s) => (getSessionLocalDate(s.startTime || s.createdAt)) === normalizedDate
  );

  const sessionIds = new Set(completedSessions.map((s) => Number(s.id)).filter((id) => !Number.isNaN(id)));
  const dayCompletions = (completions || []).filter((c) => {
    if (c?.sessionId !== undefined && c?.sessionId !== null && sessionIds.has(Number(c.sessionId))) {
      return true;
    }
    const cd = getSessionLocalDate(c?.completedAt || c?.createdAt);
    return cd === normalizedDate;
  });

  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  for (const c of dayCompletions) {
    const { sets, reps, volume } = calculateCompletionVolume(c);
    totalVolumeKg += volume;
    totalSets += sets > 0 ? sets : 0;
    totalReps += sets > 0 ? sets * reps : reps;
  }

  if (totalSets === 0 && totalReps === 0) {
    for (const s of completedSessions) {
      totalSets += Number(s?.total_sets) || 0;
      totalReps += Number(s?.total_reps) || 0;
    }
  }

  const totalDurationMinutes = completedSessions.reduce(
    (sum, s) => sum + parseDurationToMinutes(s?.duration),
    0
  );

  const override = schedule?.overrides?.[normalizedDate];
  const weekdayRule = schedule?.weeklySchedule?.find((d) => d.dayOfWeek === dayOfWeek);

  let isOverride = false;
  let isRestDay = true;
  let isAlternating = false;
  let alternatingPool: ScheduledWorkoutItem[] = [];
  let plannedWorkout: ScheduledWorkoutItem | null = null;
  let note: string | null = null;

  if (override) {
    isOverride = true;
    isRestDay = Boolean(override.isRestDay);
    note = override.note ? String(override.note).trim() : null;
    if (!isRestDay && override.workoutName) {
      plannedWorkout = {
        workoutId: override.workoutId ?? null,
        programId: override.programId ?? null,
        workoutName: override.workoutName,
        programName: override.programName ?? null,
      };
    }
  } else if (weekdayRule) {
    note = weekdayRule.note ? String(weekdayRule.note).trim() : null;
    alternatingPool = (weekdayRule.workouts || []).filter((w) => Boolean(w?.workoutName));
    isRestDay = Boolean(weekdayRule.isRestDay) || alternatingPool.length === 0;
    if (!isRestDay && alternatingPool.length > 0) {
      isAlternating = Boolean(weekdayRule.isAlternating) && alternatingPool.length > 1;
      if (isAlternating) {
        plannedWorkout = resolveAlternatingWorkout(
          alternatingPool,
          realSessions,
          normalizedDate
        ).selected;
      } else {
        plannedWorkout = alternatingPool[0];
      }
    }
  }

  let status: CalendarDayStatus;
  let statusLabel: string;

  if (completedSessions.length > 0) {
    status = 'completed';
    statusLabel = 'Tamamlandı';
  } else if (isRestDay) {
    status = isToday ? 'today_rest' : 'rest';
    statusLabel = REST_DAY_LABEL;
  } else if (isToday) {
    status = 'today_planned';
    statusLabel = 'Bugünün Planı';
  } else if (isFuture) {
    status = 'planned';
    statusLabel = 'Planlandı';
  } else {
    status = 'missed';
    statusLabel = 'Tamamlanmadı';
  }

  return {
    date: normalizedDate,
    dayNumber: parsed.getDate(),
    dayOfWeek,
    dayLabel: dayMeta.label,
    dayShort: dayMeta.short,
    isCurrentMonth,
    isToday,
    isPast,
    isFuture,
    status,
    statusLabel,
    isRestDay,
    isOverride,
    isAlternating,
    plannedWorkout,
    alternatingPool,
    note,
    completedSessions,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalDurationMinutes,
    totalSets,
    totalReps,
  };
}

/**
 * Returns 7 days (Pazartesi -> Pazar) covering referenceDateStr.
 */
export function getWeekCalendarDays(
  referenceDateStr: string,
  schedule: UserWorkoutSchedule,
  sessions: any[] = [],
  completions: any[] = [],
  todayStr: string = getLocalDateString(new Date())
): ResolvedCalendarDay[] {
  const ref = parseNoonDate(referenceDateStr) || parseNoonDate(todayStr) || new Date();
  const mondayOffset = getMondayFirstDayIndex(ref); // 0 if Monday, 6 if Sunday
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - mondayOffset);

  const days: ResolvedCalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ymd = formatYmdFromLocal(d);
    days.push(resolveCalendarDay(ymd, schedule, sessions, completions, todayStr));
  }
  return days;
}

/**
 * Returns a 6x7 (42 cells) Monday-first month calendar grid.
 */
export function getMonthCalendarDays(
  year: number,
  monthZeroIndexed: number,
  schedule: UserWorkoutSchedule,
  sessions: any[] = [],
  completions: any[] = [],
  todayStr: string = getLocalDateString(new Date())
): ResolvedCalendarDay[] {
  const firstOfMonth = new Date(year, monthZeroIndexed, 1, 12, 0, 0);
  const mondayOffset = getMondayFirstDayIndex(firstOfMonth);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - mondayOffset);

  const cells: ResolvedCalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const ymd = formatYmdFromLocal(d);
    cells.push(
      resolveCalendarDay(ymd, schedule, sessions, completions, todayStr, monthZeroIndexed)
    );
  }
  return cells;
}

export function calculateWeeklyAdherence(
  referenceDateStr: string,
  schedule: UserWorkoutSchedule,
  sessions: any[] = []
): {
  plannedCount: number;
  completedCount: number;
  completionPercent: number;
  completedSessionsThisWeek: number;
  summaryText: string;
} {
  const weekDays = getWeekCalendarDays(referenceDateStr, schedule, sessions, [], referenceDateStr);
  const plannedCount = weekDays.filter((d) => !d.isRestDay).length;
  const completedCount = weekDays.filter((d) => d.completedSessions.length > 0).length;
  const completedSessionsThisWeek = weekDays.reduce(
    (sum, d) => sum + d.completedSessions.length,
    0
  );

  const completionPercent =
    plannedCount > 0
      ? Math.min(100, Math.round((completedCount / plannedCount) * 100))
      : completedCount > 0
        ? 100
        : 0;

  const summaryText =
    plannedCount > 0
      ? `Bu Hafta: ${completedCount}/${plannedCount} Antrenman Tamamlandı`
      : `Bu Hafta: ${completedCount} Antrenman Tamamlandı`;

  return {
    plannedCount,
    completedCount,
    completionPercent,
    completedSessionsThisWeek,
    summaryText,
  };
}

export function getSmartTodayAndNextRecommendation(
  todayStr: string,
  schedule: UserWorkoutSchedule,
  sessions: any[] = [],
  _programs: any[] = []
): {
  todayDay: ResolvedCalendarDay;
  nextWorkout: ScheduledWorkoutItem | null;
  nextWorkoutDayLabel: string;
  recommendationReason: string;
} {
  const todayDay = resolveCalendarDay(todayStr, schedule, sessions, [], todayStr);

  // 1. If today has an uncompleted planned workout, suggest it immediately
  if (!todayDay.isRestDay && todayDay.plannedWorkout && todayDay.completedSessions.length === 0) {
    let reason = 'Bugünkü haftalık planına göre sıradaki antrenman';
    if (todayDay.isOverride) {
      reason = 'Bugün için seçtiğin özel plan';
    } else if (todayDay.isAlternating) {
      const alt = resolveAlternatingWorkout(todayDay.alternatingPool, sessions, todayStr);
      reason = alt.lastCompletedName
        ? `Dönüşümlü plan · Son yapılan: ${alt.lastCompletedName}`
        : 'Dönüşümlü gün · İlk sıradaki antrenman';
    }
    return {
      todayDay,
      nextWorkout: todayDay.plannedWorkout,
      nextWorkoutDayLabel: 'Bugün',
      recommendationReason: reason,
    };
  }

  // 2. Otherwise inspect next 7 days in the fixed weekly schedule (never roll over missed past workouts onto today)
  const baseDate = parseNoonDate(todayStr) || new Date();
  for (let offset = 1; offset <= 7; offset++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    const ymd = formatYmdFromLocal(d);
    const resolved = resolveCalendarDay(ymd, schedule, sessions, [], todayStr);
    if (!resolved.isRestDay && resolved.plannedWorkout) {
      const dayLabel = offset === 1 ? 'Yarın' : resolved.dayLabel;
      const reason =
        todayDay.completedSessions.length > 0
          ? `Bugünkü antrenman tamamlandı · Sıradaki gün: ${dayLabel}`
          : todayDay.isRestDay
            ? `Bugün ${REST_DAY_LABEL} · Sıradaki planlı gün: ${dayLabel}`
            : `Planlanan sıradaki antrenman (${dayLabel})`;
      return {
        todayDay,
        nextWorkout: resolved.plannedWorkout,
        nextWorkoutDayLabel: dayLabel,
        recommendationReason: reason,
      };
    }
  }

  return {
    todayDay,
    nextWorkout: null,
    nextWorkoutDayLabel: REST_DAY_LABEL,
    recommendationReason: 'Haftalık planlayıcıdan antrenman günlerini tanımlayabilirsiniz.',
  };
}
