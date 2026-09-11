const CACHE = "mangamorph-v0.17.29";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const asset of OFFLINE_ASSETS){
      try{
        const response=await fetch(asset,{cache:"reload"});
        if(response.ok)await cache.put(asset,response.clone());
      }catch{}
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fetchFresh(request) {
  const destination=request.destination;
  const forceFresh=destination==="document"||destination==="script"||destination==="style";
  const response=await fetch(request,forceFresh?{cache:"reload"}:undefined);

  if(response.ok && destination === "script"){
    const pathname=new URL(request.url).pathname;

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
  if(event.request.method!=="GET")return;
  const destination=event.request.destination;
  event.respondWith(
    fetchFresh(event.request).then(response=>{
      if(response.ok && (destination==="document"||destination==="image")){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(destination==="document")return caches.match("./index.html");
      throw new Error("offline");
    })
  );
});