import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useGameState } from '../../hooks/useGameState.js';
import { Button } from '../ui/Button.js';
import type { ServerMessage } from '../../types/index.js';

interface LocationState {
  playerId: string;
  roomCode: string;
  playerName: string;
  isHost: boolean;
}

export function LobbyScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId, roomCode, playerName, isHost } = (location.state as LocationState) ?? {};

  const { state, handleMessage, setIdentity } = useGameState();

  useEffect(() => {
    if (playerId && roomCode) {
      setIdentity(playerId, roomCode, playerName, isHost);
    }
  }, [playerId, roomCode, playerName, isHost, setIdentity]);

  const onMessage = (msg: ServerMessage) => {
    handleMessage(msg);
    if (msg.type === 'game_started') {
      navigate('/game', {
        state: { playerId, roomCode, playerName, isHost },
      });
    }
  };

  const { send } = useWebSocket(
    state.playerId ?? playerId,
    state.roomCode ?? roomCode,
    onMessage,
  );

  if (!playerId || !roomCode) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        No room data. <button onClick={() => navigate('/join')} className="underline ml-2">Go back</button>
      </div>
    );
  }

  const players = state.room?.players ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur rounded-3xl p-10 w-full max-w-md shadow-2xl border border-white/20 text-white">
        <h2 className="text-2xl font-bold text-center mb-1">Lobby</h2>
        <p className="text-indigo-200 text-center text-sm mb-6">
          Room Code:{' '}
          <span className="font-mono text-lg tracking-widest bg-white/10 px-3 py-1 rounded-lg">
            {roomCode}
          </span>
        </p>

        <div className="mb-6">
          <p className="text-indigo-300 text-sm mb-3">Players ({players.length})</p>
          <ul className="space-y-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
              >
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="font-semibold">{p.name}</span>
                {p.id === playerId && (
                  <span className="ml-auto text-xs text-indigo-300">(you)</span>
                )}
                {isHost && p.id === playerId && (
                  <span className="ml-auto text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">
                    Host
                  </span>
                )}
              </li>
            ))}
            {players.length === 0 && (
              <li className="text-center text-indigo-300 text-sm py-4">Connecting…</li>
            )}
          </ul>
        </div>

        {isHost ? (
          <Button
            className="w-full"
            disabled={players.length < 1}
            onClick={() => send({ type: 'start_game' })}
          >
            Start Game
          </Button>
        ) : (
          <p className="text-center text-indigo-300 text-sm">
            Waiting for host to start the game…
          </p>
        )}
      </div>
    </div>
  );
}
