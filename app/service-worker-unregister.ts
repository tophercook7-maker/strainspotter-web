/**
 * Service Worker Unregister
 * Ensures no service worker is registered that could inject cached Authorization headers
 */

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Service worker unregistered');
        }
      });
    }
  });
}

