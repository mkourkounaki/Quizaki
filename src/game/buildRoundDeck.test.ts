import { parseQuestionsCsv } from '../data/parseCsv';
import { QUIZAKI_CSV } from '../data/csvRaw';
import type { Difficulty } from '../data/types';
import {
  buildRoundDeck,
  difficultyCountsForRound,
  questionTextFingerprint,
} from './buildRoundDeck';

function countByDifficulty(deck: { difficulty: Difficulty }[]): Record<Difficulty, number> {
  const c: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const q of deck) c[q.difficulty]++;
  return c;
}

describe('difficultyCountsForRound', () => {
  it('1 συνολικός γύρος: κατανομή σε τρία ίσα μέρη (υπόλοιπο στα εύκολα)', () => {
    expect(difficultyCountsForRound(9, 1, 1)).toEqual({ easy: 3, medium: 3, hard: 3 });
    expect(difficultyCountsForRound(10, 1, 1)).toEqual({ easy: 4, medium: 3, hard: 3 });
  });

  it('2 συνολικοί γύροι: γύρος 1 μισό-μισό εύκολο/μεσαίο · γύρος 2 μισό-μισό μεσαίο/δύσκολο', () => {
    expect(difficultyCountsForRound(10, 2, 1)).toEqual({ easy: 5, medium: 5, hard: 0 });
    expect(difficultyCountsForRound(10, 2, 2)).toEqual({ easy: 0, medium: 5, hard: 5 });
  });

  it('3 συνολικοί γύροι: 1→εύκολο/μεσαίο · 2→μεσαίο/δύσκολο · 3→μόνο δύσκολες', () => {
    expect(difficultyCountsForRound(7, 3, 1)).toEqual({ easy: 3, medium: 4, hard: 0 });
    expect(difficultyCountsForRound(7, 3, 2)).toEqual({ easy: 0, medium: 3, hard: 4 });
    expect(difficultyCountsForRound(7, 3, 3)).toEqual({ easy: 0, medium: 0, hard: 7 });
  });
});

describe('buildRoundDeck', () => {
  const all = parseQuestionsCsv(QUIZAKI_CSV);

  it('φορτώνει μόνο πολλαπλής επιλογής και σωστό/λάθος (χωρίς regular)', () => {
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((q) => q.kind === 'multiple' || q.kind === 'truefalse')).toBe(true);
  });

  it('επιστρέφει N ερωτήσεις (1 συνολικός γύρος: μίξη δυσκολιών)', () => {
    const r = buildRoundDeck(all, 1, 1, 'Όλες', 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.deck.length).toBe(10);
  });

  it('αποτυγχάνει αν ζητήσουμε περισσότερες από διαθέσιμες', () => {
    const r = buildRoundDeck(all, 1, 1, 'Όλες', all.length + 100);
    expect(r.ok).toBe(false);
  });

  it('εξαιρεί ερωτήσεις με excludeIds', () => {
    const first = buildRoundDeck(all, 1, 1, 'Όλες', 5);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const exclude = new Set(first.deck.map((q) => q.id));
    const second = buildRoundDeck(all, 1, 1, 'Όλες', 5, { excludeIds: exclude });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    for (const q of second.deck) {
      expect(exclude.has(q.id)).toBe(false);
    }
  });

  it('2 συνολικοί γύροι, 2ος γύρος με excludeIds: χτίζει deck χωρίς επανάληψη id', () => {
    const first = buildRoundDeck(all, 1, 2, 'Όλες', 10);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const exclude = new Set(first.deck.map((q) => q.id));
    const second = buildRoundDeck(all, 2, 2, 'Όλες', 10, { excludeIds: exclude });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.deck.length).toBe(10);
    for (const q of second.deck) {
      expect(exclude.has(q.id)).toBe(false);
    }
  });

  it('1 συνολικός γύρος: κατανομή 3+3+3 για N=9', () => {
    const r = buildRoundDeck(all, 1, 1, 'Όλες', 9);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = countByDifficulty(r.deck);
    expect(c.easy).toBe(3);
    expect(c.medium).toBe(3);
    expect(c.hard).toBe(3);
  });

  it('3 συνολικοί γύροι, 1ος γύρος: μισές εύκολες μισές μεσαίες', () => {
    const r = buildRoundDeck(all, 1, 3, 'Όλες', 12);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = countByDifficulty(r.deck);
    expect(c.easy).toBe(6);
    expect(c.medium).toBe(6);
    expect(c.hard).toBe(0);
  });

  it('3 συνολικοί γύροι, 2ος γύρος: μισές μεσαίες μισές δύσκολες', () => {
    const r = buildRoundDeck(all, 2, 3, 'Όλες', 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = countByDifficulty(r.deck);
    expect(c.easy).toBe(0);
    expect(c.medium).toBe(5);
    expect(c.hard).toBe(5);
  });

  it('3 συνολικοί γύροι, 3ος γύρος: μόνο δύσκολες', () => {
    const r = buildRoundDeck(all, 3, 3, 'Όλες', 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deck.every((q) => q.difficulty === 'hard')).toBe(true);
  });

  it('αποκλείει ίδιο κείμενο ερώτησης μέσω excludeQuestionFingerprints (διαφορετικό id)', () => {
    const base = all[0];
    const clone = { ...base, id: 'synthetic-clone-id' };
    const mixed = [clone, ...all];
    const fp = questionTextFingerprint(base.text);
    const r = buildRoundDeck(mixed, 1, 1, 'Όλες', 10, {
      excludeQuestionFingerprints: new Set([fp]),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const q of r.deck) {
      expect(questionTextFingerprint(q.text)).not.toBe(fp);
    }
  });

  it('ένα deck δεν περιέχει δύο φορές το ίδιο κείμενο (δύο id στο pool)', () => {
    const base = all.find((q) => q.kind === 'multiple');
    if (!base) return;
    const clone = { ...base, id: 'dup-text-second-id' };
    const mixed = [clone, base, ...all];
    const r = buildRoundDeck(mixed, 1, 1, 'Όλες', 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const prints = r.deck.map((q) => questionTextFingerprint(q.text));
    expect(new Set(prints).size).toBe(prints.length);
  });
});
