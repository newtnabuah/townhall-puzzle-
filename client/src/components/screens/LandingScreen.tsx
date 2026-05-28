import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.js';

export function LandingScreen() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) {
      setError('Enter your name and room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), roomCode: roomCode.trim().toUpperCase() }),
      });
      const data = await res.json() as { playerId?: string; roomCode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to join');
      navigate('/lobby', {
        state: {
          playerId: data.playerId,
          roomCode: data.roomCode,
          playerName: name.trim(),
          isHost: false,
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    // Host view is at /host — it creates the room itself
    navigate('/host');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur rounded-3xl p-10 w-full max-w-md shadow-2xl border border-white/20">
        <h1 className="text-4xl font-extrabold text-white text-center mb-2">
          Townhall Puzzle
        </h1>
        <p className="text-indigo-200 text-center mb-8 text-sm">
          Race to solve lender logo puzzles with your team!
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-indigo-200 text-sm font-medium block mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={24}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-indigo-200 text-sm font-medium block mb-1">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. XK7T2P"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono tracking-widest uppercase"
            />
          </div>

          {error && <p className="text-red-300 text-sm text-center">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Joining…' : 'Join Game'}
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 border-t border-white/20" />
          <span className="text-indigo-300 text-xs">OR</span>
          <div className="flex-1 border-t border-white/20" />
        </div>

        <Button
          variant="secondary"
          onClick={handleCreate}
          disabled={loading}
          className="w-full mt-4"
        >
          Create Room (Host)
        </Button>
      </div>
    </div>
  );
}
