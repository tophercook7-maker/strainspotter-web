"use client";

import { useEffect, useState } from "react";

export default function DispensaryFinderPage() {
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapUrl(
        "https://www.google.com/maps?q=cannabis+dispensary+near+me&output=embed"
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapUrl(
          `https://www.google.com/maps?q=cannabis+dispensary&ll=${latitude},${longitude}&z=13&output=embed`
        );
      },
      () => {
        setMapUrl(
          "https://www.google.com/maps?q=cannabis+dispensary+near+me&output=embed"
        );
      }
    );
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "black",
        color: "#E6FFE6",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", textAlign: "center" }}>
        🏪 Dispensary Finder
      </h1>

      <p
        style={{
          textAlign: "center",
          opacity: 0.8,
          marginBottom: "1.5rem",
        }}
      >
        Licensed dispensaries near you. Live map. No tracking.
      </p>

      {!mapUrl && (
        <div style={{ textAlign: "center", opacity: 0.6 }}>
          Loading nearby dispensaries…
        </div>
      )}

      {mapUrl && (
        <div
          style={{
            width: "100%",
            height: "75vh",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0 }}
          />
        </div>
      )}

      <div
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          opacity: 0.5,
          fontSize: "0.85rem",
        }}
      >
        Status: In-app map active
      </div>
    </main>
  );
}
