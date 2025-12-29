// @ts-nocheck
export function installFetchDebug() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = function (input, init) {
    if (init?.headers) {
      let headers = {};

      try {
        if (init.headers instanceof Headers) {
          headers = Object.fromEntries(init.headers.entries());
        } else if (Array.isArray(init.headers)) {
          headers = Object.fromEntries(init.headers);
        } else {
          headers = init.headers;
        }
      } catch {}

      const auth = headers["authorization"] || headers["Authorization"];

      if (auth) {
        console.error("❌ INVALID AUTH HEADER DETECTED");
        console.error("Authorization:", auth);
        console.error("STACK TRACE (THIS IS THE SOURCE):");
        console.trace();
        debugger;
      }
    }

    return originalFetch.apply(this, arguments);
  };

  console.log("🔍 Fetch debug interceptor INSTALLED");
}
