"use client";



export default function DashboardStatGrid() {

  const stats = [

    { label: "Scans Left", value: "18", glow: "green" },

    { label: "Doctor Scans Left", value: "4", glow: "gold" },

    { label: "Membership Tier", value: "Garden Member", glow: "blue" },

    { label: "Lifetime Scans", value: "142", glow: "purple" },

  ];



  return (

    <div className="grid-stats">

      {stats.map((s, idx) => (

        <div key={idx} className={`stat-card glow-${s.glow}`}>

          <div className="stat-value">{s.value}</div>

          <div className="stat-label">{s.label}</div>

        </div>

      ))}

    </div>

  );

}
