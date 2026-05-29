import type { PlayerPuzzle, PowerupType } from './types/index';

export function calcPuzzleScore(moves: number, seconds: number): number {
  return Math.max(200, 1000 - moves * 5 - seconds * 2);
}

export function calcFinalScore(
  puzzles: PlayerPuzzle[],
  powerups: Record<PowerupType, number>,
): number {
  const remainingPowerups = Object.values(powerups).reduce((a, b) => a + b, 0);
  const puzzleTotal = puzzles.reduce((sum, p) => {
    if (!p.completed || p.endTime === undefined) return sum;
    const seconds = Math.floor((p.endTime - p.startTime) / 1000);
    return sum + calcPuzzleScore(p.moves, seconds);
  }, 0);
  return puzzleTotal + remainingPowerups * 50;
}

