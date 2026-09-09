const CACHE = "mangamorph-v0.12.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manga.html",
  "./reader.html",
  "./assets/css/style.css?v=041",
  "./assets/css/auth.css?v=002",
  "./assets/css/settings.css?v=002",
  "./assets/css/manga.css?v=016",
  "./assets/css/reader.css?v=002",
  "./assets/js/app.js?v=036",
  "./assets/js/auth.js?v=002",
  "./assets/js/manga.js?v=013",
  "./assets/js/manga-ratings.js?v=001",
  "./assets/js/reader.js?v=002",
  "./assets/js/reader-community.js?v=001",
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