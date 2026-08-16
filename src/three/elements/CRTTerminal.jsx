// src/three/elements/CRTTerminal.jsx
//
// Stylized CRT computer built from primitives.
// Surgical visual pass: keep the machine dark and physical, while making
// the text — not the entire screen plane — carry the cyan emphasis.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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

export default function CRTTerminal({
  position = [0, 0, 0],
  terminalLines = [],
}) {
  const ledRef = useRef();
  const screenLightRef = useRef();
  const screenMatRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 0.5 + Math.sin(t * 0.6) * 0.5;

    // Keep the glass almost black. The terminal text should be what reads cyan.
    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity = 0.08 + breathe * 0.05;
    }

    // A small local glow is enough to reveal the bezel/casing.
    if (screenLightRef.current) {
      screenLightRef.current.intensity = 0.22 + breathe * 0.12;
    }

    // Rare, restrained red LED pulse.
    if (ledRef.current) {
      const pulse = Math.max(0, Math.sin(t * 0.35));
      ledRef.current.material.emissiveIntensity = 0.25 + pulse * 0.9;
    }
  });

  return (
    <group position={position} scale={0.72}>
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
      <mesh position={[0, 0.78, 0.665]} rotation={[0, 0, 0]}>
        <planeGeometry args={[1.1, 0.1]} />
        <meshStandardMaterial
          color="#0a0c0c"
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Recessed screen bezel */}
      <mesh position={[0, 1.2, 0.66]} castShadow>
        <boxGeometry args={[1.15, 0.95, 0.06]} />
        <meshStandardMaterial
          color="#101415"
          roughness={0.66}
          metalness={0.2}
        />
      </mesh>

      {/* CRT glass — intentionally near-black, only faintly emissive */}
      <mesh position={[0, 1.2, 0.7]}>
        <planeGeometry args={[1.0, 0.8]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#010505"
          emissive={SCREEN_EMISSIVE}
          emissiveIntensity={0.1}
          roughness={0.52}
          metalness={0}
        />

        {/* Screen-attached DOM text: stays locked to the CRT under resizing. */}
        <Html
          transform
          occlude
          position={[0, 0, 0.012]}
          distanceFactor={1.55}
          style={{ pointerEvents: "none" }}
        >
          <div className="crt-terminal-readout" aria-hidden="true">
            {terminalLines.map((line, i) =>
              line === "_" ? (
                <div key={i} className="crt-terminal-readout-line">
                  <span className="crt-terminal-cursor">_</span>
                </div>
              ) : (
                <div key={i} className="crt-terminal-readout-line">
                  {line}
                </div>
              ),
            )}
          </div>
        </Html>
      </mesh>

      {/* Small local screen glow — no more cyan floodlight. */}
      <pointLight
        ref={screenLightRef}
        position={[0, 1.18, 1.0]}
        color={ACTIVE_CYAN}
        intensity={0.3}
        distance={2.1}
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
