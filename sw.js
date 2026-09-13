const VERSION="2.2.0";
const CACHE_PREFIX="mangamorph-";
const CRITICAL_SUFFIXES=[
  "/assets/js/navigation-speed.js",
  "/assets/js/global-header.js",
  "/assets/js/theme-system.js",
  "/assets/css/navigation-speed.css"
];

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

function isCriticalAsset(pathname){
  return CRITICAL_SUFFIXES.some(suffix=>pathname.endsWith(suffix));
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  // Never proxy document navigation through the service worker. On mobile this
  // extra network hop could leave the previous page visible while navigation
  // waited indefinitely. Let the browser handle page changes directly.
  if(event.request.mode==="navigate")return;

  // Keep the navigation shell fresh on both root deployments and GitHub Pages
  // subpaths such as /mangamorph/assets/....
  if(isCriticalAsset(url.pathname)){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
  }
});
