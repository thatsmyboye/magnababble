"use client";

import { useEffect, useRef } from "react";

/** The host fires first; everyone else waits a little longer as a backup. */
const HOST_GRACE_MS = 500;
const BACKUP_GRACE_MS = 3_000;
const BACKUP_JITTER_MS = 2_000;

/**
 * Fires `onExpired` once when `phaseEndsAt` passes. Every client runs this
 * so the game keeps moving even if the host's tab is closed; the server
 * compare-and-sets the transition, so duplicate calls are harmless.
 */
export function usePhaseTimer(
  phaseEndsAt: string | null | undefined,
  isHost: boolean,
  onExpired: () => void
) {
  const callback = useRef(onExpired);
  callback.current = onExpired;

  useEffect(() => {
    if (!phaseEndsAt) return;

    const grace = isHost
      ? HOST_GRACE_MS
      : BACKUP_GRACE_MS + Math.random() * BACKUP_JITTER_MS;
    const msUntilExpiry = new Date(phaseEndsAt).getTime() - Date.now() + grace;

    const timeout = setTimeout(() => callback.current(), Math.max(0, msUntilExpiry));
    return () => clearTimeout(timeout);
  }, [phaseEndsAt, isHost]);
}
