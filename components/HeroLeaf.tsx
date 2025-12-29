export default function HeroLeaf() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px",
      }}
    >
      <img
        src="/brand/leaf-icon.png"
        alt="StrainSpotter"
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          border: "6px solid #1f5f3a", // forest green ring
          boxShadow: "0 0 18px rgba(31, 95, 58, 0.65)", // soft glow
          backgroundColor: "black",
        }}
      />
    </div>
  );
}
