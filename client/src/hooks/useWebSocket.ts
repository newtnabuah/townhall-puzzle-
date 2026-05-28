import { useEffect, useRef, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '../types/index.js';

type MessageHandler = (msg: ServerMessage) => void;

export function useWebSocket(
  playerId: string | null,
  roomCode: string | null,
  onMessage: MessageHandler,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef<MessageHandler>(onMessage);
  onMessageRef.current = onMessage;

  const reconnectDelay = useRef(500);

  useEffect(() => {
    if (!playerId || !roomCode) return;

    // Local flag per effect run — not a ref, so StrictMode cleanup can't poison the next run
    let active = true;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // In dev, connect directly to backend (avoids Vite proxy WS issues).
      // In prod, connect to same host and let the reverse proxy forward.
      const backendHost = import.meta.env.VITE_BACKEND_HOST ?? window.location.host;
      const url = `${protocol}://${backendHost}/ws?playerId=${playerId}&roomCode=${roomCode}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelay.current = 500;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        // Only null the ref if this exact ws is still current.
        // Without this guard, the async onclose from a StrictMode-discarded
        // ws fires after the new ws has already been stored, wiping it out.
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (active) {
          setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 8000);
            connect();
          }, reconnectDelay.current);
        }
      };
    }

    connect();

    return () => {
      active = false;
      wsRef.current?.close();
    };
  }, [playerId, roomCode]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
