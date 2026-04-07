export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionKind = 'multiple' | 'truefalse';

export type NormalizedQuestion =
  | {
      id: string;
      category: string;
      difficulty: Difficulty;
      kind: 'multiple';
      text: string;
      options: [string, string, string, string];
      correctIndex: 0 | 1 | 2 | 3;
    }
  | {
      id: string;
      category: string;
      difficulty: Difficulty;
      kind: 'truefalse';
      text: string;
      correctLabel: 'Σωστό' | 'Λάθος';
    };

export type Player = { id: string; name: string; score: number };

export const CATEGORY_OPTIONS = [
  'Όλες',
  'Γενικά',
  'Επιστήμη',
  'Ιστορία',
  'Γεωγραφία',
  'Καλλιτεχνικά',
  'Αθλητικά',
] as const;

export type CategoryChoice = (typeof CATEGORY_OPTIONS)[number];
