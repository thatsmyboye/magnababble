"use client";

import { MotionConfig } from "framer-motion";

/** Honors the user's reduced-motion preference for every animation in the app. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
