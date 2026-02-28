/**
 * Ghost Broker — WebSocket client
 * Connects to ws://host/ws?channels=channel1,channel2
 * Backend channels: market.trades, market.orderbook, oracle.prices,
 *                   agent.lifecycle, agent.decisions, engine.batch,
 *                   token.burn, chain.block
 */
import { useEffect, useRef, useCallback } from 'react';
import type { WSEvent } from '@/types';

const WS_BASE = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000').replace(/\/$/, '');

export type WSChannel =
  | 'market.trades'
  | 'market.orderbook'
  | 'oracle.prices'
  | 'agent.lifecycle'
  | 'agent.decisions'
  | 'engine.batch'
  | 'token.burn'
  | 'chain.block';

interface UseGhostWSOptions {
  channels: WSChannel[];
  onEvent: (event: WSEvent) => void;
  enabled?: boolean;
}

export function useGhostWS({ channels, onEvent, enabled = true }: UseGhostWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled || channels.length === 0) return;
    const url = `${WS_BASE}/ws?channels=${channels.join(',')}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WSEvent;
        onEventRef.current(event);
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onclose = () => {
      retryRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [channels.join(','), enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
