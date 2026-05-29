import type WebSocket from 'ws';

export type GameState = 'waiting' | 'active' | 'finished';
export type PowerupType = 'peek' | 'swap' | 'freeze' | 'scramble' | 'reshuffle';

export interface PlayerPuzzle {
  imageIndex: number;
  tiles: number[];
  moves: number;
  startTime: number;
  endTime?: number;
  completed: boolean;
}

export interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomCode: string;
  puzzles: PlayerPuzzle[];
  currentPuzzleIndex: number;
  totalScore: number;
  powerups: Record<PowerupType, number>;
  isFrozen: boolean;
  freezeEndsAt?: number;
  frozenBonus: number; // ms of scoring time saved by using Freeze
}

export interface Room {
  code: string;
  hostId: string;
  hostWs?: WebSocket;
  players: Map<string, Player>;
  state: GameState;
  puzzlePool: number[];
  createdAt: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  totalScore: number;
  puzzlesCompleted: number;
}

export interface RoomSnapshot {
  code: string;
  state: GameState;
  players: { id: string; name: string; totalScore: number; puzzlesCompleted: number }[];
}

export type ClientMessage =
  | { type: 'start_game' }
  | { type: 'end_game' }
  | { type: 'tile_move'; tileIndex: number }
  | { type: 'use_powerup'; powerup: PowerupType; targetId?: string; swapIndices?: [number, number] }
  | { type: 'puzzle_complete' }
  | { type: 'restart_puzzle' }
  | { type: 'skip_puzzle' };

export type ServerMessage =
  | { type: 'room_update'; room: RoomSnapshot }
  | { type: 'game_started'; puzzleIndices: number[]; currentPuzzleIndex?: number; powerups?: Record<PowerupType, number> }
  | { type: 'board_update'; tiles: number[]; moves: number; puzzleIndex?: number }
  | { type: 'powerup_applied'; powerup: PowerupType; payload?: unknown }
  | { type: 'puzzle_solved'; imageIndex: number; puzzleScore: number; newPowerups: Record<PowerupType, number> }
  | { type: 'leaderboard_update'; leaderboard: LeaderboardEntry[] }
  | { type: 'game_over'; leaderboard: LeaderboardEntry[] }
  | { type: 'error'; message: string };
