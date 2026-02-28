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

// Backend deploy edilmemişse (localhost veya tanımsızsa) WS'i devre dışı bırak
const WS_ENABLED = !!import.meta.env.VITE_WS_URL &&
  !import.meta.env.VITE_WS_URL.includes('localhost');

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

  // WS_ENABLED false ise (localhost / env var yok) hiç bağlanma
  const isEnabled = enabled && WS_ENABLED;

  const connect = useCallback(() => {
    if (!isEnabled || channels.length === 0) return;
    const url = `${WS_BASE}/ws?channels=${channels.join(',')}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return; // WebSocket açılamazsa sessizce çık
    }
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
      if (isEnabled) retryRef.current = setTimeout(connect, 5000); // 2s yerine 5s
    };

    ws.onerror = () => {
      ws.close(); // onerror → onclose → retry zinciri
    };
  }, [channels.join(','), isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

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
