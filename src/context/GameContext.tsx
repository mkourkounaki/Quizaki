import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { hydrateQuestionRotationFromStorage } from '../data/questionRotation';
import { gameReducer, initialGameState, type GameAction, type GameState } from '../game/gameReducer';

type Ctx = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
};

const GameContext = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  useEffect(() => {
    void hydrateQuestionRotationFromStorage();
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error('useGame outside GameProvider');
  return c;
}
