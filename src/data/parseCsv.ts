import { rawRowSchema } from './schema';
import type { Difficulty, NormalizedQuestion } from './types';

/** Απλός CSV parser με υποστήριξη εισαγωγικών πεδίων */
export function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
    } else if ((c === '\n' || (c === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (c === '\r') i++;
      if (cur.trim()) lines.push(cur);
      cur = '';
    } else if (c !== '\r' || inQuotes) {
      cur += c;
    }
  }
  if (cur.trim()) lines.push(cur);
  return lines;
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseOptionsJson(s: string): string[] {
  const t = s.trim();
  if (!t) return [];
  try {
    const arr = JSON.parse(t) as unknown;
    if (Array.isArray(arr)) return arr.map((x) => String(x));
  } catch {
    // Excel / Python: ['a', 'b', 'c', 'd']
    try {
      const asJson = t.replace(/'/g, '"');
      const arr = JSON.parse(asJson) as unknown;
      if (Array.isArray(arr)) return arr.map((x) => String(x));
    } catch {
      // ignore
    }
  }
  return [];
}

function normalizeType(raw: string): 'multiple' | 'truefalse' | 'regular' | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (t === 'multiple') return 'multiple';
  if (t === 'truefalse') return 'truefalse';
  if (t === 'regular') return 'regular';
  return null;
}

function normalizeDifficulty(raw: string): 'easy' | 'medium' | 'hard' | null {
  const t = raw.trim().toLocaleLowerCase('el-GR');
  if (t === 'easy' || t === 'εύκολο' || t === 'εύκολη') return 'easy';
  if (t === 'medium' || t === 'μεσαίο' || t === 'μεσαία') return 'medium';
  if (t === 'hard' || t === 'δύσκολο' || t === 'δύσκολη') return 'hard';
  return null;
}

/** Σωστό/Λάθος + αγγλικά True/False από Excel */
function normalizeTrueFalseAnswer(raw: string): 'Σωστό' | 'Λάθος' | null {
  const s = raw.trim();
  if (s === 'Σωστό' || s === 'Λάθος') return s;
  const low = s.toLowerCase();
  if (low === 'true' || s === 'True') return 'Σωστό';
  if (low === 'false' || s === 'False') return 'Λάθος';
  return null;
}

/** 1–4 ή Α–Δ / A–D */
function normalizeCorrectOptionIndex(raw: string): number | null {
  const s = raw.trim();
  const n = parseInt(s, 10);
  if (n >= 1 && n <= 4) return n;
  if (s.length !== 1) return null;
  const ch = s.toLocaleUpperCase('el-GR');
  const greek = 'ΑΒΓΔ';
  const latin = 'ABCD';
  const gi = greek.indexOf(ch);
  if (gi >= 0) return gi + 1;
  const li = latin.indexOf(ch);
  if (li >= 0) return li + 1;
  return null;
}

/** Φέρνει γραμμές Excel σε μορφή που περνάει το schema + rowToQuestion. */
function normalizeRowForSchema(row: Record<string, string>): Record<string, string> | null {
  const type = normalizeType(row.type ?? '');
  const difficulty = normalizeDifficulty(row.difficulty ?? '');
  if (!type || !difficulty) return null;

  const out: Record<string, string> = { ...row, type, difficulty };

  if (type === 'truefalse') {
    const a = normalizeTrueFalseAnswer(row.answer ?? '');
    if (!a) return null;
    out.answer = a;
  }

  if (type === 'multiple') {
    const idx = normalizeCorrectOptionIndex(row.correct_option ?? '');
    if (idx === null) return null;
    out.correct_option = String(idx);
  }

  return out;
}

function rowToQuestion(cols: string[], headers: string[]): NormalizedQuestion | null {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h] = cols[i] ?? '';
  });
  const normalized = normalizeRowForSchema(row);
  if (!normalized) return null;
  const parsed = rawRowSchema.safeParse(normalized);
  if (!parsed.success) return null;
  const r = parsed.data;
  const id = r.id;
  const difficulty = r.difficulty as Difficulty;
  const category = r.category;

  if (r.type === 'multiple') {
    const opts = parseOptionsJson(r.options);
    if (opts.length !== 4) return null;
    const ci = parseInt(r.correct_option, 10);
    if (ci < 1 || ci > 4) return null;
    const correctIndex = (ci - 1) as 0 | 1 | 2 | 3;
    const tuple: [string, string, string, string] = [opts[0], opts[1], opts[2], opts[3]];
    return {
      id,
      category,
      difficulty,
      kind: 'multiple',
      text: r.question,
      options: tuple,
      correctIndex,
    };
  }

  if (r.type === 'truefalse') {
    const a = r.answer.trim();
    if (a !== 'Σωστό' && a !== 'Λάθος') return null;
    return {
      id,
      category,
      difficulty,
      kind: 'truefalse',
      text: r.question,
      correctLabel: a,
    };
  }

  /* regular / ελεύθερη απάντηση — δεν χρησιμοποιείται στην εφαρμογή */
  return null;
}

export function parseQuestionsCsv(csv: string): NormalizedQuestion[] {
  const lines = splitCsvLines(csv);
  if (lines.length < 2) return [];
  const headerCols = parseCsvRow(lines[0]).map((h) => h.trim());
  const out: NormalizedQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const q = rowToQuestion(cols, headerCols);
    if (q) out.push(q);
  }
  return out;
}
