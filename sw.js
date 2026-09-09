const CACHE = "mangamorph-v0.8.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manga.html",
  "./reader.html",
  "./assets/css/style.css?v=039",
  "./assets/css/auth.css?v=001",
  "./assets/css/settings.css?v=002",
  "./assets/css/manga.css?v=013",
  "./assets/css/reader.css?v=001",
  "./assets/js/app.js?v=034",
  "./assets/js/auth.js?v=001",
  "./assets/js/manga.js?v=010",
  "./assets/js/reader.js?v=001",
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