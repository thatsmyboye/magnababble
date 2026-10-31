"use client";

import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

/**
 * Drag sensors for tiles. Mouse drags start after a small movement; touch
 * drags need a short press-and-hold, so an ordinary swipe that starts on a
 * tile scrolls the page instead of grabbing the tile. Tiles use
 * `touch-action: manipulation` (not `none`) so the browser can still scroll.
 */
export function useTileSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
}
