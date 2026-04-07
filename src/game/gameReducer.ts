import {
  addGlobalUsedQuestionIds,
  clearGlobalUsedQuestionIds,
  getGlobalUsedQuestionIds,
} from '../data/questionRotation';
import {
  buildRoundDeck,
  questionTextFingerprint,
  type BuildDeckOptions,
  type BuildDeckResult,
  type MatchTotalRounds,
} from './buildRoundDeck';
import type { CategoryChoice, NormalizedQuestion, Player } from '../data/types';
import { parseQuestionsCsv } from '../data/parseCsv';
import { QUIZAKI_CSV } from '../data/csvRaw';
import { scoreDeltaForCorrectAnswer } from './scoring';

function logAction(name: string, payload?: unknown): void {
  console.log(`[Quizaki] ${name}`, payload !== undefined ? payload : '');
}

export type ScreenName =
  | 'splash'
  | 'playerCount'
  | 'names'
  | 'settings'
  | 'category'
  | 'countdown'
  | 'question'
  | 'feedback'
  | 'playerSetScore'
  | 'roundSummary'
  | 'final';

export type TotalRounds = MatchTotalRounds;

export interface GameState {
  screen: ScreenName;
  allQuestions: NormalizedQuestion[];
  players: Player[];
  playerCount: number;
  nameIndex: number;
  tempNames: string[];
  questionsPerRound: number;
  secondsPerQuestion: number;
  /** Πλήθος γύρων στον αγώνα (1–3). Προεπιλογή 1. */
  totalRounds: TotalRounds;
  /** IDs ερωτήσεων που έχουν μπει σε deck (όλοι οι παίκτες / γύροι του ίδιου αγώνα). */
  usedQuestionIds: string[];
  category: CategoryChoice;
  round: 1 | 2 | 3;
  currentPlayerIndex: number;
  questionIndexInSet: number;
  currentDeck: NormalizedQuestion[];
  lastAnswerCorrect: boolean | null;
  lastFeedbackDetail: string | null;
  errorMessage: string | null;
}

export const initialGameState: GameState = {
  screen: 'splash',
  allQuestions: [],
  players: [],
  playerCount: 2,
  nameIndex: 0,
  tempNames: [],
  questionsPerRound: 10,
  secondsPerQuestion: 30,
  totalRounds: 1,
  usedQuestionIds: [],
  category: 'Όλες',
  round: 1,
  currentPlayerIndex: 0,
  questionIndexInSet: 0,
  currentDeck: [],
  lastAnswerCorrect: null,
  lastFeedbackDetail: null,
  errorMessage: null,
};

export type GameAction =
  | { type: 'SPLASH_DONE' }
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'SET_NAME'; name: string }
  | { type: 'NAMES_NEXT' }
  | {
      type: 'SET_SETTINGS';
      questionsPerRound: number;
      secondsPerQuestion: number;
      totalRounds: TotalRounds;
    }
  | { type: 'SET_CATEGORY'; category: CategoryChoice }
  | { type: 'START_GAME' }
  | { type: 'COUNTDOWN_FINISHED' }
  | { type: 'SUBMIT_ANSWER'; payload: { choiceIndex?: number; trueFalseLabel?: 'Σωστό' | 'Λάθος' } }
  | { type: 'TIME_UP' }
  | { type: 'FEEDBACK_DONE' }
  | { type: 'PLAYER_SET_CONTINUE' }
  | { type: 'SOLO_PLAY_AGAIN' }
  | { type: 'ROUND_SUMMARY_CONTINUE' }
  | { type: 'EXIT_TO_HOME' }
  | { type: 'FINAL_REMATCH' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SETUP_BACK' };

function ensureQuestionsLoaded(state: GameState): NormalizedQuestion[] {
  if (state.allQuestions.length > 0) return state.allQuestions;
  return parseQuestionsCsv(QUIZAKI_CSV);
}

function currentQuestion(state: GameState): NormalizedQuestion | null {
  return state.currentDeck[state.questionIndexInSet] ?? null;
}

/** Αποκλεισμός κειμένου ερώτησης ήδη χρησιμοποιημένου στον αγώνα (ίδιο κείμενο, διαφορετικό id). */
function matchUsedQuestionFingerprints(state: GameState): Set<string> {
  const out = new Set<string>();
  const { allQuestions, usedQuestionIds } = state;
  if (allQuestions.length === 0 || usedQuestionIds.length === 0) return out;
  const used = new Set(usedQuestionIds);
  for (const q of allQuestions) {
    if (used.has(q.id)) out.add(questionTextFingerprint(q.text));
  }
  return out;
}

function deckBuildOptions(state: GameState): BuildDeckOptions {
  const s = new Set(state.usedQuestionIds);
  for (const id of getGlobalUsedQuestionIds()) s.add(id);
  return {
    excludeIds: s,
    excludeQuestionFingerprints: matchUsedQuestionFingerprints(state),
  };
}

/** Αν δεν φτάνουν ερωτήσεις (όλες «καταναλώθηκαν» σε προηγούμενα παιχνίδια), ξαναρχίζει τον κύκλο. */
function tryBuildDeckWithRotationReset(
  all: NormalizedQuestion[],
  round: 1 | 2 | 3,
  category: CategoryChoice,
  n: number,
  state: GameState
): BuildDeckResult {
  const run = () =>
    buildRoundDeck(all, round, state.totalRounds, category, n, deckBuildOptions(state));
  let built = run();
  if (!built.ok) {
    clearGlobalUsedQuestionIds();
    built = run();
  }
  return built;
}

function recordDeckForGlobalRotation(deck: NormalizedQuestion[]): void {
  addGlobalUsedQuestionIds(deck.map((q) => q.id));
}

function mergeUsedQuestionIds(state: GameState, deck: NormalizedQuestion[]): string[] {
  const s = new Set(state.usedQuestionIds);
  for (const q of deck) s.add(q.id);
  return [...s];
}

function normalizePlayerName(s: string): string {
  return s.trim().toLocaleLowerCase('el-GR');
}

function checkAnswer(
  q: NormalizedQuestion,
  payload: { choiceIndex?: number; trueFalseLabel?: 'Σωστό' | 'Λάθος' }
): boolean {
  if (q.kind === 'multiple') {
    return payload.choiceIndex === q.correctIndex;
  }
  return payload.trueFalseLabel === q.correctLabel;
}

/** Νέος αγώνας: μηδενισμός σκορ, νέο deck, ίδιοι παίκτες/ρυθμίσεις/κατηγορία. */
function startMatchFromState(state: GameState): GameState {
  const all = ensureQuestionsLoaded(state);
  const fresh = { ...state, usedQuestionIds: [] as string[] };
  const built = tryBuildDeckWithRotationReset(
    all,
    1,
    fresh.category,
    fresh.questionsPerRound,
    fresh
  );
  if (!built.ok) {
    return { ...state, errorMessage: built.reason, allQuestions: all };
  }
  recordDeckForGlobalRotation(built.deck);
  const players = state.players.map((p) => ({ ...p, score: 0 }));
  return {
    ...state,
    allQuestions: all,
    players,
    round: 1,
    currentPlayerIndex: 0,
    questionIndexInSet: 0,
    currentDeck: built.deck,
    usedQuestionIds: mergeUsedQuestionIds({ ...fresh, usedQuestionIds: [] }, built.deck),
    screen: 'countdown',
    lastAnswerCorrect: null,
    lastFeedbackDetail: null,
    errorMessage: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  logAction(action.type, action);

  switch (action.type) {
    case 'SPLASH_DONE':
      return { ...state, screen: 'playerCount', errorMessage: null };

    case 'SET_PLAYER_COUNT':
      return {
        ...state,
        playerCount: action.count,
        tempNames: Array.from({ length: action.count }, () => ''),
        nameIndex: 0,
        screen: 'names',
      };

    case 'SET_NAME': {
      const temp = [...state.tempNames];
      temp[state.nameIndex] = action.name;
      return { ...state, tempNames: temp };
    }

    case 'NAMES_NEXT': {
      const name = state.tempNames[state.nameIndex]?.trim();
      if (!name) {
        return { ...state, errorMessage: 'Πληκτρολόγησε όνομα' };
      }
      const nameKey = normalizePlayerName(name);
      for (let j = 0; j < state.tempNames.length; j++) {
        if (j === state.nameIndex) continue;
        const other = state.tempNames[j]?.trim();
        if (!other) continue;
        if (normalizePlayerName(other) === nameKey) {
          return { ...state, errorMessage: 'Υπάρχει ήδη παίκτης με αυτό το όνομα' };
        }
      }
      if (state.nameIndex + 1 < state.playerCount) {
        return { ...state, nameIndex: state.nameIndex + 1, errorMessage: null };
      }
      const players: Player[] = state.tempNames.map((n, i) => ({
        id: `p${i}`,
        name: n.trim(),
        score: 0,
      }));
      return {
        ...state,
        players,
        screen: 'settings',
        errorMessage: null,
      };
    }

    case 'SET_SETTINGS':
      return {
        ...state,
        questionsPerRound: action.questionsPerRound,
        secondsPerQuestion: action.secondsPerQuestion,
        totalRounds: action.totalRounds,
        screen: 'category',
        errorMessage: null,
      };

    case 'SET_CATEGORY':
      return { ...state, category: action.category };

    case 'START_GAME':
      return startMatchFromState(state);

    case 'COUNTDOWN_FINISHED':
      return { ...state, screen: 'question' };

    case 'SUBMIT_ANSWER': {
      const q = currentQuestion(state);
      if (!q) return state;
      const correct = checkAnswer(q, action.payload);
      const delta = correct ? scoreDeltaForCorrectAnswer(state.round) : 0;
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, score: p.score + delta } : p
      );
      return {
        ...state,
        players,
        lastAnswerCorrect: correct,
        lastFeedbackDetail: correct ? null : explainCorrect(q),
        screen: 'feedback',
      };
    }

    case 'TIME_UP': {
      const q = currentQuestion(state);
      if (!q) return state;
      return {
        ...state,
        lastAnswerCorrect: false,
        lastFeedbackDetail: explainCorrect(q),
        screen: 'feedback',
      };
    }

    case 'FEEDBACK_DONE': {
      const nextQ = state.questionIndexInSet + 1;
      if (nextQ < state.currentDeck.length) {
        return { ...state, questionIndexInSet: nextQ, screen: 'question' };
      }
      return { ...state, screen: 'playerSetScore' };
    }

    case 'PLAYER_SET_CONTINUE': {
      const multi = state.playerCount > 1;
      if (multi) {
        const nextP = state.currentPlayerIndex + 1;
        if (nextP < state.playerCount) {
          const built = tryBuildDeckWithRotationReset(
            state.allQuestions,
            state.round,
            state.category,
            state.questionsPerRound,
            state
          );
          if (!built.ok) return { ...state, errorMessage: built.reason };
          recordDeckForGlobalRotation(built.deck);
          return {
            ...state,
            currentPlayerIndex: nextP,
            questionIndexInSet: 0,
            currentDeck: built.deck,
            usedQuestionIds: mergeUsedQuestionIds(state, built.deck),
            screen: 'countdown',
            errorMessage: null,
          };
        }
        return { ...state, screen: 'roundSummary' };
      }
      return { ...state, screen: 'roundSummary' };
    }

    case 'SOLO_PLAY_AGAIN': {
      const built = tryBuildDeckWithRotationReset(
        state.allQuestions,
        state.round,
        state.category,
        state.questionsPerRound,
        state
      );
      if (!built.ok) return { ...state, errorMessage: built.reason };
      recordDeckForGlobalRotation(built.deck);
      return {
        ...state,
        questionIndexInSet: 0,
        currentDeck: built.deck,
        usedQuestionIds: mergeUsedQuestionIds(state, built.deck),
        screen: 'countdown',
        errorMessage: null,
      };
    }

    case 'ROUND_SUMMARY_CONTINUE': {
      if (state.round >= state.totalRounds) {
        return { ...state, screen: 'final' };
      }
      const nextRound = (state.round + 1) as 1 | 2 | 3;
      const built = tryBuildDeckWithRotationReset(
        state.allQuestions,
        nextRound,
        state.category,
        state.questionsPerRound,
        state
      );
      if (!built.ok) return { ...state, errorMessage: built.reason };
      recordDeckForGlobalRotation(built.deck);
      return {
        ...state,
        round: nextRound,
        currentPlayerIndex: 0,
        questionIndexInSet: 0,
        currentDeck: built.deck,
        usedQuestionIds: mergeUsedQuestionIds(state, built.deck),
        screen: 'countdown',
        errorMessage: null,
      };
    }

    case 'EXIT_TO_HOME':
      return {
        ...initialGameState,
        allQuestions: state.allQuestions.length ? state.allQuestions : parseQuestionsCsv(QUIZAKI_CSV),
        screen: 'splash',
      };

    case 'FINAL_REMATCH':
      return startMatchFromState(state);

    case 'CLEAR_ERROR':
      return { ...state, errorMessage: null };

    case 'SETUP_BACK': {
      switch (state.screen) {
        case 'playerCount':
          return { ...state, screen: 'splash', errorMessage: null };
        case 'names':
          if (state.nameIndex > 0) {
            return { ...state, nameIndex: state.nameIndex - 1, errorMessage: null };
          }
          return { ...state, screen: 'playerCount', errorMessage: null };
        case 'settings':
          return {
            ...state,
            screen: 'names',
            nameIndex: Math.max(0, state.playerCount - 1),
            errorMessage: null,
          };
        case 'category':
          return { ...state, screen: 'settings', errorMessage: null };
        default:
          return state;
      }
    }

    default:
      return state;
  }
}

function explainCorrect(q: NormalizedQuestion): string {
  if (q.kind === 'multiple') return `Σωστή: ${q.options[q.correctIndex]}`;
  return `Σωστή απάντηση: ${q.correctLabel}`;
}
