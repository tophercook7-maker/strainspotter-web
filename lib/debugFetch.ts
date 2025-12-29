export function installFetchDebug() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = function (input, init) {
    if (init?.headers) {
      const headers =
        init.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : init.headers;

      if (headers?.Authorization) {
        console.error("❌ INVALID AUTH HEADER DETECTED");
        console.error("Authorization:", headers.Authorization);
        console.error("STACK TRACE:");
        console.trace();
        debugger; // pause exactly here
      }
    }
    return originalFetch.apply(this, arguments);
  };

  console.log("🔍 fetch debug interceptor ACTIVE");
}
