// STEP J6 (Browser console) — Example request using imageDataUrl
// Replace DATA_URL with a real data URL (e.g. from a file input)
fetch("/api/scan/judge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageDataUrl: "DATA_URL",
    topK: 5,
    minSimilarity: 0.0,
    anonSessionId: "local-test"
  })
}).then(r => r.json()).then(console.log);
