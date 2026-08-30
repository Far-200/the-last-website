// src/scenes/Feed/FeedThreshold.jsx
//
// Where the archive runs out.
//
// The Feed's route ends at z = -120 and its departure then carries the
// camera forward into its own collapsing haze. That departure was already
// well built — FeedCamera captures the actually-rendered pose and keeps
// travelling on it, and FeedScene's fog and lights collapse around the
// move rather than a DOM overlay covering the page — but the darkness it
// ended on had no CAUSE. The frame went dark because the lights were
// turned down, which is a technique, not a place.
//
// This is the place. Two rings of a collapsed terminal aperture standing
// in the last clear bay of the nave, which the camera physically passes
// through while still moving forward. The final frame is dark because the
// camera is inside a ruined structure with the fog closed to six units
// around it, not because something faded.
//
// Siting is constrained, not free
// -------------------------------
// FeedArchitecture's colonnade has rows at z = -128 and z = -144, so the
// rings sit in the clear bay between them (-130.5 to -142.75). The
// route's closing fragment card ("recovered-ellie") sits at z = -127.5,
// in front of the first ring, so the ring backs it with dark mass rather
// than cutting it. And the aperture 66 units further on is the thing the
// whole nave points at, so NOTHING here crosses it:
//
//   * From the route's end the aperture's bright gap subtends about 6.9
//     degrees either side of centre and reaches 20.1 degrees up.
//   * Both ring openings are wider than that (23.4 and 12.8 degrees
//     half-angle) and both headers start above it (25.1 and 23.8
//     degrees).
//   * The two leaning slabs that cross the frame at low height are
//     therefore placed OFF the axis — one on each flank, at different
//     depths and angles — where they crop the sides of the frame as the
//     camera passes without ever covering the aperture.
//
// So at the end of the route the visitor is looking down the nave at the
// aperture through two receding frames, which is a stronger closing
// composition than the bare corridor was. During the departure those
// frames pass the camera at 4.6 and 3.2 units of clearance and sweep out
// through the sides, the headers go over the top, and the last thing
// still resolving through the haze is a slot in a wall.

import * as THREE from "three";
import { FLOOR_Y, STONE_MID } from "./FeedArchitecture";

// Kept in step with FeedArchitecture's own tiers. STONE_MID is exported
// there and imported here rather than restated, so a retune of the scene's
// stone cannot leave this file behind; the near and far values are local
// because they are only used by this structure.
const THRESHOLD_NEAR = "#4a534f";
const THRESHOLD_FAR = "#212827";

// --- Ring one: the mouth ----------------------------------------------
const MOUTH_Z = -131.1;
const MOUTH_D = 1.0;
const MOUTH_GAP = 4.8; // half-width of the opening
const MOUTH_JAMB_W = 4.7;
const MOUTH_H = 16;
const MOUTH_HEAD = [7.0, 10.2];

// --- Ring two: the inner frame, tighter and lower ----------------------
const INNER_Z = -135.0;
const INNER_D = 0.8;
const INNER_GAP = 3.4;
const INNER_JAMB_W = 4.6;
const INNER_H = 12;
const INNER_HEAD = [8.4, 11.0];

// Beyond the inner frame the structure closes down to a slot. These two
// masses stop just short of the aperture's bright gap on either side (see
// the header), so the light at the end of the nave survives as a narrow
// vertical band with dark mass crowding it.
const CLOSING_MASSES = [
  { x: -8.5, z: -140.5, w: 11, h: 9, d: 3.2, rot: 0.06 },
  { x: 8.5, z: -141.8, w: 11, h: 9, d: 3.2, rot: -0.05 },
];

// Rubble banked against the ring feet, off the worn centre line — the
// same placement logic FeedArchitecture's RUBBLE_HEAPS already uses.
const RUBBLE = [
  { position: [-6.2, 0.9, -129.4], rotation: [0.14, 0.32, 0.08], size: [5.4, 1.9, 4.2] },
  { position: [6.6, 0.7, -132.6], rotation: [0.09, -0.4, -0.06], size: [4.6, 1.5, 4.8] },
  { position: [-5.4, 0.6, -136.2], rotation: [0.11, 0.5, 0.05], size: [4.2, 1.3, 3.6] },
  { position: [4.4, 0.5, -137.4], rotation: [0.07, -0.24, 0.09], size: [3.8, 1.1, 3.4] },
];

function Ring({ z, depth, gap, jambWidth, height, head }) {
  const jambCentre = gap + jambWidth / 2;
  return (
    <group position={[0, FLOOR_Y, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * jambCentre, height / 2, 0]}>
          <boxGeometry args={[jambWidth, height, depth]} />
          <meshStandardMaterial color={THRESHOLD_NEAR} roughness={0.98} metalness={0.04} />
        </mesh>
      ))}
      <mesh position={[0, (head[0] + head[1]) / 2, 0]}>
        <boxGeometry args={[gap * 2 + 1.2, head[1] - head[0], depth]} />
        <meshStandardMaterial color={STONE_MID} roughness={0.98} metalness={0.04} />
      </mesh>
    </group>
  );
}

export default function FeedThreshold() {
  return (
    <group>
      <Ring
        z={MOUTH_Z}
        depth={MOUTH_D}
        gap={MOUTH_GAP}
        jambWidth={MOUTH_JAMB_W}
        height={MOUTH_H}
        head={MOUTH_HEAD}
      />
      <Ring
        z={INNER_Z}
        depth={INNER_D}
        gap={INNER_GAP}
        jambWidth={INNER_JAMB_W}
        height={INNER_H}
        head={INNER_HEAD}
      />

      {/* The two flank slabs. These are the pieces that actually cross the
          frame as the camera goes through: each comes down from its own
          ring's head toward the floor at an angle, on one side only, so
          the departure has something passing close on the left and then
          something else passing close on the right. Never mirrored — a
          matched pair either side of the axis would read as a gateway. */}
      <mesh position={[-5.3, 3.4, -131.4]} rotation={[0.12, 0.18, -0.78]}>
        <boxGeometry args={[1.5, 8.6, 1.3]} />
        <meshStandardMaterial color={THRESHOLD_NEAR} roughness={0.98} metalness={0.04} />
      </mesh>
      <mesh position={[5.4, 2.8, -135.6]} rotation={[-0.1, -0.22, 0.86]}>
        <boxGeometry args={[1.3, 7.4, 1.1]} />
        <meshStandardMaterial color={STONE_MID} roughness={0.98} metalness={0.04} />
      </mesh>

      {/* Conduit torn out of the mouth's head and hanging. The Feed's
          overhead runs stop here; on the far side of this the world has no
          ceiling at all. */}
      {[
        { x: -2.6, y: 5.4, z: -130.9, len: 3.2, rot: [0.34, 0.1, 0.14] },
        { x: 1.1, y: 5.9, z: -131.3, len: 2.4, rot: [-0.28, -0.16, -0.1] },
        { x: 3.4, y: 6.4, z: -134.8, len: 4.0, rot: [0.2, 0.22, 0.3] },
      ].map((c, i) => (
        <mesh key={`cable-${i}`} position={[c.x, c.y, c.z]} rotation={c.rot}>
          <boxGeometry args={[0.1, c.len, 0.1]} />
          <meshStandardMaterial color="#141a19" roughness={0.86} metalness={0.22} />
        </mesh>
      ))}

      {CLOSING_MASSES.map((m, i) => (
        <mesh key={`mass-${i}`} position={[m.x, m.h / 2, m.z]} rotation={[0, m.rot, 0]}>
          <boxGeometry args={[m.w, m.h, m.d]} />
          <meshStandardMaterial color={THRESHOLD_FAR} roughness={1} metalness={0} />
        </mesh>
      ))}

      {RUBBLE.map((r, i) => (
        <mesh key={`rub-${i}`} position={r.position} rotation={r.rotation} receiveShadow>
          <boxGeometry args={r.size} />
          <meshStandardMaterial
            color={i % 2 === 0 ? STONE_MID : THRESHOLD_FAR}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}

      {/* A single strip of floor plate lifted at the threshold, so the
          ground itself changes at the crossing rather than running through
          unbroken. Thin, and only on one side of the worn centre line. */}
      <mesh position={[-2.4, 0.34, -133.2]} rotation={[0.44, 0.2, 0.06]}>
        <boxGeometry args={[3.6, 0.12, 2.4]} />
        <meshStandardMaterial
          color={THRESHOLD_NEAR}
          roughness={0.94}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
