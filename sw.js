const VERSION="2.0.1";
const CACHE_PREFIX="mangamorph-";

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const hadLegacyWorker=keys.some(key=>key.startsWith("mangamorph-v1"));
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)).map(key=>caches.delete(key)));
    await self.clients.claim();
    if(hadLegacyWorker){
      const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
      await Promise.all(windows.map(client=>{
        try{return client.navigate(client.url)}catch{return null}
      }));
    }
  })());
});

function offlineDocument(){
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1119"><title>MangaMorph — Offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0b1119;color:#eef3f9;font:500 16px/1.5 system-ui,sans-serif;text-align:center}main{max-width:420px}h1{font-size:24px;margin:0 0 10px}p{color:#9aa8ba;margin:0}</style><main><h1>Sem conexão</h1><p>Não foi possível abrir esta página agora. Verifique sua internet e tente novamente.</p></main></html>`,{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}

async function publicDocument(request){
  let response;
  try{
    response=await fetch(request,{cache:"no-store"});
  }catch{
    return offlineDocument();
  }
  if(!response.ok)return response;

  const url=new URL(request.url);
  const filename=url.pathname.split("/").pop()||"index.html";
  if(filename==="admin.html")return response;

  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html"))return response;

  let html=await response.text();
  if(!html.includes("navigation-speed.css?v=010")){
    const critical='<link rel="stylesheet" href="assets/css/navigation-speed.css?v=010"><script src="assets/js/navigation-speed.js?v=010" defer></script>';
    html=html.replace(/<\/head>/i,critical+"</head>");
  }

  const headers=new Headers(response.headers);
  headers.set("Content-Type","text/html; charset=utf-8");
  headers.set("Cache-Control","no-store, max-age=0");
  headers.set("X-MangaMorph-SW",VERSION);
  headers.delete("Content-Length");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||event.request.mode!=="navigate")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(publicDocument(event.request));
});
