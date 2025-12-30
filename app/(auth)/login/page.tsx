"use client";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #062B18, #020B05)",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("FORM SUBMIT — NO AUTH YET");
        }}
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "40px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <h1 style={{ color: "#E8FFE8", fontSize: "22px" }}>
          Sign In
        </h1>

        <input
          type="email"
          placeholder="Email"
          style={{
            height: "48px",
            padding: "0 14px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#E8FFE8",
            fontSize: "15px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          style={{
            height: "48px",
            padding: "0 14px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#E8FFE8",
            fontSize: "15px",
          }}
        />

        <button
          type="submit"
          style={{
            height: "52px",
            borderRadius: "14px",
            background: "rgba(0,40,0,0.85)",
            border: "1px solid rgba(0,255,0,0.4)",
            color: "#E8FFE8",
            fontSize: "16px",
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(0,255,0,0.35)",
          }}
        >
          Test
        </button>
      </form>
    </div>
  );
}
