import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRoom, getRoom, addPlayerToRoom, getRoomSnapshot } from './gameManager';

const router = Router();

router.post('/create', (req, res) => {
  const hostId = uuidv4();
  const room = createRoom(hostId);
  res.json({ roomCode: room.code, hostId });
});

router.post('/join', (req, res) => {
  const { roomCode, name } = req.body as { roomCode?: string; name?: string };

  if (!roomCode || !name) {
    res.status(400).json({ error: 'roomCode and name are required' });
    return;
  }

  const room = getRoom(roomCode.toUpperCase());
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (room.state !== 'waiting') {
    res.status(409).json({ error: 'Game already in progress' });
    return;
  }

  const playerId = uuidv4();
  // Player WS gets attached later on WebSocket connect; placeholder null cast here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player = addPlayerToRoom(room.code, playerId, name, null as any);
  if (!player) {
    res.status(500).json({ error: 'Failed to join room' });
    return;
  }

  res.json({ playerId, roomCode: room.code });
});

router.get('/:roomCode', (req, res) => {
  const room = getRoom(req.params.roomCode.toUpperCase());
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(getRoomSnapshot(room));
});

export default router;

