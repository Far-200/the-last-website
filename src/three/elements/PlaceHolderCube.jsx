import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function PlaceholderCube() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const elapsed = clock.getElapsedTime();

    meshRef.current.rotation.x = elapsed * 0.3;
    meshRef.current.rotation.y = elapsed * 0.4;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#888888" />
    </mesh>
  );
}
