import { z } from 'zod';

export const rawRowSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  type: z.enum(['multiple', 'truefalse', 'regular']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  options: z.string(),
  correct_option: z.string(),
});

export type RawCsvRow = z.infer<typeof rawRowSchema>;
