// src/scenes/Graveyard/GraveyardArchitecture.jsx
//
// The Graveyard's environment shell: ground, sky and the ruined relay
// infrastructure, open and horizontal. Where Feed enclosed the visitor in
// a colonnaded nave, this removes the enclosure entirely. This file stays
// deliberately sparse on its own — the cemetery itself, hero graves and
// the much larger anonymous field, is population that lives in
// GraveyardMemorials.jsx and grows out of this aftermath rather than
// replacing it.
//
// Horizon (kept from the composition pass, retuned here)
// -----------------------------------------------------
// An early version put a `meshBasicMaterial` plane with `fog={false}`
// behind the scene as a "horizon". Measured off the render, that gave
// RGB(35,39,43) immediately above the horizon line and RGB(2,2,3)
// immediately below it — a 33-level cliff across one edge, and the same
// pair of values at every progression point, because an unfogged basic
// material is a literal constant. That seam is why the space read as
// finite and constructed.
//
// The replacement has no seam by construction, and stays: a backdrop
// sphere carrying a vertical gradient, recentred on the camera each
// frame so its transition is pinned to the true visual horizon, plus
// scene fog set to exactly HORIZON so distant geometry fades into the
// value the sky already is at that height. The ground does not meet the
// sky at an edge; it becomes it.
//
// What changed in the staging pass: the gradient's falloff was
// `smoothstep(0.0, 0.46, h)` — a bright band spread across nearly half
// the upper hemisphere, brightest exactly at the horizon and fading
// slowly upward. That is the optical signature of a sunrise, and it made
// the scene read as a morning with a journey ahead rather than as an
// aftermath. The band is now tight to the horizon and falls off fast, so
// the residual light reads as ground haze in a dead atmosphere rather
// than as a sky about to produce a sun.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { groundHeightAt } from "./groundHeight";
import {
  EXIT_GROUND_HOLE,
  EXIT_SHAFT_RECT,
  UNDERGROUND_DARK,
  exitSink,
} from "./exitLayout";

export const GROUND_Y = 0;
export const EYE_HEIGHT = 1.8;

// The monument sits OFF the route's axis. When it stood at x = 0 with a
// straight route running down the same axis and the camera aimed at it
// throughout, the scene had the exact grammar of an objective marker.
// See GraveyardCamera for the aiming half of that fix.
export const CAPTCHA_X = 30;
export const CAPTCHA_Z = -320;

// Fog must be exactly HORIZON (see the header), so these two move
// together or not at all. The semantic pass took both a step toward cold
// navy — HORIZON gains a little blue over green, ZENITH becomes a navy
// black rather than a neutral one — which is enough to stop the sky
// reading as "absence of light" and start it reading as a cold dead
// atmosphere, without introducing a colour the scene does not already
// have. GraveyardScene imports HORIZON for its fog, so the seam the
// backdrop exists to remove stays removed.
export const HORIZON = "#161c23";
export const ZENITH = "#04060c";
// The distant lift down the route and on the rake bearing. Cold, and
// small enough that it is a change in value rather than in hue.
const SKY_GLOW = "#1b2530";

// Albedo, not brightness. An early attempt set this to #0e1011 — linear
// ~0.004, roughly a tenth of real asphalt — and then tried to light it.
// Diffuse response is irradiance x albedo, so at that albedo the ground
// multiplied every light in the scene down to nothing and measured
// RGB(0,0,0) in the foreground however the lights were tuned. Darkness
// here comes from keeping the LIGHTS low, which is controllable, not
// from a near-black surface, which also annihilates the relief and
// vertex variation meant to make the ground readable at all.
const GROUND_STONE = "#343b3e";
const TOWER_METAL = "#242a2c";

const GROUND_W = 1400;
const GROUND_D = 1400;
const GROUND_CENTER_Z = -300;
// ~6.4 units per segment, set against the height field's finest term
// (~30-unit wavelength, see groundHeight.js) — that term carries the
// relief the grazing key reveals, and coarser tessellation would
// undersample it into nothing.
const GROUND_SEGMENTS = 220;

// Ground-plans of structures that are gone. Sizes, angles and spacing are
// authored (never generated) so the site reads as having been laid out by
// somebody, and none of them is square to the route. The last two sit
// beyond where the visitor can walk, so the erasure carries on past the
// end of the path.
const FOOTPRINTS = [
  { x: -44, z: -18, hw: 9, hd: 6, rot: 0.35 },
  { x: -18, z: -62, hw: 13, hd: 8, rot: -0.22 },
  { x: -40, z: -104, hw: 7, hd: 11, rot: 0.6 },
  { x: -16, z: -146, hw: 16, hd: 9, rot: 0.18 },
  { x: -34, z: -196, hw: 10, hd: 7, rot: -0.5 },
  { x: 2, z: -230, hw: 12, hd: 14, rot: 0.28 },
  { x: -24, z: -286, hw: 18, hd: 10, rot: -0.15 },
  { x: 46, z: -348, hw: 22, hd: 13, rot: 0.4 },
];

// Local smoothstep on an already-normalized edge distance. Cheaper than
// routing through THREE.MathUtils for ~49k vertices x 8 footprints.
function smoothstep01(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

function Ground() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(GROUND_W, GROUND_D, GROUND_SEGMENTS, GROUND_SEGMENTS);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      // Plane is authored in XY then rotated -90deg about X, which maps
      // local +Y onto world -Z. Convert before sampling so the height
      // function stays in honest world coordinates.
      const wx = pos.getX(i);
      const wz = GROUND_CENTER_Z - pos.getY(i);
      pos.setZ(i, groundHeightAt(wx, wz));

      // Neutral multiplier around 1.0 rather than an authored colour:
      // vertex colours multiply albedo in linear space, so keeping this
      // achromatic avoids any colour-management mismatch and lets
      // GROUND_STONE stay the single source of hue.
      //
      // The lit corridor is GONE. It brightened everything within 19
      // units of x = 0 by 34%, which in an otherwise near-black scene
      // drew a glowing strip running the length of the route and
      // terminating at the monument — a literal arrow at the objective,
      // and one of the strongest reasons the space read as a level with
      // a goal at the end.
      const patch =
        Math.sin(wx * 0.019 + 0.6) * Math.cos(wz * 0.014 + 2.3) * 0.18 +
        Math.sin(wx * 0.047 + 2.9) * Math.cos(wz * 0.039 + 1.1) * 0.1;

      // A buried cable run: a long shallow depression in the tone,
      // crossing the site diagonally. Evidence written into the terrain
      // rather than another object, and deliberately set at an angle to
      // the route so it reads as something that was here before the
      // visitor's path, not as wayfinding.
      const across = 1.4 * (wx + 30) - (wz + 100);
      let trench = Math.exp(-Math.pow(across / 26, 2)) * 0.2;
      // Two more services on their own bearings, one broad and shallow,
      // one narrow. Three runs crossing at three angles read as a site
      // that was dug up repeatedly over years; one run reads as a
      // decoration. None of them is parallel to the route.
      const across2 = 0.7 * (wx - 20) + (wz + 260);
      trench += Math.exp(-Math.pow(across2 / 34, 2)) * 0.14;
      const across3 = -1.9 * (wx + 60) - (wz - 40);
      trench += Math.exp(-Math.pow(across3 / 17, 2)) * 0.12;

      // Erased structure. Each FOOTPRINT is the ground-plan of something
      // that stood here and was removed: the earth inside it never
      // weathered like the earth around it, and the kerb line survives as
      // a thin raised edge. This is the "buried interface / order
      // breaking down" idea done as tone rather than as an object — a
      // rectangle is the most recognisable evidence of intent there is,
      // and a half-legible one dissolving into noisy ground says
      // "something was built here and is gone" without a single prop.
      //
      // Explicitly NOT text, glyphs or circuit patterns on the floor:
      // those read as decoration applied to a surface. These read as a
      // surface that remembers.
      let erased = 0;
      for (const f of FOOTPRINTS) {
        const dx = wx - f.x;
        const dz = wz - f.z;
        const c = Math.cos(f.rot);
        const sn = Math.sin(f.rot);
        const m = Math.max(
          Math.abs(dx * c + dz * sn) / f.hw,
          Math.abs(-dx * sn + dz * c) / f.hd,
        );
        if (m > 1.4) continue;
        const fill = 1 - smoothstep01((m - 0.84) / 0.18);
        const kerb = Math.exp(-Math.pow((m - 1.0) / 0.085, 2));
        erased += kerb * 0.15 - fill * 0.07;
      }

      // A finer worn-patch octave. Short wavelength, low amplitude: at
      // the ~6.4 units-per-segment this mesh is tessellated at it is
      // nearly at the sampling limit, which is what makes it read as
      // scuffing rather than as another rolling term.
      const worn = Math.sin(wx * 0.113 + 1.3) * Math.cos(wz * 0.091 + 0.5) * 0.055;

      const tint = 1 + patch + worn + erased - trench;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint;
      colors[i * 3 + 2] = tint;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // THE SERVICE STAIR'S OPENING.
    //
    // GraveyardExit builds a maintenance shaft that descends 6.5 units
    // BELOW this plane. A solid ground plane occludes all of it: the
    // sightline from a standing camera to a step three units down crosses
    // y = 0 long before it reaches the doorway, so without an actual hole
    // in the terrain the stairwell can only ever render as a black
    // rectangle in a wall. It has to be a real opening.
    //
    // Faces are dropped by CENTROID rather than by vertex, because a
    // vertex test on a 6.36-unit grid removes every quad merely touching
    // the rect and blows the hole out to two quads either side. The
    // centroid rect in exitLayout is authored against this tessellation
    // so it removes exactly the block the shaft needs, and the exit's
    // apron is sized to cover that block's quantised edge. The second
    // test is insurance for a finer ground: any face with a vertex
    // strictly inside the shaft footprint goes too. At 220 segments no
    // vertex qualifies, so today it removes nothing.
    const index = g.getIndex();
    const kept = [];
    for (let f = 0; f < index.count; f += 3) {
      const a = index.getX(f);
      const b = index.getX(f + 1);
      const c = index.getX(f + 2);
      let inside = false;
      let cx = 0;
      let cz = 0;
      for (const v of [a, b, c]) {
        const vx = pos.getX(v);
        const vz = GROUND_CENTER_Z - pos.getY(v);
        cx += vx / 3;
        cz += vz / 3;
        if (
          vx > EXIT_SHAFT_RECT.x0 &&
          vx < EXIT_SHAFT_RECT.x1 &&
          vz > EXIT_SHAFT_RECT.z0 &&
          vz < EXIT_SHAFT_RECT.z1
        ) {
          inside = true;
        }
      }
      if (
        cx > EXIT_GROUND_HOLE.x0 &&
        cx < EXIT_GROUND_HOLE.x1 &&
        cz > EXIT_GROUND_HOLE.z0 &&
        cz < EXIT_GROUND_HOLE.z1
      ) {
        inside = true;
      }
      if (!inside) kept.push(a, b, c);
    }
    g.setIndex(kept);

    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_Y, GROUND_CENTER_Z]}
    >
      <meshStandardMaterial color={GROUND_STONE} vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

// Vertical gradient backdrop. Drawn before everything with depth testing
// disabled, so it is unconditionally behind the scene and never
// interacts with the camera's far plane. `fog={false}` is correct here
// and only here: this IS the value fog resolves to, so fogging it would
// be circular.
const backdropVertex = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The semantic pass added three things to this, all of them additions to
// the value the gradient already produced and none of them a new colour
// family. The sky must stay a dead sky:
//
//   1. STRATA. Two very shallow haze layers just above the horizon, made
//      by widening/narrowing the falloff rather than by drawing bands, so
//      the atmosphere reads as settled and stratified instead of as one
//      smooth ramp. Amplitude is tiny — this is legible as depth, not as
//      cloud.
//   2. A DISTANT GLOW down the route. A wide, cold, low-amplitude
//      brightening on the -z bearing, hugging the horizon. It gives the
//      monument something to be a silhouette against for the whole
//      approach, and it gives the walk a direction that is not a
//      waypoint. It is a COLD grey-blue lift of a few percent and it
//      falls off over ~80 degrees — deliberately not a sun, not a dawn,
//      and not on the CAPTCHA's own bearing hard enough to frame it.
//   3. A faint counter-lift on the +x bearing, matching the scene's rake
//      light so the sky and the ground agree about where what little
//      light there is comes from.
const backdropFragment = /* glsl */ `
  uniform vec3 horizonColor;
  uniform vec3 zenithColor;
  uniform vec3 transitionColor;
  uniform vec3 undergroundColor;
  uniform vec3 glowColor;
  uniform float reveal;
  uniform float sink;
  uniform float radius;
  varying vec3 vLocal;

  void main() {
    float h = clamp(vLocal.y / radius, -1.0, 1.0);
    // Tight falloff: the residual light hugs the horizon and is gone a
    // short way above it. A wide, slow falloff reads as dawn.
    vec3 c = mix(horizonColor, zenithColor, smoothstep(-0.03, 0.19, h));
    c = mix(c, zenithColor * 0.55, smoothstep(0.0, -0.2, h));

    // Strata. Two shallow layers of settled haze, both above the horizon
    // and both gone by a fifth of the way up.
    float band1 = smoothstep(0.012, 0.038, h) * (1.0 - smoothstep(0.052, 0.086, h));
    float band2 = smoothstep(0.094, 0.122, h) * (1.0 - smoothstep(0.138, 0.194, h));
    c += horizonColor * (band1 * 0.42 + band2 * 0.22);

    // Bearing-dependent lift. dir is the horizontal direction of this
    // fragment on the backdrop sphere; the sphere is recentred on the
    // camera every frame but never rotated, so these bearings are fixed
    // in world space.
    vec2 dir = normalize(vec2(vLocal.x, vLocal.z) + vec2(1e-5));
    float horizonHug = 1.0 - smoothstep(-0.02, 0.16, abs(h));
    float downRoute = smoothstep(0.25, 1.0, -dir.y);
    float rakeSide = smoothstep(0.55, 1.0, dir.x);
    c += glowColor * horizonHug * (downRoute * 0.85 + rakeSide * 0.3);

    c = mix(transitionColor, c, reveal);
    // The sky does not survive going underground. The sink uniform is the
    // exit route's own progress into the stairwell (see exitLayout's
    // exitSink): the fog resolves to the same value over the same window,
    // so the backdrop — which is fog-exempt by construction, being the
    // value fog resolves TO — has to be taken down explicitly or it would
    // keep showing a horizon through a doorway the camera has already
    // walked past.
    c = mix(c, undergroundColor, sink);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function Backdrop({ arrival, arrivalProgressRef, exitProgressRef }) {
  const meshRef = useRef(null);
  const radius = 500;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        uniforms: {
          horizonColor: { value: new THREE.Color(HORIZON) },
          zenithColor: { value: new THREE.Color(ZENITH) },
          transitionColor: { value: new THREE.Color("#0d1112") },
          undergroundColor: { value: new THREE.Color(UNDERGROUND_DARK) },
          glowColor: { value: new THREE.Color(SKY_GLOW) },
          reveal: { value: 0 },
          sink: { value: 0 },
          radius: { value: radius },
        },
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    [],
  );

  // Recentred on the camera every frame, pinned to y = 0. The gradient's
  // transition then sits at the camera's own eye ray, which is exactly
  // where an infinite ground plane meets the sky — so the horizon never
  // drifts as the visitor travels the length of the route.
  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    meshRef.current.position.set(camera.position.x, 0, camera.position.z);
    const raw = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    meshRef.current.material.uniforms.reveal.value = arrival ? Math.pow(raw, 3.2) : 1;
    meshRef.current.material.uniforms.sink.value = exitSink(
      THREE.MathUtils.clamp(exitProgressRef?.current ?? 0, 0, 1),
    );
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 24]} />
    </mesh>
  );
}

// Shared lattice construction. An earlier pass used a plain post with one
// angled branch, which read in the render as a leafless tree — and a
// field of them read as a cemetery, which at the time was exactly wrong:
// the Graveyard had no actual graves yet, so anything reading as a
// tombstone was reading as the wrong kind of ruin. That premise is gone —
// the site now holds a real cemetery of its own (see GraveyardMemorials)
// — but these towers still need to stay legible as relay infrastructure
// specifically, not as more grave markers, or the two vocabularies blur
// into one undifferentiated field of stones. Paired legs with horizontal
// rungs and alternating diagonal bracing is the specific feature that
// keeps a distant silhouette reading as a tower.
function latticeParts(length, spread) {
  const out = [];
  const half = spread / 2;
  const bays = Math.max(3, Math.round(length / 3.1));
  const bay = length / bays;

  out.push({ pos: [-half, length / 2, 0], size: [0.26, length, 0.26], rot: [0, 0, 0] });
  out.push({ pos: [half, length / 2, 0], size: [0.26, length, 0.26], rot: [0, 0, 0] });

  for (let i = 1; i <= bays; i++) {
    out.push({ pos: [0, i * bay, 0], size: [spread, 0.17, 0.17], rot: [0, 0, 0] });
    const dir = i % 2 === 0 ? 1 : -1;
    out.push({
      pos: [0, (i - 0.5) * bay, 0],
      size: [Math.hypot(spread, bay), 0.13, 0.13],
      rot: [0, 0, dir * Math.atan2(bay, spread)],
    });
  }

  return out;
}

function TowerMeshes({ parts }) {
  return parts.map((p, i) => (
    <mesh key={i} position={p.pos} rotation={p.rot}>
      <boxGeometry args={p.size} />
      <meshStandardMaterial color={TOWER_METAL} roughness={0.72} metalness={0.32} />
    </mesh>
  ));
}

function RelayTower({ position, height, tilt = 0, spread = 1.9, snapped = false }) {
  const parts = useMemo(() => {
    const shaft = snapped ? height * 0.62 : height;
    const out = latticeParts(shaft, spread);

    if (snapped) {
      // The top section, bent over and still attached at the break.
      const rest = height - shaft;
      out.push({
        pos: [rest * 0.42, shaft + rest * 0.34, 0],
        size: [0.24, rest, 0.24],
        rot: [0, 0, -0.95],
      });
    } else {
      const armY = shaft * 0.88;
      out.push({ pos: [0, armY, 0], size: [spread * 3.6, 0.2, 0.2], rot: [0, 0, 0] });
      out.push({ pos: [-spread * 1.6, armY + 0.75, 0], size: [0.14, 1.5, 0.14], rot: [0, 0, 0] });
      out.push({ pos: [spread * 1.6, armY + 0.62, 0], size: [0.14, 1.25, 0.14], rot: [0, 0, 0] });
    }

    return out;
  }, [height, spread, snapped]);

  const [x, z] = position;

  return (
    <group position={[x, groundHeightAt(x, z) - 0.25, z]} rotation={[0, 0, tilt]}>
      <TowerMeshes parts={parts} />
    </group>
  );
}

// A tower that came down, lying where it fell and part-sunk into the
// ground. These exist to BREAK SIGHTLINES, which is the structural half
// of delaying the monument's reveal: an object cannot be a gradual
// discovery while it is continuously visible from the first frame.
// Each instance below is positioned on the line between the camera and
// the monument at a specific stretch of the route, so the machine is
// eclipsed rather than merely dim. They also give the entry frame a
// near layer, so the visitor's first read is wreckage in front of them
// rather than a clean panorama of the whole site.
function FallenTower({ position, length, yaw, pitch = 0, sink = 0.9, spread = 2.2, breakAt }) {
  const [x, z] = position;
  const main = useMemo(() => latticeParts(breakAt ?? length, spread), [breakAt, length, spread]);
  const tail = useMemo(
    () => (breakAt ? latticeParts(length - breakAt, spread * 0.86) : null),
    [breakAt, length, spread],
  );

  return (
    <group position={[x, groundHeightAt(x, z) - sink, z]} rotation={[0, yaw, 0]}>
      {/* Laid over onto its side; `pitch` tips one end into the dirt. */}
      <group rotation={[0, 0, Math.PI / 2 + pitch]}>
        <TowerMeshes parts={main} />
      </group>
      {tail && (
        // The snapped-off upper section, thrown clear and lying at its
        // own angle — a break, not a hinge.
        <group
          position={[(breakAt ?? 0) + 1.6, 0.15, spread * 0.8]}
          rotation={[0.1, 0.38, Math.PI / 2 - 0.14]}
        >
          <TowerMeshes parts={tail} />
        </group>
      )}
    </group>
  );
}

// Standing towers. Spacing, depth and lateral offset are all uneven, and
// the pair nearest the monument is deliberately NOT a mirrored flanking
// pair — different heights, different depths, one of them snapped. A
// symmetric pair either side of a centred monument is temple staging.
const TOWERS = [
  { position: [-46, -44], height: 16, tilt: 0.07 },
  { position: [-12, -88], height: 9, tilt: 0.3, snapped: true },
  { position: [-52, -150], height: 20, tilt: 0.05 },
  { position: [4, -188], height: 12, tilt: -0.22, snapped: true },
  { position: [62, -318], height: 14, tilt: -0.05 },
  { position: [-6, -332], height: 9, tilt: 0.16, snapped: true },
];

// Sightline breakers. Positions are derived from the camera's actual
// location at the stretch each one is meant to cover, then verified
// against the render — an occluder that misses the bearing is just
// another prop.
const FALLEN = [
  // Entry occluder. Sits at 12% of the way along the line from the
  // route's start to the monument, which is exactly the bearing the
  // machine occupies in the opening frame.
  //
  // `pitch` is the load-bearing number. At a full 90 degrees over, a
  // 2.2-wide lattice lying prone is only ~2.2 units tall, which at 40
  // units away subtends 3 degrees against the monument's 10 — it would
  // have covered the monument's feet and nothing else. Pitched to ~65
  // degrees from vertical instead, a 30-unit tower still stands 12.8
  // units high and subtends ~18 degrees, so it genuinely covers the
  // machine while occupying only about a fifth of the frame: disrupted
  // foreground, not a wall.
  { position: [-21, -30], length: 30, yaw: 0.24, pitch: -0.44, sink: 0.6, breakAt: 19 },
  // Late-middle. Catches the sightline again as the route bends, so the
  // machine is lost from view once more after first being noticed —
  // recognition that goes forward, back, then forward again reads as
  // discovery; monotonic growth reads as an objective.
  { position: [-4, -206], length: 24, yaw: 0.52, pitch: -0.3, sink: 1.2, breakAt: 15 },
];

export default function GraveyardArchitecture({
  arrival = false,
  arrivalProgressRef,
  exitProgressRef,
}) {
  return (
    <group>
      <Backdrop
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        exitProgressRef={exitProgressRef}
      />
      <Ground />
      {TOWERS.map((tower, i) => (
        <RelayTower key={`t${i}`} {...tower} />
      ))}
      {FALLEN.map((f, i) => (
        <FallenTower key={`f${i}`} {...f} />
      ))}
    </group>
  );
}
