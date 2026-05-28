import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMovable } from '../../lib/puzzle.js';

const STEPS = [
  {
    icon: '🚪',
    title: 'Join the room',
    desc: 'Enter your name and the room code shown on the host screen.',
  },
  {
    icon: '🧩',
    title: 'Solve 2 puzzles',
    desc: "You'll get 2 random lender logo puzzles from a pool of 7.",
  },
  {
    icon: '🏆',
    title: 'Outscore everyone',
    desc: 'Fewer moves and faster time = higher score. Use powerups wisely.',
  },
];

const POWERUPS = [
  { icon: '👁',  name: 'Peek',      uses: '×2', desc: 'Tiles fade transparent for 2.5 s — the full solved image shows through underneath.' },
  { icon: '🔄',  name: 'Swap',      uses: '×3', desc: 'Pick any two tiles to instantly swap their positions — no adjacency needed.' },
  { icon: '🔀',  name: 'Reshuffle', uses: '×3', desc: 'Reset your board to a brand-new solvable shuffle — no move penalty.' },
  { icon: '🧊',  name: 'Freeze',    uses: '×1', desc: 'Pause your scoring timer for 5 seconds.' },
  { icon: '🌀',  name: 'Scramble',  uses: '×1', desc: 'Reshuffle a target opponent\'s board (+5 move penalty for them).' },
];

const SCORING = [
  { label: 'Base score per puzzle', value: '1,000 pts' },
  { label: 'Per move made',         value: '−5 pts' },
  { label: 'Per second elapsed',    value: '−2 pts' },
];

const TIPS = [
  { bold: 'Work the top row first.', rest: ' Slide tiles 1, 2, and 3 into the top row and lock them in before touching anything below.' },
  { bold: 'Then solve the left column.', rest: ' Place tiles 4 and 7 using a rotation technique without disturbing the top row.' },
  { bold: 'The last 4 tiles are a 2×2.', rest: ' The bottom-right block can be cycled into place by rotating clockwise or counter-clockwise.' },
  { bold: "Never force a tile.", rest: " If moving a tile would disturb completed ones, take the longer route — it saves moves overall." },
  { bold: 'Use the reference image.', rest: ' A small thumbnail of the solved logo sits beside your board at all times — glance at it often.' },
  { bold: 'Save Swap for the endgame.', rest: ' Swap is most powerful when only 2 tiles are misplaced — it can finish the puzzle instantly.' },
  { bold: 'Reshuffle is not a failure.', rest: ' If you\'re stuck in a loop, Reshuffle costs 0 moves and can give you a far easier layout.' },
];

// Demo starts one swap away from solved so there's something to do
const DEMO_INITIAL = [1, 2, 3, 4, 5, 6, 0, 7, 8];

export function HowToPlayScreen() {
  const navigate = useNavigate();
  const [demoTiles, setDemoTiles] = useState<number[]>(DEMO_INITIAL);

  function handleDemoClick(index: number) {
    if (!isMovable(demoTiles, index)) return;
    const next = [...demoTiles];
    const blank = next.indexOf(0);
    [next[index], next[blank]] = [next[blank], next[index]];
    setDemoTiles(next);
  }

  function resetDemo() {
    setDemoTiles(DEMO_INITIAL);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-32">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-1">Townhall Puzzle</h1>
          <p className="text-2xl font-extrabold text-indigo-300 mb-4">How to Play</p>
          <p className="text-indigo-200 text-lg">
            Slide tiles to reveal the lender logo.<br />
            Fastest and most efficient player wins.
          </p>
        </div>

        {/* ── Game Flow ── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-semibold">{s.title}</span>
                </div>
                <p className="text-indigo-200 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Interactive Demo ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-1">Try it yourself</h2>
          <p className="text-indigo-300 text-sm mb-4">Click a tile next to the empty space to move it.</p>
          <div className="flex flex-col items-center gap-3">
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 4rem)' }}>
              {demoTiles.map((val, idx) => {
                const blank = val === 0;
                const movable = !blank && isMovable(demoTiles, idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleDemoClick(idx)}
                    className={[
                      'w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold select-none transition-all',
                      blank
                        ? 'border-2 border-dashed border-gray-400 bg-gray-800'
                        : movable
                        ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer active:scale-95 text-white shadow-md'
                        : 'bg-white/20 text-white/80',
                    ].join(' ')}
                  >
                    {blank ? '' : val}
                  </div>
                );
              })}
            </div>
            <button
              onClick={resetDemo}
              className="text-xs text-indigo-400 hover:text-indigo-200 underline"
            >
              Reset demo
            </button>
          </div>
        </section>

        {/* ── Powerups ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Powerups</h2>
          <p className="text-indigo-300 text-sm mb-4">
            Powerups refresh at the start of each new puzzle.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {POWERUPS.map((p) => (
              <div key={p.name} className="bg-white/10 border border-white/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="ml-auto bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {p.uses}
                  </span>
                </div>
                <p className="text-indigo-200 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scoring ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Scoring</h2>
          <div className="bg-white/10 border border-white/15 rounded-xl overflow-hidden">
            {SCORING.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-3 ${
                  i < SCORING.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <span className="text-indigo-200 text-sm">{row.label}</span>
                <span className="font-mono font-bold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tips ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Tips for solving a 3×3 puzzle</h2>
          <ol className="space-y-3">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-700 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-indigo-100 text-sm">
                  <strong>{tip.bold}</strong>{tip.rest}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all active:scale-95"
          >
            Got it, let's play →
          </button>
        </div>
      </div>
    </div>
  );
}
