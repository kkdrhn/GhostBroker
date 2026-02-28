/**
 * useGhostWebSocket — subscribes to one or more WS channels
 * and returns the latest event received on each.
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import type { WSEvent } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

type Handler = (event: WSEvent) => void;

export function useGhostWebSocket(channels: string[], onEvent: Handler) {
  const wsRef      = useRef<WebSocket | null>(null);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      channels.forEach((ch) => {
        ws.send(JSON.stringify({ subscribe: ch }));
      });
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as WSEvent;
        onEventRef.current(data);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      retryRef.current = setTimeout(connect, 2_000);
    };

    ws.onerror = () => ws.close();
  }, [channels]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);
}
