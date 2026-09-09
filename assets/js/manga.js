const catalog = [
  {id:1,title:"Neon Ronin",genre:"Ação",chapter:127,accent:"#3a4162",reads:986400,favorites:48210,rating:9.2,tags:["Manga","Ação","Ficção científica"],description:"Em uma metrópole dividida entre tecnologia e antigas tradições, um jovem espadachim descobre uma rede capaz de alterar memórias e precisa decidir em quem confiar."},
  {id:2,title:"Astral Bloom",genre:"Fantasia",chapter:91,accent:"#523b64",reads:941300,favorites:51740,rating:9.0,tags:["Manga","Fantasia","Aventura"],description:"Uma exploradora encontra uma flor capaz de abrir passagens para regiões esquecidas do céu e passa a ser perseguida por quem deseja controlar esse poder."},
  {id:3,title:"Zero District",genre:"Mistério",chapter:68,accent:"#294b52",reads:889700,favorites:39420,rating:8.8,tags:["Manga","Mistério","Suspense"],description:"No único distrito sem registros digitais da cidade, desaparecimentos começam a revelar uma história que deveria ter sido apagada."},
  {id:4,title:"Crimson Archive",genre:"Ação",chapter:143,accent:"#64363c",reads:842100,favorites:45880,rating:9.1,tags:["Manga","Ação","Sobrenatural"],description:"Um arquivo proibido registra eventos antes de acontecerem. Agora, seus guardiões precisam impedir que as previsões sejam usadas como armas."},
  {id:5,title:"Moon Relay",genre:"Fantasia",chapter:82,accent:"#354561",reads:796800,favorites:42110,rating:8.9,tags:["Manga","Fantasia","Drama"],description:"Mensagens enviadas durante luas cheias conectam duas épocas diferentes e mudam pouco a pouco o destino de seus remetentes."},
  {id:6,title:"Silent Frame",genre:"Mistério",chapter:74,accent:"#494b55",reads:741900,favorites:36520,rating:8.7,tags:["Manga","Mistério","Drama"],description:"Um fotógrafo percebe que algumas pessoas desaparecem das imagens antes de desaparecerem da vida real."},
  {id:7,title:"Vector Hearts",genre:"Ação",chapter:112,accent:"#593c4f",reads:698500,favorites:33190,rating:8.6,tags:["Manga","Ação","Romance"],description:"Pilotos conectados a máquinas de combate descobrem que suas emoções alteram literalmente a direção das batalhas."},
  {id:8,title:"Glass Kingdom",genre:"Fantasia",chapter:105,accent:"#36545e",reads:655200,favorites:40570,rating:8.9,tags:["Manga","Fantasia","Aventura"],description:"Em um reino construído sobre vidro vivo, cada rachadura revela memórias que seus governantes tentaram esconder."},
  {id:9,title:"Night Protocol",genre:"Suspense",chapter:57,accent:"#31384a",reads:612700,favorites:29410,rating:8.5,tags:["Manga","Suspense","Tecnologia"],description:"Toda meia-noite uma cidade recebe novas regras anônimas. Ignorá-las parece impossível, mas obedecê-las é ainda pior."},
  {id:10,title:"Afterlight",genre:"Drama",chapter:49,accent:"#5a4650",reads:571300,favorites:31860,rating:8.8,tags:["Manga","Drama","Sobrenatural"],description:"Após um fenômeno de luz cobrir o litoral, moradores começam a reencontrar lembranças que nunca viveram."},
  {id:11,title:"Morrow Gate",genre:"Fantasia",chapter:36,accent:"#3e4e66",reads:529800,favorites:27350,rating:8.4,tags:["Manga","Fantasia","Aventura"],description:"Um portão aparece apenas para quem está prestes a tomar a decisão mais importante da própria vida."},
  {id:12,title:"Black Signal",genre:"Ação",chapter:28,accent:"#52383d",reads:487600,favorites:24590,rating:8.3,tags:["Manga","Ação","Suspense"],description:"Uma transmissão clandestina revela crimes minutos antes de acontecerem, atraindo investigadores e criminosos para a mesma frequência."},
  {id:13,title:"Lucid Crown",genre:"Mistério",chapter:19,accent:"#3a5661",reads:446200,favorites:22740,rating:8.6,tags:["Manga","Mistério","Fantasia"],description:"Uma coroa encontrada em sonhos permite alterar pequenos detalhes da realidade, mas cada mudança cobra uma lembrança em troca."},
  {id:14,title:"Echo Garden",genre:"Drama",chapter:16,accent:"#50455f",reads:404900,favorites:21580,rating:8.5,tags:["Manga","Drama","Fantasia"],description:"Um jardim guarda ecos de conversas antigas e aproxima uma família das verdades que evitou por anos."},
  {id:15,title:"Iron Chapel",genre:"Ação",chapter:11,accent:"#4c4b50",reads:365400,favorites:19860,rating:8.2,tags:["Manga","Ação","Fantasia"],description:"Uma ordem de guerreiros protege uma capela mecânica capaz de despertar armas de uma era perdida."}
];

const params = new URLSearchParams(location.search);
const id = Number(params.get("id")) || 1;
const manga = catalog.find(item => item.id === id) || catalog[0];

const favorites = new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]"));
const marked = new Set(JSON.parse(localStorage.getItem("mangamorph:marked") || "[]"));

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(value);
}

function coverLines(title) {
  const words = title.toUpperCase().split(" ");
  if (words.length === 1) return words[0];
  const mid = Math.ceil(words.length / 2);
  return words.slice(0,mid).join(" ") + "<br>" + words.slice(mid).join(" ");
}

document.title = "MangaMorph — " + manga.title;
document.querySelector("#mangaTitle").textContent = manga.title;
document.querySelector("#mangaAltTitle").textContent = manga.genre + " · " + manga.tags.slice(1).join(" · ");
document.querySelector("#coverTitle").innerHTML = coverLines(manga.title);
document.querySelector("#detailCover").style.setProperty("--detail-accent", manga.accent);
document.querySelector("#mangaRating").textContent = "★ " + manga.rating.toFixed(1).replace(".",",");
document.querySelector("#mangaReads").textContent = "◉ " + formatNumber(manga.reads);
document.querySelector("#mangaFavorites").textContent = "☆ " + formatNumber(manga.favorites);
document.querySelector("#mangaComments").textContent = "💬 0";
document.querySelector("#mangaDescription").textContent = manga.description;
document.querySelector("#mangaTags").innerHTML = manga.tags.map(tag => "<span>" + tag + "</span>").join("");
document.querySelector("#latestChapter").textContent = manga.chapter;
document.querySelector("#mangaPublication").textContent = "PUBLICAÇÃO: 2026, EM LANÇAMENTO";

const favoriteButton = document.querySelector("#favoriteDetail");
function renderFavorite() {
  const active = favorites.has(manga.id);
  favoriteButton.textContent = active ? "★" : "☆";
  favoriteButton.classList.toggle("active", active);
  favoriteButton.setAttribute("aria-pressed", active ? "true" : "false");
}
favoriteButton.addEventListener("click", () => {
  if (favorites.has(manga.id)) favorites.delete(manga.id);
  else favorites.add(manga.id);
  localStorage.setItem("mangamorph:favorites", JSON.stringify([...favorites]));
  renderFavorite();
});
renderFavorite();

const markButton = document.querySelector("#markDetail");
function renderMarked() {
  const active = marked.has(manga.id);
  markButton.classList.toggle("active", active);
  markButton.setAttribute("aria-pressed", active ? "true" : "false");
}
markButton.addEventListener("click", () => {
  if (marked.has(manga.id)) marked.delete(manga.id);
  else marked.add(manga.id);
  localStorage.setItem("mangamorph:marked", JSON.stringify([...marked]));
  renderMarked();
});
renderMarked();

document.querySelector("#shareDetail").addEventListener("click", async () => {
  const shareData = {title:"MangaMorph — " + manga.title,text:manga.title,url:location.href};
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (_) {}
  } else if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(location.href); } catch (_) {}
  }
});

const statusButton = document.querySelector("#statusButton");
const statusMenu = document.querySelector("#statusMenu");
const statusLabel = document.querySelector("#statusLabel");
const statusKey = "mangamorph:status:" + manga.id;
const savedStatus = localStorage.getItem(statusKey);
if (savedStatus) statusLabel.textContent = savedStatus;

statusButton.addEventListener("click", () => {
  const open = statusMenu.hidden;
  statusMenu.hidden = !open;
  statusButton.setAttribute("aria-expanded", open ? "true" : "false");
});
statusMenu.addEventListener("click", event => {
  const option = event.target.closest("[data-status]");
  if (!option) return;
  const value = option.dataset.status;
  localStorage.setItem(statusKey, value);
  statusLabel.textContent = value;
  statusMenu.hidden = true;
  statusButton.setAttribute("aria-expanded","false");
});
document.addEventListener("click", event => {
  if (!event.target.closest(".status-picker")) {
    statusMenu.hidden = true;
    statusButton.setAttribute("aria-expanded","false");
  }
});

const toggleDescription = document.querySelector("#toggleDescription");
const description = document.querySelector("#mangaDescription");
toggleDescription.addEventListener("click", () => {
  const expanded = toggleDescription.getAttribute("aria-expanded") === "true";
  description.classList.toggle("collapsed", expanded);
  toggleDescription.textContent = expanded ? "Ver mais ↓" : "Ver menos ↑";
  toggleDescription.setAttribute("aria-expanded", expanded ? "false" : "true");
});

const chapters = Array.from({length:Math.min(30,manga.chapter)},(_,i)=>manga.chapter-i);
const chapterList = document.querySelector("#chapterList");
const chapterCount = document.querySelector("#chapterCount");
const sortToggle = document.querySelector("#sortToggle");
let chapterOrder = "desc";

chapterCount.textContent = chapters.length + " capítulos";

function renderChapters() {
  const ordered = chapterOrder === "desc" ? [...chapters] : [...chapters].reverse();
  chapterList.innerHTML = ordered.map(chapter => {
    const distanceFromLatest = manga.chapter - chapter;
    const time = distanceFromLatest === 0
      ? "mais recente"
      : distanceFromLatest < 4
        ? (distanceFromLatest * 3) + " h atrás"
        : Math.ceil(distanceFromLatest / 3) + " dias atrás";
    return '<article class="chapter-row"><div><strong>Capítulo ' + chapter + '</strong><span>' + time + '</span></div><a class="chapter-read" href="#" aria-label="Ler capítulo ' + chapter + '">Ler</a></article>';
  }).join("");
}

function renderSortButton() {
  const descending = chapterOrder === "desc";
  sortToggle.textContent = descending ? "Decrescente ↓" : "Crescente ↑";
  sortToggle.setAttribute("aria-pressed", descending ? "true" : "false");
}

sortToggle.addEventListener("click", () => {
  chapterOrder = chapterOrder === "desc" ? "asc" : "desc";
  renderSortButton();
  renderChapters();
});

function openManga(targetId) {
  location.href = "manga.html?id=" + targetId;
}

const related = catalog
  .filter(item => item.id !== manga.id)
  .sort((a,b) => {
    const aScore = (a.genre === manga.genre ? 2 : 0) + a.tags.filter(tag => manga.tags.includes(tag)).length;
    const bScore = (b.genre === manga.genre ? 2 : 0) + b.tags.filter(tag => manga.tags.includes(tag)).length;
    return bScore - aScore || b.reads - a.reads;
  })
  .slice(0,6);

document.querySelector("#relatedGrid").innerHTML = related.map(item => (
  '<article class="related-card" data-related="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
    '<div class="related-cover" style="--accent:' + item.accent + '"></div>' +
    '<div class="related-info"><strong>' + item.title + '</strong><span>' + item.genre + ' · Cap. ' + item.chapter + '</span></div>' +
  '</article>'
)).join("");

document.querySelector("#relatedGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-related]");
  if (card) openManga(Number(card.dataset.related));
});

document.querySelector("#relatedGrid").addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-related]")) {
    event.preventDefault();
    openManga(Number(event.target.dataset.related));
  }
});

const tabs = [...document.querySelectorAll(".manga-tab")];
const panels = {
  chapters: document.querySelector("#panelChapters"),
  comments: document.querySelector("#panelComments"),
  related: document.querySelector("#panelRelated")
};

function setTab(name) {
  tabs.forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  Object.entries(panels).forEach(([key,panel]) => {
    const active = key === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

tabs.forEach(tab => tab.addEventListener("click", () => setTab(tab.dataset.tab)));

renderSortButton();
renderChapters();

const savedTheme = localStorage.getItem("mangamorph:theme");
if (savedTheme === "light") document.body.classList.add("light");
document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("mangamorph:theme", document.body.classList.contains("light") ? "light" : "dark");
});