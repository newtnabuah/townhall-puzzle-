import { useLocation, useNavigate } from 'react-router-dom';
import { Leaderboard } from '../host/Leaderboard.js';
import { Button } from '../ui/Button.js';
import type { LeaderboardEntry } from '../../types/index.js';

interface LocationState {
  leaderboard: LeaderboardEntry[];
  playerName: string;
  playerId: string;
}

export function GameOverScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { leaderboard = [], playerName, playerId } = (location.state as LocationState) ?? {};

  const myEntry = leaderboard.find((e) => e.playerId === playerId);
  const myRank = leaderboard.findIndex((e) => e.playerId === playerId) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-white/20 text-white text-center">
        <div className="text-5xl mb-4">
          {myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎯'}
        </div>
        <h2 className="text-3xl font-extrabold mb-1">Game Over!</h2>
        {myEntry && (
          <p className="text-indigo-200 mb-6">
            {playerName} — Rank #{myRank} with{' '}
            <span className="font-bold text-white">{myEntry.totalScore.toLocaleString()}</span> pts
          </p>
        )}

        <div className="flex justify-center mb-8">
          <Leaderboard entries={leaderboard} />
        </div>

        <Button onClick={() => navigate('/join')} className="mx-auto">
          Play Again
        </Button>
      </div>
    </div>
  );
}
