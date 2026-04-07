import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { QUESTIONS_DATA_VERSION } from './questionsDataVersion';

/** Αποθήκευση: id → τελευταία χρήση (ms). Παλιό v1 array αγνοείται. */
const STORAGE_KEY = 'quizaki_question_last_used_v2';
const LEGACY_STORAGE_KEY = 'quizaki_global_used_question_ids_v1';
/** Συγχρονίζεται με την έκδοση που παράγει το import:questions — αν αλλάξει, reset rotation. */
const DATA_VERSION_KEY = 'quizaki_questions_data_version';

/** 7 ημέρες — μετά η ερώτηση ξανά επιλέξιμη. */
export const QUESTION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** id → timestamp (ms) τελευταίας χρήσης σε deck */
let lastUsedAt = new Map<string, number>();

function pruneExpired(now: number): void {
  const cutoff = now - QUESTION_COOLDOWN_MS;
  for (const [id, ts] of lastUsedAt) {
    if (ts < cutoff) lastUsedAt.delete(id);
  }
}

function applyDataVersionResetIfNeededSyncWeb(): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    const stored = localStorage.getItem(DATA_VERSION_KEY);
    if (stored === QUESTIONS_DATA_VERSION) return;
    lastUsedAt.clear();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(DATA_VERSION_KEY, QUESTIONS_DATA_VERSION);
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

function readWebLocalStorage(): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const m = new Map<string, number>();
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'number' && Number.isFinite(v)) m.set(String(k), v);
      }
      lastUsedAt = m;
    }
    pruneExpired(Date.now());
  } catch {
    // ignore
  }
}

if (Platform.OS === 'web') {
  applyDataVersionResetIfNeededSyncWeb();
  readWebLocalStorage();
}

/**
 * IDs που **ακόμα** βρίσκονται σε «παύση» (χρησιμοποιήθηκαν μέσα στις τελευταίες 7 ημέρες).
 */
export function getGlobalUsedQuestionIds(): Set<string> {
  const now = Date.now();
  pruneExpired(now);
  const out = new Set<string>();
  for (const [id, ts] of lastUsedAt) {
    if (now - ts < QUESTION_COOLDOWN_MS) out.add(id);
  }
  return out;
}

export function addGlobalUsedQuestionIds(ids: string[]): void {
  const now = Date.now();
  for (const id of ids) {
    lastUsedAt.set(id, now);
  }
  pruneExpired(now);
  void persistLastUsed();
}

/** Έκτακτο: άδειασμα cooldown (μόνο όταν αποτυγχάνει το χτίσιμο deck). */
export function clearGlobalUsedQuestionIds(): void {
  lastUsedAt.clear();
  void persistLastUsed();
}

async function persistLastUsed(): Promise<void> {
  const now = Date.now();
  pruneExpired(now);
  const obj: Record<string, number> = {};
  for (const [id, ts] of lastUsedAt) {
    obj[id] = ts;
  }
  const payload = JSON.stringify(obj);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, payload);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, payload);
    }
  } catch {
    // ignore
  }
}

async function persistDataVersion(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(DATA_VERSION_KEY, QUESTIONS_DATA_VERSION);
    } else {
      await AsyncStorage.setItem(DATA_VERSION_KEY, QUESTIONS_DATA_VERSION);
    }
  } catch {
    // ignore
  }
}

export async function hydrateQuestionRotationFromStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    applyDataVersionResetIfNeededSyncWeb();
    readWebLocalStorage();
    return;
  }
  try {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    const storedVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== QUESTIONS_DATA_VERSION) {
      lastUsedAt.clear();
      await persistLastUsed();
      await persistDataVersion();
      return;
    }
  } catch {
    // ignore
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const m = new Map<string, number>();
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'number' && Number.isFinite(v)) m.set(String(k), v);
      }
      lastUsedAt = m;
    }
    pruneExpired(Date.now());
  } catch {
    // ignore
  }
}
