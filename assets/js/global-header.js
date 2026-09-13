import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
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
    :root{--mm-nav-h:60px;--mm-nav-bg:rgba(9,13,20,.92);--mm-nav-line:rgba(255,255,255,.08);--mm-nav-text:#f2f5fa;--mm-nav-muted:#9aa7ba;--mm-nav-accent:#e9b35b}
    body,button,input,textarea,select{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    html{scroll-padding-top:calc(var(--mm-nav-h) + 14px)}
    .mm-site-header{position:sticky!important;top:0!important;z-index:1100!important;min-height:var(--mm-nav-h)!important;height:var(--mm-nav-h)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:.75rem!important;padding:0 clamp(.85rem,3vw,1.45rem)!important;border-bottom:1px solid var(--mm-nav-line)!important;background:var(--mm-nav-bg)!important;box-shadow:0 10px 30px rgba(0,0,0,.16)!important;backdrop-filter:blur(22px) saturate(135%)!important;-webkit-backdrop-filter:blur(22px) saturate(135%)!important;transform:none!important;opacity:1!important;visibility:visible!important;transition:background .2s ease,border-color .2s ease!important}
    .mm-site-header .header-brand{display:flex;align-items:center;gap:.7rem;min-width:0}
    .mm-site-header .brand{min-width:0;display:flex;align-items:center}
    .mm-site-header .brand-name{font-size:1.06rem!important;line-height:1!important;letter-spacing:-.035em!important;font-weight:860!important;color:var(--mm-nav-text)!important;white-space:nowrap}
    .mm-site-header .brand-name>span{color:var(--mm-nav-accent)!important}
    .mm-site-header .topbar-actions{display:flex!important;align-items:center!important;gap:.38rem!important;margin-left:auto}
    .mm-site-header .menu-tab,.mm-site-header .icon-button,.mm-site-header .mm-nav-button{width:40px!important;height:40px!important;min-width:40px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;background:rgba(255,255,255,.035)!important;color:var(--mm-nav-text)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important;cursor:pointer!important;transition:transform .16s ease,border-color .16s ease,background .16s ease!important}
    .mm-site-header .menu-tab:hover,.mm-site-header .icon-button:hover,.mm-site-header .mm-nav-button:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.18)!important;background:rgba(255,255,255,.065)!important}
    .mm-site-header .menu-tab{display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important}
    .mm-site-header .menu-tab span{display:block!important;width:17px!important;height:1.6px!important;border-radius:999px!important;background:currentColor!important}
    .mm-site-header svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .mm-site-header .notification-button{display:none!important}
    .mm-site-header .account-button,.mm-site-header .mm-profile-button{overflow:hidden;border-radius:50%!important}
    .mm-site-header .header-profile-image,.mm-site-header .mm-profile-image{width:100%!important;height:100%!important;display:block;object-fit:cover;border-radius:inherit}
    .mm-site-header .header-profile-initials,.mm-site-header .mm-profile-initials{font-size:.68rem;font-weight:850;letter-spacing:.02em}
    .mm-site-header .mm-profile-image[hidden],.mm-site-header .mm-profile-initials[hidden]{display:none!important}
    .mm-site-header .mm-profile-button svg{width:19px;height:19px}
    .mm-reader-site-header{width:100%}
    .reader-header.mm-reader-context{position:relative!important;top:auto!important;z-index:20!important;min-height:36px!important;padding:.3rem .8rem!important;grid-template-columns:minmax(0,1fr)!important;background:rgba(8,11,17,.72)!important;transform:none!important;opacity:1!important}
    .reader-header.mm-reader-context .reader-back,.reader-header.mm-reader-context .reader-icon-button,.reader-header.mm-reader-context .reader-brand{display:none!important}
    .reader-header.mm-reader-context .reader-heading{padding-left:.1rem}
    .reader-header.mm-reader-context .reader-heading strong{font-size:.65rem!important;margin:0!important}
    .reader-header.mm-reader-context .reader-heading small{font-size:.48rem!important;margin-top:.03rem!important}
    .reader-body.controls-hidden .mm-reader-site-header{transform:none!important;opacity:1!important;pointer-events:auto!important}
    .reader-progress-shell{top:var(--mm-nav-h)!important}
    .mm-global-layer{position:fixed;inset:0;z-index:1800}
    .mm-global-layer[hidden]{display:none!important}
    .mm-global-backdrop{position:absolute;inset:0;background:rgba(2,5,10,.72);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
    .mm-global-drawer{position:absolute;top:0;left:0;width:min(340px,88vw);height:100%;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 14px 18px;border-right:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,#0e151f,#0a1018);box-shadow:24px 0 70px rgba(0,0,0,.35)}
    .mm-global-drawer-head,.mm-global-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}
    .mm-global-drawer-brand{font-size:1.1rem;font-weight:860;letter-spacing:-.04em}.mm-global-drawer-brand span{color:var(--mm-nav-accent)}
    .mm-global-close{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.04);color:#eef3fb}.mm-global-close svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
    .mm-global-menu{display:grid;gap:6px;margin-top:20px}.mm-global-menu a{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:52px;padding:7px 10px;border:1px solid transparent;border-radius:14px;color:#b7c1d0}.mm-global-menu a:hover{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.06);color:#fff}.mm-global-menu a svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.mm-global-menu a strong{font-size:.78rem}.mm-global-menu a small{display:block;margin-top:2px;color:#718096;font-size:.55rem}.mm-global-menu .mm-menu-arrow{font-size:1rem;color:#66758a}
    .mm-global-drawer-foot{margin-top:auto;padding:14px 8px 0;border-top:1px solid rgba(255,255,255,.06);color:#627087;font-size:.56rem}
    .mm-global-search-dialog{position:relative;width:min(720px,calc(100% - 24px));max-height:min(78vh,720px);overflow:hidden;margin:max(72px,9vh) auto 0;padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:#0d141e;box-shadow:0 30px 90px rgba(0,0,0,.48)}
    .mm-global-sheet-head h2{margin:0;font-size:1.2rem;letter-spacing:-.035em}.mm-global-sheet-head p{margin:3px 0 0;color:#738198;font-size:.62rem}
    .mm-global-search-field{display:flex;align-items:center;gap:10px;margin-top:14px;padding:0 13px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:#121b27}.mm-global-search-field svg{width:19px;height:19px;fill:none;stroke:#8090a6;stroke-width:1.8}.mm-global-search-field input{width:100%;height:48px;border:0;outline:0;background:transparent;color:#f1f5fa;font-size:.78rem}
    .mm-global-search-results{display:grid;gap:7px;max-height:52vh;overflow:auto;margin-top:12px}.mm-global-search-result{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px;border:1px solid rgba(255,255,255,.055);border-radius:13px;background:#101925;color:#e9eef6}.mm-global-search-result img,.mm-global-search-cover{width:42px;aspect-ratio:3/4;border-radius:8px;object-fit:cover;background:#1a2432;display:grid;place-items:center;font-size:.55rem;font-weight:800}.mm-global-search-result strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.7rem}.mm-global-search-result small{display:block;margin-top:2px;color:#77869a;font-size:.52rem}.mm-global-search-result span:last-child{color:#728197}.mm-global-search-empty{padding:28px 10px;text-align:center;color:#78879c;font-size:.66rem}
    .mm-settings-popover{position:fixed;z-index:1750;top:calc(var(--mm-nav-h) + 8px);right:12px;width:min(300px,calc(100vw - 24px));padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:#0d151f;box-shadow:0 20px 65px rgba(0,0,0,.4);backdrop-filter:blur(18px)}.mm-settings-popover[hidden]{display:none!important}.mm-settings-popover>strong{display:block;padding:5px 7px 9px;font-size:.7rem}.mm-settings-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;padding:8px 10px;border:0;border-radius:11px;background:transparent;color:#c4cedb;text-align:left}.mm-settings-option:hover{background:rgba(255,255,255,.05)}.mm-settings-option span{font-size:.65rem}.mm-settings-option small{color:#718096;font-size:.52rem}
    .mm-theme-light .mm-site-header,body.light .mm-site-header{--mm-nav-bg:rgba(245,247,250,.94);--mm-nav-line:rgba(15,23,42,.08);--mm-nav-text:#111827;--mm-nav-muted:#64748b;--mm-nav-accent:#b77a20;box-shadow:0 8px 24px rgba(15,23,42,.06)!important}.mm-theme-light .mm-site-header .menu-tab,.mm-theme-light .mm-site-header .icon-button,.mm-theme-light .mm-site-header .mm-nav-button,body.light .mm-site-header .menu-tab,body.light .mm-site-header .icon-button,body.light .mm-site-header .mm-nav-button{border-color:rgba(15,23,42,.08)!important;background:rgba(15,23,42,.025)!important}
    @media(max-width:620px){:root{--mm-nav-h:54px}.mm-site-header{padding:0 .72rem!important;gap:.45rem!important}.mm-site-header .header-brand{gap:.52rem}.mm-site-header .brand-name{font-size:.96rem!important}.mm-site-header .menu-tab,.mm-site-header .icon-button,.mm-site-header .mm-nav-button{width:36px!important;height:36px!important;min-width:36px!important;border-radius:11px!important}.mm-site-header .topbar-actions{gap:.28rem!important}.mm-site-header svg{width:18px;height:18px}.reader-header.mm-reader-context{min-height:32px!important;padding:.25rem .72rem!important}.mm-global-search-dialog{margin-top:64px;border-radius:17px;padding:13px}.mm-global-search-field input{height:44px}.mm-global-search-result{grid-template-columns:38px minmax(0,1fr) auto}.mm-global-search-result img,.mm-global-search-cover{width:38px}}
  `;
  document.head.append(style);
}

function sharedHeaderMarkup(){
  return `<div class="header-brand">
    <button class="menu-tab" type="button" data-mm-menu aria-label="Abrir menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <a class="brand brand-text-only" href="./" aria-label="MangaMorph — voltar ao início"><span class="brand-name">Manga<span>Morph</span></span></a>
  </div>
  <div class="topbar-actions">
    <button class="mm-nav-button" type="button" data-mm-search aria-label="Pesquisar" title="Pesquisar">${icon("search")}</button>
    <button class="mm-nav-button" type="button" data-mm-settings aria-label="Configurações" title="Configurações">${icon("settings")}</button>
    <button class="mm-nav-button mm-profile-button" type="button" data-mm-profile aria-label="Perfil" title="Perfil">
      <img class="mm-profile-image" alt="" hidden><span class="mm-profile-initials" hidden>MM</span><span class="mm-profile-guest">${icon("user")}</span>
    </button>
  </div>`;
}

function prepareHeader(){
  const homeHeader=$(".topbar:not(.manga-topbar)");
  if((page==="index.html"||page==="")&&homeHeader){homeHeader.classList.add("mm-site-header");return}
  if(page==="manga.html"){
    const header=$(".manga-topbar");
    if(header){header.classList.add("mm-site-header");header.innerHTML=sharedHeaderMarkup()}
    return;
  }
  if(page==="reader.html"){
    const old=$("#readerHeader");
    if(old&&!$(".mm-reader-site-header")){
      const header=document.createElement("header");header.className="topbar mm-site-header mm-reader-site-header";header.innerHTML=sharedHeaderMarkup();old.before(header);old.classList.add("mm-reader-context");
    }
  }
}

function currentMangaLink(){
  if(page==="manga.html")return location.href;
  const readerLink=$("#readerTitleLink");
  return readerLink?.href||"./";
}

function ensureMenu(){
  let layer=$("#mmGlobalMenu");
  if(layer)return layer;
  layer=document.createElement("div");layer.id="mmGlobalMenu";layer.className="mm-global-layer";layer.hidden=true;
  const pageSpecific=page==="manga.html"?`<a href="#chapters"><span>${icon("book")}</span><span><strong>Capítulos desta obra</strong><small>Ir direto para a lista</small></span><span class="mm-menu-arrow">›</span></a>`:page==="reader.html"?`<a href="${currentMangaLink()}"><span>${icon("book")}</span><span><strong>Voltar à obra</strong><small>Abrir perfil e capítulos</small></span><span class="mm-menu-arrow">›</span></a>`:"";
  layer.innerHTML=`<div class="mm-global-backdrop" data-mm-close-menu></div><aside class="mm-global-drawer" role="dialog" aria-modal="true" aria-label="Menu principal"><div class="mm-global-drawer-head"><div class="mm-global-drawer-brand">Manga<span>Morph</span></div><button class="mm-global-close" data-mm-close-menu aria-label="Fechar menu">${icon("close")}</button></div><nav class="mm-global-menu"><a href="./"><span>${icon("home")}</span><span><strong>Início</strong><small>Página principal</small></span><span class="mm-menu-arrow">›</span></a>${pageSpecific}<a href="./#favoritadas"><span>${icon("list")}</span><span><strong>Mais favoritadas</strong><small>Ranking da comunidade</small></span><span class="mm-menu-arrow">›</span></a><a href="./#recentes"><span>${icon("book")}</span><span><strong>Últimos capítulos</strong><small>Atualizações recentes</small></span><span class="mm-menu-arrow">›</span></a></nav><div class="mm-global-drawer-foot">Navegação MangaMorph · interface compacta e persistente</div></aside>`;
  document.body.append(layer);return layer;
}

function openMenu(){const layer=ensureMenu();layer.hidden=false;document.body.style.overflow="hidden";$("[data-mm-menu]")?.setAttribute("aria-expanded","true")}
function closeMenu(){const layer=$("#mmGlobalMenu");if(layer)layer.hidden=true;document.body.style.overflow="";$("[data-mm-menu]")?.setAttribute("aria-expanded","false")}

function ensureSearch(){
  let layer=$("#mmGlobalSearch");if(layer)return layer;
  layer=document.createElement("div");layer.id="mmGlobalSearch";layer.className="mm-global-layer";layer.hidden=true;
  layer.innerHTML=`<div class="mm-global-backdrop" data-mm-close-search></div><section class="mm-global-search-dialog" role="dialog" aria-modal="true" aria-labelledby="mmGlobalSearchTitle"><div class="mm-global-sheet-head"><div><h2 id="mmGlobalSearchTitle">Buscar no MangaMorph</h2><p>Encontre uma obra sem sair da página.</p></div><button class="mm-global-close" data-mm-close-search aria-label="Fechar busca">${icon("close")}</button></div><label class="mm-global-search-field">${icon("search")}<input id="mmGlobalSearchInput" type="search" autocomplete="off" placeholder="Digite o título da obra..."></label><div class="mm-global-search-results" id="mmGlobalSearchResults"><div class="mm-global-search-empty">Digite pelo menos 2 letras para pesquisar.</div></div></section>`;
  document.body.append(layer);return layer;
}

let searchTimer=0;
function openSearch(){const layer=ensureSearch();layer.hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$("#mmGlobalSearchInput")?.focus(),30)}
function closeSearch(){const layer=$("#mmGlobalSearch");if(layer)layer.hidden=true;document.body.style.overflow=""}
async function runSearch(query){
  const out=$("#mmGlobalSearchResults");if(!out)return;
  const q=String(query||"").trim();if(q.length<2){out.innerHTML='<div class="mm-global-search-empty">Digite pelo menos 2 letras para pesquisar.</div>';return}
  out.innerHTML='<div class="mm-global-search-empty">Buscando…</div>';
  const {data,error}=await db.from("mangamorph_mangas").select("id,title,cover_url,type,publication_status").eq("published",true).ilike("title",`%${q}%`).order("title",{ascending:true}).limit(16);
  if(error){out.innerHTML='<div class="mm-global-search-empty">Não foi possível pesquisar agora.</div>';return}
  if(!data?.length){out.innerHTML='<div class="mm-global-search-empty">Nenhuma obra encontrada.</div>';return}
  out.innerHTML=data.map(row=>`<a class="mm-global-search-result" href="manga.html?id=${Number(row.id)}">${row.cover_url?`<img src="${String(row.cover_url).replace(/"/g,"&quot;")}" alt="" loading="lazy">`:'<span class="mm-global-search-cover">MM</span>'}<span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml([row.type,row.publication_status].filter(Boolean).join(" · "))}</small></span><span>›</span></a>`).join("");
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}

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
  if(profile?.avatarUrl){image.src=profile.avatarUrl;image.hidden=false;letters.hidden=true;guest.hidden=true}
  else if(profile){image.hidden=true;letters.textContent=initials(profile.name);letters.hidden=false;guest.hidden=true}
  else{image.hidden=true;letters.hidden=true;guest.hidden=false}
}
function openProfile(){
  const logged=localStorage.getItem("mangamorph:profile-session")==="on";
  if(logged){location.href="profile.html";return}
  const returnTo=page==="reader.html"?`reader.html${location.search}`:page==="manga.html"?`manga.html${location.search}`:"";
  if(returnTo)localStorage.setItem("mangamorph:auth-return",returnTo);
  location.href="./?mmAccount=1";
}

function handleHomeDeepLinks(){
  if(page!=="index.html"&&page!=="")return;
  const params=new URLSearchParams(location.search);let handled=false;
  if(params.get("mmSearch")==="1"){$("#searchToggle")?.click();params.delete("mmSearch");handled=true}
  if(params.get("mmAccount")==="1"){$("#accountToggle")?.click();params.delete("mmAccount");handled=true}
  if(handled){const next=params.toString();history.replaceState(null,"",`${location.pathname}${next?`?${next}`:""}${location.hash}`)}
}

function bind(){
  document.addEventListener("click",event=>{
    const target=event.target;
    if(target.closest?.("[data-mm-menu]")){event.preventDefault();openMenu();return}
    if(target.closest?.("[data-mm-close-menu]")){event.preventDefault();closeMenu();return}
    if(target.closest?.("[data-mm-search]")){event.preventDefault();openSearch();return}
    if(target.closest?.("[data-mm-close-search]")){event.preventDefault();closeSearch();return}
    if(target.closest?.("[data-mm-settings]")){event.preventDefault();toggleSettings();return}
    if(target.closest?.("[data-mm-profile]")){event.preventDefault();openProfile();return}
    const theme=target.closest?.("[data-mm-theme]");if(theme){event.preventDefault();window.MangaMorphTheme?.apply?.(theme.dataset.mmTheme);closeSettings();return}
    if(target.closest?.("[data-mm-reader-settings]")){event.preventDefault();closeSettings();$("#readerSettingsButton")?.click();return}
    const pop=$("#mmGlobalSettings");if(pop&&!pop.hidden&&!target.closest?.("#mmGlobalSettings"))closeSettings();
  });
  document.addEventListener("input",event=>{if(event.target?.id!=="mmGlobalSearchInput")return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(event.target.value),220)});
  document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;closeMenu();closeSearch();closeSettings()});
  window.addEventListener("storage",event=>{if(event.key==="mangamorph:profile"||event.key==="mangamorph:profile-session")paintProfile()});
  window.addEventListener("mangamorph:auth-state",paintProfile);
}

function init(){injectStyles();prepareHeader();paintProfile();bind();setTimeout(handleHomeDeepLinks,120)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
