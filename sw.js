const CACHE = "mangamorph-v0.17.12";
const ASSETS = [
  "./",
  "./index.html",
  "./manga.html",
  "./reader.html",
  "./admin.html",
  "./profile.html",
  "./terms.html",
  "./privacy.html",
  "./assets/css/style.css?v=045",
  "./assets/css/auth.css?v=002",
  "./assets/css/settings.css?v=002",
  "./assets/css/manga.css?v=016",
  "./assets/css/reader.css?v=008",
  "./assets/css/admin.css?v=004",
  "./assets/css/public-profile.css?v=001",
  "./assets/js/app.js?v=044",
  "./assets/js/catalog-runtime.js?v=003",
  "./assets/js/account-sync.js?v=002",
  "./assets/js/notifications.js?v=001",
  "./assets/js/admin.js?v=004",
  "./assets/js/admin-import.js?v=003",
  "./assets/js/admin-archive-import.js?v=001",
  "./assets/js/admin-partners.js?v=001",
  "./assets/js/public-profile.js?v=001",
  "./assets/js/auth.js?v=004",
  "./assets/js/manga.js?v=017",
  "./assets/js/manga-runtime.js?v=004",
  "./assets/js/manga-ratings.js?v=001",
  "./assets/js/reader.js?v=008",
  "./assets/js/reader-runtime.js?v=006",
  "./assets/js/reader-community.js?v=003",
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