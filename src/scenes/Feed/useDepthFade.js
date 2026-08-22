// src/scenes/Feed/useDepthFade.js
//
// Shared by every Html-anchored element in the Feed — primary fragments
// and the fainter ghost traces alike (extracted from FeedFragment.jsx,
// which was the only caller before FeedGhostTraces.jsx needed the same
// behaviour). Writes distance-based opacity straight to the element's
// style every frame rather than through React state, since this runs on
// every camera frame and must not re-render. The value is quantised so
// an effectively static camera stops producing style writes altogether.
//
// `maxOpacity` is what lets a ghost trace share the exact same falloff
// shape as a primary fragment without ever competing with one: both fade
// in and out on the same curve as the camera passes, but a ghost capped
// at 0.22 never rises above roughly a fifth of a primary fragment's
// strength.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export const FRAGMENT_FADE_NEAR = 18;
export const FRAGMENT_FADE_FAR = 82;

export function useDepthFade(
  position,
  { near = FRAGMENT_FADE_NEAR, far = FRAGMENT_FADE_FAR, maxOpacity = 1 } = {},
) {
  const elRef = useRef(null);
  const lastRef = useRef(-1);
  const [fx, fy, fz] = position;

  useFrame(({ camera }) => {
    const el = elRef.current;
    if (!el) return;

    const dx = camera.position.x - fx;
    const dy = camera.position.y - fy;
    const dz = camera.position.z - fz;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const raw = 1 - (distance - near) / (far - near);
    const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    // Ease out — holds presence through the middle distances, then drops
    // away, rather than fading linearly from the moment it appears.
    const eased = clamped * clamped * (3 - 2 * clamped);
    const next = Math.round(eased * maxOpacity * 100) / 100;

    if (next !== lastRef.current) {
      lastRef.current = next;
      el.style.opacity = `${next}`;
    }
  });

  return elRef;
}
