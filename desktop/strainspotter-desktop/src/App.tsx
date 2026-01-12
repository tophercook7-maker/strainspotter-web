import { WebviewWindow } from "@tauri-apps/api/window";

export default function App() {
  return (
    <iframe
      src="https://app.strainspotter.app/garden"
      style={{
        width: "100vw",
        height: "100vh",
        border: "none",
        overflow: "auto",
      }}
    />
  );
}
