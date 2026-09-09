const CACHE = "mangamorph-v0.3.1";
const ASSETS = [
  "./",
  "./index.html",
  "./manga.html",
  "./assets/css/style.css?v=026",
  "./assets/css/settings.css?v=001",
  "./assets/css/manga.css?v=006",
  "./assets/js/app.js?v=018",
  "./assets/js/manga.js?v=005",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});