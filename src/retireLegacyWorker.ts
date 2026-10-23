/** Ask an already-installed prototype worker to fetch its retirement update. */
export function retireLegacyWorker() {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.getRegistrations().then(registrations =>
    Promise.allSettled(registrations.map(registration => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (worker && new URL(worker.scriptURL).pathname === "/service-worker.js") {
        return registration.update();
      }
    })),
  ).catch(() => { /* A failed update must not stop the app from opening. */ });
}
