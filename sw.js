const CACHE = "mangamorph-v0.14.1";
const ASSETS = [
  "./",
  "./index.html",
  "./manga.html",
  "./reader.html",
  "./admin.html",
  "./profile.html",
  "./terms.html",
  "./privacy.html",
  "./assets/css/style.css?v=041",
  "./assets/css/auth.css?v=002",
  "./assets/css/settings.css?v=002",
  "./assets/css/manga.css?v=016",
  "./assets/css/reader.css?v=004",
  "./assets/css/admin.css?v=001",
  "./assets/css/public-profile.css?v=001",
  "./assets/js/app.js?v=037",
  "./assets/js/catalog-runtime.js?v=001",
  "./assets/js/admin.js?v=001",
  "./assets/js/public-profile.js?v=001",
  "./assets/js/auth.js?v=002",
  "./assets/js/manga.js?v=014",
  "./assets/js/manga-runtime.js?v=001",
  "./assets/js/manga-ratings.js?v=001",
  "./assets/js/reader.js?v=004",
  "./assets/js/reader-community.js?v=002",
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