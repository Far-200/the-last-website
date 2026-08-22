// src/scenes/Feed/FeedArchitecture.jsx
//
// The Feed's environment: a ruined civic nave the archive fragments are
// embedded in. Everything here is authored, unmoving geometry — no
// logic, no per-frame cost — so it never competes with FeedCamera's
// progression authority or FeedFragment's discrete GSAP moments.
//
// Why this was rebuilt rather than retuned
// ----------------------------------------
// The previous pass placed a great deal of geometry that the camera
// could not physically see, so the scene read as fragments over black:
//
//   * The ground plane sat at y = -26 while the camera rode y -0.4..1.0.
//     At fov 52 the bottom of frame only reaches y = -26 about 54 units
//     ahead, and fog was fully opaque at 30. The floor was mathematically
//     unreachable — there was never a ground, a path, or a horizon.
//   * Pillars were centred at y = 9 with their bases 12 to 23 units below
//     the camera, i.e. below the (invisible) floor. Nothing terminated
//     anywhere the eye could read, so height was asserted but never
//     perceived.
//   * Materials sat at #242b28 / #171c1a / #030404 under 0.35 total
//     light, which lands the brightest tier around RGB 8-12. Present,
//     but invisible.
//   * The "distant destination" was a 20x14 plane 14.5 units past the
//     route's end, where the frame is 14.1 units tall — so the last shot
//     of the Feed was a flat grey wall filling the screen.
//
// The rebuild fixes the geometry of the problem, not the numbers:
// the floor is at y = 0 with the camera at standing height, so it is
// visible from ~3.5 units ahead all the way out to the fog and gives the
// scene a receding surface and a vanishing point. Columns rise from that
// floor — bases readable, tops leaving frame — which is what actually
// communicates scale. A vault rhythm overhead closes the space into an
// interior. Bounding walls stop the light falling off into nothing. And
// the destination is a genuine aperture far enough away to stay an
// aperture.
//
// Second pass — the floor itself was the dead zone
// -------------------------------------------------
// With the geometry now visible, screenshots across the whole route
// showed the actual remaining problem: the floor plane occupies roughly
// the bottom half of every single frame and, apart from the 150 tiny
// (0.18-0.9 unit) instanced pebbles in FeedDebris, was one continuous,
// unbroken value. Columns and vault gave the upper frame rhythm; the
// floor gave the lower frame nothing. FLOOR_STAINS and FLOOR_CRACKS
// exist purely to break that plane's flatness — value-only, no new
// readable content, same technique as the worn-path strip already in
// Floor() below. FOREGROUND_DEBRIS and DEAD_SCREENS then put actual
// human-scale evidence in that same space: chunkier rubble pulled close
// to the path so it occasionally crosses into the foreground the way the
// brief asks for, and small device-shaped relics distinguished from the
// rubble around them by material alone (smoother, no text, no light —
// "shape not text"). All of it concentrates in the route's four largest
// gaps between primary fragments rather than spreading evenly, so the
// tightest stretches (log-session to missing-photo) stay sparse and the
// field reads as irregular rather than tiled.

import * as THREE from "three";

// --- World frame ------------------------------------------------------
// One place for the dimensions everything else is derived from, so the
// camera route, the fragment placement and this file cannot drift apart.
export const FLOOR_Y = 0;
export const EYE_HEIGHT = 1.75;
export const NAVE_HALF_WIDTH = 7.6; // colonnade centres
export const WALL_X = 17; // outer bounding walls
export const VAULT_Y = 23; // underside of the transverse arches
export const ROUTE_START_Z = 12;
export const ROUTE_END_Z = -120;
export const APERTURE_Z = -186;

// Three luminance tiers. These are much higher than the previous pass:
// under this scene's lighting the near tier now lands in a readable
// charcoal instead of black-on-black, while distance and fog — not the
// base value — do the work of pushing things away.
const STONE_NEAR = "#525c57";
const STONE_MID = "#39423e";
const STONE_FAR = "#232a29";
const FLOOR_STONE = "#0e1211";
const PATH_STONE = "#171c1b";
const WALL_STONE = "#232a29";

// The floor is the single most load-bearing element in the scene: it is
// what turns a void into a place. It runs the full length of the route
// and well past the aperture so the surface never visibly terminates.
function Floor() {
  const length = ROUTE_START_Z - APERTURE_Z + 60;
  const centreZ = (ROUTE_START_Z + APERTURE_Z) / 2 - 20;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, centreZ]}
        receiveShadow
      >
        <planeGeometry args={[WALL_X * 2, length]} />
        <meshStandardMaterial color={FLOOR_STONE} roughness={1} metalness={0} />
      </mesh>

      {/* A worn processional path down the centre — stone polished a
          value lighter by traffic that stopped a long time ago. This is
          the element that gives the eye a direction to follow, and it is
          a value change only: no lines, no markings, nothing that would
          read as interface. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y + 0.012, centreZ]}
        receiveShadow
      >
        <planeGeometry args={[7.4, length]} />
        <meshStandardMaterial color={PATH_STONE} roughness={0.94} metalness={0} />
      </mesh>
    </group>
  );
}

// Columns rise from the floor. Height is generous enough that the top
// always leaves frame before it resolves, while the base stays visible —
// that pairing is what reads as monumental, not the height value alone.
function Column({ x, z, height, thickness, tilt = [0, 0, 0], color = STONE_NEAR }) {
  return (
    <group position={[x, FLOOR_Y, z]} rotation={tilt}>
      {/* Shaft */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color={color} roughness={0.96} metalness={0.05} />
      </mesh>
      {/* Base block — a small step out at the floor. Reads as a column
          standing on something rather than a box intersecting a plane. */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness * 1.5, 1.1, thickness * 1.5]} />
        <meshStandardMaterial color={color} roughness={0.98} metalness={0.04} />
      </mesh>
    </group>
  );
}

// A column that failed. The stump keeps the rhythm from reading as a
// clean procedural repeat, and the fallen shaft lying across the floor
// gives the ground plane something to be measured against.
//
// fallOffset/fallRotation must keep the shaft's far end clear of the
// camera's own lateral range (see FeedCamera's WAYPOINTS) — this is a
// 13-unit box, and the values first tried here put its near end at world
// x -0.41 (the rightBroken instance, z=-41) and x -0.80 (leftBroken,
// z=-86): both directly in the corridor the camera actually travels, so
// the "fallen column" functioned as a wall across the nave for a
// sustained stretch of the route rather than debris along one aisle.
// The values below were checked numerically (three.js Box3().
// setFromObject on the rotated mesh, not eyeballed) to keep the near end
// several units clear on both instances while the shaft still visibly
// leaves its stump and crosses into the aisle.
function BrokenColumn({ x, z, stumpHeight, thickness, fallRotation, fallOffset }) {
  return (
    <group position={[x, FLOOR_Y, z]}>
      <mesh position={[0, stumpHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, stumpHeight, thickness]} />
        <meshStandardMaterial color={STONE_NEAR} roughness={0.98} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness * 1.5, 1.1, thickness * 1.5]} />
        <meshStandardMaterial color={STONE_NEAR} roughness={0.98} metalness={0.04} />
      </mesh>
      <mesh
        position={fallOffset}
        rotation={fallRotation}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[thickness, thickness, 13]} />
        <meshStandardMaterial color={STONE_MID} roughness={1} metalness={0.03} />
      </mesh>
    </group>
  );
}

// A device lying in the rubble — phone, tablet or small monitor, face
// down or tipped. Pure shape: no text, no light, no cyan. The material
// is what makes it read as "object" rather than "rock": roughness is
// under half the surrounding stone's (0.5 vs 0.96-1) and it carries a
// little metalness the stone never does, so the same key light that
// leaves rubble matte gives this a faint, distinct sheen. Small enough
// (under half a metre) that it is never the subject of a frame, only
// something the eye catches in passing.
function DeadScreen({ position, rotation, size }) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#121915" roughness={0.5} metalness={0.16} />
    </mesh>
  );
}

// A transverse arch spanning the nave. Built from a lintel plus two
// angled haunches rather than curved geometry — from eye level the
// receding rhythm is what reads, not the profile of any single one.
function VaultArch({ z, missingLeft = false, missingRight = false }) {
  const span = NAVE_HALF_WIDTH * 2;
  return (
    <group position={[0, VAULT_Y, z]}>
      <mesh castShadow>
        <boxGeometry args={[span, 1.8, 2.6]} />
        <meshStandardMaterial color={STONE_MID} roughness={0.97} metalness={0.05} />
      </mesh>
      {!missingLeft && (
        <mesh position={[-NAVE_HALF_WIDTH + 1.9, -2.6, 0]} rotation={[0, 0, 0.72]} castShadow>
          <boxGeometry args={[6.5, 1.4, 2.2]} />
          <meshStandardMaterial color={STONE_MID} roughness={0.97} metalness={0.05} />
        </mesh>
      )}
      {!missingRight && (
        <mesh position={[NAVE_HALF_WIDTH - 1.9, -2.6, 0]} rotation={[0, 0, -0.72]} castShadow>
          <boxGeometry args={[6.5, 1.4, 2.2]} />
          <meshStandardMaterial color={STONE_MID} roughness={0.97} metalness={0.05} />
        </mesh>
      )}
    </group>
  );
}

// Outer bounding walls. Not meant to be examined — they stop the light
// and the fog falling off into open nothing, and they give the aisles
// beyond the colonnade a dark depth to recede into.
function SideWalls() {
  const length = ROUTE_START_Z - APERTURE_Z + 40;
  const centreZ = (ROUTE_START_Z + APERTURE_Z) / 2 - 10;

  return (
    <group>
      {[-WALL_X, WALL_X].map((x) => (
        <mesh key={x} position={[x, 15, centreZ]} receiveShadow>
          <boxGeometry args={[1.5, 30, length]} />
          <meshStandardMaterial color={WALL_STONE} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

// The destination. A dark end wall built from three blocks around a gap,
// with a pale plane behind it.
//
// The pale plane uses `fog={false}` deliberately: it is the one thing in
// the scene that must stay brighter than the haze at any distance, since
// everything else silhouettes against it. That is also why it can sit
// this far away without vanishing — 66 units past the route's end, so it
// stays a small bright aperture the whole way instead of becoming a wall
// in the camera's face at the end of the run.
function Aperture() {
  const gapHalfWidth = 8;
  const gapHeight = 26;

  return (
    <group position={[0, FLOOR_Y, APERTURE_Z]}>
      <mesh position={[0, 22, -6]}>
        <planeGeometry args={[30, 48]} />
        <meshBasicMaterial color="#75837b" fog={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Left / right jambs and the lintel above the gap. */}
      <mesh position={[-gapHalfWidth - 15, 22, 0]}>
        <boxGeometry args={[30, 44, 2]} />
        <meshStandardMaterial color={STONE_FAR} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[gapHalfWidth + 15, 22, 0]}>
        <boxGeometry args={[30, 44, 2]} />
        <meshStandardMaterial color={STONE_FAR} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, gapHeight + 13, 0]}>
        <boxGeometry args={[gapHalfWidth * 2, 26, 2]} />
        <meshStandardMaterial color={STONE_FAR} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

// Foreground framing. Large collapsed masses placed close enough to the
// route that the camera passes within a couple of units of them, so
// something crosses the near plane and the frame gets an actual
// foreground layer instead of everything sitting at mid distance.
//
// The rotation.y on a long box swings one end toward the path even when
// `position` itself sits well off it — a 7-unit slab at rotation.y 0.5
// puts its near end within ~2 units of the camera's own lateral range at
// matching z, and at that closest approach (z-depth to the object goes
// to zero) a 3.4-unit-thick cross-section doesn't crop a corner, it
// walls off the corridor for several units of travel, sustained across
// multiple seconds of forward motion — this showed up directly in
// testing as the aperture and everything past it disappearing behind a
// flat wall for an extended stretch, exactly the "foreground fragments
// obscuring memories" failure mode. Cross-sections below are eased down
// (was 2-2.4 tall / 3-3.4 deep, now 1.2-1.5 / 1.7-2) and rotation is
// reduced, so the near end still crosses into frame — the point of
// having these at all — without becoming a wall.
const FOREGROUND_SLABS = [
  { position: [-5.0, 1.0, -17], rotation: [0.1, 0.24, -0.3], size: [7, 1.3, 1.8] },
  { position: [4.6, 0.85, -44], rotation: [-0.08, -0.22, 0.35], size: [6.2, 1.2, 1.7] },
  { position: [-6.2, 1.35, -83], rotation: [0.14, 0.16, 0.28], size: [7, 1.5, 2] },
];

// Rubble drifts against the colonnade, off the worn centre path.
const RUBBLE_HEAPS = [
  { position: [-7.2, 0.7, -9], rotation: [0.2, 0.4, 0.1], size: [4.5, 1.4, 5] },
  { position: [7.6, 0.6, -33], rotation: [0.1, -0.3, 0.08], size: [4, 1.2, 6] },
  { position: [-8.1, 0.9, -57], rotation: [0.16, 0.2, -0.12], size: [5, 1.8, 4.5] },
  { position: [7.9, 0.5, -74], rotation: [0.08, -0.5, 0.1], size: [4.2, 1, 5.5] },
  { position: [-7.4, 0.8, -101], rotation: [0.12, 0.34, 0.06], size: [4.6, 1.6, 5] },
];

// Colonnade. Spacing is irregular and two columns have failed, so the
// rhythm reads as decay rather than as a pattern the eye can count.
const COLUMNS = [
  { z: 2, lh: 34, rh: 33, lt: 2.6, rt: 2.4 },
  { z: -12, lh: 36, rh: 34, lt: 2.8, rt: 2.5 },
  { z: -25, lh: 33, rh: 35, lt: 2.4, rt: 2.7, rtilt: [0, 0, -0.018] },
  { z: -41, lh: 35, rh: 0, lt: 2.6, rt: 2.5, rightBroken: true },
  { z: -56, lh: 37, rh: 36, lt: 2.7, rt: 2.5 },
  { z: -70, lh: 34, rh: 34, lt: 2.5, rt: 2.7, ltilt: [0, 0, 0.02] },
  { z: -86, lh: 0, rh: 35, lt: 2.5, rt: 2.6, leftBroken: true },
  { z: -99, lh: 36, rh: 33, lt: 2.7, rt: 2.4 },
  { z: -113, lh: 34, rh: 35, lt: 2.5, rt: 2.6 },
  { z: -128, lh: 33, rh: 34, lt: 2.4, rt: 2.5 },
  { z: -144, lh: 35, rh: 33, lt: 2.6, rt: 2.4 },
];

// Vault arches overhead. Two are gone entirely and several have lost one
// haunch, so the ceiling reads as a ruin rather than a repeat.
const VAULTS = [
  { z: -6 },
  { z: -20, missingRight: true },
  { z: -34 },
  // gap — a collapsed bay
  { z: -63, missingLeft: true },
  { z: -77 },
  { z: -91 },
  // gap
  { z: -119, missingRight: true },
  { z: -134 },
];

// Large, very low-contrast patches breaking the floor's single flat
// value — old water damage, scorch, wear. Same "value change only, no
// markings" rule as the worn-path strip in Floor(): irregular rotation
// so edges never align with the path direction, and never so dark it
// reads as a shadow with a light source implied above it.
const FLOOR_STAINS = [
  { position: [-5.4, 0, -11], rotation: [-Math.PI / 2, 0, 0.4], size: [5.5, 6.2], color: "#111614" },
  { position: [4.8, 0, -19], rotation: [-Math.PI / 2, 0, -0.6], size: [4.4, 5.8], color: "#1c2321" },
  { position: [-3.6, 0, -37], rotation: [-Math.PI / 2, 0, 0.15], size: [6.5, 4.8], color: "#151b19" },
  { position: [5.6, 0, -70], rotation: [-Math.PI / 2, 0, -0.3], size: [5, 6.6], color: "#111614" },
  { position: [-6.0, 0, -90], rotation: [-Math.PI / 2, 0, 0.55], size: [5.8, 5], color: "#1c2321" },
  { position: [3.2, 0, -109], rotation: [-Math.PI / 2, 0, -0.2], size: [6.8, 5.4], color: "#151b19" },
  { position: [-4.4, 0, -122], rotation: [-Math.PI / 2, 0, 0.35], size: [5.2, 6], color: "#111614" },
];

// Thin fracture lines. Deliberately not aligned with the path or with
// each other — a handful of long, dark, near-flat boxes at irregular
// angles, breaking the floor's silhouette with direction rather than
// just value the way FLOOR_STAINS does.
const FLOOR_CRACKS = [
  { position: [-1.4, 0.016, -13], rotation: [0, 0.5, 0], length: 6.5 },
  { position: [2.6, 0.016, -22], rotation: [0, -0.75, 0], length: 5 },
  { position: [-3.1, 0.016, -40], rotation: [0, 0.25, 0], length: 7.5 },
  { position: [1.8, 0.016, -76], rotation: [0, -0.4, 0], length: 6 },
  { position: [-2.4, 0.016, -94], rotation: [0, 0.65, 0], length: 5.5 },
  { position: [1.2, 0.016, -116], rotation: [0, -0.55, 0], length: 7 },
];

// Rubble pulled closer to the path than RUBBLE_HEAPS (which sit out
// near the colonnade) so it occasionally crops a lower frame corner as
// the camera passes — the "occasional near-camera fragment entering
// only part of the frame" the brief describes. Concentrated in the
// route's four largest gaps between primary fragments (after the hero,
// after chat-cat, after missing-photo, and the long run to the closing
// fragment); the two tightest gaps in the route get none.
//
// Lateral offset is tuned against FeedCamera's own WAYPOINTS (camera x
// stays within roughly -1.8..1.4 across the whole route): a first pass
// placed debris only ~1.2-1.5 units from the camera's actual lateral
// position at matching z, and at that closest approach — where z-depth
// to the object goes to zero and only lateral distance is left — a
// 0.9-unit chunk subtends most of the frame width and reads as a wall,
// not a foreground accent. Every offset below keeps at least ~2.4 units
// of clearance from the camera's plausible x at that z, and sizes are
// capped lower, so the same crossing now reads as a corner, not a wall.
const FOREGROUND_DEBRIS = [
  { position: [3.0, 0.16, 3], rotation: [0.1, 0.6, 0.15], size: [0.55, 0.32, 0.45] },
  { position: [-3.3, 0.18, -10], rotation: [-0.08, -0.3, 0.4], size: [0.6, 0.38, 0.5] },
  { position: [3.2, 0.14, -16], rotation: [0.15, 0.5, -0.2], size: [0.48, 0.28, 0.55] },
  { position: [-3.4, 0.2, -21], rotation: [0, -0.6, 0.3], size: [0.62, 0.4, 0.5] },
  { position: [3.4, 0.15, -31], rotation: [0.12, 0.2, -0.35], size: [0.5, 0.3, 0.45] },
  { position: [-3.0, 0.13, -39], rotation: [-0.1, -0.45, 0.2], size: [0.42, 0.26, 0.4] },
  { position: [3.3, 0.19, -71], rotation: [0.08, 0.55, -0.25], size: [0.58, 0.36, 0.5] },
  { position: [-3.2, 0.15, -79], rotation: [-0.15, -0.2, 0.4], size: [0.45, 0.28, 0.42] },
  { position: [3.1, 0.17, -95], rotation: [0.1, 0.4, -0.15], size: [0.52, 0.32, 0.46] },
  { position: [-3.3, 0.19, -108], rotation: [-0.06, -0.5, 0.3], size: [0.6, 0.37, 0.42] },
  { position: [3.4, 0.14, -119], rotation: [0.14, 0.3, -0.4], size: [0.46, 0.28, 0.5] },
];

// Small device relics — see DeadScreen above. Spread through the route's
// middle stretch (including the two tightest gaps, which FOREGROUND_
// DEBRIS and the ghost traces both skip) so those bare sections get
// geometry-only variation without adding more competing text.
const DEAD_SCREENS = [
  { position: [2.7, 0.1, -19], rotation: [0.06, 0.5, 0.3], size: [0.42, 0.03, 0.27] },
  { position: [-2.2, 0.09, -42], rotation: [-0.05, -0.3, 0.55], size: [0.5, 0.03, 0.32] },
  { position: [1.6, 0.1, -50], rotation: [0.08, 0.65, -0.2], size: [0.36, 0.025, 0.23] },
  { position: [-1.4, 0.08, -61], rotation: [-0.06, -0.55, 0.4], size: [0.4, 0.025, 0.26] },
  { position: [2.0, 0.11, -87], rotation: [0.1, 0.3, -0.5], size: [0.46, 0.03, 0.3] },
  { position: [-2.6, 0.09, -105], rotation: [-0.08, -0.4, 0.25], size: [0.38, 0.025, 0.24] },
  { position: [1.3, 0.1, -123], rotation: [0.05, 0.55, -0.3], size: [0.44, 0.03, 0.28] },
];

// A few pieces pushed out toward the colonnade rather than near the
// path — the side aisles between the columns and the outer walls are
// otherwise completely bare in several stretches, and at a grazing
// angle from the key light (see FeedScene's directional light, aimed
// back up the nave from behind the aperture) a large enough shape out
// there catches just enough rim light to read as a silhouette rather
// than staying pure, evidence-free black. Larger than FOREGROUND_DEBRIS
// since they sit further from the camera and need to survive the
// distance; STONE_MID keeps them a step darker than the near rubble.
const AISLE_RELICS = [
  { position: [9.4, 0.5, -16], rotation: [0, 0.4, 0.05], size: [1.1, 1, 1.3] },
  { position: [-9.8, 0.45, -63], rotation: [0, -0.3, -0.08], size: [1.3, 0.9, 1] },
  { position: [10.2, 0.55, -118], rotation: [0, 0.5, 0.1], size: [1, 1.1, 1.2] },
];

export default function FeedArchitecture() {
  return (
    <group>
      <Floor />

      {FLOOR_STAINS.map((stain, i) => (
        <mesh key={`stain-${i}`} position={stain.position} rotation={stain.rotation} receiveShadow>
          <planeGeometry args={stain.size} />
          <meshStandardMaterial color={stain.color} roughness={1} metalness={0} />
        </mesh>
      ))}

      {FLOOR_CRACKS.map((crack, i) => (
        <mesh key={`crack-${i}`} position={crack.position} rotation={crack.rotation} receiveShadow>
          <boxGeometry args={[0.07, 0.012, crack.length]} />
          <meshStandardMaterial color="#040605" roughness={0.85} metalness={0.05} />
        </mesh>
      ))}

      <SideWalls />
      <Aperture />

      {COLUMNS.flatMap((row, i) => {
        const out = [];

        if (row.leftBroken) {
          out.push(
            <BrokenColumn
              key={`col-${i}-l`}
              x={-NAVE_HALF_WIDTH}
              z={row.z}
              stumpHeight={5.5}
              thickness={row.lt}
              fallRotation={[0, 0.22, Math.PI / 2]}
              fallOffset={[2.0, 0.8, 0.7]}
            />,
          );
        } else {
          out.push(
            <Column
              key={`col-${i}-l`}
              x={-NAVE_HALF_WIDTH}
              z={row.z}
              height={row.lh}
              thickness={row.lt}
              tilt={row.ltilt}
            />,
          );
        }

        if (row.rightBroken) {
          out.push(
            <BrokenColumn
              key={`col-${i}-r`}
              x={NAVE_HALF_WIDTH}
              z={row.z}
              stumpHeight={7.2}
              thickness={row.rt}
              fallRotation={[0, -0.22, Math.PI / 2]}
              fallOffset={[-2.0, 0.8, -0.7]}
            />,
          );
        } else {
          out.push(
            <Column
              key={`col-${i}-r`}
              x={NAVE_HALF_WIDTH}
              z={row.z}
              height={row.rh}
              thickness={row.rt}
              tilt={row.rtilt}
            />,
          );
        }

        return out;
      })}

      {VAULTS.map((v) => (
        <VaultArch
          key={v.z}
          z={v.z}
          missingLeft={v.missingLeft}
          missingRight={v.missingRight}
        />
      ))}

      {FOREGROUND_SLABS.map((slab, i) => (
        <mesh
          key={`fg-${i}`}
          position={slab.position}
          rotation={slab.rotation}
          castShadow
          receiveShadow
        >
          <boxGeometry args={slab.size} />
          <meshStandardMaterial color={STONE_NEAR} roughness={1} metalness={0.03} />
        </mesh>
      ))}

      {RUBBLE_HEAPS.map((heap, i) => (
        <mesh key={`rub-${i}`} position={heap.position} rotation={heap.rotation} receiveShadow>
          <boxGeometry args={heap.size} />
          <meshStandardMaterial color={STONE_MID} roughness={1} metalness={0} />
        </mesh>
      ))}

      {FOREGROUND_DEBRIS.map((d, i) => (
        <mesh key={`fgd-${i}`} position={d.position} rotation={d.rotation} castShadow receiveShadow>
          <boxGeometry args={d.size} />
          <meshStandardMaterial color={i % 2 === 0 ? STONE_NEAR : STONE_MID} roughness={0.98} metalness={0.03} />
        </mesh>
      ))}

      {DEAD_SCREENS.map((ds, i) => (
        <DeadScreen key={`relic-${i}`} position={ds.position} rotation={ds.rotation} size={ds.size} />
      ))}

      {AISLE_RELICS.map((r, i) => (
        <mesh key={`aisle-${i}`} position={r.position} rotation={r.rotation} receiveShadow>
          <boxGeometry args={r.size} />
          <meshStandardMaterial color={STONE_MID} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
