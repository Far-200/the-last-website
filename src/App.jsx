import { useCallback, useState } from "react";
import Prelude from "./scenes/Prelude/Prelude";
import Feed from "./scenes/Feed/Feed";

// Scene ownership is exclusive: exactly one of Prelude/Feed is mounted at
// a time, never both. `onConnected` remains Prelude's own completion
// boundary (fires only from its [ ENTER ARCHIVE ] action) — this just
// wires that boundary to the next scene without touching Prelude itself.
export default function App() {
  const [scene, setScene] = useState("prelude");

  const handleConnected = useCallback(() => {
    setScene("feed");
  }, []);

  if (scene === "feed") return <Feed />;
  return <Prelude onConnected={handleConnected} />;
}
