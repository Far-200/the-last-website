// src/scenes/LastMessage/LastMessageScene.jsx
//
// The Three.js layer of Last Message. Radically simpler than any prior
// scene, deliberately: "the visitor's attention should have exactly one
// place to go." There is a floor plane, a fog that swallows everything
// past a few metres, one very weak ambient term, and one object.
//
// The object is `CRTTerminal` — the same component the Prelude already
// built for "one isolated surviving server/terminal, alone in dark
// space" (docs/PROJECT_PLAN.md's own words for this scene's landmark).
// Reusing it rather than building a second machine does two things at
// once: it is the established project pattern for exactly this object
// ("prefer using established project transition patterns rather than
// inventing a completely separate system"), and it means the very last
// thing the visitor sees is physically the same kind of machine that
// answered them at the very start — the experience closing on itself.
//
// CRTTerminal is not given any text to display. Its own header comment
// is explicit that its glass "carries essentially no emissive of its
// own" and "never resolves into a readable panel" — that is a deliberate
// property of the shared component (cyan stays exclusive to physical
// screen glow, never UI), not a gap to fill in here. All of this scene's
// actual narrative text — the status readout, "See you tomorrow.",
// CONNECTION LOST, the thesis — is DOM overlay in LastMessage.jsx,
// exactly where Prelude's own equivalent text already lives (SignalFrame
// /SystemFrame/ArchiveFrame are DOM, not textures painted onto the CRT).
// The 3D terminal here is atmosphere and silhouette only.
//
// No camera controller. Last Message has no scroll/progression system at
// all (see LastMessage.jsx) and this scene needs no camera motion beyond
// what Prelude itself does for its own SIGNAL depth: a single position
// set once via `onCreated`, matching PreludeScene.jsx's own idiom for a
// static establishing shot. Even that small a camera authority is more
// than this closing moment needs, which is itself part of the point —
// by now even the camera has stopped moving.

import { Canvas } from "@react-three/fiber";
import CRTTerminal from "../../three/elements/CRTTerminal";

// Must stay identical to `.lastmessage-root`'s background in
// lastmessage.css and to `.memories-leave-overlay`'s colour — Memories
// fades to this exact value before handing over, so the swap has no
// seam.
export const HAZE = "#08090a";

const LOOK_AT = [0, 0.82, -6.0];
const TERMINAL_POSITION = [0, 0, -6.5];

// CRTTerminal understands four of its own phase names (see that file):
// "signal"/"resolving" modulate a live glow, "system"/"archive"/"leaving"
// force it hard off. Last Message's own phase vocabulary is unrelated —
// this is the one place the two get translated, and it is a pure
// function with no effect on the shared component itself.
//   arriving                       -> dead (screen has not woken yet)
//   signal/status/message/silence  -> alive, gentle glow
//   failing                        -> alive, the visible dying beat
//   blackout onward                -> dead, and stays dead
function crtPhaseFor(phase) {
  if (phase === "failing") return "resolving";
  if (phase === "signal" || phase === "status" || phase === "message" || phase === "silence") {
    return "signal";
  }
  return "leaving";
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]}>
      <planeGeometry args={[26, 26]} />
      <meshStandardMaterial color="#0a0c0d" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function LastMessageScene({ phase, reduceMotion }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.05, 0.9], fov: 34, near: 0.1, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(...LOOK_AT)}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {/* Tight, and the darkest fog in the whole experience — by design.
          Everything the scene has to say is either the terminal's own
          faint glow or DOM text over pure black; there is nothing else
          for the fog to reveal. */}
      <fog attach="fog" args={[HAZE, 3, 15]} />

      {/* Pale/neutral, per the project plan's own description of this
          scene's lighting ("warmth drains to pale/neutral machine light,
          then to black") — deliberately not warm like Memories and not
          the cold charcoal-green of the Graveyard. The lowest intensity
          of any scene in the experience. */}
      <hemisphereLight args={["#14181a", "#030303", 0.32]} />

      <Ground />

      <CRTTerminal
        position={TERMINAL_POSITION}
        rotation={[0, 0.32, 0]}
        phase={crtPhaseFor(phase)}
        reduceMotion={reduceMotion}
      />
    </Canvas>
  );
}
