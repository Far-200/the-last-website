// src/scenes/Memories/MemoriesArchive.jsx
//
// The layer that makes Memories a place rather than three lit objects.
//
// What this exists to fix
// -----------------------
// Measured off the render before this pass, the scene's final frame — the
// photo stop, which the extinction sequence plays out on and which is the
// last image of the whole experience before LastMessage — was ONE small
// rectangle in an otherwise pure black field. No floor, no wall, no
// foreground, nothing behind it. The lamp is over three metres away at
// that point, so there was simply nothing for light to land on. The other
// stops were better but had the same shape of problem: a hero object, and
// then dark.
//
// MemoriesResidue already populates the immediate domestic surfaces (a
// mug, a notebook, a dropped cable) and its placements are individually
// verified against the camera; this file deliberately does not touch that
// work. It adds the three layers residue was never meant to be:
//
//   1. ARCHIVE REMNANTS, beyond the walls. Dead plates, empty frames and
//      suspended shards at 6-16 metres, all far darker than any memory
//      and most of them nearly consumed by fog. They are the scene's one
//      piece of implication: there were thousands of these, and three of
//      them still work. Nothing here is readable, and nothing here is
//      meant to be looked AT — if a visitor starts reading the background
//      the layer has failed.
//   2. FOREGROUND, at authored moments. Three pieces sited to crop a
//      frame edge at a specific stop, so the composition has something in
//      front of the memory as well as behind it.
//   3. FLOOR RESIDUE AT THE PHOTO, the closing frame's own supporting
//      cast, kept separate from the general debris because it is composed
//      against one camera position rather than scattered.
//
// Everything here is authored against MemoriesCamera's actual four stops,
// the same way MemoriesResidue's positions were: this scene's camera
// pitches down 40+ degrees at two of its stops, so an object at standing
// height is simply not in the picture, and an object under a metre away
// is below the bottom edge.
//
// Value discipline: the archive layer's material is DARKER than the floor
// it stands on, and its faint panels sit at about a fortieth of a hero
// fragment's emissive. If any of this ever competes with a memory, the
// number to change is here, not there.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAMP_POSITION, PHOTO_POSITION } from "./layout";

// MemoriesCamera's four stop positions. Imported as plain numbers rather
// than from that component (a file exporting a component cannot also
// export a constant without breaking fast refresh, which is why STOPS
// already lives in layout.js). Used only to keep dust off the lens.
const CAMERA_STOPS = [
  [0.9, 1.62, 5.1],
  [-0.28, 1.58, 2.05],
  [-1.55, 1.35, -1.55],
  [0.15, 1.05, -2.9],
];
const LENS_CLEARANCE = 0.6;

// Cold, and deliberately below the floor's own value so the archive reads
// as a silhouette against the dark rather than as objects in the room.
const ARCHIVE_DARK = "#141619";
const ARCHIVE_EDGE = "#191d21";
// The faint panels. Warm, because whatever is left running in this place
// is warm, but at a value that can never be mistaken for a memory.
const PANEL_EMISSIVE = "#c9a173";
const PANEL_EMISSIVE_INTENSITY = 0.035;

const OFF_BY_PHASE = { dark: 0, leaving: 0 };

function matrixAt(p, r, s) {
  const o = new THREE.Object3D();
  o.position.set(...p);
  o.rotation.set(...r);
  o.scale.set(...s);
  o.updateMatrix();
  return o.matrix.clone();
}

// --- Archive remnants ---------------------------------------------------
// Beyond both broken walls (left wall at x = -3.6, back wall at z = -5.1)
// and stretching to about 16 metres, which is where fog (far = 18) has
// taken everything. Heights run from the floor to about three metres: a
// few are genuinely suspended, most lean or lie, because a room full of
// floating rectangles reads as a screensaver and a room with three of
// them reads as an archive that has come apart.
//
// Depth is authored in three bands so the layer itself has depth: near
// remnants at 6-8m still show an edge, mid at 9-12m are silhouettes, far
// at 13-16m are barely a change in the black.
const SHARDS = [
  // near band — past the back wall, reads as the room continuing
  { p: [-1.4, 0.62, -7.2], r: [0.06, 0.34, 0.12], s: [1.15, 1.24, 0.05] },
  { p: [1.9, 0.28, -7.9], r: [0.02, -0.5, 0.06], s: [0.9, 0.56, 0.05] },
  { p: [-4.9, 0.9, -6.6], r: [0.1, 0.9, -0.22], s: [0.8, 1.8, 0.05] },
  { p: [3.6, 1.35, -8.6], r: [0.04, -0.28, 0.09], s: [1.4, 0.95, 0.05] },
  // mid band — silhouettes
  { p: [-6.8, 1.15, -9.8], r: [0.08, 0.62, 0.16], s: [1.5, 2.3, 0.06] },
  { p: [-2.2, 2.35, -10.6], r: [0.22, 0.18, -0.4], s: [1.25, 0.85, 0.05] },
  { p: [2.4, 0.45, -10.2], r: [0.03, -0.7, 0.04], s: [1.8, 0.9, 0.06] },
  { p: [6.1, 1.7, -11.4], r: [0.06, -0.95, 0.12], s: [1.2, 2.6, 0.06] },
  { p: [-8.4, 0.5, -8.2], r: [0.05, 1.1, 0.08], s: [1.6, 1.0, 0.06] },
  { p: [0.4, 3.05, -12.2], r: [0.34, 0.4, 0.26], s: [1.05, 0.7, 0.05] },
  // far band — almost gone
  { p: [-5.2, 1.5, -11.6], r: [0.05, 0.5, 0.1], s: [2.2, 3.0, 0.07] },
  { p: [3.2, 1.9, -13.2], r: [0.04, -0.4, -0.08], s: [2.6, 2.4, 0.07] },
  { p: [-10.5, 1.2, -11.6], r: [0.06, 0.85, 0.14], s: [2.0, 2.8, 0.07] },
  { p: [8.5, 1.05, -12.4], r: [0.03, -1.05, 0.05], s: [1.9, 2.2, 0.07] },
  // two past the LEFT wall, so the archive does not only exist ahead
  { p: [-7.6, 0.75, -2.4], r: [0.04, 1.5, 0.1], s: [1.3, 1.5, 0.05] },
  { p: [-9.8, 1.4, -4.8], r: [0.07, 1.32, -0.12], s: [1.7, 2.4, 0.06] },
];

// An empty frame is the most economical object in this scene: it is the
// exact shape of a memory with the memory taken out. Four thin bars, so
// the silhouette is a hole rather than a plate.
const FRAMES = [
  { p: [-3.1, 0.0, -6.4], r: [0, 0.42, 0.06], w: 0.82, h: 1.05, lean: 0.24 },
  { p: [1.15, 0.0, -6.9], r: [0, -0.34, -0.04], w: 1.0, h: 0.72, lean: 0.16 },
  { p: [-5.6, 0.0, -8.6], r: [0, 0.72, 0.03], w: 0.68, h: 0.9, lean: 0.3 },
  { p: [4.3, 0.0, -9.9], r: [0, -0.62, 0.05], w: 1.15, h: 0.85, lean: 0.2 },
  { p: [-1.9, 0.0, -9.2], r: [0, 0.18, -0.05], w: 0.9, h: 1.2, lean: 0.12 },
];
const FRAME_BAR = 0.045;

// Dead display surfaces, deep enough that they never resolve into
// anything. These are the only emissive objects in this file and their
// intensity is set at a fortieth of the photo's.
const PANELS = [
  { p: [-2.6, 0.95, -8.1], r: [0.05, 0.36, 0.04], s: [0.72, 0.46] },
  { p: [2.85, 1.25, -9.4], r: [0.03, -0.48, -0.06], s: [0.6, 0.4] },
  { p: [-6.2, 0.62, -7.4], r: [0.04, 0.8, 0.08], s: [0.85, 0.34] },
  { p: [0.9, 2.15, -11.1], r: [0.2, 0.22, 0.1], s: [0.5, 0.34] },
  { p: [-8.8, 1.05, -10.4], r: [0.06, 1.05, -0.05], s: [0.66, 0.44] },
  { p: [5.4, 0.85, -12.4], r: [0.02, -0.86, 0.06], s: [0.78, 0.5] },
];

function ArchiveRemnants() {
  const shardRef = useRef(null);
  const barRef = useRef(null);

  const shardMatrices = useMemo(
    () => SHARDS.map((s) => matrixAt(s.p, s.r, [s.s[0], s.s[1], s.s[2]])),
    [],
  );

  // Every frame's four bars flattened into one instanced set.
  const barMatrices = useMemo(() => {
    const out = [];
    for (const f of FRAMES) {
      const [x, y, z] = f.p;
      const yaw = f.r[1];
      const cy = y + f.h / 2 + 0.02;
      // Local offsets, then rotated into the frame's own yaw so a leaned
      // frame stays square to itself.
      const local = [
        { o: [-f.w / 2, 0, 0], s: [FRAME_BAR, f.h, FRAME_BAR] },
        { o: [f.w / 2, 0, 0], s: [FRAME_BAR, f.h, FRAME_BAR] },
        { o: [0, f.h / 2, 0], s: [f.w, FRAME_BAR, FRAME_BAR] },
        { o: [0, -f.h / 2, 0], s: [f.w, FRAME_BAR, FRAME_BAR] },
      ];
      for (const b of local) {
        const v = new THREE.Vector3(...b.o).applyEuler(new THREE.Euler(f.lean, yaw, f.r[2]));
        out.push(matrixAt([x + v.x, cy + v.y, z + v.z], [f.lean, yaw, f.r[2]], b.s));
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    if (shardRef.current) {
      shardMatrices.forEach((m, i) => shardRef.current.setMatrixAt(i, m));
      shardRef.current.instanceMatrix.needsUpdate = true;
    }
    if (barRef.current) {
      barMatrices.forEach((m, i) => barRef.current.setMatrixAt(i, m));
      barRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [shardMatrices, barMatrices]);

  return (
    <>
      {/* frustumCulled off for the same reason the Graveyard's fields do
          it: an instanced set spread over 25 metres has no honest
          bounding sphere from its unit-cube base geometry. Two draw
          calls, always drawn, is cheaper than being wrong. */}
      <instancedMesh
        ref={shardRef}
        args={[null, null, shardMatrices.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ARCHIVE_DARK} roughness={0.95} metalness={0.04} />
      </instancedMesh>
      <instancedMesh ref={barRef} args={[null, null, barMatrices.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ARCHIVE_EDGE} roughness={0.9} metalness={0.06} />
      </instancedMesh>
    </>
  );
}

function DeadPanels({ phase, reduceMotion }) {
  const groupRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const target = OFF_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
    smoothed.current += (target - smoothed.current) * amount;
    for (const child of group.children) {
      child.material.emissiveIntensity = PANEL_EMISSIVE_INTENSITY * smoothed.current;
    }
  });

  return (
    <group ref={groupRef}>
      {PANELS.map((p, i) => (
        <mesh key={i} position={p.p} rotation={p.r}>
          <planeGeometry args={p.s} />
          <meshStandardMaterial
            color="#0d0b09"
            emissive={PANEL_EMISSIVE}
            emissiveIntensity={PANEL_EMISSIVE_INTENSITY}
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Foreground ---------------------------------------------------------
// Three pieces, each sited for ONE stop, each meant to be cropped by the
// frame rather than seen whole. They are the layer that stops every shot
// being "object, then dark": something has to be in front of the memory
// as well as behind it.
function Foreground() {
  return (
    <group>
      {/* Entry, left edge. Solved against stop 0 rather than guessed: the
          first attempt was a board lying on the floor at 2 metres, and at
          this stop the camera sits at 1.62 with only a 6-degree downward
          pitch, so the floor does not enter frame until 3.2 metres out —
          the board was entirely below the bottom edge and rendered as
          nothing. A STANDING form at 3.3 metres lands at ndc(-0.87,
          -0.21): hard against the left edge, cropped, exactly the near
          layer the establishing shot had none of. It is out of frame at
          all three later stops, so it frames the entry and then gets out
          of the way. */}
      <group position={[-1.85, 0, 3.2]} rotation={[0.03, 0.55, 0.075]}>
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 2.0, 0.07]} />
          <meshStandardMaterial color="#1c1f24" roughness={0.94} metalness={0.02} />
        </mesh>
        {/* the piece that came off it, on the floor at its foot */}
        <mesh position={[0.44, 0.05, 0.22]} rotation={[0.06, 0.4, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.09, 0.3]} />
          <meshStandardMaterial color={ARCHIVE_EDGE} roughness={0.9} metalness={0.04} />
        </mesh>
      </group>

      {/* Voicemail stop, upper-left. Sited at 0.9 metres from the stop-2
          camera, where it lands at ndc(-0.84, 0.57) — cropped by the left
          edge, its inner edge stopping about a fifth of the frame short
          of the voicemail itself, so it frames the memory without ever
          crossing it. Narrow on purpose for that reason. */}
      <mesh
        position={[-2.5, 1.0, -1.66]}
        rotation={[0.1, 0.5, -0.34]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.62, 1.6, 0.08]} />
        <meshStandardMaterial color="#1c1f23" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Photo stop, bottom edge: an empty frame lying face down on the
          floor, cropped by the bottom of frame at t~0.9. The closing shot
          reads through it: an emptied frame in front, the one surviving
          print behind it. */}
      <group position={[0.36, 0.02, -3.28]} rotation={[0, 0.78, 0]}>
        {[
          { o: [-0.3, 0, 0], s: [0.05, 0.04, 0.44] },
          { o: [0.3, 0, 0], s: [0.05, 0.04, 0.44] },
          { o: [0, 0, -0.22], s: [0.65, 0.04, 0.05] },
          { o: [0, 0, 0.22], s: [0.65, 0.04, 0.05] },
        ].map((b, i) => (
          <mesh key={i} position={b.o} castShadow receiveShadow>
            <boxGeometry args={b.s} />
            <meshStandardMaterial color="#23252a" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// --- The closing frame's floor -----------------------------------------
// Composed against stop 3 specifically (camera at [0.15, 1.05, -2.9]
// pitched 41 degrees down at the print 1.5 metres away). The visible
// floor at that stop runs from about 0.6 to 2.9 metres along the view
// bearing; everything below sits inside that strip, off to one side of
// the print so the print keeps the centre of its own frame.
// --- Still set for someone --------------------------------------------
// The objects that carry this pass's thesis. None of them is debris and
// none is decoration: each is a thing a person put down expecting to pick
// it up again, and each was placed against a specific camera stop rather
// than scattered.
function StillWaiting() {
  const materials = useMemo(
    () => ({
      leather: new THREE.MeshStandardMaterial({ color: "#2b2521", roughness: 0.82, metalness: 0.04 }),
      paper: new THREE.MeshStandardMaterial({ color: "#4c4436", roughness: 0.9, metalness: 0 }),
      board: new THREE.MeshStandardMaterial({ color: "#3a3128", roughness: 0.88, metalness: 0.02 }),
      patch: new THREE.MeshStandardMaterial({ color: "#2a2d31", roughness: 0.98, metalness: 0 }),
      pin: new THREE.MeshStandardMaterial({ color: "#4a4c50", roughness: 0.4, metalness: 0.5 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return (
    <group>
      {/* Shoes by the wall, set down side by side. Not thrown, not
          scattered - put there by somebody who was staying. In frame at
          both of the first two stops (ndc(-0.32,-0.34), then
          ndc(-0.91,-0.43)), so they pass out through the left edge as the
          camera closes on the desk. */}
      <group position={[-3.1, 0, -0.35]} rotation={[0, 0.34, 0]}>
        {[-0.075, 0.075].map((lx, i) => (
          <group key={i} position={[lx, 0, i * 0.04]} rotation={[0, i ? 0.12 : -0.08, 0]}>
            <mesh position={[0, 0.045, 0]} material={materials.leather} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.09, 0.27]} />
            </mesh>
            <mesh position={[0, 0.085, -0.07]} material={materials.leather} castShadow>
              <boxGeometry args={[0.095, 0.06, 0.12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* A book left open and face down, to hold the page. Sits on the
          table's own rotated top (checked in the table's local frame, not
          in world) and lands at ndc(0.36, 0.03) from the draft-message
          stop - the second thing in that frame, and the second unfinished
          thing in it. */}
      <group position={[-0.32, 0.795, -0.58]} rotation={[0, 0.62, 0]}>
        <mesh
          position={[-0.085, 0.012, 0]}
          rotation={[0, 0, 0.16]}
          material={materials.paper}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.19, 0.012, 0.24]} />
        </mesh>
        <mesh
          position={[0.085, 0.012, 0]}
          rotation={[0, 0, -0.16]}
          material={materials.paper}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.19, 0.012, 0.24]} />
        </mesh>
        <mesh position={[0, 0.032, 0]} material={materials.board} castShadow>
          <boxGeometry args={[0.2, 0.016, 0.25]} />
        </mesh>
      </group>

      {/* The left wall, still dressed. A rectangle of wall that never
          weathered because something hung over it, the nail still in it,
          and two notes somebody pinned up and never took down. The patch
          is the cheapest possible way to say "this wall was arranged by a
          person": it is evidence of a thing that is gone, on a surface
          that kept its shape. */}
      <group position={[-3.47, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[1.2, 1.35, 0]} material={materials.patch}>
          <planeGeometry args={[0.62, 0.78]} />
        </mesh>
        <mesh position={[1.2, 1.78, 0.012]} material={materials.pin}>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 5]} />
        </mesh>
        <mesh position={[1.86, 1.52, 0.004]} rotation={[0, 0, 0.08]} material={materials.paper}>
          <planeGeometry args={[0.15, 0.19]} />
        </mesh>
        <mesh position={[1.72, 1.14, 0.004]} rotation={[0, 0, -0.13]} material={materials.paper}>
          <planeGeometry args={[0.12, 0.15]} />
        </mesh>
      </group>
    </group>
  );
}

// The closing frame is no longer "a photo that was dropped". It is
// somebody sitting on the floor going through a box of photographs, one
// at a time, who stopped.
//
// That is the difference this pass turns on. A dropped print is an
// accident and reads as ruin; an OPEN BOX with its lid set down beside it
// and half its contents laid out in a small arc is an activity, paused.
// The prints around the hero are face UP and fanned the way somebody
// deals them out to look at them, not scattered the way things fall. One
// of them - the one the visitor is looking at - is still lit.
//
// Every position is solved against stop 3 (camera [0.15, 1.05, -2.9]
// pitched 41 degrees down at the print 1.5 metres away): the box lands
// right of centre at ndc(0.66, 0.36), the folded blanket left at
// ndc(-0.61, -0.08), and the fanned prints fill the arc between them.
const PHOTO_PRINTS = [
  { p: [0.62, 0.014, -3.62], r: [-Math.PI / 2, 0, 0.28], s: [0.3, 0.23] },
  { p: [1.3, 0.014, -3.98], r: [-Math.PI / 2, 0, -0.5], s: [0.32, 0.24] },
  { p: [1.45, 0.014, -4.28], r: [-Math.PI / 2, 0, 0.65], s: [0.27, 0.35] },
  { p: [1.05, 0.014, -4.25], r: [-Math.PI / 2, 0, -0.18], s: [0.31, 0.23] },
];

function PhotoFloor() {
  const materials = useMemo(
    () => ({
      // Paper that has lost its image. Lighter than the floor so the arc
      // of prints reads as an arrangement even where the light barely
      // reaches - but far below the hero, which is the only one that
      // still carries anything.
      print: new THREE.MeshStandardMaterial({ color: "#38332b", roughness: 0.95, metalness: 0 }),
      card: new THREE.MeshStandardMaterial({ color: "#2a2721", roughness: 0.96, metalness: 0 }),
      cloth: new THREE.MeshStandardMaterial({ color: "#38302a", roughness: 1, metalness: 0 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return (
    <group>
      {PHOTO_PRINTS.map((p, i) => (
        <mesh key={i} position={p.p} rotation={p.r} material={materials.print} receiveShadow>
          <planeGeometry args={p.s} />
        </mesh>
      ))}

      {/* The box they came out of: open, shallow, turned toward whoever
          was sitting here. */}
      <group position={[1.68, 0, -3.62]} rotation={[0, -0.42, 0]}>
        <mesh position={[0, 0.045, 0]} material={materials.card} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.09, 0.36]} />
        </mesh>
        {[
          { o: [-0.235, 0.12, 0], s: [0.03, 0.16, 0.36] },
          { o: [0.235, 0.12, 0], s: [0.03, 0.16, 0.36] },
          { o: [0, 0.12, -0.19], s: [0.5, 0.16, 0.03] },
          { o: [0, 0.12, 0.19], s: [0.5, 0.16, 0.03] },
        ].map((w, i) => (
          <mesh key={i} position={w.o} material={materials.card} castShadow receiveShadow>
            <boxGeometry args={w.s} />
          </mesh>
        ))}
        {/* the prints still in it, as one block */}
        <mesh position={[0, 0.13, 0]} material={materials.print} receiveShadow>
          <boxGeometry args={[0.4, 0.05, 0.3]} />
        </mesh>
      </group>

      {/* The lid, set down beside the box rather than thrown - the small
          courtesy of somebody who intended to put it all back. */}
      <mesh
        position={[2.02, 0.02, -4.02]}
        rotation={[0, -0.24, 0.03]}
        material={materials.card}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.5, 0.04, 0.4]} />
      </mesh>

      {/* A folded blanket on the floor opposite the box: this is where
          they were sitting. */}
      <group position={[0.3, 0, -4.15]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.05, 0]} material={materials.cloth} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.1, 0.44]} />
        </mesh>
        <mesh
          position={[0.06, 0.13, -0.04]}
          rotation={[0.04, 0.18, 0.02]}
          material={materials.cloth}
          castShadow
        >
          <boxGeometry args={[0.5, 0.07, 0.34]} />
        </mesh>
      </group>
    </group>
  );
}

// --- Atmosphere ---------------------------------------------------------
// Dust, and only dust. The brief's own limit — "movement should be slow
// enough to be almost subconscious" — is the whole specification: this
// drifts at about 1.5 cm a second, which over the ten-plus seconds a
// visitor spends at a stop is a few centimetres of travel and reads as
// air rather than as an effect.
//
// Concentrated where light actually is: two thirds of the motes sit in a
// small volume around the lamp and the print, because dust is only ever
// visible where something is lighting it, and an even scatter through the
// whole room would show as a grey haze in the dark corners instead.
const DUST_COUNT = 420;
const DUST_DRIFT = 0.015;

// PointsMaterial with no map draws hard SQUARES, which at any visible
// size read as snow or as dead pixels rather than as dust — the first
// render of this layer showed exactly that. One tiny procedural radial
// gradient turns each mote into a soft disc, costs a single 32px texture,
// and adds no dependency.
function createMoteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Deterministic mote field, built once at MODULE LOAD rather than inside
// the component. The drift below writes into this position buffer every
// frame, and neither a memo nor state may be mutated after render
// (react-hooks/immutability) — both rules are correct, and the honest fix
// is for a buffer owned by the render loop not to be a hook value at all.
// Same pattern the Graveyard's marker field uses for its instance data.
function createDustField() {
  const positions = new Float32Array(DUST_COUNT * 3);
  const seeds = new Float32Array(DUST_COUNT * 2);
  const base = new Float32Array(DUST_COUNT * 3);
  let seed = 991;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < DUST_COUNT; i++) {
    const roll = rand();
    let x;
    let y;
    let z;
    if (roll < 0.42) {
      // around the lamp and the table
      x = LAMP_POSITION[0] + (rand() - 0.5) * 3.4;
      y = 0.15 + rand() * 1.7;
      z = LAMP_POSITION[2] + (rand() - 0.5) * 3.0;
    } else if (roll < 0.7) {
      // around the closing frame
      x = PHOTO_POSITION[0] + (rand() - 0.5) * 2.4;
      y = 0.05 + rand() * 1.1;
      z = PHOTO_POSITION[2] + (rand() - 0.5) * 2.2;
    } else {
      // the rest of the corner, sparse
      x = -4.6 + rand() * 8.2;
      y = 0.1 + rand() * 2.4;
      z = -5.4 + rand() * 8.6;
    }
    // A mote that ends up on the lens is not dust, it is a bright blob:
    // with sizeAttenuation on, a speck 30 cm from the camera renders
    // dozens of times larger than one two metres away, and the first
    // render of this layer had exactly that — two motes reading as
    // headlights at the voicemail stop. Anything inside LENS_CLEARANCE of
    // an authored stop is pushed back out along its own bearing.
    for (const c of CAMERA_STOPS) {
      const dx = x - c[0];
      const dy = y - c[1];
      const dz = z - c[2];
      const d = Math.hypot(dx, dy, dz);
      if (d < LENS_CLEARANCE && d > 1e-4) {
        const k = LENS_CLEARANCE / d;
        x = c[0] + dx * k;
        y = c[1] + dy * k;
        z = c[2] + dz * k;
      }
    }

    base[i * 3] = x;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = z;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds[i * 2] = rand() * Math.PI * 2;
    seeds[i * 2 + 1] = 0.55 + rand() * 0.9;
  }

  return { positions, seeds, base };
}

const DUST_FIELD = createDustField();

function Dust({ phase, reduceMotion }) {
  const matRef = useRef(null);
  const moteMap = useMemo(() => createMoteTexture(), []);
  useEffect(() => () => moteMap.dispose(), [moteMap]);
  const geoRef = useRef(null);
  const level = useRef(1);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (mat) {
      const target = OFF_BY_PHASE[phase] ?? 1;
      const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
      level.current += (target - level.current) * amount;
      mat.opacity = 0.3 * level.current;
    }
    // Reduced motion keeps the dust but stops it moving: the atmosphere
    // is information about the space, the drift is not.
    if (reduceMotion) return;
    const geo = geoRef.current;
    if (!geo) return;
    clock.current += delta;
    const t = clock.current;
    const { positions, seeds, base } = DUST_FIELD;
    for (let i = 0; i < DUST_COUNT; i++) {
      const phase0 = seeds[i * 2];
      const rate = seeds[i * 2 + 1];
      positions[i * 3] = base[i * 3] + Math.sin(t * 0.09 * rate + phase0) * 0.055;
      positions[i * 3 + 1] =
        base[i * 3 + 1] + ((t * DUST_DRIFT * rate + phase0 * 0.1) % 0.9) - 0.45;
      positions[i * 3 + 2] =
        base[i * 3 + 2] + Math.cos(t * 0.075 * rate + phase0 * 1.7) * 0.055;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[DUST_FIELD.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={moteMap}
        size={0.017}
        sizeAttenuation
        color="#d8c3a2"
        transparent
        opacity={0.3}
        depthWrite={false}
        fog
      />
    </points>
  );
}

export default function MemoriesArchive({ phase, reduceMotion }) {
  return (
    <group>
      <ArchiveRemnants />
      <DeadPanels phase={phase} reduceMotion={reduceMotion} />
      <Foreground />
      <StillWaiting />
      <PhotoFloor />
      <Dust phase={phase} reduceMotion={reduceMotion} />
    </group>
  );
}
