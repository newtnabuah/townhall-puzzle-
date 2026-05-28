const GRID = 3;
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function isSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => t === SOLVED[i]);
}

function isSolvable(tiles: number[]): boolean {
  let inversions = 0;
  const flat = tiles.filter((t) => t !== 0);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
}

export function generateSolvableShuffle(): number[] {
  const tiles = [...SOLVED];
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

export function getBlankIndex(tiles: number[]): number {
  return tiles.indexOf(0);
}

export function isMovable(tiles: number[], clickedIndex: number): boolean {
  const blankIndex = getBlankIndex(tiles);
  const rowC = Math.floor(clickedIndex / GRID), colC = clickedIndex % GRID;
  const rowB = Math.floor(blankIndex / GRID), colB = blankIndex % GRID;
  return (
    (rowC === rowB && Math.abs(colC - colB) === 1) ||
    (colC === colB && Math.abs(rowC - rowB) === 1)
  );
}

export function applyMove(tiles: number[], clickedIndex: number): number[] {
  if (!isMovable(tiles, clickedIndex)) return tiles;
  const next = [...tiles];
  const blankIndex = getBlankIndex(next);
  [next[clickedIndex], next[blankIndex]] = [next[blankIndex], next[clickedIndex]];
  return next;
}

export function getSolvedTiles(): number[] {
  return [...SOLVED];
}
