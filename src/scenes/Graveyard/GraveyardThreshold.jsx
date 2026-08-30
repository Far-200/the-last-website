// src/scenes/Graveyard/GraveyardThreshold.jsx
//
// The far side of the Feed's archive mouth: the ruined structure the
// visitor walks OUT of at the start of the Graveyard.
//
// Why this exists
// ---------------
// The Feed -> Graveyard cut was already technically sound — the two
// scenes meet at the same fog colour, the same fog distances, the same
// FOV, and the Graveyard's arrival is driven from its own first rendered
// frame rather than from mount, so nothing pops and nothing flashes. What
// it lacked was a REASON. The Feed's last frame was cold darkness because
// its lights had been ramped down; the Graveyard's first frame was cold
// darkness because its lights had not yet come up. Both were honest
// atmosphere, and together they still read as "world, darkness, different
// world" rather than as passing through something.
//
// FeedThreshold gives the Feed's departure a physical cause: the nave
// runs out into a collapsed terminal aperture and the camera passes
// through two rings of it while still travelling forward. This is the
// matching grammar on the other side.
//
// Where it can go, measured rather than assumed
// ---------------------------------------------
// The obvious placement was along the arrival path, so the camera would
// emerge through it during the 1.55s reveal. That was tried and it does
// not work, for a reason that is arithmetic rather than taste:
//
//   GraveyardScene's arrival ramps every general light from a floor of
//   0.05 and gates the ramp on reveal = raw^3.2. At raw = 0.5 the reveal
//   is 0.108, so the lights are at 15 per cent and the fog far plane is
//   46. At raw = 0.5 the camera has ALREADY covered 75 per cent of the
//   arrival distance, because its own curve is 1-(1-raw)^2. So anything
//   standing on the arrival path is passed while it is still rendering
//   at essentially zero. Verified in frames: the first Graveyard frame is
//   a uniform #0d1112 — exactly the value the Feed handed over on, which
//   is the point of that ramp — and geometry placed in it is invisible,
//   not subtle.
//
// That backloaded ramp is what makes the mount swap disappear, so it is
// not something to weaken. The structure therefore sits at the START OF
// THE ROUTE instead, straddling it at z = 5 to 7, three or four units
// ahead of where the arrival ends. The visitor's first scroll carries
// them forward through the opening and under the fallen lintel, in full
// scene light, which is the "emerging from the archive" beat actually
// being seen rather than theoretically happening in the dark.
//
// It also gives the Graveyard's opening frame a foreground: the first
// view of the cemetery is through a broken doorway rather than as a clean
// panorama. Nothing about it is ceremonial — the jambs are unequal
// heights, the lintel is down and wedged rather than in place, the wall
// either side is broken into uneven spans with a gap in it, and the two
// jambs are yawed in opposite directions so the scene's two lateral rake
// lights (see GraveyardScene) catch a different face on each and the pair
// models as stone instead of reading as two matching black cut-outs.

import { useMemo } from "react";
import { groundHeightAt } from "./groundHeight";

// The Graveyard's own stone family. Deliberately close to the marker
// stone (GraveMarkerField's STONE_BODY) rather than to the Feed's, since
// this is Graveyard geometry lit by Graveyard lights — matching the Feed
// exactly in albedo would not survive the different lighting anyway, and
// what has to match across the cut is silhouette and placement.
const STONE = "#3a4245";
const STONE_DARK = "#272d30";
const STONE_RUBBLE = "#20262a";

// The opening the camera comes through. Inner faces sit about 2.2 units
// either side of the route's own line at this z, which is wide enough
// that nothing clips the 0.4 near plane and narrow enough that both jambs
// are hard against the frame edges as the camera passes between them.
const PASSAGE = [
  // [x, z, width, depth, height, yaw]
  { x: -31.8, z: 5.9, w: 2.8, d: 2.6, h: 9.4, yaw: 0.25 },
  { x: -25.0, z: 5.9, w: 2.8, d: 2.6, h: 7.1, yaw: -0.25 },
];

// The face of the structure either side of the opening, with a gap left
// in it on one flank. What the visitor understands — a little later, and
// only peripherally — is that they came out of a wall.
const OUTER_FACE = [
  { x: -38.5, z: 5.6, w: 7.0, d: 2.2, h: 5.4, yaw: 0.1 },
  { x: -33.6, z: 6.2, w: 3.4, d: 2.0, h: 3.2, yaw: -0.06 },
  { x: -22.2, z: 6.0, w: 4.4, d: 2.1, h: 4.6, yaw: 0.08 },
  { x: -17.8, z: 5.2, w: 5.2, d: 2.2, h: 3.0, yaw: -0.14 },
];

// Rubble at the feet of both jambs and spilling out through the opening,
// so the ground between them reads as something that collapsed rather
// than as a doorway that was left open.
const SPILL = [
  { pos: [-31.0, 2.6], size: [4.2, 1.5, 3.4], rot: [0.1, 0.4, 0.06] },
  { pos: [-25.4, 3.4], size: [3.4, 1.1, 2.8], rot: [0.06, -0.32, -0.08] },
  { pos: [-33.4, 7.6], size: [5.0, 1.9, 4.2], rot: [0.08, 0.18, 0.05] },
  { pos: [-23.2, 0.2], size: [4.6, 1.3, 3.6], rot: [0.12, 0.6, -0.04] },
  { pos: [-30.2, -2.0], size: [3.8, 0.9, 3.0], rot: [0.05, -0.5, 0.07] },
];

function Block({ x, z, w, d, h, yaw, color = STONE }) {
  return (
    <group position={[x, groundHeightAt(x, z) - 0.4, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.97} metalness={0.04} />
      </mesh>
    </group>
  );
}

export default function GraveyardThreshold() {
  const spill = useMemo(
    () =>
      SPILL.map((s, i) => ({
        key: `spill-${i}`,
        position: [s.pos[0], groundHeightAt(s.pos[0], s.pos[1]) + s.size[1] / 2 - 0.55, s.pos[1]],
        rotation: s.rot,
        size: s.size,
      })),
    [],
  );

  const lintelY = groundHeightAt(-28.6, 5.2);

  return (
    <group>
      {PASSAGE.map((p, i) => (
        <Block key={`jamb-${i}`} {...p} />
      ))}

      {/* The piece that crosses the top of the frame. It is a fallen
          lintel that came down and wedged, not a lintel still in place,
          and its underside clears the camera by about a metre and a half
          — close enough that it fills the upper frame for a moment and
          then is gone over the top as the visitor moves forward. */}
      <mesh position={[-28.6, lintelY + 3.65, 5.2]} rotation={[0.05, 0.12, -0.22]}>
        <boxGeometry args={[8.4, 0.9, 1.7]} />
        <meshStandardMaterial color={STONE} roughness={0.96} metalness={0.05} />
      </mesh>
      {/* The stub it broke from, still attached to the taller jamb. */}
      <mesh position={[-31.4, lintelY + 5.4, 5.5]} rotation={[0.02, 0.1, -0.5]}>
        <boxGeometry args={[3.2, 0.8, 1.5]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.97} metalness={0.04} />
      </mesh>

      {/* Two cables still hanging out of the break, the last thing the
          Feed's own overhead runs do before the architecture stops. */}
      <mesh position={[-29.6, lintelY + 2.7, 5.6]} rotation={[0.3, 0.1, 0.18]}>
        <boxGeometry args={[0.09, 2.0, 0.09]} />
        <meshStandardMaterial color="#1b2124" roughness={0.85} metalness={0.2} />
      </mesh>
      <mesh position={[-26.1, lintelY + 3.1, 5.3]} rotation={[-0.24, -0.2, -0.12]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#1b2124" roughness={0.85} metalness={0.2} />
      </mesh>

      {OUTER_FACE.map((b, i) => (
        <Block key={`face-${i}`} {...b} color={STONE_DARK} />
      ))}

      {spill.map((s) => (
        <mesh key={s.key} position={s.position} rotation={s.rotation}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={STONE_RUBBLE} roughness={1} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}
