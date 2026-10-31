"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ConnectionState } from "@/lib/hooks/useRoom";

const RECOVERED_MS = 2_200;

/**
 * Thin banner at the top of the room: "Reconnecting…" while requests fail,
 * then a short "Back in the game" once they succeed again. Game state is
 * never lost; the last good screen stays visible underneath.
 */
export function ConnectionBanner({ connection }: { connection: ConnectionState }) {
  const [recovered, setRecovered] = useState(false);
  const previous = useRef<ConnectionState>(connection);

  useEffect(() => {
    if (previous.current === "reconnecting" && connection === "online") {
      setRecovered(true);
      const t = setTimeout(() => setRecovered(false), RECOVERED_MS);
      previous.current = connection;
      return () => clearTimeout(t);
    }
    if (connection === "reconnecting") setRecovered(false);
    previous.current = connection;
  }, [connection]);

  const show = connection === "reconnecting" || recovered;
  const reconnecting = connection === "reconnecting";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none" role="status" aria-live="polite">
      <AnimatePresence>
        {show && (
          <motion.div
            key={reconnecting ? "down" : "up"}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className={
              reconnecting
                ? "mt-2 rounded-full bg-amber-400 text-amber-950 px-4 py-1.5 text-sm font-bold shadow-lg flex items-center gap-2"
                : "mt-2 rounded-full bg-emerald-400 text-emerald-950 px-4 py-1.5 text-sm font-bold shadow-lg"
            }
          >
            {reconnecting ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-950 animate-pulse" aria-hidden />
                Reconnecting… your game is safe
              </>
            ) : (
              "Back in the game"
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
