// Minimal service worker: exists so the app is installable (manifest +
// service worker are both required for "Add to Home Screen" on iOS/Android)
// and so Phase 2 web push has somewhere to add a push handler later.
// No offline caching for MVP — everything just passes through to network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
