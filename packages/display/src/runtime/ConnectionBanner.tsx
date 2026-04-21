import { useEffect, useRef, useState } from "react";
import type { DisplayClient } from "../ws/DisplayClient.js";

interface ConnectionBannerProps {
  client: DisplayClient | null;
}

type BannerState = "hidden" | "disconnected" | "reconnected";

const DISCONNECT_THRESHOLD_MS = 15_000;
const CHECK_INTERVAL_MS = 2_000;
const RECONNECTED_FLASH_MS = 2_000;

/**
 * Top-of-screen sticky banner that surfaces WS connection loss.
 *
 * - Hidden on initial load until the first message arrives.
 * - Shows amber "Disconnected — reconnecting…" when no message has been
 *   received for DISCONNECT_THRESHOLD_MS.
 * - Briefly flashes green "Reconnected" when the link recovers, then hides.
 * - Retry button forces an immediate reconnect attempt via the DisplayClient.
 *
 * z-index sits just below BlackoutOverlay (99999) so blackout always wins.
 */
export function ConnectionBanner({ client }: ConnectionBannerProps) {
  const [state, setState] = useState<BannerState>("hidden");
  const lastMessageAtRef = useRef<number | null>(null);
  const wasDisconnectedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!client) return;

    const clearFlash = () => {
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
    };

    const unsubscribe = client.onAnyMessage(() => {
      const firstMessage = lastMessageAtRef.current === null;
      lastMessageAtRef.current = Date.now();

      if (firstMessage) {
        // First ever message — stay hidden.
        return;
      }

      if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        setState("reconnected");
        clearFlash();
        flashTimerRef.current = setTimeout(() => {
          setState("hidden");
          flashTimerRef.current = null;
        }, RECONNECTED_FLASH_MS);
      }
    });

    const interval = setInterval(() => {
      const last = lastMessageAtRef.current;
      if (last === null) return; // never connected yet
      if (Date.now() - last > DISCONNECT_THRESHOLD_MS) {
        wasDisconnectedRef.current = true;
        // Don't clobber a pending "reconnected" flash retroactively — but
        // a stale timer here would be wrong. Clear it.
        clearFlash();
        setState("disconnected");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
      clearFlash();
    };
  }, [client]);

  if (state === "hidden") return null;

  const isDisconnected = state === "disconnected";
  const background = isDisconnected ? "#b7791f" : "#2f855a";
  const borderColor = isDisconnected ? "#975a16" : "#276749";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "8px 16px",
        background,
        borderBottom: `1px solid ${borderColor}`,
        color: "var(--db-font-color, #ffffff)",
        fontFamily: "var(--db-font-family, system-ui, sans-serif)",
        fontSize: "var(--db-font-size, 14px)",
        lineHeight: 1.3,
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }}
    >
      <span>
        {isDisconnected ? "Disconnected — reconnecting…" : "Reconnected"}
      </span>
      {isDisconnected && client && (
        <button
          type="button"
          onClick={() => client.reconnect()}
          style={{
            appearance: "none",
            border: `1px solid ${borderColor}`,
            background: "rgba(0,0,0,0.15)",
            color: "var(--db-font-color, #ffffff)",
            borderRadius: 4,
            padding: "2px 10px",
            fontSize: "inherit",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
