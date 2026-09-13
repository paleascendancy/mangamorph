const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const $=(selector,root=document)=>root.querySelector(selector);
const page=location.pathname.split("/").pop()||"index.html";

function icon(name){
  const icons={
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.25"></circle><path d="M15.7 15.7 20 20"></path></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.1"></circle><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.45 1.45M7.45 16.55 6 18M18 18l-1.45-1.45M7.45 7.45 6 6"></path><circle cx="12" cy="12" r="7.1"></circle></svg>',
    user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"></path></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.3 12 4l8 7.3V20h-5v-5H9v5H4z"></path></svg>',
    book:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11H8a3 3 0 0 1-3-3z"></path><path d="M8 19a3 3 0 0 1 3-3h8"></path></svg>',
    list:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h11M8 12h11M8 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"></path></svg>'
  };
  return icons[name]||"";
}

function injectStyles(){
  if($("#mmGlobalHeaderStyles"))return;
  const style=document.createElement("style");
  style.id="mmGlobalHeaderStyles";
  style.textContent=`
    :root{--mm-nav-h:56px;--mm-nav-bg:rgba(8,12,18,.94);--mm-nav-line:rgba(255,255,255,.075);--mm-nav-text:#f4f7fb;--mm-nav-muted:#8997aa;--mm-nav-accent:#e8ae56}
    body,button,input,textarea,select{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    html{scroll-padding-top:calc(var(--mm-nav-h) + 10px)}
    #notificationsToggle,.notification-button{display:none!important}
    .mm-site-header{position:sticky!important;top:0!important;z-index:1200!important;width:100%!important;min-height:var(--mm-nav-h)!important;height:var(--mm-nav-h)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:.6rem!important;padding:0 clamp(.72rem,2.6vw,1.25rem)!important;border:0!important;border-bottom:1px solid var(--mm-nav-line)!important;background:var(--mm-nav-bg)!important;color:var(--mm-nav-text)!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important;backdrop-filter:blur(20px) saturate(130%)!important;-webkit-backdrop-filter:blur(20px) saturate(130%)!important;transform:none!important;opacity:1!important;visibility:visible!important}
    .mm-site-header .desktop-nav{display:none!important}
    .mm-site-header .header-brand{display:flex!important;align-items:center!important;gap:.58rem!important;min-width:0!important}
    .mm-site-header .brand,.mm-site-header .brand-text-only{display:flex!important;align-items:center!important;min-width:0!important;gap:0!important;text-decoration:none!important}
    .mm-site-header .brand-name{display:block!important;margin:0!important;font-size:1rem!important;line-height:1!important;letter-spacing:-.045em!important;font-weight:860!important;color:var(--mm-nav-text)!important;white-space:nowrap!important;background:none!important;-webkit-text-fill-color:initial!important}
    .mm-site-header .brand-name>span{color:var(--mm-nav-accent)!important;background:none!important;-webkit-text-fill-color:initial!important}
    .mm-site-header .topbar-actions{display:flex!important;align-items:center!important;gap:.3rem!important;margin-left:auto!important}
    .mm-site-header .menu-tab,.mm-site-header .icon-button,.mm-site-header .header-action-button,.mm-site-header .mm-nav-button{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.085)!important;border-radius:11px!important;background:rgba(255,255,255,.03)!important;color:var(--mm-nav-text)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)!important;cursor:pointer!important;overflow:hidden!important;transition:transform .15s ease,border-color .15s ease,background .15s ease!important}
    .mm-site-header .menu-tab:hover,.mm-site-header .icon-button:hover,.mm-site-header .header-action-button:hover,.mm-site-header .mm-nav-button:hover{transform:translateY(-1px)!important;border-color:rgba(255,255,255,.16)!important;background:rgba(255,255,255,.06)!important}
    .mm-site-header .menu-tab{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important}
    .mm-site-header .menu-tab span{display:block!important;width:17px!important;height:1.7px!important;margin:0!important;border:0!important;border-radius:999px!important;background:currentColor!important;transform:none!important}
    .mm-site-header svg{width:18px!important;height:18px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
    .mm-site-header .account-button,.mm-site-header .mm-profile-button{border-radius:50%!important;padding:2px!important}
    .mm-site-header .header-profile-image,.mm-site-header .mm-profile-image{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;border-radius:inherit!important}
    .mm-site-header .header-profile-initials,.mm-site-header .mm-profile-initials{width:100%;height:100%;display:grid;place-items:center;font-size:.64rem!important;font-weight:850!important}
    .mm-site-header .header-profile-image[hidden],.mm-site-header .header-profile-initials[hidden],.mm-site-header .mm-profile-image[hidden],.mm-site-header .mm-profile-initials[hidden]{display:none!important}
    .reader-header.mm-reader-context{display:none!important}
    .reader-body.controls-hidden .mm-reader-site-header{display:flex!important;transform:none!important;opacity:1!important;pointer-events:auto!important}
    .reader-main{padding-top:0!important}
    .reader-progress-shell{position:fixed!important;top:var(--mm-nav-h)!important;left:0!important;right:0!important;z-index:1050!important;width:100%!important;margin:0!important;padding:.18rem clamp(.65rem,3vw,1rem) .28rem!important;background:linear-gradient(180deg,rgba(7,10,15,.78),rgba(7,10,15,.28),transparent)!important;backdrop-filter:none!important;pointer-events:none!important}
    .light-reader .reader-progress-shell{background:linear-gradient(180deg,rgba(239,242,246,.76),rgba(239,242,246,.2),transparent)!important}
    .reader-context-card{margin-top:0!important}
    .mm-global-layer{position:fixed;inset:0;z-index:1900}.mm-global-layer[hidden]{display:none!important}
    .mm-global-backdrop{position:absolute;inset:0;background:rgba(2,5,10,.72);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
    .mm-global-drawer{position:absolute;top:0;left:0;width:min(330px,88vw);height:100%;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 14px 18px;border-right:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,#0e151f,#0a1018);box-shadow:24px 0 70px rgba(0,0,0,.35)}
    .mm-global-drawer-head,.mm-global-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}.mm-global-drawer-brand{font-size:1.05rem;font-weight:860;letter-spacing:-.04em}.mm-global-drawer-brand span{color:var(--mm-nav-accent)}
    .mm-global-close{width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.04);color:#eef3fb}.mm-global-close svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
    .mm-global-menu{display:grid;gap:5px;margin-top:18px}.mm-global-menu a{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px;min-height:49px;padding:7px 9px;border:1px solid transparent;border-radius:13px;color:#b7c1d0;text-decoration:none}.mm-global-menu a:hover{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.06);color:#fff}.mm-global-menu a svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7}.mm-global-menu a strong{font-size:.75rem}.mm-global-menu a small{display:block;margin-top:2px;color:#718096;font-size:.53rem}.mm-global-menu .mm-menu-arrow{color:#66758a}.mm-global-drawer-foot{margin-top:auto;padding:13px 7px 0;border-top:1px solid rgba(255,255,255,.06);color:#627087;font-size:.54rem}
    .mm-global-search-dialog{position:relative;width:min(700px,calc(100% - 22px));max-height:min(78vh,700px);overflow:hidden;margin:max(68px,8vh) auto 0;padding:15px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:#0d141e;box-shadow:0 30px 90px rgba(0,0,0,.48)}
    .mm-global-sheet-head h2{margin:0;font-size:1.15rem;letter-spacing:-.035em}.mm-global-sheet-head p{margin:3px 0 0;color:#738198;font-size:.6rem}.mm-global-search-field{display:flex;align-items:center;gap:9px;margin-top:13px;padding:0 12px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#121b27}.mm-global-search-field svg{width:18px;height:18px;fill:none;stroke:#8090a6;stroke-width:1.8}.mm-global-search-field input{width:100%;height:46px;border:0;outline:0;background:transparent;color:#f1f5fa;font-size:.76rem}.mm-global-search-results{display:grid;gap:6px;max-height:52vh;overflow:auto;margin-top:11px}.mm-global-search-result{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:9px;padding:7px;border:1px solid rgba(255,255,255,.055);border-radius:12px;background:#101925;color:#e9eef6;text-decoration:none}.mm-global-search-result img,.mm-global-search-cover{width:40px;aspect-ratio:3/4;border-radius:7px;object-fit:cover;background:#1a2432;display:grid;place-items:center;font-size:.52rem;font-weight:800}.mm-global-search-result strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem}.mm-global-search-result small{display:block;margin-top:2px;color:#77869a;font-size:.5rem}.mm-global-search-empty{padding:26px 10px;text-align:center;color:#78879c;font-size:.64rem}
    .mm-settings-popover{position:fixed;z-index:1850;top:calc(var(--mm-nav-h) + 7px);right:10px;width:min(290px,calc(100vw - 20px));padding:9px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:#0d151f;box-shadow:0 20px 65px rgba(0,0,0,.4);backdrop-filter:blur(18px)}.mm-settings-popover[hidden]{display:none!important}.mm-settings-popover>strong{display:block;padding:5px 7px 8px;font-size:.68rem}.mm-settings-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:42px;padding:8px 9px;border:0;border-radius:10px;background:transparent;color:#c4cedb;text-align:left}.mm-settings-option:hover{background:rgba(255,255,255,.05)}.mm-settings-option span{font-size:.63rem}.mm-settings-option small{color:#718096;font-size:.5rem}
    .mm-theme-light .mm-site-header,body.light .mm-site-header{--mm-nav-bg:rgba(247,248,250,.96);--mm-nav-line:rgba(15,23,42,.075);--mm-nav-text:#111827;--mm-nav-muted:#64748b;--mm-nav-accent:#b7791f;box-shadow:0 7px 22px rgba(15,23,42,.055)!important}.mm-theme-light .mm-site-header .menu-tab,.mm-theme-light .mm-site-header .icon-button,.mm-theme-light .mm-site-header .header-action-button,.mm-theme-light .mm-site-header .mm-nav-button,body.light .mm-site-header .menu-tab,body.light .mm-site-header .icon-button,body.light .mm-site-header .header-action-button,body.light .mm-site-header .mm-nav-button{border-color:rgba(15,23,42,.08)!important;background:rgba(15,23,42,.025)!important;color:#111827!important}
    @media(max-width:620px){:root{--mm-nav-h:52px}.mm-site-header{padding:0 .68rem!important;gap:.4rem!important}.mm-site-header .header-brand{gap:.48rem!important}.mm-site-header .brand-name{font-size:.93rem!important}.mm-site-header .menu-tab,.mm-site-header .icon-button,.mm-site-header .header-action-button,.mm-site-header .mm-nav-button{width:35px!important;height:35px!important;min-width:35px!important;min-height:35px!important;border-radius:10px!important}.mm-site-header .topbar-actions{gap:.24rem!important}.mm-site-header svg{width:17px!important;height:17px!important}.mm-global-search-dialog{margin-top:60px;border-radius:16px;padding:12px}.mm-global-search-field input{height:43px}.mm-global-search-result{grid-template-columns:37px minmax(0,1fr) auto}.mm-global-search-result img,.mm-global-search-cover{width:37px}}
  `;
  document.head.append(style);
}

function sharedHeaderMarkup(){
  return `<div class="header-brand"><button class="menu-tab" type="button" data-mm-menu aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button><a class="brand brand-text-only" href="./" aria-label="MangaMorph — início"><span class="brand-name">Manga<span>Morph</span></span></a></div><div class="topbar-actions"><button class="mm-nav-button" type="button" data-mm-search aria-label="Pesquisar" title="Pesquisar">${icon("search")}</button><button class="mm-nav-button" type="button" data-mm-settings aria-label="Configurações" title="Configurações">${icon("settings")}</button><button class="mm-nav-button mm-profile-button" type="button" data-mm-profile aria-label="Perfil" title="Perfil"><img class="mm-profile-image" alt="" hidden><span class="mm-profile-initials" hidden>MM</span><span class="mm-profile-guest">${icon("user")}</span></button></div>`;
}

function prepareHomeHeader(header){
  header.classList.add("mm-site-header");
  $("#notificationsToggle")?.remove();
  const menu=$("#menuToggle");if(menu)menu.setAttribute("data-mm-menu","");
  const search=$("#searchToggle");if(search)search.setAttribute("data-mm-search","");
  const settings=$("#settingsToggle");if(settings)settings.setAttribute("data-mm-settings","");
  const account=$("#accountToggle");if(account)account.setAttribute("data-mm-profile-home","");
}

function prepareHeader(){
  if(page==="index.html"||page===""){
    const header=$(".topbar");if(header)prepareHomeHeader(header);return;
  }
  if(page==="manga.html"){
    const header=$(".manga-topbar");if(header){header.className="topbar manga-topbar mm-site-header";header.innerHTML=sharedHeaderMarkup()}return;
  }
  if(page==="reader.html"){
    const old=$("#readerHeader");
    if(old)old.classList.add("mm-reader-context");
    if(!$(".mm-reader-site-header")){
      const header=document.createElement("header");header.className="topbar mm-site-header mm-reader-site-header";header.innerHTML=sharedHeaderMarkup();
      (old||document.body.firstChild)?.before?.(header)||document.body.prepend(header);
    }
    return;
  }
  const legacy=$(".public-topbar,body>header");
  if(legacy&&!legacy.classList.contains("mm-site-header"))legacy.style.display="none";
  if(!$(".mm-site-header")){
    const header=document.createElement("header");header.className="topbar mm-site-header";header.innerHTML=sharedHeaderMarkup();document.body.prepend(header);
  }
}

function currentMangaLink(){
  if(page==="manga.html")return location.href;
  const link=$("#readerTitleLink");return link?.href||"./";
}
function ensureMenu(){
  let layer=$("#mmGlobalMenu");if(layer)return layer;
  layer=document.createElement("div");layer.id="mmGlobalMenu";layer.className="mm-global-layer";layer.hidden=true;
  const pageSpecific=page==="manga.html"?`<a href="#chapters"><span>${icon("book")}</span><span><strong>Capítulos desta obra</strong><small>Ir para a lista</small></span><span class="mm-menu-arrow">›</span></a>`:page==="reader.html"?`<a href="${currentMangaLink()}"><span>${icon("book")}</span><span><strong>Voltar à obra</strong><small>Perfil e capítulos</small></span><span class="mm-menu-arrow">›</span></a>`:"";
  layer.innerHTML=`<div class="mm-global-backdrop" data-mm-close-menu></div><aside class="mm-global-drawer" role="dialog" aria-modal="true" aria-label="Menu principal"><div class="mm-global-drawer-head"><div class="mm-global-drawer-brand">Manga<span>Morph</span></div><button class="mm-global-close" data-mm-close-menu aria-label="Fechar menu">${icon("close")}</button></div><nav class="mm-global-menu"><a href="./"><span>${icon("home")}</span><span><strong>Início</strong><small>Página principal</small></span><span class="mm-menu-arrow">›</span></a>${pageSpecific}<a href="./#favoritadas"><span>${icon("list")}</span><span><strong>Mais favoritadas</strong><small>Ranking da comunidade</small></span><span class="mm-menu-arrow">›</span></a><a href="./#recentes"><span>${icon("book")}</span><span><strong>Últimos capítulos</strong><small>Atualizações recentes</small></span><span class="mm-menu-arrow">›</span></a></nav><div class="mm-global-drawer-foot">MangaMorph · navegação principal</div></aside>`;
  document.body.append(layer);return layer;
}
function openMenu(){const layer=ensureMenu();layer.hidden=false;document.body.style.overflow="hidden";$("[data-mm-menu]")?.setAttribute("aria-expanded","true")}
function closeMenu(){const layer=$("#mmGlobalMenu");if(layer)layer.hidden=true;document.body.style.overflow="";$("[data-mm-menu]")?.setAttribute("aria-expanded","false")}

function ensureSearch(){
  let layer=$("#mmGlobalSearch");if(layer)return layer;
  layer=document.createElement("div");layer.id="mmGlobalSearch";layer.className="mm-global-layer";layer.hidden=true;
  layer.innerHTML=`<div class="mm-global-backdrop" data-mm-close-search></div><section class="mm-global-search-dialog" role="dialog" aria-modal="true" aria-labelledby="mmGlobalSearchTitle"><div class="mm-global-sheet-head"><div><h2 id="mmGlobalSearchTitle">Buscar no MangaMorph</h2><p>Encontre uma obra rapidamente.</p></div><button class="mm-global-close" data-mm-close-search aria-label="Fechar busca">${icon("close")}</button></div><label class="mm-global-search-field">${icon("search")}<input id="mmGlobalSearchInput" type="search" autocomplete="off" placeholder="Digite o título da obra..."></label><div class="mm-global-search-results" id="mmGlobalSearchResults"><div class="mm-global-search-empty">Digite pelo menos 2 letras para pesquisar.</div></div></section>`;
  document.body.append(layer);return layer;
}
let searchTimer=0,searchController=null;
function openSearch(){const layer=ensureSearch();layer.hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$("#mmGlobalSearchInput")?.focus(),20)}
function closeSearch(){const layer=$("#mmGlobalSearch");if(layer)layer.hidden=true;document.body.style.overflow="";searchController?.abort();searchController=null}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
async function runSearch(query){
  const out=$("#mmGlobalSearchResults");if(!out)return;
  const q=String(query||"").trim();if(q.length<2){out.innerHTML='<div class="mm-global-search-empty">Digite pelo menos 2 letras para pesquisar.</div>';return}
  searchController?.abort();searchController=new AbortController();out.innerHTML='<div class="mm-global-search-empty">Buscando…</div>';
  try{
    const url=new URL(SUPABASE_URL+"/rest/v1/mangamorph_mangas");
    url.searchParams.set("select","id,title,cover_url,type,publication_status");url.searchParams.set("published","eq.true");url.searchParams.set("title","ilike.*"+q.replace(/[,*()]/g," ")+"*");url.searchParams.set("order","title.asc");url.searchParams.set("limit","16");
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY},signal:searchController.signal});if(!response.ok)throw new Error("search");const data=await response.json();
    if(!data?.length){out.innerHTML='<div class="mm-global-search-empty">Nenhuma obra encontrada.</div>';return}
    out.innerHTML=data.map(row=>`<a class="mm-global-search-result" href="manga.html?id=${Number(row.id)}">${row.cover_url?`<img src="${escapeHtml(row.cover_url)}" alt="" loading="lazy">`:'<span class="mm-global-search-cover">MM</span>'}<span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml([row.type,row.publication_status].filter(Boolean).join(" · "))}</small></span><span>›</span></a>`).join("");
  }catch(error){if(error?.name!=="AbortError")out.innerHTML='<div class="mm-global-search-empty">Não foi possível pesquisar agora.</div>'}
}

function ensureSettings(){
  let pop=$("#mmGlobalSettings");if(pop)return pop;
  pop=document.createElement("div");pop.id="mmGlobalSettings";pop.className="mm-settings-popover";pop.hidden=true;
  pop.innerHTML=`<strong>Configurações</strong><button class="mm-settings-option" data-mm-theme="gray"><span>Tema cinza</span><small>Padrão</small></button><button class="mm-settings-option" data-mm-theme="light"><span>Tema branco</span><small>Claro</small></button>${page==="reader.html"?'<button class="mm-settings-option" data-mm-reader-settings><span>Leitor</span><small>Controles de leitura</small></button>':''}`;
  document.body.append(pop);return pop;
}
function toggleSettings(){const pop=ensureSettings();pop.hidden=!pop.hidden}
function closeSettings(){const pop=$("#mmGlobalSettings");if(pop)pop.hidden=true}
function readProfile(){try{return JSON.parse(localStorage.getItem("mangamorph:profile")||"null")}catch{return null}}
function initials(name){return String(name||"MM").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("")||"MM"}
function paintProfile(){
  const profile=readProfile();const image=$(".mm-profile-image"),letters=$(".mm-profile-initials"),guest=$(".mm-profile-guest");if(!image||!letters||!guest)return;
  if(profile?.avatarUrl){image.src=profile.avatarUrl;image.hidden=false;letters.hidden=true;guest.hidden=true}else if(profile){image.hidden=true;letters.textContent=initials(profile.name);letters.hidden=false;guest.hidden=true}else{image.hidden=true;letters.hidden=true;guest.hidden=false}
}
function openProfile(){
  const logged=localStorage.getItem("mangamorph:profile-session")==="on";
  if(logged){const profile=readProfile();location.href=profile?.username?"profile.html?user="+encodeURIComponent(profile.username):"profile.html";return}
  const returnTo=page==="reader.html"?`reader.html${location.search}`:page==="manga.html"?`manga.html${location.search}`:"";if(returnTo)localStorage.setItem("mangamorph:auth-return",returnTo);location.href="./?mmAccount=1";
}
function handleHomeDeepLinks(){
  if(page!=="index.html"&&page!=="")return;const params=new URLSearchParams(location.search);let handled=false;if(params.get("mmSearch")==="1"){$("#searchToggle")?.click();params.delete("mmSearch");handled=true}if(params.get("mmAccount")==="1"){$("#accountToggle")?.click();params.delete("mmAccount");handled=true}if(handled){const next=params.toString();history.replaceState(null,"",`${location.pathname}${next?`?${next}`:""}${location.hash}`)}
}
function bind(){
  document.addEventListener("click",event=>{
    const target=event.target;
    if(target.closest?.("[data-mm-menu]")){event.preventDefault();openMenu();return}
    if(target.closest?.("[data-mm-close-menu]")){event.preventDefault();closeMenu();return}
    if(target.closest?.("[data-mm-search]")){event.preventDefault();if(page==="index.html"||page===""){const native=$("#searchToggle");if(native&&target.closest("#searchToggle")){return}}openSearch();return}
    if(target.closest?.("[data-mm-close-search]")){event.preventDefault();closeSearch();return}
    if(target.closest?.("[data-mm-settings]")){event.preventDefault();if(page==="index.html"||page===""){const native=$("#settingsToggle");if(native&&target.closest("#settingsToggle")){return}}toggleSettings();return}
    if(target.closest?.("[data-mm-profile]")){event.preventDefault();openProfile();return}
    const theme=target.closest?.("[data-mm-theme]");if(theme){event.preventDefault();window.MangaMorphTheme?.apply?.(theme.dataset.mmTheme);closeSettings();return}
    if(target.closest?.("[data-mm-reader-settings]")){event.preventDefault();closeSettings();$("#readerSettingsButton")?.click();return}
    const pop=$("#mmGlobalSettings");if(pop&&!pop.hidden&&!target.closest?.("#mmGlobalSettings"))closeSettings();
  });
  document.addEventListener("input",event=>{if(event.target?.id!=="mmGlobalSearchInput")return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(event.target.value),180)});
  document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;closeMenu();closeSearch();closeSettings()});
  window.addEventListener("storage",event=>{if(event.key==="mangamorph:profile"||event.key==="mangamorph:profile-session")paintProfile()});window.addEventListener("mangamorph:auth-state",paintProfile);
}
function init(){injectStyles();prepareHeader();paintProfile();bind();setTimeout(handleHomeDeepLinks,40);document.documentElement.dataset.mmNavReady="true"}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
