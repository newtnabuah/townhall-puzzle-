import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import {
  getRoom,
  getRoomSnapshot,
  getLeaderboard,
  broadcastToRoom,
  sendToPlayer,
  assignPuzzlesToPlayer,
} from './gameManager';
import { assignPuzzles, shuffleTiles } from './puzzleAssigner';
import { calcFinalScore, calcPuzzleScore } from './scoreCalculator';
import type { ClientMessage, Player, PowerupType, Room } from './types/index';

const GRID = 3;
const SOLVED_TILES = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const DEFAULT_POWERUPS: Record<PowerupType, number> = {
  peek: 2, swap: 3, freeze: 1, scramble: 1, reshuffle: 3,
};

function isSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => t === SOLVED_TILES[i]);
}

function isAdjacent(a: number, b: number): boolean {
  const rowA = Math.floor(a / GRID), colA = a % GRID;
  const rowB = Math.floor(b / GRID), colB = b % GRID;
  return (
    (rowA === rowB && Math.abs(colA - colB) === 1) ||
    (colA === colB && Math.abs(rowA - rowB) === 1)
  );
}

function checkAllFinished(room: Room): boolean {
  if (room.players.size === 0) return false;
  for (const player of room.players.values()) {
    if (player.currentPuzzleIndex < player.puzzles.length) return false;
  }
  return true;
}

export function attachWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const rawUrl = req.url ?? '/';
    const params = new URL(rawUrl, 'http://localhost').searchParams;
    const playerId = params.get('playerId');
    const roomCode = params.get('roomCode');

    if (!playerId || !roomCode) {
      ws.close(1008, 'Missing playerId or roomCode');
      return;
    }

    const room = getRoom(roomCode.toUpperCase());
    if (!room) {
      ws.close(1008, 'Room not found');
      return;
    }

    // Host projector connection - no player record needed
    if (playerId === room.hostId) {
      room.hostWs = ws;
      ws.send(JSON.stringify({ type: 'room_update', room: getRoomSnapshot(room) }));

      ws.on('message', (raw) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as ClientMessage;
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
          return;
        }
        handleHostMessage(room, ws, msg);
      });

      ws.on('close', () => {
        room.hostWs = undefined;
      });
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      ws.close(1008, 'Player not in room');
      return;
    }

    // Attach the live WS connection to the player
    player.ws = ws;

    // Broadcast updated player list to host and all connected players
    broadcastToRoom(room, { type: 'room_update', room: getRoomSnapshot(room) });

    // Resync game state on reconnect
    if (room.state === 'active' && player.puzzles.length > 0) {
      sendToPlayer(player, {
        type: 'game_started',
        puzzleIndices: player.puzzles.map((pz) => pz.imageIndex),
        currentPuzzleIndex: player.currentPuzzleIndex,
        powerups: player.powerups,
      });
      const current = player.puzzles[player.currentPuzzleIndex];
      if (current && !current.completed) {
        sendToPlayer(player, {
          type: 'board_update',
          tiles: [...current.tiles],
          moves: current.moves,
        });
      }
      sendToPlayer(player, { type: 'leaderboard_update', leaderboard: getLeaderboard(room) });
    }

    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendToPlayer(player, { type: 'error', message: 'Invalid message' });
        return;
      }

      handleMessage(room, player, msg);
    });

    ws.on('close', () => {
      // Keep player in room on disconnect; they can reconnect
    });
  });
}

function handleMessage(room: Room, player: Player, msg: ClientMessage): void {
  switch (msg.type) {
    case 'tile_move':
      handleTileMove(room, player, msg.tileIndex);
      break;
    case 'use_powerup':
      handlePowerup(room, player, msg.powerup, msg.targetId, msg.swapIndices);
      break;
    case 'restart_puzzle':
      handleRestartPuzzle(room, player);
      break;
    case 'skip_puzzle':
      handleSkipPuzzle(room, player);
      break;
    case 'puzzle_complete':
      break;
  }
}

function handleHostMessage(room: Room, ws: WebSocket, msg: ClientMessage): void {
  if (msg.type === 'start_game') {
    if (room.state !== 'waiting') {
      ws.send(JSON.stringify({ type: 'error', message: 'Cannot start game' }));
      return;
    }
    startGame(room);
  }
}

function startGame(room: Room): void {
  if (room.state !== 'waiting') return;

  room.state = 'active';
  const now = Date.now();

  for (const p of room.players.values()) {
    const puzzles = assignPuzzles(room.puzzlePool);
    puzzles.forEach((pz) => (pz.startTime = now));
    assignPuzzlesToPlayer(p, puzzles);
    p.powerups = { ...DEFAULT_POWERUPS };
    sendToPlayer(p, {
      type: 'game_started',
      puzzleIndices: puzzles.map((pz) => pz.imageIndex),
      powerups: p.powerups,
    });
    sendToPlayer(p, {
      type: 'board_update',
      tiles: [...puzzles[0].tiles],
      moves: 0,
    });
  }

  // Notify host screen
  if (room.hostWs && room.hostWs.readyState === 1) {
    room.hostWs.send(JSON.stringify({ type: 'game_started', puzzleIndices: [] }));
  }

  broadcastToRoom(room, { type: 'leaderboard_update', leaderboard: getLeaderboard(room) });
}

function handleTileMove(room: Room, player: Player, tileIndex: number): void {
  if (room.state !== 'active') return;

  const puzzle = player.puzzles[player.currentPuzzleIndex];
  if (!puzzle || puzzle.completed) return;

  // Stamp start time on the very first move so the clock is accurate
  // regardless of reconnect timing (startTime stays 0 until then).
  if (puzzle.moves === 0 || puzzle.startTime === 0) {
    puzzle.startTime = Date.now();
  }

  const blankIndex = puzzle.tiles.indexOf(0);
  if (!isAdjacent(tileIndex, blankIndex)) return;

  // Swap
  [puzzle.tiles[tileIndex], puzzle.tiles[blankIndex]] = [
    puzzle.tiles[blankIndex],
    puzzle.tiles[tileIndex],
  ];
  puzzle.moves++;

  sendToPlayer(player, {
    type: 'board_update',
    tiles: [...puzzle.tiles],
    moves: puzzle.moves,
  });

  if (isSolved(puzzle.tiles)) {
    completePuzzle(room, player);
  }
}

function completePuzzle(room: Room, player: Player): void {
  const puzzle = player.puzzles[player.currentPuzzleIndex];
  puzzle.completed = true;
  puzzle.endTime = Date.now();

  const rawMs = puzzle.endTime - puzzle.startTime;
  const netMs = Math.max(0, rawMs - player.frozenBonus);
  const seconds = Math.floor(netMs / 1000);
  const puzzleScore = calcPuzzleScore(puzzle.moves, seconds);

  console.log(
    `[score] ${player.name} puzzle=${player.currentPuzzleIndex} moves=${puzzle.moves} ` +
    `startTime=${puzzle.startTime} endTime=${puzzle.endTime} rawMs=${rawMs} ` +
    `frozenBonus=${player.frozenBonus}ms netMs=${netMs} seconds=${seconds} score=${puzzleScore}`,
  );

  player.currentPuzzleIndex++;

  // Accumulate — do NOT recompute from scratch; puzzleScore already has frozenBonus applied
  player.totalScore += puzzleScore;

  // Reset powerups and freeze bonus for the next puzzle
  const newPowerups: Record<PowerupType, number> = { ...DEFAULT_POWERUPS };
  player.powerups = newPowerups;
  player.frozenBonus = 0;

  // Congratulatory message with score earned and fresh powerups
  sendToPlayer(player, {
    type: 'puzzle_solved',
    imageIndex: puzzle.imageIndex,
    puzzleScore,
    newPowerups,
  });

  broadcastToRoom(room, { type: 'leaderboard_update', leaderboard: getLeaderboard(room) });

  if (player.currentPuzzleIndex < player.puzzles.length) {
    const next = player.puzzles[player.currentPuzzleIndex];
    next.startTime = Date.now();
    sendToPlayer(player, {
      type: 'board_update',
      tiles: [...next.tiles],
      moves: 0,
      puzzleIndex: player.currentPuzzleIndex,
    });
  }

  if (checkAllFinished(room)) {
    room.state = 'finished';
    broadcastToRoom(room, { type: 'game_over', leaderboard: getLeaderboard(room) });
  }
}

function handleSkipPuzzle(room: Room, player: Player): void {
  if (room.state !== 'active') return;
  const puzzle = player.puzzles[player.currentPuzzleIndex];
  if (!puzzle || puzzle.completed) return;

  // Pick a new random image, avoiding duplicates where possible
  const usedIndices = new Set(player.puzzles.map((p) => p.imageIndex));
  const available = room.puzzlePool.filter((i) => !usedIndices.has(i));
  const pool = available.length > 0 ? available : room.puzzlePool;
  const newImageIndex = pool[Math.floor(Math.random() * pool.length)];

  puzzle.imageIndex = newImageIndex;
  puzzle.tiles = shuffleTiles();
  puzzle.moves = 0;
  puzzle.startTime = 0;
  puzzle.completed = false;
  puzzle.endTime = undefined;

  // Resend updated puzzle list so client knows the image changed
  sendToPlayer(player, {
    type: 'game_started',
    puzzleIndices: player.puzzles.map((p) => p.imageIndex),
    currentPuzzleIndex: player.currentPuzzleIndex,
    powerups: player.powerups,
  });
  sendToPlayer(player, {
    type: 'board_update',
    tiles: [...puzzle.tiles],
    moves: 0,
    puzzleIndex: player.currentPuzzleIndex,
  });
}

function handleRestartPuzzle(room: Room, player: Player): void {
  if (room.state !== 'active') return;
  const puzzle = player.puzzles[player.currentPuzzleIndex];
  if (!puzzle || puzzle.completed) return;
  puzzle.tiles = shuffleTiles();
  puzzle.moves += 10; // 10-move penalty per restart
  puzzle.startTime = 0; // will re-stamp on first move after restart
  sendToPlayer(player, {
    type: 'board_update',
    tiles: [...puzzle.tiles],
    moves: puzzle.moves,
  });
}

function handlePowerup(
  room: Room,
  player: Player,
  powerup: string,
  targetId?: string,
  swapIndices?: [number, number],
): void {
  if (room.state !== 'active') return;

  const validPowerups: PowerupType[] = ['peek', 'swap', 'freeze', 'scramble', 'reshuffle'];
  if (!validPowerups.includes(powerup as PowerupType)) return;

  const pu = powerup as PowerupType;

  if (player.powerups[pu] <= 0) {
    sendToPlayer(player, { type: 'error', message: `No ${pu} powerups remaining` });
    return;
  }

  player.powerups[pu]--;

  switch (pu) {
    case 'peek':
      sendToPlayer(player, { type: 'powerup_applied', powerup: 'peek', payload: { duration: 2500 } });
      break;

    case 'swap': {
      const puzzle = player.puzzles[player.currentPuzzleIndex];
      if (!puzzle || puzzle.completed) break;
      const [a, b] = swapIndices ?? [];
      if (a === undefined || b === undefined || a === b) break;
      if (a < 0 || a >= puzzle.tiles.length || b < 0 || b >= puzzle.tiles.length) break;
      [puzzle.tiles[a], puzzle.tiles[b]] = [puzzle.tiles[b], puzzle.tiles[a]];
      sendToPlayer(player, {
        type: 'board_update',
        tiles: [...puzzle.tiles],
        moves: puzzle.moves,
      });
      sendToPlayer(player, { type: 'powerup_applied', powerup: 'swap' });
      if (isSolved(puzzle.tiles)) completePuzzle(room, player);
      break;
    }

    case 'freeze': {
      // Pause the scoring timer for 5 s — no movement block, just banks the time.
      const FREEZE_MS = 5000;
      player.frozenBonus += FREEZE_MS;
      sendToPlayer(player, {
        type: 'powerup_applied',
        powerup: 'freeze',
        payload: { duration: FREEZE_MS },
      });
      break;
    }

    case 'scramble': {
      if (!targetId) break;
      const target = room.players.get(targetId);
      if (!target || target.id === player.id) break;
      const targetPuzzle = target.puzzles[target.currentPuzzleIndex];
      if (!targetPuzzle || targetPuzzle.completed) break;
      targetPuzzle.tiles = shuffleTiles();
      targetPuzzle.moves += 5;
      sendToPlayer(target, {
        type: 'board_update',
        tiles: [...targetPuzzle.tiles],
        moves: targetPuzzle.moves,
      });
      sendToPlayer(target, { type: 'powerup_applied', powerup: 'scramble' });
      break;
    }

    case 'reshuffle': {
      // Reshuffle your own current puzzle for a potentially easier arrangement
      const puzzle = player.puzzles[player.currentPuzzleIndex];
      if (!puzzle || puzzle.completed) break;
      puzzle.tiles = shuffleTiles();
      // No move penalty — just a new layout
      sendToPlayer(player, {
        type: 'board_update',
        tiles: [...puzzle.tiles],
        moves: puzzle.moves,
      });
      sendToPlayer(player, { type: 'powerup_applied', powerup: 'reshuffle' });
      break;
    }
  }

  broadcastToRoom(room, { type: 'leaderboard_update', leaderboard: getLeaderboard(room) });
}

