// src/scenes/Graveyard/GraveyardArchitecture.jsx
//
// The Graveyard's environment: open, horizontal, almost empty. Where
// Feed enclosed the visitor in a colonnaded nave, this removes the
// enclosure entirely. Absence is the composition — the job here is to
// make that absence readable, not to fill it.
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

export const GROUND_Y = 0;
export const EYE_HEIGHT = 1.8;

// The monument sits OFF the route's axis. When it stood at x = 0 with a
// straight route running down the same axis and the camera aimed at it
// throughout, the scene had the exact grammar of an objective marker.
// See GraveyardCamera for the aiming half of that fix.
export const CAPTCHA_X = 30;
export const CAPTCHA_Z = -320;

// Fog must be exactly HORIZON — see the header. Changing one without the
// other reintroduces the seam.
export const HORIZON = "#171c1f";
export const ZENITH = "#050607";

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
      const trench = Math.exp(-Math.pow(across / 26, 2)) * 0.2;

      const tint = 1 + patch - trench;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint;
      colors[i * 3 + 2] = tint;
    }

    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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

const backdropFragment = /* glsl */ `
  uniform vec3 horizonColor;
  uniform vec3 zenithColor;
  uniform float radius;
  varying vec3 vLocal;

  void main() {
    float h = clamp(vLocal.y / radius, -1.0, 1.0);
    // Tight falloff: the residual light hugs the horizon and is gone a
    // short way above it. A wide, slow falloff reads as dawn.
    vec3 c = mix(horizonColor, zenithColor, smoothstep(-0.03, 0.19, h));
    c = mix(c, zenithColor * 0.55, smoothstep(0.0, -0.2, h));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function Backdrop() {
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
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 24]} />
    </mesh>
  );
}

// Shared lattice construction. An earlier pass used a plain post with one
// angled branch, which read in the render as a leafless tree — and a
// field of them read as a cemetery, which is exactly wrong for a place
// where the internet is what died. Paired legs with horizontal rungs and
// alternating diagonal bracing is the specific feature that makes a
// distant silhouette read as infrastructure.
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

export default function GraveyardArchitecture() {
  return (
    <group>
      <Backdrop />
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
