// src/scenes/Feed/FeedGhostTraces.jsx
//
// Tertiary evidence layer: bare, unpaneled text drifting at low opacity
// in the gaps between primary fragments (see feedGhosts.js for why these
// exist and how they're placed). Same Html/occlusion technique as
// FeedFragment — occlude="blending" so architecture in front of a trace
// still covers it — but no card chrome at all: no background, no
// border. That is the whole point of keeping this a separate, minimal
// component rather than a variant of FeedFragment: with no background,
// occlusion only punches a hole where the glyphs themselves render, so a
// ghost trace reads as text scratched into the dark rather than another
// panel. useDepthFade's maxOpacity keeps every trace capped at roughly a
// fifth of a primary fragment's strength at any distance, so these are
// never mistaken for content — felt at the edge of attention, not read.

import { Html } from "@react-three/drei";
import { feedGhosts } from "../../data/feedGhosts";
import { useDepthFade } from "./useDepthFade";

// Tighter and nearer than a primary fragment's fade (18/82): a ghost
// trace should only ever resolve when the camera is genuinely close to
// it, and should be gone again well before it could be mistaken for the
// next primary fragment coming into view.
const NEAR = 9;
const FAR = 44;
const MAX_OPACITY = 0.22;

// Fixed rather than derived from a per-ghost width like primary
// fragments — these have no authored size hierarchy to preserve, just
// one small, consistent scale. ~9px type at this factor sits well under
// a primary fragment's smallest (2.2-unit) card.
const DISTANCE_FACTOR = 5;

function GhostTrace({ ghost, index, reduceMotion }) {
  const fadeRef = useDepthFade(ghost.position, { near: NEAR, far: FAR, maxOpacity: MAX_OPACITY });

  return (
    <group position={ghost.position} rotation={ghost.rotation}>
      <Html transform occlude="blending" distanceFactor={DISTANCE_FACTOR} style={{ pointerEvents: "none" }}>
        <div
          ref={fadeRef}
          className={`feed-ghost${reduceMotion ? "" : " feed-ghost--flicker"}`}
          style={reduceMotion ? undefined : { animationDelay: `-${(index * 2.63) % 9}s` }}
          aria-hidden="true"
        >
          {ghost.text}
        </div>
      </Html>
    </group>
  );
}

export default function FeedGhostTraces({ reduceMotion }) {
  return (
    <>
      {feedGhosts.map((ghost, index) => (
        <GhostTrace key={ghost.id} ghost={ghost} index={index} reduceMotion={reduceMotion} />
      ))}
    </>
  );
}
