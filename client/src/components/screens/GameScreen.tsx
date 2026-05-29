import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useGameState } from '../../hooks/useGameState.js';
import { useAudio, startBackgroundMusic } from '../../hooks/useAudio.js';
import { PuzzleBoard } from '../game/PuzzleBoard.js';
import { PowerupBar } from '../game/PowerupBar.js';
import { Leaderboard } from '../host/Leaderboard.js';
import type { PowerupType, ServerMessage } from '../../types/index.js';

interface LocationState {
  playerId: string;
  roomCode: string;
  playerName: string;
  isHost: boolean;
}

export function GameScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId, roomCode, playerName, isHost } = (location.state as LocationState) ?? {};

  const { state, handleMessage, setIdentity, deactivatePeek, decrementPowerup, clearSolvedPuzzle, clearScrambled } =
    useGameState();

  const { playTileMove, playSolved, playScrambled, playPowerup, playGameOver, muted, toggleMute } =
    useAudio();

  // Swap mode: two-step tile selection
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState<number | null>(null);

  // Scramble target selection
  const [scrambleTargetMode, setScrambleTargetMode] = useState(false);

  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solvedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrambledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Elapsed display timer — pauses while freeze is active
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const frozenUntilRef = useRef<number | null>(null);
  frozenUntilRef.current = state.frozenUntil;

  useEffect(() => {
    if (playerId && roomCode) setIdentity(playerId, roomCode, playerName, isHost);
  }, [playerId, roomCode, playerName, isHost, setIdentity]);

  // Preload all puzzle images as soon as the indices are known
  useEffect(() => {
    if (state.puzzleIndices.length === 0) return;
    state.puzzleIndices.forEach((idx) => {
      const img = new Image();
      img.src = `/logos/logo${idx + 1}.webp`;
    });
  }, [state.puzzleIndices]);

  // Single persistent interval — reads frozenUntilRef to avoid restart issues
  useEffect(() => {
    const interval = setInterval(() => {
      const frozen = frozenUntilRef.current;
      if (frozen && Date.now() < frozen) {
        startTimeRef.current += 1000;
        return;
      }
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss peek
  useEffect(() => {
    if (!state.peekActive) return;
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => deactivatePeek(), 2500);
  }, [state.peekActive, deactivatePeek]);

  // Auto-dismiss scramble notification + play sound
  useEffect(() => {
    if (!state.scrambled) return;
    playScrambled();
    if (scrambledTimerRef.current) clearTimeout(scrambledTimerRef.current);
    scrambledTimerRef.current = setTimeout(() => clearScrambled(), 2500);
  }, [state.scrambled, clearScrambled]);

  // Auto-dismiss solved overlay + play sound
  useEffect(() => {
    if (!state.solvedPuzzle) return;
    playSolved();
    if (solvedTimerRef.current) clearTimeout(solvedTimerRef.current);
    solvedTimerRef.current = setTimeout(() => clearSolvedPuzzle(), 2500);
    setSwapMode(false);
    setSwapFirst(null);
  }, [state.solvedPuzzle, clearSolvedPuzzle]);

  const onMessage = (msg: ServerMessage) => {
    handleMessage(msg);
  };

  // Navigate to game over (after solved overlay if showing) + play fanfare
  useEffect(() => {
    if (state.gameOver && !state.solvedPuzzle) {
      playGameOver();
      navigate('/over', { state: { leaderboard: state.leaderboard, playerName, playerId } });
    }
  }, [state.gameOver, state.solvedPuzzle]);

  const { send } = useWebSocket(playerId, roomCode, onMessage);

  function handleTileClick(gridIndex: number) {
    startBackgroundMusic(); // ensure music is running (resumes if tab was backgrounded)
    if (swapMode) {
      if (swapFirst === null) {
        setSwapFirst(gridIndex);
      } else if (swapFirst !== gridIndex) {
        decrementPowerup('swap');
        send({ type: 'use_powerup', powerup: 'swap', swapIndices: [swapFirst, gridIndex] });
        playPowerup('swap');
        setSwapMode(false);
        setSwapFirst(null);
      }
      return;
    }
    playTileMove();
    send({ type: 'tile_move', tileIndex: gridIndex });
  }

  function handlePowerup(powerup: PowerupType) {
    if (powerup === 'swap') {
      if ((state.powerups.swap ?? 0) <= 0) return;
      setSwapMode(true);
      setSwapFirst(null);
      return;
    }
    if (powerup === 'scramble') {
      if ((state.powerups.scramble ?? 0) <= 0) return;
      setScrambleTargetMode(true);
      return;
    }
    decrementPowerup(powerup);
    send({ type: 'use_powerup', powerup });
    playPowerup(powerup);
    if (powerup === 'peek') {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => deactivatePeek(), 2500);
    }
  }

  function handleScrambleTarget(targetId: string) {
    decrementPowerup('scramble');
    send({ type: 'use_powerup', powerup: 'scramble', targetId });
    playPowerup('scramble');
    setScrambleTargetMode(false);
  }

  const freezeActive = !!(state.frozenUntil && Date.now() < state.frozenUntil);
  const totalPuzzles = state.puzzleIndices.length || 2;
  const puzzleNum = Math.min(state.currentPuzzleIndex + 1, totalPuzzles);
  const imageIndex = state.puzzleIndices[state.currentPuzzleIndex] ?? 0;
  const opponents = state.leaderboard.filter((e) => e.playerId !== playerId);

  if (!playerId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        No game data.{' '}
        <button onClick={() => navigate('/join')} className="underline ml-2">Go home</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 to-indigo-950 flex flex-col items-center justify-center gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-5xl">
        <div className="text-white font-bold text-lg">{playerName}</div>
        <div className="text-indigo-300 text-sm">Puzzle {puzzleNum} / {totalPuzzles}</div>
        <div className="flex items-center gap-3">
          <div className={`font-mono text-lg ${freezeActive ? 'text-cyan-300' : 'text-white'}`}>
            {freezeActive ? '⏸' : '⏱'} {formatTime(elapsed)}
          </div>
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            className="text-lg text-gray-400 hover:text-white transition-colors"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Puzzle column */}
        <div className="flex flex-col items-center gap-3">
          {/* Status banners */}
          {freezeActive && (
            <div className="bg-cyan-500/20 text-cyan-300 rounded-xl px-4 py-2 text-sm font-semibold animate-pulse">
              ⏸ Timer paused — +5s saved to your score
            </div>
          )}
          {swapMode && (
            <div className="bg-yellow-500/20 text-yellow-300 rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-3">
              🔄 {swapFirst === null ? 'Click the first tile to swap' : 'Now click the second tile'}
              <button
                onClick={() => { setSwapMode(false); setSwapFirst(null); }}
                className="text-xs underline text-yellow-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {state.tiles.length > 0 ? (
            <PuzzleBoard
              tiles={state.tiles}
              imageIndex={imageIndex}
              peekActive={state.peekActive}
              swapMode={swapMode}
              swapFirstIndex={swapFirst}
              onTileClick={handleTileClick}
            />
          ) : (
            <div
              className="bg-white/10 rounded-xl flex items-center justify-center text-white animate-pulse"
              style={{ width: 368, height: 368 }}
            >
              Loading puzzle…
            </div>
          )}

          {/* Move counter + action buttons */}
          <div className="flex items-center gap-3">
            <p className="text-indigo-300 text-sm">
              Moves: <span className="font-bold text-white">{state.moves}</span>
            </p>
            <button
              onClick={() => send({ type: 'restart_puzzle' })}
              title="Reshuffle the same image (+10 move penalty)"
              className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg px-3 py-1 transition-colors"
            >
              ↺ Reshuffle <span className="text-red-400">+10</span>
            </button>
            <button
              onClick={() => send({ type: 'skip_puzzle' })}
              title="Skip to a completely new random puzzle"
              className="text-xs text-orange-400 hover:text-orange-200 border border-orange-700 hover:border-orange-400 rounded-lg px-3 py-1 transition-colors"
            >
              ⏭ New puzzle
            </button>
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/10 min-w-[220px]">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">Leaderboard</p>
          <Leaderboard entries={state.leaderboard} totalPuzzles={totalPuzzles} />
        </div>
      </div>

      {/* Powerups */}
      <div className="w-full max-w-5xl">
        <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider text-center mb-3">
          Powerups
        </p>
        <PowerupBar
          powerups={state.powerups}
          players={state.leaderboard}
          currentPlayerId={playerId}
          swapModeActive={swapMode}
          onUse={handlePowerup}
        />

        {/* Scramble target picker */}
        {scrambleTargetMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/20 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
              <div className="text-4xl mb-3">🌀</div>
              <h2 className="text-xl font-extrabold text-white mb-1">Scramble who?</h2>
              <p className="text-gray-400 text-sm mb-6">Their board gets reshuffled +5 moves</p>
              <div className="space-y-2 mb-5">
                {opponents.length === 0 ? (
                  <p className="text-gray-500 text-sm py-2">No opponents to target</p>
                ) : (
                  opponents.map((p) => (
                    <button
                      key={p.playerId}
                      onClick={() => handleScrambleTarget(p.playerId)}
                      className="w-full flex items-center justify-between bg-red-900/30 hover:bg-red-800/50 border border-red-700/50 hover:border-red-500 rounded-xl px-5 py-3 text-white font-semibold transition-all active:scale-95"
                    >
                      <span>{p.name}</span>
                      <span className="text-gray-400 text-sm font-normal">{p.totalScore.toLocaleString()} pts</span>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setScrambleTargetMode(false)}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scramble notification */}
      {state.scrambled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-red-500 rounded-3xl px-10 py-8 text-center shadow-2xl max-w-xs mx-4 animate-shake">
            <div className="text-6xl mb-4">🌀</div>
            <h2 className="text-3xl font-extrabold text-red-400 mb-2">Scrambled!</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              An opponent reshuffled your board<br />
              <span className="text-red-400 font-semibold">+5 moves added to your score</span>
            </p>
          </div>
        </div>
      )}

      {/* Puzzle solved overlay */}
      {state.solvedPuzzle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-3xl p-8 text-center shadow-2xl border border-green-500/40 max-w-xs mx-4 animate-slide-in">
            <div className="text-5xl mb-3">🎉</div>
            <img
              src={`/logos/logo${state.solvedPuzzle.imageIndex + 1}.webp`}
              alt="solved puzzle"
              className="w-44 h-44 object-cover rounded-2xl mx-auto mb-4 ring-4 ring-green-400 shadow-lg"
              draggable={false}
            />
            <h2 className="text-2xl font-extrabold text-green-400 mb-1">Puzzle Solved!</h2>
            <p className="text-white text-2xl font-mono font-bold">
              +{state.solvedPuzzle.puzzleScore.toLocaleString()} pts
            </p>
            {state.currentPuzzleIndex < totalPuzzles - 1 && (
              <p className="text-gray-400 text-sm mt-3">Powerups refilled — last puzzle incoming…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
