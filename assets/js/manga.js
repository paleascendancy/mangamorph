const catalog = [
  {id:1,title:"Neon Ronin",type:"Mangá",genre:"Ação",chapter:127,accent:"#3a4162",reads:986400,favorites:48210,rating:9.2,tags:["Ação","Ficção científica","Samurai"],description:"Em uma metrópole dividida entre tecnologia e antigas tradições, um jovem espadachim descobre uma rede capaz de alterar memórias e precisa decidir em quem confiar."},
  {id:2,title:"Astral Bloom",type:"Manhwa",genre:"Fantasia",chapter:91,accent:"#523b64",reads:941300,favorites:51740,rating:9.0,tags:["Fantasia","Aventura","Drama"],description:"Uma exploradora encontra uma flor capaz de abrir passagens para regiões esquecidas do céu e passa a ser perseguida por quem deseja controlar esse poder."},
  {id:3,title:"Zero District",type:"Manhua",genre:"Mistério",chapter:68,accent:"#294b52",reads:889700,favorites:39420,rating:8.8,tags:["Mistério","Suspense","Tecnologia"],description:"No único distrito sem registros digitais da cidade, desaparecimentos começam a revelar uma história que deveria ter sido apagada."},
  {id:4,title:"Crimson Archive",type:"Mangá",genre:"Ação",chapter:143,accent:"#64363c",reads:842100,favorites:45880,rating:9.1,tags:["Ação","Sobrenatural","Mistério"],description:"Um arquivo proibido registra eventos antes de acontecerem. Agora, seus guardiões precisam impedir que as previsões sejam usadas como armas."},
  {id:5,title:"Moon Relay",type:"Manhwa",genre:"Fantasia",chapter:82,accent:"#354561",reads:796800,favorites:42110,rating:8.9,tags:["Fantasia","Drama","Romance"],description:"Mensagens enviadas durante luas cheias conectam duas épocas diferentes e mudam pouco a pouco o destino de seus remetentes."},
  {id:6,title:"Silent Frame",type:"Manhua",genre:"Mistério",chapter:74,accent:"#494b55",reads:741900,favorites:36520,rating:8.7,tags:["Mistério","Drama","Suspense"],description:"Um fotógrafo percebe que algumas pessoas desaparecem das imagens antes de desaparecerem da vida real."},
  {id:7,title:"Vector Hearts",type:"Mangá",genre:"Ação",chapter:112,accent:"#593c4f",reads:698500,favorites:33190,rating:8.6,tags:["Ação","Romance","Mecha"],description:"Pilotos conectados a máquinas de combate descobrem que suas emoções alteram literalmente a direção das batalhas."},
  {id:8,title:"Glass Kingdom",type:"Manhwa",genre:"Fantasia",chapter:105,accent:"#36545e",reads:655200,favorites:40570,rating:8.9,tags:["Fantasia","Aventura","Drama"],description:"Em um reino construído sobre vidro vivo, cada rachadura revela memórias que seus governantes tentaram esconder."},
  {id:9,title:"Night Protocol",type:"Manhua",genre:"Suspense",chapter:57,accent:"#31384a",reads:612700,favorites:29410,rating:8.5,tags:["Suspense","Tecnologia","Mistério"],description:"Toda meia-noite uma cidade recebe novas regras anônimas. Ignorá-las parece impossível, mas obedecê-las é ainda pior."},
  {id:10,title:"Afterlight",type:"Mangá",genre:"Drama",chapter:49,accent:"#5a4650",reads:571300,favorites:31860,rating:8.8,tags:["Drama","Sobrenatural","Mistério"],description:"Após um fenômeno de luz cobrir o litoral, moradores começam a reencontrar lembranças que nunca viveram."},
  {id:11,title:"Morrow Gate",type:"Manhwa",genre:"Fantasia",chapter:36,accent:"#3e4e66",reads:529800,favorites:27350,rating:8.4,tags:["Fantasia","Aventura","Drama"],description:"Um portão aparece apenas para quem está prestes a tomar a decisão mais importante da própria vida."},
  {id:12,title:"Black Signal",type:"Manhua",genre:"Ação",chapter:28,accent:"#52383d",reads:487600,favorites:24590,rating:8.3,tags:["Ação","Suspense","Tecnologia"],description:"Uma transmissão clandestina revela crimes minutos antes de acontecerem, atraindo investigadores e criminosos para a mesma frequência."},
  {id:13,title:"Lucid Crown",type:"Mangá",genre:"Mistério",chapter:19,accent:"#3a5661",reads:446200,favorites:22740,rating:8.6,tags:["Mistério","Fantasia","Drama"],description:"Uma coroa encontrada em sonhos permite alterar pequenos detalhes da realidade, mas cada mudança cobra uma lembrança em troca."},
  {id:14,title:"Echo Garden",type:"Manhwa",genre:"Drama",chapter:16,accent:"#50455f",reads:404900,favorites:21580,rating:8.5,tags:["Drama","Fantasia","Família"],description:"Um jardim guarda ecos de conversas antigas e aproxima uma família das verdades que evitou por anos."},
  {id:15,title:"Iron Chapel",type:"Manhua",genre:"Ação",chapter:11,accent:"#4c4b50",reads:365400,favorites:19860,rating:8.2,tags:["Ação","Fantasia","Aventura"],description:"Uma ordem de guerreiros protege uma capela mecânica capaz de despertar armas de uma era perdida."}
];

const params = new URLSearchParams(location.search);
const id = Number(params.get("id")) || 1;
const manga = catalog.find(function(item){ return item.id === id; }) || catalog[0];

const favorites = new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]"));
const marked = new Set(JSON.parse(localStorage.getItem("mangamorph:marked") || "[]"));

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(value);
}

function originInfo(type) {
  if (type === "Mangá") return {flag:"🇯🇵",country:"Japão"};
  if (type === "Manhwa") return {flag:"🇰🇷",country:"Coreia"};
  return {flag:"🇨🇳",country:"China"};
}

function coverLines(title) {
  const words = title.toUpperCase().split(" ");
  if (words.length === 1) return words[0];
  const mid = Math.ceil(words.length / 2);
  return words.slice(0,mid).join(" ") + "<br>" + words.slice(mid).join(" ");
}

function showToast(message) {
  const toast = document.querySelector("#mangaToast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function(){ toast.hidden = true; }, 2400);
}

const origin = originInfo(manga.type);
document.title = "MangaMorph — " + manga.title;
document.querySelector("#mangaTitle").textContent = manga.title;
document.querySelector("#mangaAltTitle").textContent = manga.genre + " · " + manga.tags.join(" · ");
document.querySelector("#coverTitle").innerHTML = coverLines(manga.title);
document.querySelector("#coverType").textContent = manga.type.toUpperCase();
document.querySelector("#detailCover").style.setProperty("--detail-accent", manga.accent);
document.querySelector("#mangaOriginBadge").textContent = origin.flag + " " + manga.type + " · " + origin.country;
document.querySelector("#mangaTypeFact").textContent = manga.type + " · " + origin.country;
document.querySelector("#mangaRating").textContent = "★ " + manga.rating.toFixed(1).replace(".",",");
document.querySelector("#mangaReads").textContent = "◉ " + formatNumber(manga.reads);
document.querySelector("#mangaFavorites").textContent = "☆ " + formatNumber(manga.favorites);
document.querySelector("#mangaDescription").textContent = manga.description;
document.querySelector("#mangaTags").innerHTML = manga.tags.map(function(tag){ return "<span>" + tag + "</span>"; }).join("");
document.querySelector("#latestChapter").textContent = manga.chapter;
document.querySelector("#readLatestLabel").textContent = "Ler capítulo " + manga.chapter;

const history = JSON.parse(localStorage.getItem("mangamorph:history") || "[]").filter(function(historyId){ return historyId !== manga.id; });
localStorage.setItem("mangamorph:history", JSON.stringify([manga.id].concat(history).slice(0,20)));

const favoriteButton = document.querySelector("#favoriteDetail");
function renderFavorite() {
  const active = favorites.has(manga.id);
  favoriteButton.classList.toggle("active", active);
  favoriteButton.setAttribute("aria-pressed", active ? "true" : "false");
  favoriteButton.querySelector(".action-glyph").textContent = active ? "★" : "☆";
  favoriteButton.querySelector("span:last-child").textContent = active ? "Favoritado" : "Favoritar";
}
favoriteButton.addEventListener("click", function() {
  if (favorites.has(manga.id)) favorites.delete(manga.id);
  else favorites.add(manga.id);
  localStorage.setItem("mangamorph:favorites", JSON.stringify(Array.from(favorites)));
  renderFavorite();
});
renderFavorite();

const markButton = document.querySelector("#markDetail");
function renderMarked() {
  const active = marked.has(manga.id);
  markButton.classList.toggle("active", active);
  markButton.setAttribute("aria-pressed", active ? "true" : "false");
  markButton.querySelector(".action-glyph").textContent = active ? "✓" : "＋";
  markButton.querySelector("span:last-child").textContent = active ? "Na minha lista" : "Minha lista";
}
markButton.addEventListener("click", function() {
  if (marked.has(manga.id)) marked.delete(manga.id);
  else marked.add(manga.id);
  localStorage.setItem("mangamorph:marked", JSON.stringify(Array.from(marked)));
  renderMarked();
});
renderMarked();

document.querySelector("#shareDetail").addEventListener("click", async function() {
  const shareData = {title:"MangaMorph — " + manga.title,text:manga.title,url:location.href};
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (_) {}
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("Link copiado.");
    } catch (_) {}
  }
});

const statusButton = document.querySelector("#statusButton");
const statusMenu = document.querySelector("#statusMenu");
const statusLabel = document.querySelector("#statusLabel");
const statusKey = "mangamorph:status:" + manga.id;

const STATUS_CONFIG = {
  "Quero ler": {color:"#64B5FF"},
  "Lendo": {color:"#34D17B"},
  "Concluído": {color:"#4FD1C5"},
  "Pausado": {color:"#F5C451"},
  "Abandonado": {color:"#FF6B6B"},
  "Relendo": {color:"#B388FF"},
  "Aguardando capítulos": {color:"#7DD3FC"},
  "Favorito": {color:"#FFD166"}
};

function positionStatusMenu() {
  const rect = statusButton.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, 230), 320);
  statusMenu.style.width = width + "px";
  statusMenu.style.left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width)) + "px";

  const menuHeight = statusMenu.offsetHeight;
  const below = rect.bottom + 8;
  const above = rect.top - menuHeight - 8;
  statusMenu.style.top = (below + menuHeight <= window.innerHeight - 10 ? below : Math.max(10, above)) + "px";
}

function applyStatusColor(value) {
  const config = STATUS_CONFIG[value];
  statusButton.style.setProperty("--status-color", config ? config.color : "#66758b");

  statusMenu.querySelectorAll("[data-status]").forEach(function(option) {
    const optionConfig = STATUS_CONFIG[option.dataset.status];
    option.style.setProperty("--status-color", optionConfig ? optionConfig.color : "#66758b");
  });
}

function renderStatus(value) {
  statusLabel.textContent = value || "Escolher";
  statusButton.classList.toggle("has-status", Boolean(value));

  statusMenu.querySelectorAll("[data-status]").forEach(function(option) {
    const active = option.dataset.status === value;
    option.classList.toggle("active", active);
    option.setAttribute("aria-checked", active ? "true" : "false");
  });

  applyStatusColor(value);
}

function closeStatusMenu() {
  statusMenu.hidden = true;
  statusButton.setAttribute("aria-expanded","false");
}

const savedStatus = localStorage.getItem(statusKey);
renderStatus(savedStatus);

statusButton.addEventListener("click", function(event) {
  event.stopPropagation();
  const willOpen = statusMenu.hidden;

  if (willOpen) {
    statusMenu.hidden = false;
    statusButton.setAttribute("aria-expanded","true");
    requestAnimationFrame(positionStatusMenu);
  } else {
    closeStatusMenu();
  }
});

statusMenu.addEventListener("click", function(event) {
  event.stopPropagation();
  const option = event.target.closest("[data-status]");
  if (!option) return;

  const value = option.dataset.status;
  localStorage.setItem(statusKey, value);
  renderStatus(value);
  closeStatusMenu();
  showToast("Status alterado para " + value + ".");
});

document.addEventListener("click", function(event) {
  if (!event.target.closest(".status-picker") && !event.target.closest("#statusMenu")) closeStatusMenu();
});

window.addEventListener("resize", function() {
  if (!statusMenu.hidden) positionStatusMenu();
});

window.addEventListener("scroll", function() {
  if (!statusMenu.hidden) closeStatusMenu();
}, {passive:true});

const toggleDescription = document.querySelector("#toggleDescription");
const description = document.querySelector("#mangaDescription");
toggleDescription.addEventListener("click", function() {
  const expanded = toggleDescription.getAttribute("aria-expanded") === "true";
  description.classList.toggle("collapsed", expanded);
  toggleDescription.textContent = expanded ? "Ver descrição completa ↓" : "Recolher descrição ↑";
  toggleDescription.setAttribute("aria-expanded", expanded ? "false" : "true");
});

const chapters = Array.from({length:Math.min(30,manga.chapter)}, function(_,i){ return manga.chapter-i; });
const chapterList = document.querySelector("#chapterList");
const chapterCount = document.querySelector("#chapterCount");
const tabChapterCount = document.querySelector("#tabChapterCount");
const sortToggle = document.querySelector("#sortToggle");
const chapterSearch = document.querySelector("#chapterSearch");
let chapterOrder = "desc";
let chapterQuery = "";

chapterCount.textContent = chapters.length + " capítulos recentes";
tabChapterCount.textContent = chapters.length;

const chapterBaseDate = new Date("2026-09-09T12:00:00");

function chapterDate(chapter) {
  const distanceFromLatest = manga.chapter - chapter;
  const date = new Date(chapterBaseDate);
  date.setDate(date.getDate() - distanceFromLatest);
  return new Intl.DateTimeFormat("pt-BR", {day:"2-digit", month:"short", year:"numeric"}).format(date).replace(".", "");
}

function chapterViews(chapter) {
  const distanceFromLatest = manga.chapter - chapter;
  const freshness = Math.max(.24, 1 - distanceFromLatest * .026);
  const base = Math.max(1200, Math.round((manga.reads / Math.max(manga.chapter, 18)) * freshness));
  return formatNumber(base) + " visualizações";
}

function renderChapters() {
  const normalized = chapterQuery.trim().replace(/[^0-9]/g,"");
  let ordered = chapterOrder === "desc" ? chapters.slice() : chapters.slice().reverse();
  if (normalized) ordered = ordered.filter(function(chapter){ return String(chapter).includes(normalized); });

  if (!ordered.length) {
    chapterList.innerHTML = '<div class="chapter-empty">Nenhum capítulo encontrado.</div>';
    return;
  }

  chapterList.innerHTML = ordered.map(function(chapter) {
    const latest = chapter === manga.chapter;
    return '<article class="chapter-row ' + (latest ? 'latest' : '') + '" id="capitulo-' + chapter + '">' +
      '<div class="chapter-copy">' +
        '<div class="chapter-number"><strong>Capítulo ' + chapter + '</strong>' +
          '<span class="chapter-meta-line"><span>◷ ' + chapterDate(chapter) + '</span><span>◉ ' + chapterViews(chapter) + '</span></span>' +
        '</div>' +
        (latest ? '<span class="chapter-badge">NOVO</span>' : '') +
      '</div>' +
      '<button class="chapter-read" type="button" data-read-chapter="' + chapter + '">Ler <span>›</span></button>' +
    '</article>';
  }).join("");
}

function renderSortButton() {
  const descending = chapterOrder === "desc";
  sortToggle.innerHTML = '<span class="sort-label">Ordem</span><span class="sort-value">' + (descending ? 'Decrescente' : 'Crescente') + '</span><span class="sort-arrow">' + (descending ? '↓' : '↑') + '</span>';
  sortToggle.setAttribute("aria-pressed", descending ? "true" : "false");
}

sortToggle.addEventListener("click", function() {
  chapterOrder = chapterOrder === "desc" ? "asc" : "desc";
  renderSortButton();
  renderChapters();
});

chapterSearch.addEventListener("input", function(event) {
  chapterQuery = event.target.value;
  renderChapters();
});

document.querySelector("#readLatest").addEventListener("click", function() {
  setTab("chapters");
  chapterQuery = String(manga.chapter);
  chapterSearch.value = chapterQuery;
  renderChapters();
  document.querySelector("#chapters").scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(function() {
    const row = document.querySelector("#capitulo-" + manga.chapter);
    if (row) row.scrollIntoView({behavior:"smooth",block:"center"});
  }, 220);
});

chapterList.addEventListener("click", function(event) {
  const readButton = event.target.closest("[data-read-chapter]");
  if (!readButton) return;
  showToast("Leitor do capítulo " + readButton.dataset.readChapter + " será conectado na próxima etapa.");
});

function openManga(targetId) {
  location.href = "manga.html?id=" + targetId;
}

const related = catalog
  .filter(function(item){ return item.id !== manga.id; })
  .sort(function(a,b) {
    const aScore = (a.genre === manga.genre ? 2 : 0) + a.tags.filter(function(tag){ return manga.tags.includes(tag); }).length;
    const bScore = (b.genre === manga.genre ? 2 : 0) + b.tags.filter(function(tag){ return manga.tags.includes(tag); }).length;
    return bScore - aScore || b.reads - a.reads;
  })
  .slice(0,8);

document.querySelector("#relatedGrid").innerHTML = related.map(function(item,index) {
  const info = originInfo(item.type);
  return '<article class="related-card" data-related="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
    '<div class="related-cover" style="--accent:' + item.accent + '"><span class="related-rank">#' + String(index+1).padStart(2,"0") + '</span></div>' +
    '<div class="related-info"><strong>' + item.title + '</strong><span>' + info.flag + ' ' + item.type + ' · ' + item.genre + '</span><small><span>Cap. ' + item.chapter + '</span><span>★ ' + item.rating.toFixed(1).replace(".",",") + '</span></small></div>' +
  '</article>';
}).join("");

document.querySelector("#relatedGrid").addEventListener("click", function(event) {
  const card = event.target.closest("[data-related]");
  if (card) openManga(Number(card.dataset.related));
});

document.querySelector("#relatedGrid").addEventListener("keydown", function(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-related]")) {
    event.preventDefault();
    openManga(Number(event.target.dataset.related));
  }
});

const tabs = Array.from(document.querySelectorAll(".manga-tab"));
const panels = {
  chapters: document.querySelector("#panelChapters"),
  related: document.querySelector("#panelRelated"),
  comments: document.querySelector("#panelComments")
};

function setTab(name) {
  tabs.forEach(function(tab) {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  Object.entries(panels).forEach(function(entry) {
    const key = entry[0];
    const panel = entry[1];
    const active = key === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

tabs.forEach(function(tab) {
  tab.addEventListener("click", function(){ setTab(tab.dataset.tab); });
});

renderSortButton();
renderChapters();

const savedTheme = localStorage.getItem("mangamorph:theme");
if (savedTheme === "light") document.body.classList.add("light");
document.querySelector("#themeToggle").addEventListener("click", function() {
  document.body.classList.toggle("light");
  localStorage.setItem("mangamorph:theme", document.body.classList.contains("light") ? "light" : "dark");
});