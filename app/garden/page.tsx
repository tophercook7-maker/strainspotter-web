import GardenButton from "@/components/GardenButton";

export default function GardenPage() {
  return (
    <div
      style={{
        padding: "32px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "14px",
      }}
    >
      {/* PRIMARY */}
      <GardenButton href="/scanner-upload" label="Scan" accent />
      <GardenButton href="/scanner-upload" label="Upload" />

      {/* CORE */}
      <GardenButton href="/gallery" label="Library" />
      <GardenButton href="/strains" label="Explore Strains" />
      <GardenButton href="/dispensaries" label="Nearby" />

      {/* COMMUNITY */}
      <GardenButton href="/community" label="Community" />
      <GardenButton href="/discover/news" label="News" />

      {/* ACCOUNT */}
      <GardenButton href="/membership" label="Plan" />
      <GardenButton href="/account" label="Account" />
    </div>
  );
}
