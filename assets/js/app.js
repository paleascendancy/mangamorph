const catalog = [
  {id:1,title:"Neon Ronin",genre:"Ação",chapter:127,accent:"#3a4162",popularity:99,favorites:48210,newness:72},
  {id:2,title:"Astral Bloom",genre:"Fantasia",chapter:91,accent:"#523b64",popularity:96,favorites:51740,newness:60},
  {id:3,title:"Zero District",genre:"Mistério",chapter:68,accent:"#294b52",popularity:94,favorites:39420,newness:48},
  {id:4,title:"Crimson Archive",genre:"Ação",chapter:143,accent:"#64363c",popularity:91,favorites:45880,newness:44},
  {id:5,title:"Moon Relay",genre:"Fantasia",chapter:82,accent:"#354561",popularity:88,favorites:42110,newness:38},
  {id:6,title:"Silent Frame",genre:"Mistério",chapter:74,accent:"#494b55",popularity:86,favorites:36520,newness:34},
  {id:7,title:"Vector Hearts",genre:"Ação",chapter:112,accent:"#593c4f",popularity:84,favorites:33190,newness:31},
  {id:8,title:"Glass Kingdom",genre:"Fantasia",chapter:105,accent:"#36545e",popularity:82,favorites:40570,newness:29},
  {id:9,title:"Night Protocol",genre:"Suspense",chapter:57,accent:"#31384a",popularity:80,favorites:29410,newness:26},
  {id:10,title:"Afterlight",genre:"Drama",chapter:49,accent:"#5a4650",popularity:78,favorites:31860,newness:22},
  {id:11,title:"Morrow Gate",genre:"Fantasia",chapter:36,accent:"#3e4e66",popularity:76,favorites:27350,newness:95},
  {id:12,title:"Black Signal",genre:"Ação",chapter:28,accent:"#52383d",popularity:74,favorites:24590,newness:92},
  {id:13,title:"Lucid Crown",genre:"Mistério",chapter:19,accent:"#3a5661",popularity:72,favorites:22740,newness:89},
  {id:14,title:"Echo Garden",genre:"Drama",chapter:16,accent:"#50455f",popularity:70,favorites:21580,newness:87},
  {id:15,title:"Iron Chapel",genre:"Ação",chapter:11,accent:"#4c4b50",popularity:68,favorites:19860,newness:84}
];

const state = {
  currentPage: 1,
  pageSize: 30,
  totalPages: 5,
  favorites: new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]"))
};

const popularRail = document.querySelector("#popularRail");
const favoriteRail = document.querySelector("#favoriteRail");
const newRail = document.querySelector("#newRail");
const releaseList = document.querySelector("#releaseList");
const pagination = document.querySelector("#pagination");
const pageIndicator = document.querySelector("#pageIndicator");
const prevPage = document.querySelector("#prevPage");
const nextPage = document.querySelector("#nextPage");
const searchPanel = document.querySelector("#searchPanel");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const featuredDetails = document.querySelector("#featuredDetails");
const featuredExtra = document.querySelector("#featuredExtra");

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {notation:"compact", maximumFractionDigits:1}).format(value);
}

function cardTemplate(item, rank) {
  const active = state.favorites.has(item.id);
  return '<article class="manga-card">' +
    '<div class="manga-cover" style="--accent:' + item.accent + '">' +
      '<span class="manga-rank">#' + String(rank).padStart(2,"0") + '</span>' +
      '<span class="manga-cover-title">' + item.title + '</span>' +
    '</div>' +
    '<div class="manga-info">' +
      '<h3>' + item.title + '</h3>' +
      '<div class="manga-meta"><span>' + item.genre + '</span><span>Cap. ' + item.chapter + '</span></div>' +
      '<div class="manga-stats"><span>★ ' + formatNumber(item.favorites) + '</span><span>↗ ' + item.popularity + '%</span>' +
      '<button class="favorite-button ' + (active ? 'active' : '') + '" data-favorite="' + item.id + '" aria-label="' + (active ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + (active ? '★' : '☆') + '</button></div>' +
    '</div>' +
  '</article>';
}

function renderRail(element, items) {
  element.innerHTML = items.map(function(item,index){ return cardTemplate(item,index+1); }).join("");
}

function renderCatalogs() {
  renderRail(popularRail, [...catalog].sort(function(a,b){return b.popularity-a.popularity;}).slice(0,10));
  renderRail(favoriteRail, [...catalog].sort(function(a,b){return b.favorites-a.favorites;}).slice(0,10));
  renderRail(newRail, [...catalog].sort(function(a,b){return b.newness-a.newness;}).slice(0,10));
}

const releases = Array.from({length:150}, function(_,index) {
  const item = catalog[index % catalog.length];
  const cycle = Math.floor(index / catalog.length);
  const chapter = Math.max(1, item.chapter - cycle);
  let updated;
  if (index < 3) updated = ["agora","4 min","11 min"][index];
  else if (index < 12) updated = (index * 7) + " min";
  else if (index < 30) updated = Math.max(1,Math.floor(index/3)) + " h";
  else updated = Math.max(1,Math.floor(index/24)) + " dias";
  return {id:index+1,manga:item,chapter:chapter,updated:updated};
});

function releaseTemplate(release) {
  return '<article class="release-row">' +
    '<div class="release-thumb" style="--accent:' + release.manga.accent + '"></div>' +
    '<div class="release-copy"><strong>' + release.manga.title + '</strong><span>' + release.manga.genre + '</span></div>' +
    '<span class="release-chapter">Cap. ' + release.chapter + '</span>' +
    '<span class="release-time">' + release.updated + '</span>' +
  '</article>';
}

function renderReleases() {
  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = releases.slice(start, start + state.pageSize);
  releaseList.innerHTML = pageItems.map(releaseTemplate).join("");
  pageIndicator.textContent = "Página " + state.currentPage + " de " + state.totalPages;
  prevPage.disabled = state.currentPage === 1;
  nextPage.disabled = state.currentPage === state.totalPages;
  pagination.innerHTML = Array.from({length:state.totalPages}, function(_,index) {
    const page = index + 1;
    return '<button class="' + (page === state.currentPage ? 'active' : '') + '" data-page="' + page + '" aria-label="Ir para página ' + page + '"' + (page === state.currentPage ? ' aria-current="page"' : '') + '>' + page + '</button>';
  }).join("");
}

function goToPage(page) {
  if (page < 1 || page > state.totalPages) return;
  state.currentPage = page;
  renderReleases();
  document.querySelector("#recentes").scrollIntoView({behavior:"smooth", block:"start"});
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  localStorage.setItem("mangamorph:favorites", JSON.stringify(Array.from(state.favorites)));
  renderCatalogs();
}

function openSearch() {
  searchPanel.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(function(){searchInput.focus();},0);
  renderSearch("");
}

function closeSearch() {
  searchPanel.hidden = true;
  document.body.style.overflow = "";
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  const matches = normalized ? catalog.filter(function(item){
    return (item.title + " " + item.genre).toLowerCase().includes(normalized);
  }) : catalog.slice(0,7);
  searchResults.innerHTML = matches.length ? matches.map(function(item){
    return '<div class="search-result"><strong>' + item.title + '</strong><small>' + item.genre + ' · Capítulo ' + item.chapter + '</small></div>';
  }).join("") : '<div class="search-result">Nenhum resultado encontrado.</div>';
}

document.addEventListener("click", function(event) {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) toggleFavorite(Number(favorite.dataset.favorite));

  const pageButton = event.target.closest("[data-page]");
  if (pageButton) goToPage(Number(pageButton.dataset.page));

  if (event.target.matches("[data-close-search]")) closeSearch();
});

if (featuredDetails && featuredExtra) {
  featuredDetails.addEventListener("click", function() {
    featuredExtra.hidden = !featuredExtra.hidden;
    featuredDetails.textContent = featuredExtra.hidden ? "Mais detalhes" : "Menos detalhes";
  });
}

prevPage.addEventListener("click", function(){ goToPage(state.currentPage - 1); });
nextPage.addEventListener("click", function(){ goToPage(state.currentPage + 1); });
document.querySelector("#searchToggle").addEventListener("click", openSearch);
document.querySelector("#searchClose").addEventListener("click", closeSearch);
searchInput.addEventListener("input", function(event){ renderSearch(event.target.value); });

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && !searchPanel.hidden) closeSearch();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
});

const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("mangamorph:theme");
if (savedTheme === "light") document.body.classList.add("light");
themeToggle.addEventListener("click", function() {
  document.body.classList.toggle("light");
  localStorage.setItem("mangamorph:theme", document.body.classList.contains("light") ? "light" : "dark");
});

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) {
  openSearch();
  searchInput.value = initialQuery;
  renderSearch(initialQuery);
}

renderCatalogs();
renderReleases();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){});
  });
}