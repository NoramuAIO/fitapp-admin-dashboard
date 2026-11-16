export const ISTANBUL_TZ = 'Europe/Istanbul';

/**
 * Normalizes timezone-naive ISO timestamps returned by Postgres `timestamp without time zone`
 * columns (which store UTC values without a trailing `Z`) into explicit UTC ISO strings.
 */
export function normalizeUtcTimestamp(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed)) {
    return trimmed.replace(' ', 'T') + 'Z';
  }
  return trimmed;
}

/**
 * Converts a JS Date.getDay() into Monday-first index (0=Monday..6=Sunday) in Europe/Istanbul.
 */
export function getMondayFirstDayIndex(date: Date): number {
  const shortDay = new Intl.DateTimeFormat('en-US', {
    timeZone: ISTANBUL_TZ,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[shortDay] ?? (date.getDay() + 6) % 7;
}

function isValidCalendarYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseLocaleFiniteNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(',', '.');
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const MANUAL_TIMER_CATEGORIES = new Set(['duration', 'timer', 'manual', 'set']);
const MANUAL_TIMER_NAMES = new Set([
  'Serbest Süre',
  'Manuel Süre',
  'Serbest Antrenman',
  'Salonda Geçirilen Vakit',
  'Süre Takibi',
  'Antreman Süresi',
  'Set Süresi',
]);

export const MUSCLE_COLORS = [
  '#4ECDC4',
  '#9B6FFF',
  '#FF6B4A',
  '#5DD97C',
  '#FFD700',
  '#FF6B9D',
  '#38BDF8',
];

// Specific compound rules must come before broad single-word terms to prevent misclassifications
const MUSCLE_KEYWORDS: Array<{ group: string; terms: string[] }> = [
  { group: 'Karın', terms: ['crunch', 'plank', 'abs', 'core', 'sit up', 'russian twist', 'leg raise', 'knee raise', 'karın', 'mekik'] },
  { group: 'Omuz', terms: ['lateral raise', 'side raise', 'front raise', 'rear delt', 'face pull', 'shoulder press', 'overhead press', 'military press', 'arnold press', 'ohp', 'shoulder', 'overhead', 'arnold', 'omuz'] },
  { group: 'Kol', terms: ['incline dumbbell curl', 'incline curl', 'hammer curl', 'preacher curl', 'reverse curl', 'tricep extension', 'overhead extension', 'triceps pushdown', 'triceps push-down', 'rope pushdown', 'curl', 'bicep', 'biceps', 'tricep', 'triceps', 'hammer', 'pushdown', 'push-down', 'skullcrusher', 'preacher', 'kol'] },
  { group: 'Bacak', terms: ['leg extension', 'leg curl', 'leg press', 'hip thrust', 'romanian deadlift', 'stiff leg deadlift', 'squat', 'lunge', 'calf', 'hamstring', 'quad', 'glute', 'rdl', 'bacak', 'kalf', 'kalça', 'leg'] },
  { group: 'Göğüs', terms: ['bench press', 'incline chest', 'chest press', 'pec deck', 'chest fly', 'bench', 'chest', 'pec', 'fly', 'incline', 'decline', 'push up', 'pushup', 'göğüs', 'dip', 'dips'] },
  { group: 'Sırt', terms: ['lat pulldown', 'barbell row', 'dumbbell row', 'cable row', 'seated row', 'pull up', 'pullup', 'chin up', 'chinup', 'deadlift', 'pulldown', 'shrug', 'row', 'pull', 'lat', 'back', 'sırt', 'kanat', 'barfiks'] },
  { group: 'Kardiyo', terms: ['koşu', 'run', 'running', 'treadmill', 'bisiklet', 'bike', 'cycling', 'cardio', 'kardiyo', 'ip atlama', 'jump rope', 'jumping jack', 'hiit', 'kürek', 'rowing', 'yürüyüş', 'walk', 'walking'] },
];

export const DEFAULT_ATHLETE_RANKS = [
  { id: 1, title: 'Demir Çırağı', icon: '⚡', color: '#5DD97C', min_volume_kg: 0, max_volume_kg: 300, description: 'İlk antrenmanlarını yapan hevesli sporcu' },
  { id: 2, title: 'Bronz Kaldırıcı', icon: '🥉', color: '#FF6B4A', min_volume_kg: 300, max_volume_kg: 1000, description: 'Temel hareketlerde düzenli efor gösteren sporcu' },
  { id: 3, title: 'Gümüş Güç', icon: '🥈', color: '#9B6FFF', min_volume_kg: 1000, max_volume_kg: 2500, description: 'Disiplinli çalışan ve kuvvetlenen sporcu' },
  { id: 4, title: 'Altın Titan', icon: '🥇', color: '#F59E0B', min_volume_kg: 2500, max_volume_kg: 5000, description: 'Salonda iz bırakan ağır ve kararlı kaldırıcı' },
  { id: 5, title: 'Platin Gladyatör', icon: '💎', color: '#4ECDC4', min_volume_kg: 5000, max_volume_kg: 10000, description: 'Gelişmiş kuvvet, kondisyon ve kas hakimiyeti' },
  { id: 6, title: 'Elit Şampiyon', icon: '🔥', color: '#FF6B9D', min_volume_kg: 10000, max_volume_kg: 20000, description: 'Zirveye oynayan profesyonel sporcu' },
  { id: 7, title: 'Efsanevi Titan', icon: '🏆', color: '#FFD700', min_volume_kg: 20000, max_volume_kg: 50000, description: 'Efsaneleşmiş demir büken usta' },
];

/**
 * Formats a Date or ISO timestamp into YYYY-MM-DD in Europe/Istanbul timezone.
 * Preserves pure YYYY-MM-DD strings without timezone shift.
 */
export function getLocalDateString(dateInput?: Date | string | null): string {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return isValidCalendarYmd(trimmed) ? trimmed : '';
    }
    const normalized = normalizeUtcTimestamp(trimmed) || trimmed;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: ISTANBUL_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(parsed);
    }
    const prefix = trimmed.slice(0, 10);
    return isValidCalendarYmd(prefix) ? prefix : '';
  }

  if (dateInput === undefined || dateInput === null) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ISTANBUL_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ISTANBUL_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateInput);
  }

  return '';
}

/**
 * Extracts HH:MM time in Europe/Istanbul from an ISO/datetime string.
 * Returns null if the string has no time component (e.g. date-only YYYY-MM-DD).
 */
export function extractLocalTimeString(dateInput?: string | null): string | null {
  if (!dateInput) return null;
  const trimmed = String(dateInput).trim();
  if (trimmed.length <= 10 || (!trimmed.includes('T') && !trimmed.includes(':'))) {
    return null;
  }

  const normalized = normalizeUtcTimestamp(trimmed) || trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);

  return formatted.startsWith('24:') ? `00:${formatted.slice(3)}` : formatted;
}

/**
 * Parses duration labels like "1s 30dk", "2 sa 15 dk", "45 min", "1h 15m", or plain numbers into minutes.
 */
export function parseDurationToMinutes(dur?: string | null): number {
  if (!dur) return 0;
  const trimmed = String(dur).trim();
  if (!trimmed) return 0;

  const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10);
    const m = parseInt(hmsMatch[2], 10);
    const s = hmsMatch[3] ? parseInt(hmsMatch[3], 10) : 0;
    return h * 60 + m + Math.round(s / 60);
  }

  let totalMinutes = 0;
  let matchedUnit = false;

  const secsNamedMatch = trimmed.match(/(\d+)\s*(?:saniye|sn|secs?|seconds?)(?![a-zçğıöşü])/i);
  const minsMatch = trimmed.match(/(\d+)\s*(?:dakika|dk|minutes?|mins?|m)(?![a-zçğıöşü])/i);
  const secsAfterMinMatch = minsMatch
    ? trimmed.match(/(?:\d+\s*(?:dakika|dk|minutes?|mins?|m)\s*)(\d+)\s*s(?![a-zçğıöşü])/i)
    : null;
  const secsMatch = secsNamedMatch || secsAfterMinMatch;

  const hoursMatch =
    trimmed.match(/(\d+)\s*(?:saat|hours?|hrs?|sa|h)(?![a-zçğıöşü])/i) ||
    (!secsMatch ? trimmed.match(/(\d+)\s*s(?![a-zçğıöşü])/i) : null);

  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    matchedUnit = true;
  }
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1], 10);
    matchedUnit = true;
  }
  if (secsMatch) {
    totalMinutes += Math.round(parseInt(secsMatch[1], 10) / 60);
    matchedUnit = true;
  }

  if (!matchedUnit) {
    const numMatch = trimmed.match(/(\d+)/);
    if (numMatch) {
      totalMinutes += parseInt(numMatch[1], 10);
    }
  }

  return Number.isNaN(totalMinutes) ? 0 : Math.max(0, totalMinutes);
}

export function formatMinutesTurkish(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours > 0 && mins > 0) return `${hours}s ${mins}dk`;
  if (hours > 0) return `${hours}s`;
  return `${mins}dk`;
}

export function isManualTimerSession(s: any): boolean {
  if (!s) return false;
  if (Boolean(s.is_manual_timer)) return true;
  const cat = String(s.category || '').toLowerCase().trim();
  if (MANUAL_TIMER_CATEGORIES.has(cat)) return true;
  const pName = String(s.program_name || s.programName || '').trim();
  const wName = String(s.workout_name || s.workoutName || '').trim();
  if (MANUAL_TIMER_NAMES.has(pName) || MANUAL_TIMER_NAMES.has(wName)) return true;
  return false;
}

export function isRealWorkoutSession(s: any): boolean {
  if (!s) return false;
  return !isManualTimerSession(s);
}

/**
 * Epley 1RM estimation (caps effective reps at 12 to avoid high-rep endurance inflation).
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0 || !Number.isFinite(weight)) return 0;
  if (!reps || reps <= 1) return Math.round(weight);
  const effectiveReps = Math.min(reps, 12);
  return Math.round(weight * (1 + effectiveReps / 30));
}

export function calculateCompletionVolume(c: any): {
  weight: number;
  sets: number;
  reps: number;
  volume: number;
} {
  let weight = Math.max(0, parseLocaleFiniteNumber(c?.weight_kg ?? c?.actualWeight ?? c?.weight));
  let sets = Math.max(0, parseLocaleFiniteNumber(c?.sets));
  let reps = Math.max(0, parseLocaleFiniteNumber(c?.reps));

  if (Array.isArray(c?.setsDetail) && c.setsDetail.length > 0) {
    let setVolume = 0;
    let maxSetWeight = 0;
    let sumReps = 0;
    for (const s of c.setsDetail) {
      const sw = Math.max(0, parseLocaleFiniteNumber(s?.weight_kg ?? s?.weight));
      const sr = Math.max(0, parseLocaleFiniteNumber(s?.reps));
      setVolume += sw * sr;
      if (sw > maxSetWeight) maxSetWeight = sw;
      sumReps += sr;
    }
    if (weight <= 0 && maxSetWeight > 0) weight = maxSetWeight;
    if (sets <= 0) sets = c.setsDetail.length;
    if (reps <= 0 && sumReps > 0) reps = Math.round(sumReps / c.setsDetail.length);
    return { weight, sets, reps, volume: Math.max(0, setVolume) };
  }

  return {
    weight,
    sets,
    reps,
    volume: Math.max(0, weight * reps * sets),
  };
}

export interface ExercisePRRecord {
  key: string;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  maxWeight: number;
  repsAtMax: number;
  setsAtMax: number;
  estimated1RM: number;
  bestSessionVolume: number;
  date: string;
  history: Array<{
    date: string;
    weight: number;
    reps: number;
    sets: number;
    volume: number;
    estimated1RM: number;
  }>;
}

export function calculateExercisePRs(
  completions: any[],
  exercisesMap?: Map<number, string>
): ExercisePRRecord[] {
  const prMap: Record<string, ExercisePRRecord> = {};

  for (const c of completions || []) {
    const rawName =
      c?.exercises?.name ||
      c?.exerciseName ||
      (c?.exerciseId && exercisesMap?.get(Number(c.exerciseId))) ||
      (c?.exerciseId ? `Hareket #${c.exerciseId}` : 'Hareket');
    const displayName = String(rawName).trim();
    const key = displayName.toLowerCase();

    const { weight, sets, reps, volume } = calculateCompletionVolume(c);
    if (weight <= 0) continue;

    const est1RM = calculateEstimated1RM(weight, reps > 0 ? reps : 1);
    const completedAt = String(c?.completedAt || c?.createdAt || '');
    const muscleGroup = inferMuscleGroup(displayName, c?.muscleGroup || c?.exercises?.muscleGroup);

    const existing = prMap[key];
    const isBetterPR =
      !existing ||
      weight > existing.maxWeight ||
      (weight === existing.maxWeight &&
        (est1RM > existing.estimated1RM || reps > existing.repsAtMax));

    if (!existing) {
      prMap[key] = {
        key,
        exerciseId: Number(c?.exerciseId) || 0,
        exerciseName: displayName,
        muscleGroup,
        maxWeight: weight,
        repsAtMax: reps,
        setsAtMax: sets,
        estimated1RM: est1RM,
        bestSessionVolume: volume,
        date: completedAt,
        history: [
          {
            date: completedAt,
            weight,
            reps,
            sets,
            volume,
            estimated1RM: est1RM,
          },
        ],
      };
    } else {
      existing.history.push({
        date: completedAt,
        weight,
        reps,
        sets,
        volume,
        estimated1RM: est1RM,
      });
      existing.bestSessionVolume = Math.max(existing.bestSessionVolume, volume);
      if (isBetterPR) {
        existing.maxWeight = weight;
        existing.repsAtMax = reps;
        existing.setsAtMax = sets;
        existing.estimated1RM = est1RM;
        existing.date = completedAt;
        existing.exerciseName = displayName;
        if (existing.muscleGroup === 'Genel' && muscleGroup !== 'Genel') {
          existing.muscleGroup = muscleGroup;
        }
      }
    }
  }

  return Object.values(prMap).sort(
    (a, b) => b.maxWeight - a.maxWeight || b.estimated1RM - a.estimated1RM
  );
}

function matchesKeywordBoundary(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, 'iu');
  return pattern.test(text);
}

export function inferMuscleGroup(
  exerciseName?: string | null,
  rawMuscleGroup?: string | null
): string {
  const cleaned = String(rawMuscleGroup || '').trim();
  if (cleaned && cleaned.toLowerCase() !== 'genel') {
    return cleaned;
  }

  const lower = String(exerciseName || '').trim().toLowerCase();
  if (!lower) return 'Genel';
  for (const rule of MUSCLE_KEYWORDS) {
    if (rule.terms.some((term) => matchesKeywordBoundary(lower, term))) {
      return rule.group;
    }
  }
  return 'Genel';
}

export function calculateMuscleDistribution(completions: any[]): Array<{
  group: string;
  count: number;
  volume: number;
  percent: number;
  color: string;
}> {
  const map: Record<string, { count: number; volume: number }> = {};
  let totalSets = 0;

  for (const c of completions || []) {
    const name = c?.exercises?.name || c?.exerciseName || '';
    const resolved = inferMuscleGroup(name, c?.muscleGroup || c?.exercises?.muscleGroup);
    const group = resolved && resolved !== 'Genel' ? resolved : 'Tüm Vücut';
    const { sets, volume } = calculateCompletionVolume(c);
    const safeSets = sets > 0 ? sets : 1;

    if (!map[group]) {
      map[group] = { count: 0, volume: 0 };
    }
    map[group].count += safeSets;
    map[group].volume += volume;
    totalSets += safeSets;
  }

  return Object.entries(map)
    .map(([group, val], idx) => ({
      group,
      count: val.count,
      volume: Math.round(val.volume),
      percent: totalSets > 0 ? Math.round((val.count / totalSets) * 100) : 0,
      color: MUSCLE_COLORS[idx % MUSCLE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculateWorkoutCalories(
  durationMinutes: number,
  totalVolumeKg: number,
  totalSets: number,
  userWeightKg = 75,
  totalReps = 0
): number {
  const safeWeight = userWeightKg > 30 && userWeightKg < 250 ? userWeightKg : 75;
  const safeMins = Math.max(0, Number(durationMinutes) || 0);
  const safeVol = Math.max(0, Number(totalVolumeKg) || 0);
  const safeSets = Math.max(0, Number(totalSets) || 0);
  const safeReps = Math.max(0, Number(totalReps) || 0);

  if (safeMins === 0 && safeSets === 0 && safeReps === 0) return 0;

  let met = 5.0;
  if (safeMins > 0 && safeSets > 0) {
    const setsPerHour = (safeSets / safeMins) * 60;
    if (setsPerHour >= 18 || safeVol >= 3000) {
      met = 6.0;
    } else if (setsPerHour >= 12) {
      met = 5.5;
    }
  } else if (safeReps > 0 && safeVol > 1000) {
    met = 5.5;
  }

  const effectiveMinutes =
    safeMins > 0
      ? safeMins
      : safeSets > 0
        ? Math.max(safeSets * 2.2, safeReps * 0.35)
        : safeReps * 0.35;

  const kcalFromTime = ((met * 3.5 * safeWeight) / 200) * effectiveMinutes;
  const volumeBonus = Math.min(safeVol * 0.008, kcalFromTime * 0.25);

  return Math.max(1, Math.round(kcalFromTime + volumeBonus));
}

export function calculateAthleteRank(
  totalVolumeKg: number,
  ranks: any[] = DEFAULT_ATHLETE_RANKS
): {
  title: string;
  icon: string;
  color: string;
  currentVolume: number;
  min: number;
  nextTarget: number;
  nextTitle: string | null;
  pct: number;
  description: string;
} {
  const source = Array.isArray(ranks) && ranks.length > 0 ? ranks : DEFAULT_ATHLETE_RANKS;
  const sorted = [...source].sort(
    (a, b) => (Number(a.min_volume_kg) || 0) - (Number(b.min_volume_kg) || 0)
  );

  let currentIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (totalVolumeKg >= (Number(sorted[i].min_volume_kg) || 0)) {
      currentIdx = i;
    }
  }

  const current = sorted[currentIdx];
  const next = sorted[currentIdx + 1] || null;
  const min = Number(current.min_volume_kg) || 0;
  const max = Number(current.max_volume_kg) || (next ? Number(next.min_volume_kg) : min + 1000);
  const span = Math.max(1, max - min);
  const progressInTier = Math.max(0, totalVolumeKg - min);
  const pct = Math.min(100, Math.round((progressInTier / span) * 100));

  return {
    title: current.title,
    icon: current.icon || '⚡',
    color: current.color || '#5DD97C',
    currentVolume: Math.round(totalVolumeKg),
    min,
    nextTarget: max,
    nextTitle: next ? next.title : null,
    pct,
    description: current.description || '',
  };
}

export interface WeightGoalMetrics {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  progressPercent: number;
  remainingKg: number;
  isLossGoal: boolean;
}

export function stripGoalMetadataTags(description?: string | null): string {
  if (!description) return '';
  return String(description).replace(/\[START:[^\]]+\]/gi, '').trim();
}

export function parseStartValueTag(description?: string | null): number | null {
  if (!description) return null;
  const match = String(description).match(/\[START:([0-9]+(?:[.,][0-9]+)?)\]/i);
  if (!match) return null;
  const parsed = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculateWeightGoalMetrics(
  goal: {
    targetValue: number;
    currentValue: number;
    startValue?: number | null;
    unit?: string;
    startDate?: string | null;
    createdAt?: string | null;
    description?: string | null;
  },
  weightLogs: Array<{ date?: string; weight: number | string; id?: number }> = []
): WeightGoalMetrics {
  const sortedLogs = [...(weightLogs || [])]
    .map((l) => ({
      date: l.date ? getLocalDateString(l.date) : '',
      weight: parseLocaleFiniteNumber(l.weight),
      id: Number(l.id) || 0,
    }))
    .filter((l) => l.date !== '' && Number.isFinite(l.weight) && l.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  const latestLog = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1] : null;
  const targetWeight = Number(goal.targetValue) || 0;
  const currentWeight = latestLog ? latestLog.weight : Number(goal.currentValue) || 0;

  // Resolve baseline start weight priority: explicit goal.startValue -> [START:x] tag -> log on/before startDate -> oldest log -> currentValue
  const explicitStart =
    goal.startValue !== undefined && goal.startValue !== null && Number(goal.startValue) > 0
      ? Number(goal.startValue)
      : parseStartValueTag(goal.description);

  let startWeight = explicitStart || 0;
  if (!startWeight && sortedLogs.length > 0) {
    const goalStartDate = goal.startDate ? getLocalDateString(goal.startDate) : null;
    if (goalStartDate) {
      const logsBeforeOrOn = sortedLogs.filter((l) => l.date <= goalStartDate);
      if (logsBeforeOrOn.length > 0) {
        startWeight = logsBeforeOrOn[logsBeforeOrOn.length - 1].weight;
      } else {
        const logsAfter = sortedLogs.filter((l) => l.date >= goalStartDate);
        startWeight = logsAfter.length > 0 ? logsAfter[0].weight : sortedLogs[0].weight;
      }
    } else {
      startWeight = sortedLogs[0].weight;
    }
  }
  if (!startWeight) {
    startWeight = Number(goal.currentValue) || currentWeight;
  }

  let progressPercent = 0;
  if (targetWeight > 0 && currentWeight > 0) {
    if (Math.abs(targetWeight - startWeight) < 0.01) {
      progressPercent = Math.abs(currentWeight - targetWeight) <= 0.5 ? 100 : 0;
    } else if (Math.abs(currentWeight - targetWeight) <= 0.2) {
      progressPercent = 100;
    } else {
      const rawRatio = (currentWeight - startWeight) / (targetWeight - startWeight);
      const clamped = Math.max(0, Math.min(1, rawRatio));
      progressPercent = Math.round(clamped * 100);
    }
  }

  return {
    startWeight: Number(startWeight.toFixed(1)),
    currentWeight: Number(currentWeight.toFixed(1)),
    targetWeight: Number(targetWeight.toFixed(1)),
    progressPercent,
    remainingKg: Number(Math.abs(targetWeight - currentWeight).toFixed(1)),
    isLossGoal: targetWeight < startWeight,
  };
}

export function calculateGoalProgressPercent(
  goal: {
    targetValue: number;
    currentValue: number;
    startValue?: number | null;
    unit?: string;
    startDate?: string | null;
    createdAt?: string | null;
    description?: string | null;
  },
  weightLogs: Array<{ date?: string; weight: number | string; id?: number }> = []
): number {
  const unit = String(goal.unit || '').trim().toLowerCase();
  if (unit === 'kg') {
    return calculateWeightGoalMetrics(goal, weightLogs).progressPercent;
  }

  const target = Number(goal.targetValue) || 0;
  const current = Number(goal.currentValue) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}
