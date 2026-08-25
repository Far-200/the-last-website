// Cheap far/peripheral population. Three instanced meshes carry the entire
// field: dark screen slabs, incomplete interface-frame bars, and narrow line /
// metadata residues. Placement is deterministic and clustered by authored
// depth bands, with no React state and no useFrame work.

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { archiveFieldBands } from "../../data/feedArchive";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function matrixAt(position, rotation, scale) {
  const object = new THREE.Object3D();
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.updateMatrix();
  return object.matrix.clone();
}

function generateField() {
  const rand = mulberry32(190726);
  const slabs = [];
  const frameBars = [];
  const marks = [];

  archiveFieldBands.forEach((band, bandIndex) => {
    const zAt = () => band.zNear + rand() * (band.zFar - band.zNear);

    for (let i = 0; i < band.slabs; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const placement = rand();
      let x;
      let y;
      let rotation;

      if (placement < 0.38) {
        // Side-wall archive: seen at a grazing angle through the columns.
        x = side * (14.7 + rand() * 1.25);
        y = 1.2 + rand() * 14;
        rotation = [0, side * Math.PI * 0.5, (rand() - 0.5) * 0.08];
      } else if (placement < 0.72) {
        // Side aisles and pier-adjacent fragments.
        x = side * (8.1 + rand() * 5.4);
        y = 0.8 + rand() * 9.5;
        rotation = [(rand() - 0.5) * 0.1, -side * (0.42 + rand() * 0.48), (rand() - 0.5) * 0.18];
      } else if (placement < 0.9) {
        // Above eye level, caught between the vault rhythm.
        x = side * (3.8 + rand() * 7.8);
        y = 9 + rand() * 10;
        rotation = [(rand() - 0.5) * 0.08, -side * rand() * 0.38, (rand() - 0.5) * 0.14];
      } else {
        // Floor-edge shells, kept away from the camera's central route.
        x = side * (4.2 + rand() * 7.6);
        y = 0.15 + rand() * 0.42;
        rotation = [-1.2 + rand() * 0.35, -side * rand() * 0.8, (rand() - 0.5) * 0.5];
      }

      const width = 0.55 + rand() * 2.7;
      const height = 0.28 + rand() * 1.5;
      slabs.push(matrixAt([x, y, zAt()], rotation, [width, height, 0.055 + rand() * 0.07]));
    }

    for (let i = 0; i < band.frames; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const width = 1.1 + rand() * 2.6;
      const height = 0.7 + rand() * 1.8;
      const edge = 0.035 + rand() * 0.055;
      const position = new THREE.Vector3(
        side * (8.6 + rand() * 6.4),
        1 + rand() * 13,
        zAt(),
      );
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          (rand() - 0.5) * 0.08,
          -side * (0.48 + rand() * 0.54),
          (rand() - 0.5) * 0.16,
        ),
      );
      const composeBar = (offset, scale) => {
        const worldOffset = offset.clone().applyQuaternion(quaternion).add(position);
        const matrix = new THREE.Matrix4();
        matrix.compose(worldOffset, quaternion, new THREE.Vector3(...scale));
        frameBars.push(matrix);
      };

      // Intentionally incomplete: one side is shortened and the lower bar is
      // offset, preventing these from reading as a clean UI grid.
      composeBar(new THREE.Vector3(-width / 2, 0, 0), [edge, height, edge]);
      composeBar(new THREE.Vector3(width / 2, height * 0.12, 0), [edge, height * 0.76, edge]);
      composeBar(new THREE.Vector3(-width * 0.08, height / 2, 0), [width * 0.84, edge, edge]);
      if ((i + bandIndex) % 3 !== 0) {
        composeBar(new THREE.Vector3(width * 0.12, -height / 2, 0), [width * 0.66, edge, edge]);
      }
    }

    for (let i = 0; i < band.marks; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const onWall = rand() < 0.62;
      const x = side * (onWall ? 14.8 + rand() * 1.1 : 7.8 + rand() * 6.3);
      const y = onWall ? 0.7 + rand() * 16 : 0.45 + rand() * 11;
      const length = 0.22 + rand() * 1.7;
      const thickness = 0.018 + rand() * 0.038;
      const yaw = onWall ? side * Math.PI * 0.5 : -side * (0.35 + rand() * 0.65);
      marks.push(
        matrixAt(
          [x, y, zAt()],
          [(rand() - 0.5) * 0.05, yaw, (rand() - 0.5) * 0.16],
          [length, thickness, thickness],
        ),
      );
    }
  });

  return { slabs, frameBars, marks };
}

function fillInstances(mesh, matrices) {
  if (!mesh) return;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export default function FeedArchiveField() {
  const slabsRef = useRef(null);
  const framesRef = useRef(null);
  const marksRef = useRef(null);
  const field = useMemo(() => generateField(), []);

  useLayoutEffect(() => {
    fillInstances(slabsRef.current, field.slabs);
    fillInstances(framesRef.current, field.frameBars);
    fillInstances(marksRef.current, field.marks);
  }, [field]);

  return (
    <group>
      <instancedMesh ref={slabsRef} args={[null, null, field.slabs.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#19221f" roughness={0.64} metalness={0.14} />
      </instancedMesh>

      <instancedMesh ref={framesRef} args={[null, null, field.frameBars.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#52615b" transparent opacity={0.2} depthWrite={false} />
      </instancedMesh>

      <instancedMesh ref={marksRef} args={[null, null, field.marks.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#728079" transparent opacity={0.16} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
