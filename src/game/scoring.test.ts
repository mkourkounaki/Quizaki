import { scoreDeltaForCorrectAnswer } from './scoring';

describe('scoreDeltaForCorrectAnswer', () => {
  it('γύροι 1–3: N πόντοι', () => {
    expect(scoreDeltaForCorrectAnswer(1)).toBe(1);
    expect(scoreDeltaForCorrectAnswer(2)).toBe(2);
    expect(scoreDeltaForCorrectAnswer(3)).toBe(3);
  });
});
