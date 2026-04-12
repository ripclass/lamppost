/**
 * Lamppost Service Worker Registration
 *
 * Registers the service worker for offline PWA support.
 * The actual service worker file is at public/sw.js.
 *
 * Call registerServiceWorker() from your app's entry point
 * to enable offline capabilities.
 */

/**
 * Register the Lamppost service worker.
 * Safe to call in any environment — silently no-ops if SW is unsupported.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New version available — could prompt user to refresh
          console.log('[Lamppost SW] New version available');
        }
      });
    });

    console.log('[Lamppost SW] Registered successfully');
  } catch (error) {
    console.warn('[Lamppost SW] Registration failed:', error);
  }
}

/**
 * Unregister all service workers (for debugging).
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
}
