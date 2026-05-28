import type { PlayerPuzzle } from './types/index';

function isSolvable(tiles: number[]): boolean {
  // For odd grid size (3×3), solvable iff inversion count is even
  let inversions = 0;
  const flat = tiles.filter((t) => t !== 0);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
}

function shuffleTiles(): number[] {
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let attempts = 0;
  do {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    attempts++;
  } while (!isSolvable(tiles) && attempts < 1000);
  return [...tiles];
}

function fisherYatesSample(pool: number[], count: number): number[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function assignPuzzles(pool: number[]): PlayerPuzzle[] {
  const selected = fisherYatesSample(pool, 2);
  return selected.map((imageIndex) => ({
    imageIndex,
    tiles: shuffleTiles(),
    moves: 0,
    startTime: 0,
    completed: false,
  }));
}

export { shuffleTiles };

