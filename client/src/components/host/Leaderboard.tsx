import type { LeaderboardEntry } from '../../types/index.js';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  totalPuzzles?: number;
}

export function Leaderboard({ entries, totalPuzzles = 5 }: LeaderboardProps) {
  return (
    <div className="w-full max-w-lg">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
            <th className="pb-3 w-10">#</th>
            <th className="pb-3">Player</th>
            <th className="pb-3 text-right">Puzzles</th>
            <th className="pb-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, rank) => (
            <tr
              key={entry.playerId}
              className={`border-b border-gray-800 transition-all ${
                rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-gray-300' : rank === 2 ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              <td className="py-3 font-bold text-lg">{rank + 1}</td>
              <td className="py-3 font-semibold text-lg">{entry.name}</td>
              <td className="py-3 text-right text-sm">
                {entry.puzzlesCompleted}/{totalPuzzles}
              </td>
              <td className="py-3 text-right font-mono font-bold text-xl">
                {entry.totalScore.toLocaleString()}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-500">
                Waiting for players…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
