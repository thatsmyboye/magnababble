"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";

const STORAGE_KEY = "magnababble_reduce_motion";

interface MotionPreference {
  /** True when the player turned animations off in the app. */
  reduced: boolean;
  setReduced: (reduced: boolean) => void;
}

const MotionPreferenceContext = createContext<MotionPreference>({
  reduced: false,
  setReduced: () => {},
});

export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}

/**
 * Animations follow the device's reduced-motion setting, and players can
 * also turn them off in the app. The in-app switch covers Framer Motion
 * (via MotionConfig) and CSS animations (via a data attribute on <html>).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReducedState] = useState(false);

  useEffect(() => {
    try {
      setReducedState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage unavailable — keep the default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduced ? "true" : "false";
  }, [reduced]);

  const setReduced = useCallback((next: boolean) => {
    setReducedState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Preference just won't persist.
    }
  }, []);

  return (
    <MotionPreferenceContext.Provider value={{ reduced, setReduced }}>
      <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}

/** Small switch for turning animations on or off. */
export function MotionToggle({ className }: { className?: string }) {
  const { reduced, setReduced } = useMotionPreference();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!reduced}
      onClick={() => setReduced(!reduced)}
      className={
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white " +
        (className ?? "")
      }
    >
      <span
        aria-hidden
        className={
          "relative inline-block w-7 h-4 rounded-full transition-colors " +
          (reduced ? "bg-white/20" : "bg-violet-500")
        }
      >
        <span
          className={
            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all " + (reduced ? "left-0.5" : "left-3.5")
          }
        />
      </span>
      Animations {reduced ? "off" : "on"}
    </button>
  );
}
