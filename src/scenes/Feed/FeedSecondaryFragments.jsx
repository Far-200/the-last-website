// Authored near/midground population for Feed. Unlike primary fragments,
// these remnants are decorative, non-interactive Three.js surfaces: no Html,
// no focus target and no per-object frame work. A small texture vocabulary is
// shared across physically different constructions so the content feels like
// one archive without becoming a repeated card grid.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { archiveTextureContent, feedArchiveClusters } from "../../data/feedArchive";

function makeArchiveTexture(content, index) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = index % 3 === 0 ? "#0d1211" : "#101514";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint storage damage. Fixed positions keep every texture deterministic.
  ctx.fillStyle = "rgba(116, 132, 125, 0.055)";
  for (let i = 0; i < 9; i++) {
    const y = 19 + ((i * 47 + index * 29) % 218);
    const width = 42 + ((i * 73 + index * 41) % 330);
    ctx.fillRect((i * 61 + index * 37) % 430, y, width, i % 3 === 0 ? 3 : 1);
  }

  ctx.font = "18px 'Courier New', monospace";
  ctx.fillStyle = "#75817c";
  ctx.fillText(content.label, 30, 42);

  ctx.fillStyle = "#46514d";
  ctx.fillRect(30, 59, 452, 1);

  content.lines.forEach((line, lineIndex) => {
    ctx.font = `${lineIndex === 0 ? 22 : 17}px 'Courier New', monospace`;
    ctx.fillStyle = lineIndex === 0 ? "#9aa49f" : "#66726d";
    ctx.fillText(line, 30, 102 + lineIndex * 48);
  });

  // Incomplete corners instead of a complete interface border.
  ctx.strokeStyle = "rgba(125, 143, 135, 0.26)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 44);
  ctx.lineTo(12, 12);
  ctx.lineTo(78, 12);
  ctx.moveTo(500, 194);
  ctx.lineTo(500, 244);
  ctx.lineTo(420, 244);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function ArchiveRemnant({ remnant, materials }) {
  const [width, height] = remnant.size;
  const faceMaterial = materials.faces[remnant.texture];

  if (remnant.kind === "frame") {
    const edge = Math.min(width, height) * 0.055;
    return (
      <group position={remnant.position} rotation={remnant.rotation}>
        <mesh position={[0, 0, -0.055]} material={materials.deadScreen}>
          <planeGeometry args={[width * 0.92, height * 0.82]} />
        </mesh>
        <mesh position={[0, -height * 0.34, 0.015]} material={faceMaterial}>
          <planeGeometry args={[width * 0.78, height * 0.27]} />
        </mesh>
        <mesh position={[-width / 2, 0, 0]} material={materials.frame}>
          <boxGeometry args={[edge, height, edge]} />
        </mesh>
        <mesh position={[width / 2, height * 0.12, 0]} material={materials.frame}>
          <boxGeometry args={[edge, height * 0.76, edge]} />
        </mesh>
        <mesh position={[-width * 0.12, height / 2, 0]} material={materials.frame}>
          <boxGeometry args={[width * 0.76, edge, edge]} />
        </mesh>
        <mesh position={[width * 0.17, -height / 2, 0]} material={materials.frame}>
          <boxGeometry args={[width * 0.62, edge, edge]} />
        </mesh>
      </group>
    );
  }

  if (remnant.kind === "stack") {
    return (
      <group position={remnant.position} rotation={remnant.rotation}>
        <mesh position={[-0.22, 0.12, -0.18]} rotation={[0.03, -0.06, -0.08]} material={materials.deadScreen}>
          <boxGeometry args={[width * 0.94, height * 0.9, 0.09]} />
        </mesh>
        <mesh position={[0.17, -0.13, -0.09]} rotation={[-0.02, 0.04, 0.06]} material={materials.backing}>
          <boxGeometry args={[width, height, 0.08]} />
        </mesh>
        <mesh position={[0, 0, 0]} material={faceMaterial}>
          <planeGeometry args={[width, height]} />
        </mesh>
      </group>
    );
  }

  if (remnant.kind === "screen") {
    return (
      <group position={remnant.position} rotation={remnant.rotation}>
        <mesh position={[0, 0, -0.065]} material={materials.backing}>
          <boxGeometry args={[width + 0.16, height + 0.16, 0.13]} />
        </mesh>
        <mesh position={[0, 0, 0.012]} material={faceMaterial}>
          <planeGeometry args={[width, height]} />
        </mesh>
      </group>
    );
  }

  if (remnant.kind === "strip") {
    return (
      <group position={remnant.position} rotation={remnant.rotation}>
        <mesh position={[0, 0, -0.035]} material={materials.backing}>
          <boxGeometry args={[width, height, 0.07]} />
        </mesh>
        <mesh position={[width * 0.08, 0, 0.008]} material={faceMaterial}>
          <planeGeometry args={[width * 0.78, height]} />
        </mesh>
      </group>
    );
  }

  // A thin, chipped plane with two missing-looking edge pieces. The face is
  // intentionally offset inside its substrate, so it reads as recovered
  // material attached to a broken object rather than a clean floating card.
  return (
    <group position={remnant.position} rotation={remnant.rotation}>
      <mesh position={[-width * 0.06, 0, -0.045]} material={materials.backing}>
        <boxGeometry args={[width * 0.86, height, 0.08]} />
      </mesh>
      <mesh position={[width * 0.08, -height * 0.035, 0.008]} material={faceMaterial}>
        <planeGeometry args={[width * 0.74, height * 0.84]} />
      </mesh>
      <mesh position={[width * 0.43, height * 0.3, -0.01]} rotation={[0, 0, 0.16]} material={materials.frame}>
        <boxGeometry args={[width * 0.13, height * 0.31, 0.06]} />
      </mesh>
    </group>
  );
}

export default function FeedSecondaryFragments() {
  const materials = useMemo(() => {
    const textures = Object.entries(archiveTextureContent).map(([key, content], index) => [
      key,
      makeArchiveTexture(content, index),
    ]);
    const faces = Object.fromEntries(
      textures.map(([key, texture]) => [
        key,
        new THREE.MeshBasicMaterial({ map: texture, color: "#7f8984", toneMapped: false }),
      ]),
    );

    return {
      textures: textures.map(([, texture]) => texture),
      faces,
      backing: new THREE.MeshStandardMaterial({ color: "#151c1a", roughness: 0.62, metalness: 0.14 }),
      deadScreen: new THREE.MeshStandardMaterial({ color: "#090d0c", roughness: 0.46, metalness: 0.2 }),
      frame: new THREE.MeshStandardMaterial({ color: "#27312e", roughness: 0.78, metalness: 0.12 }),
    };
  }, []);

  useEffect(
    () => () => {
      materials.textures.forEach((texture) => texture.dispose());
      Object.values(materials.faces).forEach((material) => material.dispose());
      materials.backing.dispose();
      materials.deadScreen.dispose();
      materials.frame.dispose();
    },
    [materials],
  );

  return (
    <group>
      {feedArchiveClusters.flatMap((cluster) =>
        cluster.remnants.map((remnant) => (
          <ArchiveRemnant key={`${cluster.id}-${remnant.id}`} remnant={remnant} materials={materials} />
        )),
      )}
    </group>
  );
}
