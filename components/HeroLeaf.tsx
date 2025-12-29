import Image from "next/image";

export default function HeroLeaf() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px",
      }}
    >
      <Image
        src="/brand/leaf-icon.png"
        alt="StrainSpotter"
        width={220}
        height={220}
        style={{
          borderRadius: "50%",
          border: "6px solid #1f5f3a", // forest green ring
          boxShadow: "0 0 20px rgba(31, 95, 58, 0.65)",
          backgroundColor: "black",
        }}
        priority
      />
    </div>
  );
}
