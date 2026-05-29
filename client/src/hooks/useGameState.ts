import { useState, useCallback } from 'react';
import type { GameClientState, ServerMessage, PowerupType } from '../types/index.js';

const DEFAULT_POWERUPS: Record<PowerupType, number> = {
  peek: 2,
  swap: 3,
  freeze: 1,
  scramble: 1,
  reshuffle: 3,
};

const initialState: GameClientState = {
  playerId: null,
  roomCode: null,
  playerName: null,
  isHost: false,
  room: null,
  puzzleIndices: [],
  currentPuzzleIndex: 0,
  tiles: [],
  moves: 0,
  powerups: { ...DEFAULT_POWERUPS },
  leaderboard: [],
  gameOver: false,
  peekActive: false,
  frozenUntil: null,
  solvedPuzzle: null,
  scrambled: false,
  playerFinished: false,
};

export function useGameState() {
  const [state, setState] = useState<GameClientState>(initialState);

  const handleMessage = useCallback((msg: ServerMessage) => {
    setState((prev) => {
      switch (msg.type) {
        case 'room_update':
          return { ...prev, room: msg.room };

        case 'game_started':
          return {
            ...prev,
            puzzleIndices: msg.puzzleIndices,
            currentPuzzleIndex: msg.currentPuzzleIndex ?? 0,
            ...(msg.powerups ? { powerups: msg.powerups } : {}),
          };

        case 'board_update':
          return {
            ...prev,
            tiles: msg.tiles,
            moves: msg.moves,
            ...(msg.puzzleIndex !== undefined ? { currentPuzzleIndex: msg.puzzleIndex } : {}),
          };

        case 'puzzle_solved':
          return {
            ...prev,
            powerups: msg.newPowerups,
            solvedPuzzle: { imageIndex: msg.imageIndex, puzzleScore: msg.puzzleScore },
          };

        case 'leaderboard_update':
          return { ...prev, leaderboard: msg.leaderboard };

        case 'player_finished':
          return { ...prev, leaderboard: msg.leaderboard, playerFinished: true };

        case 'game_over':
          return { ...prev, leaderboard: msg.leaderboard, gameOver: true };

        case 'powerup_applied': {
          if (msg.powerup === 'peek') {
            return { ...prev, peekActive: true };
          }
          if (msg.powerup === 'freeze') {
            const payload = msg.payload as { duration: number } | undefined;
            const duration = payload?.duration ?? 5000;
            return { ...prev, frozenUntil: Date.now() + duration };
          }
          if (msg.powerup === 'scramble') {
            return { ...prev, scrambled: true };
          }
          return prev;
        }

        case 'error':
          console.warn('Server error:', msg.message);
          return prev;

        default:
          return prev;
      }
    });
  }, []);

  const setIdentity = useCallback(
    (playerId: string, roomCode: string, playerName: string, isHost: boolean) => {
      setState((prev) => ({ ...prev, playerId, roomCode, playerName, isHost }));
    },
    [],
  );

  const deactivatePeek = useCallback(() => {
    setState((prev) => ({ ...prev, peekActive: false }));
  }, []);

  const decrementPowerup = useCallback((powerup: PowerupType) => {
    setState((prev) => ({
      ...prev,
      powerups: {
        ...prev.powerups,
        [powerup]: Math.max(0, prev.powerups[powerup] - 1),
      },
    }));
  }, []);

  const clearSolvedPuzzle = useCallback(() => {
    setState((prev) => ({ ...prev, solvedPuzzle: null }));
  }, []);

  const clearScrambled = useCallback(() => {
    setState((prev) => ({ ...prev, scrambled: false }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    handleMessage,
    setIdentity,
    deactivatePeek,
    decrementPowerup,
    clearSolvedPuzzle,
    clearScrambled,
    reset,
  };
}
