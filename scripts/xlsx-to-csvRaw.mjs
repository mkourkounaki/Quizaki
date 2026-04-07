/**
 * Διαβάζει Excel με ερωτήσεις, ξαναγράφει το src/data/csvRaw.ts και το questionsDataVersion.ts.
 * Νέα έκδοση δεδομένων → στην επόμενη εκκίνηση εφαρμογής reset της αποθηκευμένης rotation (cooldown).
 *
 * Χρήση:
 *   .\import-questions.cmd
 *   node scripts/xlsx-to-csvRaw.mjs [path/προς/αρχείο.xlsx]
 *   (ή npm.cmd run import:questions αν το npm.ps1 είναι μπλοκαρισμένο)
 *
 * Η 1η γραμμή του φύλλου πρέπει να είναι κεφαλίδες (όπως στο CSV):
 *   id, category, question, answer, type, difficulty, options, correct_option
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const EXPECTED = [
  'id',
  'category',
  'question',
  'answer',
  'type',
  'difficulty',
  'options',
  'correct_option',
];

/** Προεπιλογή: όπου υπάρχει πρώτα — src/data/ ή data/ */
const DEFAULT_XLSX_CANDIDATES = [
  path.join(root, 'src', 'data', 'Quizaki_2026.04.05.xlsx'),
  path.join(root, 'data', 'Quizaki_2026.04.05.xlsx'),
];
const OUT_TS = path.join(root, 'src', 'data', 'csvRaw.ts');
const OUT_VERSION = path.join(root, 'src', 'data', 'questionsDataVersion.ts');

function normHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function escapeCsvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsvLine(cols) {
  return cols.map(escapeCsvField).join(',');
}

/** Για να μπει το CSV μέσα σε template literal του TypeScript */
function escapeForTsTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const xlsxPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_XLSX_CANDIDATES.find((p) => fs.existsSync(p)) ?? DEFAULT_XLSX_CANDIDATES[0];

if (!fs.existsSync(xlsxPath)) {
  console.error(`Δεν βρέθηκε το αρχείο: ${xlsxPath}`);
  console.error(
    'Βάλε το Quizaki_2026.04.05.xlsx στο src/data/ ή data/, ή τρέξε: .\\import-questions.cmd path\\προς\\αρχείο.xlsx'
  );
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const sheetName = wb.SheetNames[0];
if (!sheetName) {
  console.error('Το workbook δεν έχει φύλλα.');
  process.exit(1);
}

const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

if (!Array.isArray(rows) || rows.length < 2) {
  console.error('Το φύλλο είναι άδειο ή έχει μόνο κεφαλίδα.');
  process.exit(1);
}

const headerRow = rows[0].map((c) => String(c).trim());
const headerNorm = headerRow.map(normHeader);

const idx = {};
for (const key of EXPECTED) {
  const i = headerNorm.indexOf(normHeader(key));
  if (i === -1) {
    console.error(`Λείπει στήλη «${key}» στην πρώτη γραμμή. Βρέθηκαν: ${headerRow.join(', ')}`);
    process.exit(1);
  }
  idx[key] = i;
}

const lines = [EXPECTED.join(',')];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!Array.isArray(row)) continue;
  const cols = EXPECTED.map((key) => row[idx[key]] ?? '');
  if (cols.every((c) => String(c).trim() === '')) continue;
  lines.push(rowToCsvLine(cols));
}

const csv = lines.join('\n');
const base = path.basename(xlsxPath);
const ts = `/** Πηγή: ${base} — ενημέρωση με npm run import:questions */
export const QUIZAKI_CSV = \`${escapeForTsTemplate(csv)}\`;
`;

fs.writeFileSync(OUT_TS, ts, 'utf8');
console.log(`Έγραψε ${OUT_TS} (${lines.length - 1} ερωτήσεις + κεφαλίδα) από ${xlsxPath}`);

const dataVersion = new Date().toISOString();
const rowCount = lines.length - 1;
const versionTs = `/** Αυτόματο από scripts/xlsx-to-csvRaw.mjs — μην επεξεργαστείς χειροκίνητα. */
export const QUESTIONS_DATA_VERSION = '${dataVersion}';
export const QUESTIONS_SOURCE_ROW_COUNT = ${rowCount};
`;
fs.writeFileSync(OUT_VERSION, versionTs, 'utf8');
console.log(
  `Έγραψε ${OUT_VERSION} — νέα έκδοση δεδομένων (${dataVersion}). Στην επόμενη εκκίνηση της εφαρμογής θα γίνει reset της αποθηκευμένης κατάστασης ερωτήσεων (rotation).`
);
