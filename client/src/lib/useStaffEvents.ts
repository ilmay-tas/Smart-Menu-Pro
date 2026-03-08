import { useEffect, useRef } from "react";

export type StaffEventType =
  | "orders.updated"
  | "table_calls.updated"
  | "menu.updated"
  | "offers.updated"
  | "staff.updated"
  | "theme.updated";

export interface StaffStreamEvent {
  type: StaffEventType;
  restaurantId: number;
  source?: string;
  timestamp: string;
}

interface UseStaffEventsOptions {
  enabled?: boolean;
  onEvent: (event: StaffStreamEvent) => void;
}

export function useStaffEvents({ enabled = true, onEvent }: UseStaffEventsOptions): void {
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      attemptRef.current += 1;
      const delayMs = Math.min(30000, 1000 * 2 ** Math.min(attemptRef.current, 5));
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (cancelled || sourceRef.current) {
        return;
      }

      const source = new EventSource("/api/events/stream", { withCredentials: true });
      sourceRef.current = source;

      source.addEventListener("connected", () => {
        attemptRef.current = 0;
      });

      source.addEventListener("staff-event", (rawEvent) => {
        try {
          const parsed = JSON.parse((rawEvent as MessageEvent<string>).data) as StaffStreamEvent;
          onEventRef.current(parsed);
        } catch {
          // Ignore malformed event payloads to keep the stream alive.
        }
      });

      source.onerror = () => {
        if (sourceRef.current) {
          sourceRef.current.close();
          sourceRef.current = null;
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled]);
}
