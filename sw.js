const CACHE = "mangamorph-v0.17.25";
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
  "./assets/css/reader-hero.css?v=001",
  "./assets/css/admin.css?v=004",
  "./assets/css/public-profile.css?v=001",
  "./assets/js/app.js?v=044",
  "./assets/js/catalog-runtime.js?v=003",
  "./assets/js/catalog-cover-fix.js?v=003",
  "./assets/js/account-sync.js?v=002",
  "./assets/js/notifications.js?v=001",
  "./assets/js/admin.js?v=004",
  "./assets/js/admin-import.js?v=003",
  "./assets/js/admin-archive-import.js?v=001",
  "./assets/js/admin-partners.js?v=001",
  "./assets/js/admin-anilist-cover.js?v=001",
  "./assets/js/public-profile.js?v=001",
  "./assets/js/auth.js?v=004",
  "./assets/js/manga.js?v=017",
  "./assets/js/manga-runtime.js?v=004",
  "./assets/js/manga-ui-fixes.js?v=001",
  "./assets/js/manga-actions-fixes.js?v=001",
  "./assets/js/manga-ratings.js?v=001",
  "./assets/js/reader.js?v=008",
  "./assets/js/reader-runtime.js?v=006",
  "./assets/js/reader-ui-fixes.js?v=002",
  "./assets/js/reader-hero.js?v=001",
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

async function fetchFresh(request) {
  const destination=request.destination;
  const revalidate=destination === "document" || destination === "script" || destination === "style" || destination === "image";
  const response=await fetch(request,revalidate?{cache:"no-cache"}:undefined);

  if(response.ok && destination === "script"){
    const pathname=new URL(request.url).pathname;

    if(pathname.endsWith("/assets/js/catalog-runtime.js")){
      const source=await response.text();
      const injected=source+'\nimport("./catalog-cover-fix.js?v=003").catch(error=>console.error("MangaMorph cover fix:",error));\n';
      const headers=new Headers(response.headers);
      headers.set("Content-Type","text/javascript; charset=utf-8");
      return new Response(injected,{status:response.status,statusText:response.statusText,headers});
    }

    if(pathname.endsWith("/assets/js/admin.js")){
      const source=await response.text();
      const injected=source+'\nimport("./admin-anilist-cover.js?v=001").catch(error=>console.error("MangaMorph AniList cover importer:",error));\n';
      const headers=new Headers(response.headers);
      headers.set("Content-Type","text/javascript; charset=utf-8");
      return new Response(injected,{status:response.status,statusText:response.statusText,headers});
    }

    if(pathname.endsWith("/assets/js/manga.js")){
      const source=await response.text();
      const guard='(()=>{if(document.getElementById("mmMangaLiveGuard"))return;const s=document.createElement("style");s.id="mmMangaLiveGuard";s.textContent="#mangaPage,.footer{visibility:hidden!important}";document.head.append(s)})();\n';
      const headers=new Headers(response.headers);
      headers.set("Content-Type","text/javascript; charset=utf-8");
      return new Response(guard+source,{status:response.status,statusText:response.statusText,headers});
    }

    if(pathname.endsWith("/assets/js/manga-runtime.js")){
      const source=await response.text();
      const reveal='\nqueueMicrotask(()=>{document.getElementById("mmMangaLiveGuard")?.remove();document.documentElement.classList.add("manga-live-ready")});\n';
      const headers=new Headers(response.headers);
      headers.set("Content-Type","text/javascript; charset=utf-8");
      return new Response(source+reveal,{status:response.status,statusText:response.statusText,headers});
    }
  }

  return response;
}

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET")return;
  event.respondWith(
    fetchFresh(event.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html")))
  );
});