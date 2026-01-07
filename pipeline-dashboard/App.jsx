import { useEffect, useState } from "react";

export default function Dashboard() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch("http://localhost:3333/api/pipeline/state");
      const json = await res.json();
      setState(json);
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  if (!state) return <div>Loading pipeline state…</div>;

  return (
    <div style={{ fontFamily: "monospace", padding: 20 }}>
      <h2>Status: {state.running ? "RUNNING" : "IDLE"}</h2>
      <p>Mode: {state.mode}</p>
      <p>Processed strains: {state.strains}</p>
      <p>Total images: {state.images}</p>
      <p>Current query: {state.currentQuery}</p>
      <p>Last update: {state.lastUpdate}</p>
      <p>Note: {state.note}</p>
    </div>
  );
}

