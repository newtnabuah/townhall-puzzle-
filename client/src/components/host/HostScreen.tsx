import { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useGameState } from '../../hooks/useGameState.js';
import { Leaderboard } from './Leaderboard.js';
import { Button } from '../ui/Button.js';
import type { ServerMessage, RoomSnapshot } from '../../types/index.js';

export function HostScreen() {
  const [hostId, setHostId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const { state, handleMessage, setIdentity } = useGameState();

  const onMessage = (msg: ServerMessage) => {
    handleMessage(msg);
    if (msg.type === 'game_started') {
      setGameStarted(true);
    }
  };

  const { send } = useWebSocket(hostId, roomCode, onMessage);

  async function createRoom() {
    setCreating(true);
    try {
      const res = await fetch('/api/rooms/create', { method: 'POST' });
      const data = await res.json() as { roomCode: string; hostId: string };
      setHostId(data.hostId);
      setRoomCode(data.roomCode);
      setIdentity(data.hostId, data.roomCode, 'Host', true);
    } finally {
      setCreating(false);
    }
  }

  const room: RoomSnapshot | null = state.room;
  const players = room?.players ?? [];

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-white mb-4">Townhall Puzzle</h1>
          <p className="text-gray-400 mb-8">Host / Projector View</p>
          <Button onClick={createRoom} disabled={creating} className="text-lg px-10 py-4">
            {creating ? 'Creating…' : 'Create Room'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-8">
      {/* Room code display */}
      <div className="text-center">
        <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Room Code</p>
        <div className="text-7xl font-extrabold text-white font-mono tracking-[0.2em] bg-indigo-900/50 px-8 py-4 rounded-3xl border border-indigo-500/30">
          {roomCode}
        </div>
        <p className="text-gray-500 text-sm mt-2">Players join at the game URL</p>
      </div>

      {/* Leaderboard */}
      <div className="w-full max-w-2xl bg-white/5 rounded-3xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {gameStarted ? 'Live Leaderboard' : 'Players in Lobby'}
        </h2>
        {gameStarted ? (
          <Leaderboard entries={state.leaderboard} />
        ) : (
          <ul className="space-y-3">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-5 py-4 text-white font-semibold text-lg"
              >
                <span className="w-3 h-3 bg-green-400 rounded-full" />
                {p.name}
              </li>
            ))}
            {players.length === 0 && (
              <p className="text-gray-500 text-center py-4">Waiting for players…</p>
            )}
          </ul>
        )}
      </div>

      {/* Start button */}
      {!gameStarted && (
        <Button
          className="text-lg px-10 py-4"
          disabled={players.length < 1}
          onClick={() => send({ type: 'start_game' })}
        >
          Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
        </Button>
      )}

      {room?.state === 'finished' && (
        <div className="text-center">
          <p className="text-green-400 text-2xl font-bold mb-4">Game Complete!</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            New Game
          </Button>
        </div>
      )}
    </div>
  );
}
