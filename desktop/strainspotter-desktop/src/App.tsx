import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    // Point the desktop app at the live Garden web app
    window.location.href = "https://strainspotter-web.vercel.app/garden";
  }, []);

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "#22c55e",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      Loading The Garden…
    </div>
  );
}
