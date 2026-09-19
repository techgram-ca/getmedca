/* GetMed Driver service worker: app-shell caching, offline fallback, Web Push. */
const CACHE = "getmed-driver-v1";
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/images/logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline")));
    return;
  }
  if (req.destination === "image" || req.destination === "style" || req.destination === "script" || req.destination === "font") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : { title: "GetMed", body: "You have a new delivery." };
  e.waitUntil(self.registration.showNotification(data.title || "GetMed Driver", { body: data.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: data.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => { for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
