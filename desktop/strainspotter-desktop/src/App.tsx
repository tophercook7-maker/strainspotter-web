import { WebviewWindow } from "@tauri-apps/api/window";

export default function App() {
  return (
    <iframe
      src="http://localhost:3000/garden"
      style={{
        width: "100vw",
        height: "100vh",
        border: "none",
      }}
    />
  );
}
