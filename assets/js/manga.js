import("./nav-stability.js?v=001").catch(()=>{});
import("./theme-system.js?v=111").catch(()=>{});
import("./global-header.js?v=002").catch(()=>{});

const params=new URLSearchParams(location.search);
const mangaId=Number(params.get("id"));
const favorites=new Set(JSON.parse(localStorage.getItem("mangamorph:favorites")||"[]").map(Number));
const marked=new Set(JSON.parse(localStorage.getItem("mangamorph:marked")||"[]").map(Number));
const $=selector=>document.querySelector(selector);

function showToast(message){const toast=$("#mangaToast");if(!toast)return;toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,2200)}

const favoriteButton=$("#favoriteDetail");
function renderFavorite(){if(!favoriteButton||!mangaId)return;const active=favorites.has(mangaId);favoriteButton.classList.toggle("active",active);favoriteButton.setAttribute("aria-pressed",String(active));favoriteButton.querySelector(".action-glyph")&&(favoriteButton.querySelector(".action-glyph").textContent=active?"★":"☆");const label=favoriteButton.querySelector("span:last-child");if(label)label.textContent=active?"Favoritado":"Favoritar"}
favoriteButton?.addEventListener("click",()=>{if(!mangaId)return;if(favorites.has(mangaId))favorites.delete(mangaId);else favorites.add(mangaId);localStorage.setItem("mangamorph:favorites",JSON.stringify([...favorites]));window.dispatchEvent(new CustomEvent("mangamorph:library-change",{detail:{mangaId,favorite:favorites.has(mangaId)}}));renderFavorite()});
renderFavorite();

const markButton=$("#markDetail");
function renderMarked(){if(!markButton||!mangaId)return;const active=marked.has(mangaId);markButton.classList.toggle("active",active);markButton.setAttribute("aria-pressed",String(active));markButton.querySelector(".action-glyph")&&(markButton.querySelector(".action-glyph").textContent=active?"✓":"＋");const label=markButton.querySelector("span:last-child");if(label)label.textContent=active?"Na minha lista":"Minha lista"}
markButton?.addEventListener("click",()=>{if(!mangaId)return;if(marked.has(mangaId))marked.delete(mangaId);else marked.add(mangaId);localStorage.setItem("mangamorph:marked",JSON.stringify([...marked]));window.dispatchEvent(new CustomEvent("mangamorph:library-change",{detail:{mangaId,inList:marked.has(mangaId)}}));renderMarked()});
renderMarked();

$("#shareDetail")?.addEventListener("click",async()=>{const title=$("#mangaTitle")?.textContent?.trim()||"MangaMorph";const data={title:"MangaMorph — "+title,text:title,url:location.href};if(navigator.share){try{await navigator.share(data)}catch{}}else if(navigator.clipboard){try{await navigator.clipboard.writeText(location.href);showToast("Link copiado.")}catch{}}});

const statusButton=$("#statusButton"),statusMenu=$("#statusMenu"),statusLabel=$("#statusLabel");
const statusKey=mangaId?"mangamorph:status:"+mangaId:"";
const STATUS_CONFIG={"Quero ler":"#64B5FF","Lendo":"#34D17B","Concluído":"#4FD1C5","Pausado":"#F5C451","Abandonado":"#FF6B6B","Relendo":"#B388FF","Aguardando capítulos":"#7DD3FC","Favorito":"#FFD166"};
function closeStatus(){if(statusMenu)statusMenu.hidden=true;statusButton?.setAttribute("aria-expanded","false")}
function renderStatus(value){if(!statusButton||!statusMenu||!statusLabel)return;statusLabel.textContent=value||"Escolher";statusButton.classList.toggle("has-status",!!value);statusButton.style.setProperty("--status-color",STATUS_CONFIG[value]||"#66758b");statusMenu.querySelectorAll("[data-status]").forEach(option=>{const active=option.dataset.status===value;option.classList.toggle("active",active);option.setAttribute("aria-checked",String(active));option.style.setProperty("--status-color",STATUS_CONFIG[option.dataset.status]||"#66758b")})}
function positionStatus(){if(!statusButton||!statusMenu)return;const rect=statusButton.getBoundingClientRect(),width=Math.min(Math.max(rect.width,230),320);statusMenu.style.width=width+"px";statusMenu.style.left=Math.max(10,Math.min(innerWidth-width-10,rect.right-width))+"px";const h=statusMenu.offsetHeight,below=rect.bottom+8,above=rect.top-h-8;statusMenu.style.top=(below+h<=innerHeight-10?below:Math.max(10,above))+"px"}
renderStatus(statusKey?localStorage.getItem(statusKey):null);
statusButton?.addEventListener("click",event=>{event.stopPropagation();if(!statusMenu)return;const open=statusMenu.hidden;statusMenu.hidden=!open;statusButton.setAttribute("aria-expanded",String(open));if(open)requestAnimationFrame(positionStatus)});
statusMenu?.addEventListener("click",event=>{event.stopPropagation();const option=event.target.closest("[data-status]");if(!option||!statusKey)return;const value=option.dataset.status;localStorage.setItem(statusKey,value);window.dispatchEvent(new CustomEvent("mangamorph:library-change",{detail:{mangaId,readingStatus:value}}));renderStatus(value);closeStatus();showToast("Status alterado para "+value+".")});
document.addEventListener("click",event=>{if(!event.target.closest(".status-picker")&&!event.target.closest("#statusMenu"))closeStatus()});
window.addEventListener("resize",()=>{if(statusMenu&&!statusMenu.hidden)positionStatus()},{passive:true});
window.addEventListener("scroll",()=>{if(statusMenu&&!statusMenu.hidden)closeStatus()},{passive:true});

const toggleDescription=$("#toggleDescription"),description=$("#mangaDescription");
toggleDescription?.addEventListener("click",()=>{const expanded=toggleDescription.getAttribute("aria-expanded")==="true";description?.classList.toggle("collapsed",expanded);toggleDescription.textContent=expanded?"Ver descrição completa ↓":"Recolher descrição ↑";toggleDescription.setAttribute("aria-expanded",expanded?"false":"true")});

const chapterList=$("#chapterList"),sortToggle=$("#sortToggle"),chapterSearch=$("#chapterSearch");
let chapterOrder="desc",chapterQuery="";
function chapterNumber(row){const n=Number(row.querySelector("[data-read-chapter]")?.dataset.readChapter);return Number.isFinite(n)?n:0}
function applyChapterView(){if(!chapterList)return;const rows=[...chapterList.querySelectorAll(".chapter-row")];const q=chapterQuery.trim().replace(/[^0-9.]/g,"");rows.sort((a,b)=>chapterOrder==="desc"?chapterNumber(b)-chapterNumber(a):chapterNumber(a)-chapterNumber(b));rows.forEach(row=>{row.hidden=!!q&&!String(chapterNumber(row)).includes(q);chapterList.append(row)});if(sortToggle){const descending=chapterOrder==="desc";sortToggle.innerHTML='<span class="sort-label">Ordem</span><span class="sort-value">'+(descending?'Decrescente':'Crescente')+'</span><span class="sort-arrow">'+(descending?'↓':'↑')+'</span>';sortToggle.setAttribute("aria-pressed",String(descending))}}
sortToggle?.addEventListener("click",()=>{chapterOrder=chapterOrder==="desc"?"asc":"desc";applyChapterView()});
chapterSearch?.addEventListener("input",event=>{chapterQuery=event.target.value;applyChapterView()});
chapterList?.addEventListener("click",event=>{const button=event.target.closest("[data-read-chapter]");if(button&&mangaId)location.href="reader.html?id="+mangaId+"&chapter="+button.dataset.readChapter});
if(chapterList)new MutationObserver(()=>requestAnimationFrame(applyChapterView)).observe(chapterList,{childList:true});

$("#relatedGrid")?.addEventListener("click",event=>{const card=event.target.closest("[data-related]");if(card)location.href="manga.html?id="+Number(card.dataset.related)});
$("#relatedGrid")?.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-related]")){event.preventDefault();location.href="manga.html?id="+Number(event.target.dataset.related)}});

const tabs=[...document.querySelectorAll(".manga-tab")];
const panels={chapters:$("#panelChapters"),related:$("#panelRelated")};
function setTab(name){tabs.forEach(tab=>{const active=tab.dataset.tab===name;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active))});Object.entries(panels).forEach(([key,panel])=>{if(!panel)return;const active=key===name;panel.hidden=!active;panel.classList.toggle("active",active)})}
tabs.forEach(tab=>tab.addEventListener("click",()=>setTab(tab.dataset.tab)));

window.addEventListener("mangamorph:library-loaded",event=>{const row=(event.detail?.library||[]).find(item=>Number(item.manga_id)===mangaId);if(!row)return;row.favorite?favorites.add(mangaId):favorites.delete(mangaId);row.in_list?marked.add(mangaId):marked.delete(mangaId);renderFavorite();renderMarked();if(row.reading_status)renderStatus(row.reading_status)});

if(mangaId){const history=JSON.parse(localStorage.getItem("mangamorph:history")||"[]").map(Number).filter(id=>id!==mangaId);localStorage.setItem("mangamorph:history",JSON.stringify([mangaId,...history].slice(0,20)));window.dispatchEvent(new CustomEvent("mangamorph:history-open",{detail:{mangaId}}))}
applyChapterView();
