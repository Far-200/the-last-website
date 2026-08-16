import Prelude from "./scenes/Prelude/Prelude";

export default function App() {
  // `onConnected` is the completion boundary for this scene. When Feed
  // exists, hook the Prelude -> Feed transition here without touching
  // Prelude's internals.
  const handleConnected = () => {
    // Intentionally left as a no-op for now. Future scope: trigger the
    // Prelude -> Feed transition.
  };

  return <Prelude onConnected={handleConnected} />;
}
