import { parseQuestionsCsv } from './parseCsv';
import { QUIZAKI_CSV } from './csvRaw';

describe('parseQuestionsCsv + bundled csvRaw', () => {
  it('δέχεται μορφές Excel (TrueFalse, Εύκολο, single-quoted options, Α–Δ) και επιστρέφει πολλές ερωτήσεις', () => {
    const qs = parseQuestionsCsv(QUIZAKI_CSV);
    // regular γραμμές αγνοούνται· το xlsx έχει κυρίως multiple + TrueFalse
    expect(qs.length).toBeGreaterThan(400);
  });
});
