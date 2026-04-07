import type { CategoryChoice } from '../data/types';
import type { Difficulty, NormalizedQuestion } from '../data/types';

/** Ακέραιος στο [0, maxExclusive) — προτιμά `crypto.getRandomValues` για καλύτερη τυχαιότητα. */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const max = 0x100000000;
    const limit = Math.floor(max / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    let r = 0;
    do {
      c.getRandomValues(buf);
      r = buf[0]!;
    } while (r >= limit);
    return r % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Κανονικοποίηση κειμένου για σύγκριση «ίδιας» ερώτησης (διαφορετικά id στο CSV). */
export function questionTextFingerprint(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('el-GR');
}

function dedupeQuestionsById(questions: NormalizedQuestion[]): NormalizedQuestion[] {
  const seen = new Set<string>();
  const out: NormalizedQuestion[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

/** Μία εγγραφή ανά κείμενο — αποφεύγει διπλότυπα στον ίδιο γύρο/παίκτη. */
function dedupeQuestionsByFingerprint(questions: NormalizedQuestion[]): NormalizedQuestion[] {
  const seen = new Set<string>();
  const out: NormalizedQuestion[] = [];
  for (const q of questions) {
    const fp = questionTextFingerprint(q.text);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(q);
  }
  return out;
}

export type MatchTotalRounds = 1 | 2 | 3;

/**
 * Πόσες ερωτήσεις ανά δυσκολία για τον τρέχοντα γύρο, ανάλογα με τους συνολικούς γύρους αγώνα.
 * - 1 γύρος συνολικά: ~1/3 εύκολες, ~1/3 μεσαίες, ~1/3 δύσκολες
 * - 2 γύροι: γύρος 1 → 50% εύκολες + 50% μεσαίες · γύρος 2 → 50% μεσαίες + 50% δύσκολες
 * - 3 γύροι: γύρος 1 → 50% εύκολες + 50% μεσαίες · γύρος 2 → 50% μεσαίες + 50% δύσκολες · γύρος 3 → 100% δύσκολες
 */
export function difficultyCountsForRound(
  n: number,
  totalRounds: MatchTotalRounds,
  round: 1 | 2 | 3
): { easy: number; medium: number; hard: number } {
  if (n < 1) return { easy: 0, medium: 0, hard: 0 };
  if (totalRounds === 3) {
    if (round === 1) {
      const easy = Math.floor(n / 2);
      return { easy, medium: n - easy, hard: 0 };
    }
    if (round === 2) {
      const medium = Math.floor(n / 2);
      return { easy: 0, medium, hard: n - medium };
    }
    return { easy: 0, medium: 0, hard: n };
  }
  if (totalRounds === 2) {
    if (round === 1) {
      const easy = Math.floor(n / 2);
      return { easy, medium: n - easy, hard: 0 };
    }
    const medium = Math.floor(n / 2);
    return { easy: 0, medium, hard: n - medium };
  }
  const base = Math.floor(n / 3);
  const rem = n % 3;
  let easy = base;
  let medium = base;
  let hard = base;
  if (rem >= 1) easy++;
  if (rem === 2) medium++;
  return { easy, medium, hard };
}

function filterCategory(questions: NormalizedQuestion[], category: CategoryChoice): NormalizedQuestion[] {
  if (category === 'Όλες') return questions;
  return questions.filter((q) => q.category === category);
}

function isMultiple(q: NormalizedQuestion): boolean {
  return q.kind === 'multiple';
}

function isTrueFalse(q: NormalizedQuestion): boolean {
  return q.kind === 'truefalse';
}

function byDifficulty(pool: NormalizedQuestion[], d: Difficulty): NormalizedQuestion[] {
  return pool.filter((q) => q.difficulty === d);
}

/** ~50/50 MC/TF (με τυχαία κατανομή όταν το `need` είναι περιττό). */
function pickBalancedMcTf(
  poolMc: NormalizedQuestion[],
  poolTf: NormalizedQuestion[],
  need: number
): NormalizedQuestion[] {
  if (need <= 0) return [];
  let needMc = Math.floor(need / 2);
  let needTf = need - needMc;
  if (need % 2 === 1) {
    if (randomInt(2) === 1) {
      needMc += 1;
      needTf -= 1;
    }
  }
  const mc = shuffle(poolMc).slice(0, Math.min(needMc, poolMc.length));
  const tf = shuffle(poolTf).slice(0, Math.min(needTf, poolTf.length));
  let out: NormalizedQuestion[] = [...mc, ...tf];
  let deficit = need - out.length;
  if (deficit > 0) {
    const usedIds = new Set(out.map((q) => q.id));
    const usedFp = new Set(out.map((q) => questionTextFingerprint(q.text)));
    const rest = shuffle(
      [...poolMc, ...poolTf].filter(
        (q) => !usedIds.has(q.id) && !usedFp.has(questionTextFingerprint(q.text))
      )
    );
    for (const q of rest) {
      if (deficit <= 0) break;
      out.push(q);
      usedIds.add(q.id);
      usedFp.add(questionTextFingerprint(q.text));
      deficit--;
    }
  }
  return out;
}

export type BuildDeckOptions = {
  excludeIds?: ReadonlySet<string>;
  /**
   * Αποκλεισμός κατά **κείμενο** ερώτησης για τον τρέχοντα αγώνα (όλοι οι παίκτες).
   * Χρειάζεται όταν το dataset έχει πολλαπλά id με ίδιο κείμενο.
   */
  excludeQuestionFingerprints?: ReadonlySet<string>;
};

export type BuildDeckResult =
  | { ok: true; deck: NormalizedQuestion[] }
  | { ok: false; reason: string };

/**
 * Ουρά N ερωτήσεων (πολλαπλής + σωστό/λάθος), με κατανομή δυσκολίας ανά `totalRounds` / `round`.
 */
export function buildRoundDeck(
  all: NormalizedQuestion[],
  round: 1 | 2 | 3,
  totalRounds: MatchTotalRounds,
  category: CategoryChoice,
  n: number,
  options?: BuildDeckOptions
): BuildDeckResult {
  if (n < 1) return { ok: false, reason: 'Το πλήθος ερωτήσεων πρέπει να είναι ≥ 1' };

  let pool = filterCategory(all, category);
  const ex = options?.excludeIds;
  if (ex && ex.size > 0) {
    pool = pool.filter((q) => !ex.has(q.id));
    if (pool.length === 0) {
      return {
        ok: false,
        reason:
          'Δεν απομένουν νέες ερωτήσεις (όλες χρησιμοποιήθηκαν σε αυτόν τον αγώνα). Μείωσε ερωτήσεις/γύρους ή άλλαξε κατηγορία.',
      };
    }
  }

  pool = shuffle(pool);
  pool = dedupeQuestionsById(pool);

  const fpEx = options?.excludeQuestionFingerprints;
  if (fpEx && fpEx.size > 0) {
    pool = pool.filter((q) => !fpEx.has(questionTextFingerprint(q.text)));
    if (pool.length === 0) {
      return {
        ok: false,
        reason:
          'Δεν απομένουν νέες ερωτήσεις (ίδιο κείμενο με ήδη χρησιμοποιημένες σε αυτόν τον αγώνα). Μείωσε ερωτήσεις/γύρους ή άλλαξε κατηγορία.',
      };
    }
  }

  pool = shuffle(pool);
  pool = dedupeQuestionsByFingerprint(pool);

  pool = pool.filter((q) => isMultiple(q) || isTrueFalse(q));
  if (pool.length === 0) {
    return { ok: false, reason: 'Δεν υπάρχουν ερωτήσεις πολλαπλής επιλογής ή σωστού/λάθους για αυτό το φίλτρο.' };
  }

  pool = shuffle(pool);

  const counts = difficultyCountsForRound(n, totalRounds, round);
  const allowedDifficulties = new Set<Difficulty>();
  if (counts.easy > 0) allowedDifficulties.add('easy');
  if (counts.medium > 0) allowedDifficulties.add('medium');
  if (counts.hard > 0) allowedDifficulties.add('hard');

  const easyMc = shuffle(byDifficulty(pool, 'easy').filter(isMultiple));
  const easyTf = shuffle(byDifficulty(pool, 'easy').filter(isTrueFalse));
  const medMc = shuffle(byDifficulty(pool, 'medium').filter(isMultiple));
  const medTf = shuffle(byDifficulty(pool, 'medium').filter(isTrueFalse));
  const hardMc = shuffle(byDifficulty(pool, 'hard').filter(isMultiple));
  const hardTf = shuffle(byDifficulty(pool, 'hard').filter(isTrueFalse));

  const buckets: { mc: NormalizedQuestion[]; tf: NormalizedQuestion[]; need: number }[] = [
    { mc: easyMc, tf: easyTf, need: counts.easy },
    { mc: medMc, tf: medTf, need: counts.medium },
    { mc: hardMc, tf: hardTf, need: counts.hard },
  ].filter((b) => b.need > 0);
  shuffle(buckets);

  let deck: NormalizedQuestion[] = [];
  for (const b of buckets) {
    deck.push(...pickBalancedMcTf(b.mc, b.tf, b.need));
  }

  let deficit = n - deck.length;
  if (deficit > 0) {
    const usedIds = new Set(deck.map((q) => q.id));
    const usedFp = new Set(deck.map((q) => questionTextFingerprint(q.text)));
    const rest = shuffle(
      pool.filter(
        (q) =>
          allowedDifficulties.has(q.difficulty) &&
          !usedIds.has(q.id) &&
          !usedFp.has(questionTextFingerprint(q.text))
      )
    );
    for (const q of rest) {
      if (deficit <= 0) break;
      deck.push(q);
      usedIds.add(q.id);
      usedFp.add(questionTextFingerprint(q.text));
      deficit--;
    }
  }

  if (deck.length < n) {
    return {
      ok: false,
      reason: `Μόνο ${deck.length} ερωτήσεις διαθέσιμες (ζητήθηκαν ${n})`,
    };
  }

  deck = shuffle(deck.slice(0, n));
  return { ok: true, deck };
}
