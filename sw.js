const CACHE = "mangamorph-v0.17.35";
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/navigation-speed.css",
  "./assets/js/navigation-speed.js",
  "./assets/css/light-theme-final.css",
  "./assets/css/dark-theme-final.css"
];

self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const asset of OFFLINE_ASSETS){
      try{
        const response=await fetch(asset,{cache:"no-cache"});
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

function textResponse(source,response,contentType){
  const headers=new Headers(response.headers);
  headers.set("Content-Type",contentType);
  headers.set("Cache-Control","no-store, max-age=0");
  return new Response(source,{status:response.status,statusText:response.statusText,headers});
}

async function cleanDocument(request,response){
  const url=new URL(request.url);
  const path=url.pathname;
  let html=await response.text();

  const perf='<link rel="preconnect" href="https://fnyellunugdfesprmvzm.supabase.co" crossorigin><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="assets/css/navigation-speed.css?v=002"><script src="assets/js/navigation-speed.js?v=001" defer></script>';
  html=html.replace(/<\/head>/i,perf+'</head>');

  const home=path.endsWith("/")||path.endsWith("/index.html")||path.endsWith("/mangamorph/");
  const manga=path.endsWith("/manga.html");

  if(home){
    const themeBoot=`<script>(function(){try{var t=localStorage.getItem('mangamorph:theme')||'light';document.documentElement.classList.remove('mm-theme-dark','mm-theme-light');document.documentElement.classList.add(t==='light'?'mm-theme-light':'mm-theme-dark')}catch(e){document.documentElement.classList.add('mm-theme-light')}})()</script><link rel="stylesheet" href="assets/css/account-menu.css?v=004"><link rel="stylesheet" href="assets/css/card-compact-fix.css?v=002"><link rel="stylesheet" href="assets/css/dark-theme-final.css?v=003"><link rel="stylesheet" href="assets/css/light-theme-final.css?v=002">`;
    const guard=`${themeBoot}<script>document.documentElement.classList.add('mm-prelive')</script><style id="mmNoLegacyFlash">html.mm-prelive body.mm-home .hero-feature,html.mm-prelive body.mm-home .catalog-section,html.mm-prelive body.mm-home .releases-section{visibility:hidden!important}html.mm-prelive body.mm-home:after{content:'';position:fixed;left:0;top:0;z-index:2147483646;width:38%;height:3px;background:linear-gradient(90deg,#5f83b3,#8db7ee);box-shadow:0 0 14px rgba(95,131,179,.28);animation:mmPreliveBar .85s ease-in-out infinite alternate}@keyframes mmPreliveBar{to{width:78%}}html.mm-theme-dark body.mm-home{background:#202329!important;color:#f4f6f9!important}html.mm-theme-dark body.mm-home .topbar{background:rgba(31,34,39,.94)!important;border-color:rgba(255,255,255,.07)!important}html.mm-theme-dark body.mm-home .menu-tab,html.mm-theme-dark body.mm-home .icon-button{background:#2b3037!important;color:#f4f6f9!important;border-color:rgba(255,255,255,.10)!important}html.mm-theme-light body.mm-home{background:#f3f5f8!important;color:#141b25!important}html.mm-theme-light body.mm-home .topbar{background:rgba(248,250,252,.96)!important;border-color:rgba(24,35,50,.08)!important}html.mm-theme-light body.mm-home .menu-tab,html.mm-theme-light body.mm-home .icon-button{background:#fff!important;color:#18212d!important;border-color:rgba(34,49,70,.09)!important}</style>`;
    html=html.replace(/<head>/i,"<head>"+guard);
  }

  if(manga){
    const guard=`<script>document.documentElement.classList.add('mm-manga-prelive')</script><style id="mmMangaDocumentGuard">html.mm-manga-prelive #mangaPage,html.mm-manga-prelive .footer{visibility:hidden!important}html.mm-manga-prelive body:after{content:'';position:fixed;left:0;top:0;z-index:2147483646;width:45%;height:3px;background:linear-gradient(90deg,#5f83b3,#8db7ee);animation:mmMangaBar .8s ease-in-out infinite alternate}@keyframes mmMangaBar{to{width:82%}}</style>`;
    html=html.replace(/<head>/i,"<head>"+guard);
  }

  return textResponse(html,response,"text/html; charset=utf-8");
}

function stripDemoCatalog(source){
  source=source.replace(/let catalog\s*=\s*\[[\s\S]*?\n\];\n\nconst state/,"let catalog = [];\n\nconst state");
  source=source.replace(/let releases\s*=\s*Array\.from\(\{length:150\}[\s\S]*?\n\}\);\n\nfunction releaseTemplate/,"let releases = [];\n\nfunction releaseTemplate");
  return source;
}

function patchAppTheme(source){
  return source.replace(
    'function applyTheme(theme) {',
    'function applyTheme(theme) {\n  document.documentElement.classList.remove("mm-theme-dark","mm-theme-light");\n  document.documentElement.classList.add(theme === "light" ? "mm-theme-light" : "mm-theme-dark");'
  );
}

async function fetchFresh(request) {
  const destination=request.destination;
  const mustRevalidate=destination==="document"||destination==="script"||destination==="style";
  const options=mustRevalidate?{cache:"no-cache"}:undefined;
  let response=await fetch(request,options);

  if(response.ok && destination==="document"){
    response=await cleanDocument(request,response);
  }

  if(response.ok && destination === "script"){
    const pathname=new URL(request.url).pathname;

    if(pathname.endsWith("/assets/js/app.js")){
      let source=stripDemoCatalog(await response.text());
      source=patchAppTheme(source);
      return textResponse(source,response,"text/javascript; charset=utf-8");
    }

    if(pathname.endsWith("/assets/js/catalog-runtime.js")){
      let source=await response.text();
      source=source.replace('await warmCovers(catalog);','warmCovers(catalog).catch(()=>{});');
      return textResponse(source,response,"text/javascript; charset=utf-8");
    }

    if(pathname.endsWith("/assets/js/manga.js")){
      let source=await response.text();
      source=source.replace(/const catalog\s*=\s*\[[\s\S]*?\n\];\n\nconst params/,"const catalog = [];\n\nconst params");
      const guard='(()=>{if(document.getElementById("mmMangaLiveGuard"))return;const s=document.createElement("style");s.id="mmMangaLiveGuard";s.textContent="#mangaPage,.footer{visibility:hidden!important}";document.head.append(s)})();\n';
      return textResponse(guard+source,response,"text/javascript; charset=utf-8");
    }

    if(pathname.endsWith("/assets/js/manga-runtime.js")){
      const source=await response.text();
      const reveal='\nqueueMicrotask(()=>{document.getElementById("mmMangaLiveGuard")?.remove();document.getElementById("mmMangaDocumentGuard")?.remove();document.documentElement.classList.remove("mm-manga-prelive");document.documentElement.classList.add("manga-live-ready")});\n';
      return textResponse(source+reveal,response,"text/javascript; charset=utf-8");
    }
  }

  return response;
}

self.addEventListener("fetch", event => {
  if(event.request.method!=="GET")return;
  const destination=event.request.destination;
  event.respondWith(
    fetchFresh(event.request).then(response=>{
      const pathname=new URL(event.request.url).pathname;
      if(response.ok && (destination==="image" || pathname.endsWith('/assets/js/navigation-speed.js') || pathname.endsWith('/assets/css/navigation-speed.css') || pathname.endsWith('/assets/css/light-theme-final.css') || pathname.endsWith('/assets/css/dark-theme-final.css'))){
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