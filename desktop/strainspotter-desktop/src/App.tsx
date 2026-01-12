export default function App() {
  // Use your production Garden so desktop always matches web.
  // Change this domain if your real prod domain differs.
  const url = "https://app.strainspotter.app/garden";

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, background: "#000" }}>
      <iframe
        src={url}
        title="StrainSpotter — The Garden"
        style={{
          width: "100%",
          height: "100%",
          border: "0",
          display: "block",
          background: "#000",
        }}
      />
    </div>
  );
}
