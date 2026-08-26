// src/scenes/Feed/FeedInfrastructure.jsx
//
// The ruined information layer inside FeedArchitecture's civic nave. The
// nave gives the shot its scale, its vanishing point and the atmosphere
// the Prelude->Feed and Feed->Graveyard handoffs both depend on; this
// file gives it the thing the Feed is actually about — a dead archive
// that was built into the building and then failed.
//
// Why a separate file and not more arrays in FeedArchitecture
// ----------------------------------------------------------
// FeedArchitecture is the unmoving stone shell and is deliberately frozen
// around the transition contract. This is a distinct vocabulary (metal,
// racks, pylons, ducts, cable) with its own material set, and keeping it
// apart means the shell can be re-tuned for the handoff without wading
// through server racks, and vice versa. Placement lives in
// src/data/feedInfrastructure.js for the same reason feedFragments and
// feedArchive keep their layout out of render code.
//
// Ownership
// ---------
// Every mesh here is static authored geometry. There is no useFrame, no
// state, no light and no shadow in this file — it cannot compete with
// FeedCamera's progression authority, FeedScene's single-writer
// Atmosphere, or FeedFragment's discrete GSAP moments. Fog is the only
// thing that changes how this geometry reads frame to frame, and fog is
// owned entirely by FeedScene.
//
// Composition, built against the camera route
// ------------------------------------------
// FeedCamera runs z +12 -> -120 with small lateral drift and a nearly
// level gaze fixed 40 units down the nave. Depth is authored in four
// bands against that path:
//
//   FOREGROUND  overhead runs whose sag drops into the upper frame right
//               over a waypoint, plus one near-path leaning rack and one
//               near-path pylon whose mid-section clips a frame edge in
//               passing. None crosses the walking corridor.
//   ROUTE/MID   debris clusters pulled toward the path in the route's big
//               gaps; conduit lines whose length rushes past the camera.
//   ARCHITECTURE rack towers and pylons filling the bare side aisles and
//               overlapping the colonnade tops; screen housings that fix
//               four floating fragment cards to something physical.
//   DISTANT     server-tower silhouettes past the aperture, sitting in
//               the resting fog so they only pale-in and loom as the
//               camera closes the saturation stretch.
//
// Density follows feedArchive's bands: heavy through the opening and the
// -55..-118 saturation stretch, withdrawn from z -119 to the aperture so
// the closing frames keep their negative space.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { STONE_MID } from "./FeedArchitecture";
import { feedFragments } from "../../data/feedFragments";
import {
  RACK_TOWERS,
  PYLONS,
  OVERHEAD_RUNS,
  CABLE_DRAPES,
  CONDUIT_LINES,
  DEBRIS_CLUSTERS,
  FLOOR_SCORCH,
  SCREEN_HOUSING_IDS,
  DISTANT_TOWERS,
} from "../../data/feedInfrastructure";

// Same seeded PRNG the rest of the project uses (Prelude Debris,
// FeedDebris, FeedArchiveField, GraveyardMemorials) — deterministic
// layout, identical output every reload, so authored compositions do not
// drift between renders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Metal / screen vocabulary. Kept in the same cold green-charcoal family
// as FeedSecondaryFragments (backing #151c1a, frame #27312e, dead screen
// #090d0c) and FeedArchiveField (#19221f) so the two population layers
// read as one archive. A touch of metalness so the scene's aperture
// back-light gives rack frames and pylon masts a faint edge the matte
// stone never gets — the same trick DeadScreen uses in FeedArchitecture.
const METAL_DARK = "#141a19";
const METAL_MID = "#212a28";
const SCREEN_DEAD = "#0a0e0d";
const DISTANT = "#0f1413";

// One reusable unit box / unit plane shared by every instanced field
// here, scaled per instance. Disposed on unmount.
function useKitResources() {
  const res = useMemo(() => {
    return {
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      metalDark: new THREE.MeshStandardMaterial({
        color: METAL_DARK,
        roughness: 0.9,
        metalness: 0.22,
      }),
      metalMid: new THREE.MeshStandardMaterial({
        color: METAL_MID,
        roughness: 0.82,
        metalness: 0.3,
      }),
      screen: new THREE.MeshStandardMaterial({
        color: SCREEN_DEAD,
        roughness: 0.5,
        metalness: 0.16,
      }),
      stoneMid: new THREE.MeshStandardMaterial({
        color: STONE_MID,
        roughness: 1,
        metalness: 0.03,
      }),
      cable: new THREE.MeshStandardMaterial({
        color: "#0b0f0e",
        roughness: 0.95,
        metalness: 0,
      }),
      // Fog still applies to a basic material, so a flat near-black slab
      // reads as a clean silhouette that pales into the haze with
      // distance regardless of the scene's back-light direction — which
      // is exactly what a distant structure should do.
      distant: new THREE.MeshBasicMaterial({ color: DISTANT }),
      // Dark floor skirt / scorch — value only, no lighting response
      // needed, matches FeedArchitecture's FLOOR_STAINS intent.
      scorch: new THREE.MeshStandardMaterial({
        color: "#0c100f",
        roughness: 1,
        metalness: 0,
      }),
    };
  }, []);

  useEffect(() => {
    return () => {
      res.box.dispose();
      res.plane.dispose();
      res.metalDark.dispose();
      res.metalMid.dispose();
      res.screen.dispose();
      res.stoneMid.dispose();
      res.cable.dispose();
      res.distant.dispose();
      res.scorch.dispose();
    };
  }, [res]);

  return res;
}

// Compose a child's local transform into the world frame of a leaning
// "root" (a rack tower / pylon that is tilted as a whole). Returns a
// world matrix ready for setMatrixAt. Reuses two scratch Object3Ds per
// call rather than allocating inside the loop.
const rootScratch = new THREE.Object3D();
const childScratch = new THREE.Object3D();
function composeChild(rootPos, rootRot, localPos, localRot, localScale) {
  rootScratch.position.set(rootPos[0], rootPos[1], rootPos[2]);
  rootScratch.rotation.set(rootRot[0], rootRot[1], rootRot[2]);
  rootScratch.updateMatrix();
  childScratch.position.set(localPos[0], localPos[1], localPos[2]);
  childScratch.rotation.set(localRot[0], localRot[1], localRot[2]);
  childScratch.scale.set(localScale[0], localScale[1], localScale[2]);
  childScratch.updateMatrix();
  return rootScratch.matrix.clone().multiply(childScratch.matrix);
}

function fillInstanced(mesh, matrices) {
  if (!mesh) return;
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  // The matrices are world-space and static, so one aggregate bound makes
  // Three's normal frustum culling safe without per-frame recomputation.
  mesh.computeBoundingSphere();
}

// --- Rack / terminal towers ------------------------------------------
// Two instanced fields for every rack in the scene: the open frame
// (uprights + base) and the blade slabs. Missing bay indices are left
// empty; a few become a single blade hanging out of its slot, so the
// gaps read as failure rather than as a blade that was never installed.
function RackTowers({ res }) {
  const frameRef = useRef(null);
  const bladeRef = useRef(null);

  const { frames, blades } = useMemo(() => {
    const frameM = [];
    const bladeM = [];

    RACK_TOWERS.forEach((t, idx) => {
      const rand = mulberry32(9100 + idx * 37);
      const [x, z] = t.pos;
      const rootPos = [x, 0, z];
      const rootRot = t.lean;
      const halfW = t.slim ? 0.7 : 1.1;
      const depth = t.slim ? 0.9 : 1.4;

      // Uprights.
      for (const sx of [-halfW, halfW]) {
        frameM.push(
          composeChild(rootPos, rootRot, [sx, t.h / 2, 0], [0, 0, 0], [0.16, t.h, 0.16]),
        );
      }
      // Base plinth.
      frameM.push(
        composeChild(rootPos, rootRot, [0, 0.35, 0], [0, 0, 0], [halfW * 2 + 0.5, 0.7, depth + 0.4]),
      );
      // A couple of back rails so the frame is not just two poles.
      for (const ry of [t.h * 0.3, t.h * 0.72]) {
        frameM.push(
          composeChild(rootPos, rootRot, [0, ry, -depth / 2], [0, 0, 0], [halfW * 2, 0.1, 0.1]),
        );
      }

      // Blades.
      const first = 0.9;
      const span = t.h - 1.4 - first;
      for (let b = 0; b < t.bays; b++) {
        const ly = first + (span * b) / (t.bays - 1);
        const missing = t.missing?.includes(b);
        if (missing) {
          // ~40% of gaps get a blade tipped half out of the slot.
          if (rand() < 0.4) {
            const drop = 0.25 + rand() * 0.4;
            bladeM.push(
              composeChild(
                rootPos,
                rootRot,
                [halfW * 0.5, ly - drop, depth * 0.35],
                [rand() * 0.3 - 0.15, rand() * 0.5, 0.5 + rand() * 0.5],
                [halfW * 1.5, 0.16, depth * 0.8],
              ),
            );
          }
          continue;
        }
        const th = 0.18 + rand() * 0.14;
        bladeM.push(
          composeChild(
            rootPos,
            rootRot,
            [0, ly, 0],
            [0, 0, 0],
            [halfW * 1.9, th, depth],
          ),
        );
      }
    });

    return { frames: frameM, blades: bladeM };
  }, []);

  useLayoutEffect(() => {
    fillInstanced(frameRef.current, frames);
    fillInstanced(bladeRef.current, blades);
  }, [frames, blades]);

  return (
    <group>
      <instancedMesh
        ref={frameRef}
        args={[res.box, res.metalMid, frames.length]}
      />
      <instancedMesh
        ref={bladeRef}
        args={[res.box, res.screen, blades.length]}
      />
    </group>
  );
}

// --- Feed pylons ----------------------------------------------------
// Full-height masts with broken cross-arms and a shattered panel head.
// Three instanced fields: mast, arms, head bars. The head is an
// incomplete frame (three or four bars, never a closed rectangle) so it
// reads as a smashed sign, not a picture frame.
function Pylons({ res }) {
  const mastRef = useRef(null);
  const armRef = useRef(null);
  const headRef = useRef(null);

  const { masts, arms, heads } = useMemo(() => {
    const mastM = [];
    const armM = [];
    const headM = [];

    PYLONS.forEach((p, idx) => {
      const rand = mulberry32(4400 + idx * 53);
      const [x, z] = p.pos;
      const rootPos = [x, 0, z];
      const rootRot = p.lean;

      mastM.push(composeChild(rootPos, rootRot, [0, p.h / 2, 0], [0, 0, 0], [0.34, p.h, 0.34]));
      // A short thicker collar low down so the base has some weight.
      mastM.push(composeChild(rootPos, rootRot, [0, 1.1, 0], [0, 0, 0], [0.7, 2.2, 0.7]));

      p.arms.forEach((ay, ai) => {
        const dir = ai % 2 === 0 ? 1 : -1;
        const len = 2.6 + rand() * 2.2;
        const droop = 0.1 + rand() * 0.35;
        armM.push(
          composeChild(
            rootPos,
            rootRot,
            [dir * (len / 2 + 0.2), ay, 0],
            [0, 0, dir * -droop],
            [len, 0.18, 0.18],
          ),
        );
        // Half the arms carry a stub hanger.
        if (rand() < 0.5) {
          armM.push(
            composeChild(
              rootPos,
              rootRot,
              [dir * (len * 0.7), ay - 0.7, 0],
              [0, 0, 0],
              [0.12, 1.3, 0.12],
            ),
          );
        }
      });

      // Head — sits just below the mast top, tipped off-axis.
      const hy = p.h - 2.2;
      const hw = p.head === "half" ? 2.2 : 3.0;
      const hh = 2.4;
      const tip = (rand() - 0.5) * 0.5;
      const bars =
        p.head === "half"
          ? [
              [-hw / 2, 0, [0.14, hh, 0.14]],
              [0, hh / 2, [hw, 0.14, 0.14]],
              [hw * 0.1, -hh / 2, [hw * 0.7, 0.14, 0.14]],
            ]
          : [
              [-hw / 2, hh * 0.05, [0.14, hh * 0.9, 0.14]],
              [hw / 2, hh * 0.2, [0.14, hh * 0.6, 0.14]],
              [-hw * 0.1, hh / 2, [hw * 0.8, 0.14, 0.14]],
            ];
      for (const [bx, by, bs] of bars) {
        headM.push(
          composeChild(rootPos, rootRot, [bx, hy + by, 0], [0, 0, tip], bs),
        );
      }
      // The dead panel behind the broken frame.
      headM.push(
        composeChild(
          rootPos,
          rootRot,
          [tip * 2, hy, -0.12],
          [0, 0, tip],
          [hw * 0.82, hh * 0.78, 0.08],
        ),
      );
    });

    return { masts: mastM, arms: armM, heads: headM };
  }, []);

  useLayoutEffect(() => {
    fillInstanced(mastRef.current, masts);
    fillInstanced(armRef.current, arms);
    fillInstanced(headRef.current, heads);
  }, [masts, arms, heads]);

  return (
    <group>
      <instancedMesh ref={mastRef} args={[res.box, res.metalMid, masts.length]} />
      <instancedMesh ref={armRef} args={[res.box, res.metalDark, arms.length]} />
      <instancedMesh ref={headRef} args={[res.box, res.screen, heads.length]} />
    </group>
  );
}

// --- Overhead runs ------------------------------------------------
// Ducts / trays / beams slung under the vault. Each run is three box
// segments across the nave following a shallow V, low enough (y 8.5-13,
// vault is 23) that the camera passes visibly beneath it. Where the run
// is snapped (`x2`) only the near half survives plus a segment hanging
// from the break. All in one instanced field.
function OverheadRuns({ res }) {
  const ref = useRef(null);

  const segments = useMemo(() => {
    const out = [];
    const dummy = new THREE.Object3D();
    const push = (pos, rot, scale) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(rot[0], rot[1], rot[2]);
      dummy.scale.set(scale[0], scale[1], scale[2]);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
    };

    OVERHEAD_RUNS.forEach((r) => {
      const thick = r.kind === "beam" ? 0.7 : r.kind === "duct" ? 1.1 : 0.5;
      const deep = r.kind === "duct" ? 1.0 : r.kind === "tray" ? 0.9 : 0.5;
      const left = -16;
      const right = r.x2 ?? 16;
      const mid = (left + right) / 2;
      const dip = r.sag;
      // The cap sits well above the full sag depth so the lowest thing
      // over the nave centre is never more than ~1.4 below the run's
      // hung height — keeps it a beam you pass under, not a lintel across
      // the aperture. The two halves still angle down toward it for the
      // sag read.
      const capDrop = Math.min(dip * 0.55, 1.4);

      // Left half: from the left wall down toward the sag point.
      push(
        [(left + mid) / 2, r.y - capDrop / 2, r.z],
        [0, 0, Math.atan2(capDrop, mid - left)],
        [Math.hypot(mid - left, capDrop), thick, deep],
      );
      // Right half: sag point back up to the right end.
      push(
        [(mid + right) / 2, r.y - capDrop / 2, r.z],
        [0, 0, -Math.atan2(capDrop, right - mid)],
        [Math.hypot(right - mid, capDrop), thick, deep],
      );
      // Short flat cap at the sag point.
      push([mid, r.y - capDrop, r.z], [0, 0, 0], [2.4, thick * 1.1, deep * 1.1]);

      if (r.x2 != null) {
        // The snapped far section, hanging from the break toward its own
        // aisle (negative x here) rather than swinging into the centre.
        push(
          [r.x2 - 2.4, r.y - capDrop - 2.2, r.z + 0.4],
          [0.2, 0, 1.15],
          [5.5, thick, deep],
        );
      }
    });

    return out;
  }, []);

  useLayoutEffect(() => fillInstanced(ref.current, segments), [segments]);

  return (
    <instancedMesh
      ref={ref}
      args={[res.box, res.metalDark, segments.length]}
    />
  );
}

// --- Cables --------------------------------------------------------
// Catenary bundles from CABLE_DRAPES. Each is its own short TubeGeometry
// (they cannot share an instance) but all share one material — four
// low-segment tubes, negligible cost. Endpoints are authored so the sag
// lines are reproducible, and every span stays to one side of the nave
// centre (see feedInfrastructure.js) so no cable crosses the aperture
// sightline.
function Cables({ res }) {
  const geometries = useMemo(() => {
    return CABLE_DRAPES.map((s) => {
      const mid = [
        (s.a[0] + s.b[0]) / 2,
        Math.min(s.a[1], s.b[1]) - s.sag,
        (s.a[2] + s.b[2]) / 2,
      ];
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...s.a),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...s.b),
      ]);
      return new THREE.TubeGeometry(curve, 14, s.r, 5, false);
    });
  }, []);

  useEffect(() => {
    return () => geometries.forEach((g) => g.dispose());
  }, [geometries]);

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={res.cable} />
      ))}
    </group>
  );
}

// --- Conduit lines ----------------------------------------------
// Long thin pipe runs along the base of each side aisle, parallel to the
// route. Their length is the point: it streams past the moving camera and
// gives the aisles the parallax the bare walls do not. One instanced
// field of stretched boxes plus a small elbow at each near end.
function ConduitLines({ res }) {
  const ref = useRef(null);

  const segments = useMemo(() => {
    const out = [];
    const dummy = new THREE.Object3D();
    CONDUIT_LINES.forEach((c) => {
      const len = Math.abs(c.z2 - c.z1);
      const cz = (c.z1 + c.z2) / 2;
      dummy.position.set(c.x, c.y, cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(c.r * 2, c.r * 2, len);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
      // Elbow turning toward the wall at the near end.
      dummy.position.set(c.x + Math.sign(c.x) * 0.6, c.y, Math.max(c.z1, c.z2));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.4, c.r * 2, c.r * 2);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
    });
    return out;
  }, []);

  useLayoutEffect(() => fillInstanced(ref.current, segments), [segments]);

  return (
    <instancedMesh
      ref={ref}
      args={[res.box, res.metalDark, segments.length]}
    />
  );
}

// --- Debris clusters ------------------------------------------
// Chunky angular rubble — the silhouette FeedArchitecture's flat
// RUBBLE_HEAPS boxes and FeedDebris's tiny pebbles both miss. Every block
// across every cluster is one instanced field; each cluster also drops a
// dark skirt plane so the bright floor gets a value break where the pile
// sits. Deterministic from each cluster's own seed.
function DebrisClusters({ res }) {
  const blockRef = useRef(null);
  const skirtRef = useRef(null);

  const { blocks, skirts } = useMemo(() => {
    const blockM = [];
    const skirtM = [];
    const dummy = new THREE.Object3D();

    DEBRIS_CLUSTERS.forEach((c) => {
      const rand = mulberry32(c.seed);
      const [cx, cz] = c.pos;

      for (let i = 0; i < c.count; i++) {
        const ang = rand() * Math.PI * 2;
        const d = rand() * c.radius;
        const s = c.scale * (0.4 + rand() * 0.9);
        dummy.position.set(
          cx + Math.cos(ang) * d,
          s * 0.4 - 0.15 - rand() * 0.2,
          cz + Math.sin(ang) * d,
        );
        dummy.rotation.set(rand() * 0.7, rand() * Math.PI, rand() * 0.7);
        dummy.scale.set(s * (0.7 + rand()), s * (0.5 + rand() * 0.6), s * (0.7 + rand()));
        dummy.updateMatrix();
        blockM.push(dummy.matrix.clone());
      }

      dummy.position.set(cx, 0.015, cz);
      dummy.rotation.set(-Math.PI / 2, 0, rand() * Math.PI);
      const skirt = c.radius * 2.4;
      dummy.scale.set(skirt, skirt * (0.8 + rand() * 0.3), 1);
      dummy.updateMatrix();
      skirtM.push(dummy.matrix.clone());
    });

    return { blocks: blockM, skirts: skirtM };
  }, []);

  useLayoutEffect(() => {
    fillInstanced(blockRef.current, blocks);
    fillInstanced(skirtRef.current, skirts);
  }, [blocks, skirts]);

  return (
    <group>
      <instancedMesh
        ref={skirtRef}
        args={[res.plane, res.scorch, skirts.length]}
      />
      <instancedMesh
        ref={blockRef}
        args={[res.box, res.stoneMid, blocks.length]}
      />
    </group>
  );
}

// --- Floor scorch --------------------------------------------
// Standalone dark patches for the bare path stretches the debris skirts
// do not cover. Same rule as FeedArchitecture's FLOOR_STAINS: value only,
// irregular rotation, never dark enough to read as a cast shadow.
function FloorScorch({ res }) {
  return (
    <group>
      {FLOOR_SCORCH.map((s, i) => (
        <mesh
          key={i}
          geometry={res.plane}
          position={s.pos}
          rotation={[-Math.PI / 2, 0, s.rot]}
          scale={[s.size[0], s.size[1], 1]}
        >
          <meshStandardMaterial color={s.color} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

// --- Screen housings ---------------------------------------
// A physical mount at four primary-fragment positions so those DOM cards
// (occlude="blending", so they read as holes punched through the render —
// see FeedFragment) sit inside a bezel instead of hovering. Positions and
// facing come straight from feedFragments, never re-typed here. The
// backplate is placed a little BEHIND the card along its own facing
// normal and made a touch larger, so the card's depth plane still wins
// per-pixel and the housing only ever frames it.
// The 28 boxes share three material-grouped instance fields, preserving
// those authored transforms while avoiding one draw call per box.
function ScreenHousings({ res }) {
  const backplateRef = useRef(null);
  const bezelRef = useRef(null);
  const mountRef = useRef(null);

  const { backplates, bezels, mounts } = useMemo(() => {
    const backplateM = [];
    const bezelM = [];
    const mountM = [];

    SCREEN_HOUSING_IDS.map((id) => feedFragments.find((f) => f.id === id))
      .filter(Boolean)
      .forEach((f) => {
        const w = f.width * 1.16;
        const h = f.width * 0.78;
        const [, fy] = f.position;
        const grounded = fy < 2.8;
        const legLen = grounded ? fy + 0.2 : 1.1;

        backplateM.push(
          composeChild(f.position, f.rotation, [0, 0, -0.1], [0, 0, 0], [w, h, 0.1]),
        );
        bezelM.push(
          composeChild(
            f.position,
            f.rotation,
            [-w / 2, 0, 0],
            [0, 0, 0],
            [0.12, h + 0.12, 0.16],
          ),
          composeChild(
            f.position,
            f.rotation,
            [w / 2, h * 0.06, 0],
            [0, 0, 0],
            [0.12, h * 0.82, 0.16],
          ),
          composeChild(
            f.position,
            f.rotation,
            [-w * 0.08, h / 2, 0],
            [0, 0, 0],
            [w * 0.9, 0.12, 0.16],
          ),
          composeChild(
            f.position,
            f.rotation,
            [w * 0.14, -h / 2, 0],
            [0, 0, 0],
            [w * 0.66, 0.12, 0.16],
          ),
        );
        mountM.push(
          composeChild(
            f.position,
            f.rotation,
            [grounded ? w * 0.22 : 0, -h / 2 - legLen / 2, grounded ? 0.1 : -0.35],
            [grounded ? 0.05 : 0.4, 0, 0],
            [0.14, legLen, 0.14],
          ),
        );
        if (grounded) {
          mountM.push(
            composeChild(
              f.position,
              f.rotation,
              [-w * 0.22, -h / 2 - legLen / 2, 0.1],
              [0.05, 0, 0],
              [0.14, legLen, 0.14],
            ),
          );
        }
      });

    return { backplates: backplateM, bezels: bezelM, mounts: mountM };
  }, []);

  useLayoutEffect(() => {
    fillInstanced(backplateRef.current, backplates);
    fillInstanced(bezelRef.current, bezels);
    fillInstanced(mountRef.current, mounts);
  }, [backplates, bezels, mounts]);

  return (
    <group>
      <instancedMesh
        ref={backplateRef}
        args={[res.box, res.screen, backplates.length]}
      />
      <instancedMesh ref={bezelRef} args={[res.box, res.metalMid, bezels.length]} />
      <instancedMesh ref={mountRef} args={[res.box, res.metalDark, mounts.length]} />
    </group>
  );
}

// --- Distant silhouettes ---------------------------------
// Server / relay towers past the aperture. Two stacked boxes per tower
// (wide lower, tapered upper) so the silhouette reads as a structure, not
// a monolith. meshBasicMaterial: fog still pales it with distance, but
// the scene's back-light cannot carve highlights into something that is
// only ever meant to be a shape. See feedInfrastructure.js for why the
// x-placement (bracketing the aperture plane) does the contrast work.
function DistantTowers({ res }) {
  const ref = useRef(null);

  const boxes = useMemo(() => {
    const out = [];
    const dummy = new THREE.Object3D();
    DISTANT_TOWERS.forEach((t) => {
      const [x, z] = t.pos;
      const lowerH = t.h * 0.62;
      const upperH = t.h - lowerH;
      dummy.position.set(x, lowerH / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.w, lowerH, t.w * 0.8);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
      dummy.position.set(x, lowerH + upperH / 2, z);
      dummy.scale.set(t.w * t.taper, upperH, t.w * t.taper * 0.8);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
    });
    return out;
  }, []);

  useLayoutEffect(() => fillInstanced(ref.current, boxes), [boxes]);

  return (
    <instancedMesh
      ref={ref}
      args={[res.box, res.distant, boxes.length]}
    />
  );
}

export default function FeedInfrastructure() {
  const res = useKitResources();

  return (
    <group>
      <DistantTowers res={res} />
      <RackTowers res={res} />
      <Pylons res={res} />
      <OverheadRuns res={res} />
      <Cables res={res} />
      <ConduitLines res={res} />
      <DebrisClusters res={res} />
      <FloorScorch res={res} />
      <ScreenHousings res={res} />
    </group>
  );
}
