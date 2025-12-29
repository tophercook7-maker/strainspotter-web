export function installFetchDebug() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = function (input, init) {
    if (init?.headers) {
      let headerObj: Record<string, string> = {};

      if (init.headers instanceof Headers) {
        headerObj = Object.fromEntries(init.headers.entries());
      } else if (Array.isArray(init.headers)) {
        headerObj = Object.fromEntries(init.headers);
      } else {
        headerObj = init.headers as Record<string, string>;
      }

      const auth =
        headerObj["authorization"] || headerObj["Authorization"];

      if (auth) {
        console.error("❌ INVALID AUTH HEADER DETECTED");
        console.error("Authorization:", auth);
        console.error("STACK TRACE:");
        console.trace();
        debugger; // pause exactly here
      }
    }

    return originalFetch.apply(this, arguments as any);
  };

  console.log("🔍 fetch debug interceptor ACTIVE");
}
