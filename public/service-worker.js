// Retire the old prototype's cache-first worker at its original URL.
// The current app intentionally uses normal HTTP caching, not offline HTML.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // This is the old worker's asset cache, not IndexedDB or account storage.
    await caches.delete("dealvue-v1");
    await self.clients.claim();
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    await Promise.allSettled(windows.map(client => {
      const url = new URL(client.url);
      // Refresh stale home screens without interrupting forms on other pages.
      if (url.origin === self.location.origin && url.pathname === "/") {
        return client.navigate(client.url);
      }
    }));
  })());
});
