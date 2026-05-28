import { v4 as uuidv4 } from 'uuid';
import type WebSocket from 'ws';
import type { Room, Player, PlayerPuzzle, ServerMessage, LeaderboardEntry, RoomSnapshot } from './types/index';

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(hostId: string): Room {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    hostId,
    players: new Map(),
    state: 'waiting',
    puzzlePool: [0, 1, 2, 3, 4, 5, 6],
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function addPlayerToRoom(
  roomCode: string,
  playerId: string,
  name: string,
  ws: WebSocket,
): Player | null {
  const room = rooms.get(roomCode);
  if (!room || room.state !== 'waiting') return null;

  const defaultPowerups = { peek: 2, swap: 3, freeze: 1, scramble: 1, reshuffle: 3 };

  const player: Player = {
    id: playerId,
    name,
    ws,
    roomCode,
    puzzles: [],
    currentPuzzleIndex: 0,
    totalScore: 0,
    powerups: defaultPowerups,
    isFrozen: false,
    frozenBonus: 0,
  };

  room.players.set(playerId, player);
  return player;
}

export function removePlayer(playerId: string, roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.players.delete(playerId);
  if (room.players.size === 0) {
    rooms.delete(roomCode);
  }
}

export function getRoomSnapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    state: room.state,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      totalScore: p.totalScore,
      puzzlesCompleted: p.puzzles.filter((pz) => pz.completed).length,
    })),
  };
}

export function getLeaderboard(room: Room): LeaderboardEntry[] {
  return Array.from(room.players.values())
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      totalScore: p.totalScore,
      puzzlesCompleted: p.puzzles.filter((pz) => pz.completed).length,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

export function broadcastToRoom(room: Room, msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  if (room.hostWs && room.hostWs.readyState === 1) {
    room.hostWs.send(data);
  }
  for (const player of room.players.values()) {
    if (player.ws && player.ws.readyState === 1 /* OPEN */) {
      player.ws.send(data);
    }
  }
}

export function sendToPlayer(player: Player, msg: ServerMessage): void {
  if (player.ws.readyState === 1) {
    player.ws.send(JSON.stringify(msg));
  }
}

export function assignPuzzlesToPlayer(player: Player, puzzles: PlayerPuzzle[]): void {
  player.puzzles = puzzles;
  player.currentPuzzleIndex = 0;
}

// Auto-expire rooms after 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

