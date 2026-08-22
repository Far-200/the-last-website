// src/three/elements/CRTTerminal.jsx
//
// Stylized CRT computer built from primitives.
//
// SIGNAL presentation redesign
// ---------------------------
// The screen previously read as a miniature cyan monitor at screen
// centre, and that was built by four things at once — no material value
// could have removed it:
//
//   1. A `<Html transform>` readout painted the glass with a 220px block
//      of `var(--cyan)` DOM text plus a cyan text-shadow. DOM bypasses
//      fog, lighting and tone mapping entirely, so it rendered at full
//      CSS brightness however dark the scene got.
//   2. The glass was a flat, camera-facing, uniformly emissive plane —
//      the definition of "a rectangle of even value".
//   3. A cyan point light in front of the screen flooded the flat front
//      faces of the bezel and casing boxes evenly, outlining a second,
//      larger rectangle.
//   4. PreludeScene's `lookAt(0, 0.78, 0)` put the glass on the exact
//      look-at point, and it was the only lit thing in frame.
//
// The machine is now a physical object seen at a grazing angle (see the
// rotation PreludeScene gives it): the glass carries essentially no
// emissive of its own, the readout DOM is gone, and the only cyan the
// composition shows is the spill the screen throws down onto the floor
// plus a kiss of light on the near bezel edge. Cyan still means "CRT
// physical screen glow" and nothing else — it just never resolves into a
// readable panel.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CASING_COLOR = "#222526";
const CASING_ROUGH = 0.78;
const ACTIVE_CYAN = "#7fe3e8";
const SCREEN_EMISSIVE = "#12383a";

function CableCurve({ start, end, mid, color = "#0a0a0a", radius = 0.02 }) {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    ]);
  }, [start, end, mid]);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 20, radius, 6, false),
    [curve, radius],
  );

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

// The screen is only genuinely alive in these two phases. SIGNAL is the
// source being connected to; RESOLVING is where it visibly dies as the
// connection/recovery transition begins. From SYSTEM onward the screen
// must be dead: every cyan-emitting source below is hard-set to exactly
// 0 every frame rather than eased toward 0, because an exponential ease
// only ever approaches zero asymptotically and left a faint but real
// residue behind SYSTEM/ARCHIVE content.
const SCREEN_DEAD_PHASES = new Set(["system", "archive", "leaving"]);

// Glow multiplier while the screen is still alive. `resolving` is
// deliberately lower than `signal` — the visible dying beat — rather
// than dropping straight to the SCREEN_DEAD_PHASES hard zero.
const GLOW_MULTIPLIER_BY_PHASE = {
  signal: 0.5,
  resolving: 0.2,
};

export default function CRTTerminal({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  phase = "signal",
  reduceMotion = false,
}) {
  const ledRef = useRef();
  const spillLightRef = useRef();
  const bezelLightRef = useRef();
  const screenMatRef = useRef();
  const isDead = SCREEN_DEAD_PHASES.has(phase);
  const targetGlow = isDead ? 0 : GLOW_MULTIPLIER_BY_PHASE[phase] ?? 1;
  // Eased, not snapped, while alive — the CRT is the physical anchor
  // waking and dying, not a value flipping between frames.
  const glowMultiplierRef = useRef(targetGlow);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (isDead) {
      // Hard zero, no easing — see SCREEN_DEAD_PHASES above.
      if (screenMatRef.current) screenMatRef.current.emissiveIntensity = 0;
      if (spillLightRef.current) spillLightRef.current.intensity = 0;
      if (bezelLightRef.current) bezelLightRef.current.intensity = 0;
      glowMultiplierRef.current = 0;
    } else {
      const breathe = reduceMotion ? 0.5 : 0.5 + Math.sin(t * 0.6) * 0.5;
      const lerpSpeed = reduceMotion ? 1 : 1 - Math.pow(0.001, delta);
      glowMultiplierRef.current +=
        (targetGlow - glowMultiplierRef.current) * lerpSpeed;
      const glowMultiplier = glowMultiplierRef.current;

      // The glass itself stays essentially unlit. It is seen almost
      // edge-on anyway; the point is that even head-on it would never
      // read as a filled panel.
      if (screenMatRef.current) {
        screenMatRef.current.emissiveIntensity =
          (0.02 + breathe * 0.015) * glowMultiplier;
      }

      // The actual visible cyan: a soft pool thrown down onto the floor
      // in front of the machine. Light on a rough surface, not an
      // emitting rectangle.
      if (spillLightRef.current) {
        spillLightRef.current.intensity = (0.5 + breathe * 0.26) * glowMultiplier;
      }

      // A very short-range light that only reaches the near bezel edge,
      // so the machine's silhouette stays legible without its front
      // faces being flooded into a lit rectangle.
      if (bezelLightRef.current) {
        bezelLightRef.current.intensity = (0.1 + breathe * 0.06) * glowMultiplier;
      }
    }

    // Rare, restrained red LED pulse — independent of the screen's
    // life/death state, not cyan.
    if (ledRef.current) {
      const pulse = reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.35));
      ledRef.current.material.emissiveIntensity = 0.25 + pulse * 0.9;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={0.72}>
      {/* Monitor casing — slightly uneven roughness reads as worn plastic
          rather than a clean render, without adding geometry or deps. */}
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.3, 1.3]} />
        <meshStandardMaterial
          color={CASING_COLOR}
          roughness={CASING_ROUGH}
          metalness={0.16}
        />
      </mesh>

      {/* Faint grime/wear streak beneath the screen bezel */}
      <mesh position={[0, 0.78, 0.665]}>
        <planeGeometry args={[1.1, 0.1]} />
        <meshStandardMaterial
          color="#0a0c0c"
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Recessed screen bezel. Deepened from 0.06 to 0.14 so the glass
          sits genuinely inside a hood: at a grazing view angle the near
          bezel wall crops the glass rather than presenting it flat. */}
      <mesh position={[0, 1.2, 0.62]} castShadow>
        <boxGeometry args={[1.15, 0.95, 0.14]} />
        <meshStandardMaterial
          color="#101415"
          roughness={0.66}
          metalness={0.2}
        />
      </mesh>

      {/* CRT glass — recessed behind the bezel lip and effectively unlit.
          Kept as a surface so the machine reads as a machine, not as a
          light source with a rectangle on it. */}
      <mesh position={[0, 1.2, 0.655]}>
        <planeGeometry args={[1.0, 0.8]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#010505"
          emissive={SCREEN_EMISSIVE}
          emissiveIntensity={0.02}
          roughness={0.52}
          metalness={0}
        />
      </mesh>

      {/* Very short reach — kisses the bezel lip only. `distance` is in
          world units and is NOT scaled by this group's 0.72 scale, so
          these stay deliberately small numbers. */}
      <pointLight
        ref={bezelLightRef}
        position={[0, 1.2, 0.95]}
        color={ACTIVE_CYAN}
        intensity={0.1}
        distance={0.75}
        decay={2}
      />

      {/* The screen's spill, aimed at the ground rather than at the
          camera. This is the only cyan the SIGNAL composition actually
          shows at any size: a soft pool on a rough floor. */}
      <pointLight
        ref={spillLightRef}
        position={[0.35, 0.16, 1.5]}
        color={ACTIVE_CYAN}
        intensity={0.5}
        distance={2.6}
        decay={2}
      />

      {/* Base / chassis */}
      <mesh position={[0, 0.45, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.35, 1.0]} />
        <meshStandardMaterial
          color={CASING_COLOR}
          roughness={CASING_ROUGH}
          metalness={0.2}
        />
      </mesh>

      {/* Status LED */}
      <mesh position={[0.55, 0.45, 0.53]} ref={ledRef}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color="#160404"
          emissive="#ff2222"
          emissiveIntensity={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* Keyboard */}
      <mesh
        position={[0, 0.18, 0.85]}
        rotation={[-0.05, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.15, 0.06, 0.4]} />
        <meshStandardMaterial
          color="#131415"
          roughness={0.86}
          metalness={0.12}
        />
      </mesh>

      {/* Faint key-bed suggestion */}
      <mesh position={[0, 0.22, 0.85]} rotation={[-0.05, 0, 0]}>
        <planeGeometry args={[1.0, 0.3]} />
        <meshStandardMaterial
          color="#070808"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>

      {/* Cables */}
      <CableCurve
        start={[0.6, 0.45, 0.1]}
        end={[0.85, 0.02, 0.6]}
        mid={[0.9, 0.25, 0.3]}
      />
      <CableCurve
        start={[-0.6, 0.45, 0.1]}
        end={[-0.9, 0.02, 0.5]}
        mid={[-0.95, 0.2, 0.25]}
      />
      <CableCurve
        start={[0.3, 0.28, 1.0]}
        end={[0.5, 0.02, 1.3]}
        mid={[0.5, 0.15, 1.15]}
        radius={0.015}
      />

      {/* Small debris box near the base */}
      <mesh position={[0.75, 0.05, 0.9]} rotation={[0.3, 0.6, 0.1]}>
        <boxGeometry args={[0.12, 0.08, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
    </group>
  );
}
