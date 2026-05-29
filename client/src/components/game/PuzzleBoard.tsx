import { useState, useEffect } from 'react';
import { isMovable, isSolved } from '../../lib/puzzle.js';

interface PuzzleBoardProps {
  tiles: number[];
  imageIndex: number;
  peekActive: boolean;
  swapMode: boolean;
  swapFirstIndex: number | null;
  onTileClick: (index: number) => void;
}

export function PuzzleBoard({
  tiles,
  imageIndex,
  peekActive,
  swapMode,
  swapFirstIndex,
  onTileClick,
}: PuzzleBoardProps) {
  const [fullImage, setFullImage] = useState('');
  const solved = isSolved(tiles);

  useEffect(() => {
    setFullImage(`/logos/logo${imageIndex + 1}.webp`);
  }, [imageIndex]);

  return (
    <div className="flex gap-5 items-start">
      {/* ── Puzzle board ── */}
      <div
        className={`relative rounded-xl shadow-2xl overflow-hidden flex-shrink-0 ${
          solved ? 'ring-4 ring-green-400' : ''
        }`}
        style={{ width: 368, height: 368 }}
      >
        {/* Full solved image under tiles, revealed during Peek */}
        {fullImage && (
          <img
            src={fullImage}
            alt="solved"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        )}

        {/* Tile grid */}
        <div
          className={`absolute inset-0 grid grid-cols-3 gap-0.5 p-0.5 transition-colors duration-300 ${
            peekActive ? 'bg-transparent' : 'bg-gray-800'
          }`}
        >
          {tiles.map((tileValue, gridIndex) => {
            const isBlank = tileValue === 0;
            const canMove = !swapMode && !isBlank && isMovable(tiles, gridIndex);
            const isSwapFirst = swapMode && swapFirstIndex === gridIndex;
            const isSwapTarget = swapMode && swapFirstIndex !== null && swapFirstIndex !== gridIndex;

            // Compute background position for this tile's image slice
            const pos = tileValue - 1; // 0-indexed position in the solved image
            const tileRow = Math.floor(pos / 3);
            const tileCol = pos % 3;
            const bgPosition = `${tileCol * 50}% ${tileRow * 50}%`;

            return (
              <div
                key={gridIndex}
                onClick={() => {
                  if (swapMode) onTileClick(gridIndex);
                  else if (canMove) onTileClick(gridIndex);
                }}
                className={[
                  'relative overflow-hidden rounded-sm select-none transition-opacity duration-300',
                  isBlank ? 'bg-gray-900' : '',
                  peekActive ? 'opacity-0' : 'opacity-100',
                  isSwapFirst ? 'ring-4 ring-yellow-400 ring-inset brightness-125' : '',
                  isSwapTarget ? 'cursor-crosshair hover:ring-2 hover:ring-yellow-300 ring-inset' : '',
                  swapMode && !isSwapFirst ? 'cursor-crosshair' : '',
                  canMove ? 'cursor-pointer hover:brightness-110 active:scale-95 transition-transform' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  !isBlank && fullImage
                    ? {
                        backgroundImage: `url('${fullImage}')`,
                        backgroundSize: '300% 300%',
                        backgroundPosition: bgPosition,
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* ── Reference image ── */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reference</p>
        {fullImage ? (
          <div className="rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
            <img
              src={fullImage}
              alt="reference"
              className="object-cover"
              style={{ width: 100, height: 100 }}
              draggable={false}
            />
          </div>
        ) : (
          <div className="rounded-lg bg-white/10 animate-pulse" style={{ width: 100, height: 100 }} />
        )}
        <p className="text-xs text-gray-500 text-center leading-tight" style={{ maxWidth: 100 }}>
          Tap Peek to see full-size
        </p>
      </div>
    </div>
  );
}
