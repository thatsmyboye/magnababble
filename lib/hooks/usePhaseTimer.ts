"use client";

import { useEffect, useRef } from "react";

/**
 * Fires `onExpired` once when `phaseEndsAt` passes.
 * Only the host should act on this — others wait for Realtime updates.
 */
export function usePhaseTimer(
  phaseEndsAt: string | null,
  isHost: boolean,
  onExpired: () => void
) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!phaseEndsAt || !isHost) return;
    calledRef.current = false;

    const msUntilExpiry = new Date(phaseEndsAt).getTime() - Date.now();
    if (msUntilExpiry <= 0) {
      if (!calledRef.current) {
        calledRef.current = true;
        onExpired();
      }
      return;
    }

    const timeout = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onExpired();
      }
    }, msUntilExpiry + 500); // +500ms grace to let server catch up

    return () => clearTimeout(timeout);
  }, [phaseEndsAt, isHost]); // eslint-disable-line react-hooks/exhaustive-deps
}
