// src/scenes/Graveyard/GraveyardRelics.jsx
//
// Environmental evidence, kept deliberately scarce. Feed is where the
// remains of *people* are; this is where the remains of *systems* are,
// and the contrast between those two is the whole Feed -> Graveyard
// emotional move. Nothing here is decoration: every element below earns
// its place either by establishing physical depth (the two foreground
// remnants) or by advancing the recognition ladder that ends at the
// CAPTCHA — infrastructure, then a piece of the web itself, then the
// monument.
//
// Placement is bounded by the frustum, not by taste. At fov 50 on a 16:9
// frame the horizontal half-angle gives tan ~= 0.83, so an object X units
// to the side only sits in frame while it is more than X / 0.83 units
// ahead. Each relic's lateral offset and depth below were chosen against
// the camera's actual position at the progression window it is meant to
// be seen in — an object placed too close to the path for its depth
// simply swings out of shot before it can be read, which is how the
// first pass lost geometry it had genuinely placed.
//
// Recognition ladder and the windows each relic is visible across:
//   ~10-35%  collapsed server racks  — dead infrastructure
//   ~30-55%  frozen loading ring     — a mechanism that never finished
//   ~60-90%  404 slab                — the web itself, named
//   then     the CAPTCHA monument    — see GraveyardCaptcha.jsx

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { groundHeightAt } from "./groundHeight";

// Lifted alongside the ground's albedo for the same reason (see
// GROUND_STONE in GraveyardArchitecture): darkness in this scene comes
// from restrained lighting, not from near-black surfaces. Metalness is
// kept modest throughout — an early pass gave the fallen display panel
// metalness 0.3 at roughness 0.34, which caught a specular highlight off
// the grazing key and rendered a near-white slab in the foreground of
// the opening shot, by far the brightest thing on screen.
const METAL_DARK = "#252b2d";
const METAL_MID = "#2e3538";
const PLASTIC = "#1b1f21";

// --- Foreground -------------------------------------------------------
// Two remnants within a few units of the path at the very start of the
// route. Their only job is to give the opening shot a near layer so the
// eye has something to measure the emptiness against; both are small and
// unlit enough that neither asks for attention.

// A severed bundle of trunk cable spilling out of a broken conduit.
function CableBundle({ position }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);

  const strands = useMemo(
    () => [
      { pos: [0.1, 0.09, 0.3], rot: [0.08, 0.35, 1.62], len: 3.4, r: 0.075 },
      { pos: [-0.35, 0.07, 0.9], rot: [-0.12, 0.9, 1.55], len: 2.6, r: 0.06 },
      { pos: [0.55, 0.06, -0.5], rot: [0.05, -0.4, 1.51], len: 3.0, r: 0.065 },
      { pos: [-0.2, 0.11, -1.1], rot: [0.15, 1.25, 1.66], len: 2.1, r: 0.055 },
      { pos: [0.8, 0.05, 1.4], rot: [-0.06, 0.15, 1.49], len: 2.4, r: 0.05 },
    ],
    [],
  );

  return (
    <group position={[x, y, z]} rotation={[0, 0.4, 0]}>
      {/* The conduit the bundle was torn out of. Matte for the same
          reason as BrokenDisplay below — nothing this close to the
          camera may catch a specular off the grazing key. */}
      <mesh position={[0, 0.28, -1.9]} rotation={[0.12, 0, 0.06]}>
        <cylinderGeometry args={[0.42, 0.46, 1.1, 10]} />
        <meshStandardMaterial color={METAL_MID} roughness={0.9} metalness={0.08} />
      </mesh>
      {strands.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot}>
          <cylinderGeometry args={[s.r, s.r, s.len, 6]} />
          <meshStandardMaterial color={PLASTIC} roughness={0.95} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

// A display casing, face down in the dirt. Shape only — no text, no
// light. Its smoother material is what separates it from the terrain:
// under the grazing key it picks up a faint sheen the ground never does.
function BrokenDisplay({ position, rotation }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);

  return (
    // Every surface here is fully matte. Measured off the opening shot,
    // an earlier version of this object threw a specular highlight
    // peaking at 240/255 in a frame where 95% of pixels sat below 32 —
    // by an enormous margin the brightest thing on screen, and a
    // foreground prop is the last thing that should be. At grazing
    // incidence even a little metalness against the near-parallel key
    // produces that, so the fix is no metalness at all rather than a
    // darker colour.
    <group position={[x, y, z]} rotation={rotation}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.3, 0.44, 1.5]} />
        <meshStandardMaterial color={METAL_DARK} roughness={0.95} metalness={0} />
      </mesh>
      {/* The dead panel itself, tipped up out of the casing: a screen
          with nothing behind it, not a mirror. */}
      <mesh position={[1.35, 0.5, 0.2]} rotation={[0, 0.22, 0.62]}>
        <boxGeometry args={[1.8, 0.09, 1.15]} />
        <meshStandardMaterial color="#15191b" roughness={0.97} metalness={0} />
      </mesh>
      {/* Snapped stand. */}
      <mesh position={[-0.9, 0.16, 0.75]} rotation={[0.5, 0.3, 0.2]}>
        <boxGeometry args={[0.9, 0.14, 0.34]} />
        <meshStandardMaterial color={METAL_MID} roughness={0.92} metalness={0.04} />
      </mesh>
    </group>
  );
}

// --- Midground --------------------------------------------------------

// A short run of server racks, most still standing, one gone over. The
// horizontal slot rhythm is what makes these read as racks at distance
// rather than as plain boxes, and their strong verticals-in-a-row
// silhouette contrasts against the lattice towers around them.
function ServerRack({ position, rotation = [0, 0, 0], height = 6.2, toppled = false }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);
  const slots = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (i + 1) * (height / 8)),
    [height],
  );

  return (
    <group
      position={[x, y, z]}
      rotation={toppled ? [0, rotation[1], Math.PI / 2 - 0.12] : rotation}
    >
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[2.1, height, 1.35]} />
        <meshStandardMaterial color={METAL_DARK} roughness={0.66} metalness={0.34} />
      </mesh>
      {slots.map((sy, i) => (
        <mesh key={i} position={[0, sy, 0.7]}>
          <boxGeometry args={[1.85, 0.34, 0.07]} />
          <meshStandardMaterial color="#080a0b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// Re-sited onto the route's new line, and no longer a tidy row: the
// depths stagger, one has gone over, and the spacing is uneven enough
// that they read as what is left of a run rather than as an arrangement.
const RACKS = [
  { position: [-11, -94], rotation: [0, 0.22, 0], height: 6.4 },
  { position: [-7.4, -99], rotation: [0, 0.05, 0], height: 5.8 },
  { position: [-13.6, -103], rotation: [0, 0.34, 0], height: 6.6 },
  { position: [-5, -106.5], rotation: [0, -0.9, 0], height: 6.0, toppled: true },
];

// A loading indicator that stopped mid-rotation, at the scale of a
// building, left to sink. The gap is the whole recognition: a closed
// ring is a piece of pipe, an arc with a gap is a spinner. It is the
// only element here that says "this was still trying".
//
// Broken up in the staging pass. A single clean 1.55-pi arc, sunk
// halfway and evenly, read as an ARCH — a deliberate piece of
// architecture, which is the opposite of what it means. It is now a
// shorter main arc plus a separate segment that has broken away and
// fallen inside it, both tipped further over and sunk unevenly, so the
// circle is implied and interrupted rather than drawn. It also does
// real compositional work: it sits on the sightline to the monument
// through the middle of the route and eclipses it, which is what makes
// the machine something the visitor loses and re-finds instead of
// something continuously in view.
function FrozenSpinner({ position, radius = 7 }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);

  // WHERE THE ARC'S ENDS SIT is the entire difference between a spinner
  // and an arch, and it is not fixed by shortening the arc. Sunk evenly
  // with both ends meeting the dirt, any arc reads as a span — a piece
  // of deliberate architecture — no matter how much of the circle is
  // missing. The previous attempt shortened it to 1.12*PI and still read
  // as a clean arch in the render.
  //
  // Euler order here is XYZ, so `rotation.z` is applied FIRST and turns
  // the arc within its own plane. Spun by 0.62 rad, the arc runs from
  // ~36 degrees to ~234 degrees: the left end passes below the ground
  // line and is buried, while the RIGHT END STOPS IN MID-AIR about four
  // units up, supported by nothing. An arch cannot do that. The circle
  // is implied, interrupted, and obviously incomplete — a mechanism that
  // stopped part-way round.
  return (
    <group position={[x, y + radius * 0.05, z]} rotation={[0.3, 0.66, 0.62]}>
      <mesh>
        <torusGeometry args={[radius, 0.46, 8, 34, Math.PI * 1.1]} />
        <meshStandardMaterial color={METAL_MID} roughness={0.72} metalness={0.3} />
      </mesh>
    </group>
  );
}

// The segment that snapped out of the ring, lying flat on the ground
// clear of it. Kept as its own world-space element rather than a child
// of the ring's steeply rotated group, so it actually rests on the
// terrain instead of floating at whatever angle the parent happens to
// carry.
function SpinnerFragment({ position, radius = 6.2 }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);

  return (
    <group position={[x, y + 0.35, z]} rotation={[1.42, 0.5, 0.2]}>
      <mesh>
        <torusGeometry args={[radius, 0.42, 8, 14, Math.PI * 0.38]} />
        <meshStandardMaterial color={METAL_MID} roughness={0.8} metalness={0.26} />
      </mesh>
    </group>
  );
}

// --- 404 --------------------------------------------------------------
// The one relic in the Graveyard that names what died. Drawn to a canvas
// texture rather than built from geometry (cheap, and it lets the paint
// be degraded rather than crisp) and applied as both map and emissiveMap.
// Its emissive runs an order of magnitude under the CAPTCHA's, which is
// the point: this is a sign with a trickle of power left, not a machine
// still running. Placed far enough off the path that it has swung out of
// frame well before the final approach, so it can never compete with the
// monument.
function useSignTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0b0e0f";
    ctx.fillRect(0, 0, 512, 256);

    ctx.font = "bold 150px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6d7a7e";
    ctx.fillText("404", 256, 118);

    ctx.font = "26px 'Courier New', monospace";
    ctx.fillStyle = "#3d4649";
    ctx.fillText("NOT FOUND", 256, 205);

    // Weathering: knock irregular bands out of the paint so the sign
    // reads as survived rather than printed.
    ctx.globalCompositeOperation = "destination-out";
    const bands = [
      [0, 34, 512, 9],
      [0, 96, 512, 5],
      [0, 141, 512, 12],
      [0, 186, 512, 6],
    ];
    for (const [bx, by, bw, bh] of bands) {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.globalCompositeOperation = "source-over";

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// Driven much further into the ground and turned much further away in
// the staging pass. Standing up, tilted a little, facing the route and
// fully legible, it read as signage the level designer had set out for
// the visitor to find. It is now half-buried at a steep angle with most
// of the numerals below the dirt line and the panel turned well off the
// approach, so what survives is a fragment caught in passing — noticed
// rather than presented. A rubble drift covers the lower corner, which
// is what actually breaks up the reading of "404" into something the
// eye has to complete.
function NotFoundSlab({ position }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);
  const map = useSignTexture();

  return (
    <group position={[x, y - 5.1, z]} rotation={[-0.62, 1.16, 0.27]}>
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[11, 8.4, 0.7]} />
        <meshStandardMaterial color="#141719" roughness={0.86} metalness={0.1} />
      </mesh>
      <mesh position={[0, 4.2, 0.37]}>
        <planeGeometry args={[10.2, 5.1]} />
        <meshStandardMaterial
          map={map}
          emissiveMap={map}
          emissive="#8f9ea3"
          emissiveIntensity={0.07}
          color="#2a3033"
          roughness={0.88}
          metalness={0.03}
        />
      </mesh>
      {/* The snapped post it stood on, still attached, still buried. */}
      <mesh position={[0, -1.2, -0.5]} rotation={[0.1, 0, 0.06]}>
        <boxGeometry args={[0.8, 4, 0.8]} />
        <meshStandardMaterial color={METAL_DARK} roughness={0.82} metalness={0.2} />
      </mesh>
    </group>
  );
}

// Earth heaped over the slab's low corner. Placed in world space rather
// than inside the slab's steeply rotated group so it stays level with
// the terrain it is supposed to be part of.
function SlabDrift({ position }) {
  const [x, z] = position;
  const y = groundHeightAt(x, z);

  return (
    <group position={[x, y - 1.1, z]}>
      <mesh rotation={[0.05, 0.42, 0.04]}>
        <boxGeometry args={[13, 2.6, 9]} />
        <meshStandardMaterial color="#252b2e" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

export default function GraveyardRelics() {
  return (
    <group>
      {/* Foreground, re-sited onto the route's new line. */}
      <CableBundle position={[-23, -12]} />
      <BrokenDisplay position={[-34, -22]} rotation={[0, 0.9, 0]} />

      {RACKS.map((rack, i) => (
        <ServerRack key={i} {...rack} />
      ))}

      {/* Sited on the bearing from the camera to the monument through the
          middle of the route, so it eclipses the machine rather than
          merely sitting near it — see FrozenSpinner's own note.

          Radius reduced 7 -> 4.9 in the readability pass, on rendered
          evidence and for one reason only: SILHOUETTE COMPETITION. At
          radius 7 the camera passes within ~14 units of a 14-unit arc,
          and in the frame at t = 0.45 — the densest stretch of cemetery
          on the whole route, the shot whose entire job is "this is a
          graveyard" — the arc occupied 38% of the frame width and its
          full height, as a single black curve. It was the subject, and
          the graves behind it were background texture.

          Only the radius changed. Position, rotation, sink, the buried
          left end and the unsupported right end, and therefore both the
          spinner read and the monument eclipse, are untouched; it still
          crosses the sightline at the same point on the route. It now
          subtends roughly 70% of what it did, which is still a large
          ruined form in the middle distance and no longer the thing the
          frame is about. Its ~10 unit clearance in the grave fields'
          obstacle tables continues to cover it with room to spare. */}
      <FrozenSpinner position={[-21, -122]} radius={4.9} />
      <SpinnerFragment position={[-11.5, -116]} />

      {/* Off to the left of the closing approach and gone from frame well
          before it: the 404 is a fragment caught in passing, and it must
          never share a frame with the monument as a second thing to read. */}
      <NotFoundSlab position={[-29, -240]} />
      <SlabDrift position={[-31.5, -236]} />
    </group>
  );
}
