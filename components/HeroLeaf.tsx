export default function HeroLeaf() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "28px",
      }}
    >
      <img
        src="/brand/leaf-icon.png"
        alt="StrainSpotter"
        style={{
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          boxShadow: "0 0 28px rgba(0,255,0,0.65)",
        }}
      />
    </div>
  );
}
