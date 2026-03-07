import { useState, useEffect } from "react";
import type { EntityState } from "../template/engine.js";

interface BlackoutOverlayProps {
  blackoutEntity?: string | null;
  blackoutStartTime?: string | null;
  blackoutEndTime?: string | null;
  entities: Record<string, EntityState>;
}

function isWithinTimeRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 09:00-17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 23:00-07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export function BlackoutOverlay({
  blackoutEntity,
  blackoutStartTime,
  blackoutEndTime,
  entities,
}: BlackoutOverlayProps) {
  const [timeActive, setTimeActive] = useState(false);

  useEffect(() => {
    if (!blackoutStartTime || !blackoutEndTime) {
      setTimeActive(false);
      return;
    }

    const check = () => setTimeActive(isWithinTimeRange(blackoutStartTime, blackoutEndTime));
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [blackoutStartTime, blackoutEndTime]);

  const entityActive = blackoutEntity
    ? entities[blackoutEntity]?.state === "on"
    : false;

  const active = entityActive || timeActive;

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 99999,
      }}
    />
  );
}
