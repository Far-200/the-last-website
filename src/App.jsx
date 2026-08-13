import { Canvas } from "@react-three/fiber";
import PlaceholderCube from "./three/elements/PlaceHolderCube";

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <PlaceholderCube />
    </Canvas>
  );
}
