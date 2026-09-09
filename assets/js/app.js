const catalog = [
  {id:1,title:"Neon Ronin",genre:"Ação",chapter:127,accent:"#3a4162",reads:986400,favorites:48210,newness:72},
  {id:2,title:"Astral Bloom",genre:"Fantasia",chapter:91,accent:"#523b64",reads:941300,favorites:51740,newness:60},
  {id:3,title:"Zero District",genre:"Mistério",chapter:68,accent:"#294b52",reads:889700,favorites:39420,newness:48},
  {id:4,title:"Crimson Archive",genre:"Ação",chapter:143,accent:"#64363c",reads:842100,favorites:45880,newness:44},
  {id:5,title:"Moon Relay",genre:"Fantasia",chapter:82,accent:"#354561",reads:796800,favorites:42110,newness:38},
  {id:6,title:"Silent Frame",genre:"Mistério",chapter:74,accent:"#494b55",reads:741900,favorites:36520,newness:34},
  {id:7,title:"Vector Hearts",genre:"Ação",chapter:112,accent:"#593c4f",reads:698500,favorites:33190,newness:31},
  {id:8,title:"Glass Kingdom",genre:"Fantasia",chapter:105,accent:"#36545e",reads:655200,favorites:40570,newness:29},
  {id:9,title:"Night Protocol",genre:"Suspense",chapter:57,accent:"#31384a",reads:612700,favorites:29410,newness:26},
  {id:10,title:"Afterlight",genre:"Drama",chapter:49,accent:"#5a4650",reads:571300,favorites:31860,newness:22},
  {id:11,title:"Morrow Gate",genre:"Fantasia",chapter:36,accent:"#3e4e66",reads:529800,favorites:27350,newness:95},
  {id:12,title:"Black Signal",genre:"Ação",chapter:28,accent:"#52383d",reads:487600,favorites:24590,newness:92},
  {id:13,title:"Lucid Crown",genre:"Mistério",chapter:19,accent:"#3a5661",reads:446200,favorites:22740,newness:89},
  {id:14,title:"Echo Garden",genre:"Drama",chapter:16,accent:"#50455f",reads:404900,favorites:21580,newness:87},
  {id:15,title:"Iron Chapel",genre:"Ação",chapter:11,accent:"#4c4b50",reads:365400,favorites:19860,newness:84}
];

const state = {
  currentPage: 1,
  pageSize: 30,
  totalPages: 5,
  favorites: new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]")),
  filter: localStorage.getItem("mangamorph:filter") || "Todos",
  notifications: localStorage.getItem("mangamorph:notifications") === "on",
  history: JSON.parse(localStorage.getItem("mangamorph:history") || "[]")
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
const searchCount = document.querySelector("#searchCount");
let searchGenre = "Todos";
let searchMode = "all";
const rankingPanel = document.querySelector("#rankingPanel");
const rankingTitle = document.querySelector("#rankingTitle");
const rankingList = document.querySelector("#rankingList");
const rankingClose = document.querySelector("#rankingClose");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsClose = document.querySelector("#settingsClose");
const settingsToggle = document.querySelector("#settingsToggle");
const themeValue = document.querySelector("#themeValue");
const languageValue = document.querySelector("#languageValue");
const filterValue = document.querySelector("#filterValue");
const notificationToggle = document.querySelector("#notificationToggle");
const notificationSwitch = document.querySelector("#notificationSwitch");
const sideMenu = document.querySelector("#sideMenu");
const menuToggle = document.querySelector("#menuToggle");
const sideMenuSettings = document.querySelector("#sideMenuSettings");
const accountPanel = document.querySelector("#accountPanel");
const accountToggle = document.querySelector("#accountToggle");
const accountClose = document.querySelector("#accountClose");
const accountThemeName = document.querySelector("#accountThemeName");
const accountThemeRow = document.querySelector("#accountThemeRow");
const accountFavorites = document.querySelector("#accountFavorites");
const accountHistory = document.querySelector("#accountHistory");
const accountFavoritesCount = document.querySelector("#accountFavoritesCount");
const accountHistoryCount = document.querySelector("#accountHistoryCount");
const accountLogin = document.querySelector("#accountLogin");
const accountRegister = document.querySelector("#accountRegister");
const accountAuthMessage = document.querySelector("#accountAuthMessage");

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {notation:"compact", maximumFractionDigits:1}).format(value);
}

function openManga(id) {
  const cleanHistory = state.history.filter(function(historyId){ return historyId !== id; });
  state.history = [id].concat(cleanHistory).slice(0,20);
  localStorage.setItem("mangamorph:history", JSON.stringify(state.history));
  location.href = "manga.html?id=" + id;
}

function getFilteredCatalog() {
  if (state.filter === "Todos") return catalog;
  return catalog.filter(function(item){ return item.genre === state.filter; });
}

function cardTemplate(item, rank) {
  const active = state.favorites.has(item.id);
  return '<article class="manga-card premium-manga-card" data-manga="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
    '<div class="manga-cover" style="--accent:' + item.accent + '">' +
      '<span class="manga-rank">#' + String(rank).padStart(2,"0") + '</span>' +
      '<div class="manga-cover-copy"><span class="manga-cover-title">' + item.title + '</span><small>' + item.genre + '</small></div>' +
    '</div>' +
    '<div class="manga-info">' +
      '<div class="manga-meta"><span>' + item.genre + '</span><span>Cap. ' + item.chapter + '</span></div>' +
      '<div class="manga-stats">' +
        '<span class="manga-stat"><b>◉</b> ' + formatNumber(item.reads) + '</span>' +
        '<span class="manga-stat"><b>★</b> ' + formatNumber(item.favorites) + '</span>' +
        '<button class="favorite-button ' + (active ? 'active' : '') + '" data-favorite="' + item.id + '" aria-label="' + (active ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + (active ? '★' : '☆') + '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function seeMoreTemplate(type, label) {
  return '<button class="see-more-card" type="button" data-ranking="' + type + '" aria-label="Ver ranking completo de ' + label + '">' +
    '<span class="see-more-arrow">→</span><strong>Ver mais</strong><span>Ranking completo</span>' +
  '</button>';
}

function renderRail(element, items, moreType, moreLabel) {
  const cards = items.map(function(item,index){ return cardTemplate(item,index+1); }).join("");
  element.innerHTML = cards + (moreType && items.length ? seeMoreTemplate(moreType, moreLabel) : "");
}

function renderCatalogs() {
  const filtered = getFilteredCatalog();
  renderRail(popularRail, [...filtered].sort(function(a,b){return b.reads-a.reads;}).slice(0,10), "reads", "mais lidos");
  renderRail(favoriteRail, [...filtered].sort(function(a,b){return b.favorites-a.favorites;}).slice(0,10), "favorites", "mais favoritados");
  renderRail(newRail, [...filtered].sort(function(a,b){return b.newness-a.newness;}).slice(0,10));
}

function rankingRow(item, index, type) {
  const value = type === "reads"
    ? formatNumber(item.reads) + " leituras"
    : formatNumber(item.favorites) + " favoritos";

  return '<article class="ranking-row" data-manga="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
    '<span class="ranking-position">' + (index + 1) + '</span>' +
    '<div class="ranking-thumb" style="--accent:' + item.accent + '"></div>' +
    '<div class="ranking-copy"><strong>' + item.title + '</strong><span>' + item.genre + ' · Cap. ' + item.chapter + '</span></div>' +
    '<span class="ranking-value">' + value + '</span>' +
  '</article>';
}

function openRanking(type) {
  const byReads = type === "reads";
  const items = [...getFilteredCatalog()].sort(function(a,b){
    return byReads ? b.reads - a.reads : b.favorites - a.favorites;
  });

  rankingTitle.textContent = byReads ? "Ranking dos mais lidos" : "Ranking dos mais favoritados";
  rankingList.innerHTML = items.map(function(item,index){ return rankingRow(item,index,type); }).join("");
  rankingPanel.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeRanking() {
  rankingPanel.hidden = true;
  document.body.style.overflow = "";
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
  return '<article class="release-row" data-manga="' + release.manga.id + '">' +
    '<div class="release-thumb" style="--accent:' + release.manga.accent + '"></div>' +
    '<div class="release-copy"><strong>' + release.manga.title + '</strong><span>' + release.manga.genre + '</span></div>' +
    '<span class="release-chapter">Cap. ' + release.chapter + '</span>' +
    '<span class="release-time">' + release.updated + '</span>' +
  '</article>';
}

function renderReleases() {
  const filteredReleases = state.filter === "Todos" ? releases : releases.filter(function(release){ return release.manga.genre === state.filter; });
  state.totalPages = Math.max(1, Math.ceil(filteredReleases.length / state.pageSize));
  if (state.currentPage > state.totalPages) state.currentPage = 1;
  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = filteredReleases.slice(start, start + state.pageSize);
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
  if (accountFavoritesCount) accountFavoritesCount.textContent = String(state.favorites.size);
}

function openSearch(mode) {
  searchMode = mode || "all";
  searchPanel.hidden = false;
  document.body.style.overflow = "hidden";

  const title = document.querySelector("#searchTitle");
  const subtitle = document.querySelector(".search-subtitle");
  if (searchMode === "favorites") {
    title.textContent = "Seus favoritos";
    subtitle.textContent = "Obras que você marcou para acompanhar.";
  } else if (searchMode === "history") {
    title.textContent = "Seu histórico";
    subtitle.textContent = "Últimas obras que você abriu.";
  } else {
    title.textContent = "Buscar no MangaMorph";
    subtitle.textContent = "Encontre títulos, gêneros e capítulos rapidamente.";
  }

  setTimeout(function(){searchInput.focus();},0);
  renderSearch(searchInput.value || "");
}

function closeSearch() {
  searchPanel.hidden = true;
  document.body.style.overflow = "";
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  let source = getFilteredCatalog();
  if (searchMode === "favorites") {
    source = source.filter(function(item){ return state.favorites.has(item.id); });
  } else if (searchMode === "history") {
    source = state.history.map(function(id){ return catalog.find(function(item){ return item.id === id; }); }).filter(Boolean);
  }
  if (searchGenre !== "Todos") source = source.filter(function(item){ return item.genre === searchGenre; });
  const matches = normalized ? source.filter(function(item){
    return (item.title + " " + item.genre).toLowerCase().includes(normalized);
  }) : source.slice(0,8);

  searchCount.textContent = matches.length + (matches.length === 1 ? " obra" : " obras");
  searchResults.innerHTML = matches.length ? matches.map(function(item){
    return '<article class="search-result-card" data-manga="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
      '<div class="search-result-thumb" style="--accent:' + item.accent + '"></div>' +
      '<div class="search-result-copy"><strong>' + item.title + '</strong><span>' + item.genre + ' · Cap. ' + item.chapter + '</span></div>' +
      '<span class="search-result-arrow">›</span>' +
    '</article>';
  }).join("") : '<div class="search-empty">Nenhuma obra encontrada com esses filtros.</div>';
}

function setSearchGenre(genre) {
  searchGenre = genre;
  document.querySelectorAll("[data-search-filter]").forEach(function(button){
    button.classList.toggle("active", button.dataset.searchFilter === genre);
  });
  renderSearch(searchInput.value);
}

function openSideMenu() {
  sideMenu.hidden = false;
  menuToggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeSideMenu() {
  sideMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function updateAccountPanel() {
  accountThemeName.textContent = document.body.classList.contains("light") ? "Escuro" : "Escuro";
  accountThemeName.textContent = document.body.classList.contains("light") ? "Claro" : "Escuro";
  accountFavoritesCount.textContent = String(state.favorites.size);
  accountHistoryCount.textContent = String(state.history.length);
}

function openAccount() {
  updateAccountPanel();
  accountPanel.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeAccount() {
  accountPanel.hidden = true;
  document.body.style.overflow = "";
}

function openSettings() {
  settingsPanel.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSettings() {
  settingsPanel.hidden = true;
  document.body.style.overflow = "";
  document.querySelectorAll(".settings-submenu").forEach(function(menu){ menu.hidden = true; });
}

function toggleSettingsSection(name) {
  const target = document.querySelector("#" + name + "Menu");
  if (!target) return;
  const willOpen = target.hidden;
  document.querySelectorAll(".settings-submenu").forEach(function(menu){ menu.hidden = true; });
  target.hidden = !willOpen;
}

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem("mangamorph:theme", theme);
  themeValue.textContent = theme === "light" ? "Claro" : "Escuro";
  document.querySelectorAll("[data-theme]").forEach(function(button){
    button.classList.toggle("active", button.dataset.theme === theme);
  });
  if (accountThemeName) accountThemeName.textContent = theme === "light" ? "Claro" : "Escuro";
}

function applyLanguage(language) {
  localStorage.setItem("mangamorph:language", language);
  languageValue.textContent = language === "en" ? "English" : "Português";
  document.documentElement.lang = language === "en" ? "en" : "pt-BR";
  document.querySelectorAll("[data-language]").forEach(function(button){
    button.classList.toggle("active", button.dataset.language === language);
  });
}

function applyFilter(filter) {
  state.filter = filter;
  state.currentPage = 1;
  localStorage.setItem("mangamorph:filter", filter);
  filterValue.textContent = filter;
  document.querySelectorAll("[data-filter]").forEach(function(button){
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  renderCatalogs();
  renderReleases();
}

function applyNotifications(enabled) {
  state.notifications = enabled;
  localStorage.setItem("mangamorph:notifications", enabled ? "on" : "off");
  notificationToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
  notificationSwitch.classList.toggle("active", enabled);
}

document.addEventListener("click", function(event) {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    event.stopPropagation();
    toggleFavorite(Number(favorite.dataset.favorite));
    return;
  }

  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    goToPage(Number(pageButton.dataset.page));
    return;
  }

  const rankingButton = event.target.closest("[data-ranking]");
  if (rankingButton) {
    openRanking(rankingButton.dataset.ranking);
    return;
  }

  const sectionButton = event.target.closest("[data-settings-section]");
  if (sectionButton) {
    toggleSettingsSection(sectionButton.dataset.settingsSection);
    return;
  }

  const themeButton = event.target.closest("[data-theme]");
  if (themeButton) {
    applyTheme(themeButton.dataset.theme);
    return;
  }

  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    applyLanguage(languageButton.dataset.language);
    return;
  }

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    applyFilter(filterButton.dataset.filter);
    return;
  }

  const searchFilter = event.target.closest("[data-search-filter]");
  if (searchFilter) {
    setSearchGenre(searchFilter.dataset.searchFilter);
    return;
  }

  const menuTarget = event.target.closest("[data-menu-target]");
  if (menuTarget) {
    const target = document.querySelector(menuTarget.dataset.menuTarget);
    closeSideMenu();
    if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }

  const mangaTarget = event.target.closest("[data-manga]");
  if (mangaTarget) {
    openManga(Number(mangaTarget.dataset.manga));
    return;
  }

  if (event.target.matches("[data-close-search]")) closeSearch();
  if (event.target.matches("[data-close-ranking]")) closeRanking();
  if (event.target.matches("[data-close-settings]")) closeSettings();
  if (event.target.matches("[data-close-account]")) closeAccount();
  if (event.target.closest("[data-close-menu]")) closeSideMenu();
});

document.addEventListener("keydown", function(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-manga]")) {
    event.preventDefault();
    openManga(Number(event.target.dataset.manga));
    return;
  }

  if (event.key === "Escape" && !accountPanel.hidden) closeAccount();
  else if (event.key === "Escape" && !sideMenu.hidden) closeSideMenu();
  else if (event.key === "Escape" && !settingsPanel.hidden) closeSettings();
  else if (event.key === "Escape" && !rankingPanel.hidden) closeRanking();
  else if (event.key === "Escape" && !searchPanel.hidden) closeSearch();

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch("all");
  }
});

rankingClose.addEventListener("click", closeRanking);
prevPage.addEventListener("click", function(){ goToPage(state.currentPage - 1); });
nextPage.addEventListener("click", function(){ goToPage(state.currentPage + 1); });
document.querySelector("#searchToggle").addEventListener("click", function(){ openSearch("all"); });
document.querySelector("#searchClose").addEventListener("click", closeSearch);
searchInput.addEventListener("input", function(event){ renderSearch(event.target.value); });
settingsToggle.addEventListener("click", openSettings);
accountToggle.addEventListener("click", openAccount);
accountClose.addEventListener("click", closeAccount);
accountFavorites.addEventListener("click", function(){
  closeAccount();
  searchInput.value = "";
  searchGenre = "Todos";
  document.querySelectorAll("[data-search-filter]").forEach(function(button){
    button.classList.toggle("active", button.dataset.searchFilter === "Todos");
  });
  openSearch("favorites");
});
accountHistory.addEventListener("click", function(){
  closeAccount();
  searchInput.value = "";
  searchGenre = "Todos";
  document.querySelectorAll("[data-search-filter]").forEach(function(button){
    button.classList.toggle("active", button.dataset.searchFilter === "Todos");
  });
  openSearch("history");
});
accountThemeRow.addEventListener("click", function(){
  closeAccount();
  openSettings();
  toggleSettingsSection("theme");
});
[accountLogin, accountRegister].forEach(function(button){
  button.addEventListener("click", function(){
    accountAuthMessage.hidden = false;
  });
});
menuToggle.addEventListener("click", openSideMenu);
sideMenuSettings.addEventListener("click", function(){
  closeSideMenu();
  openSettings();
});
settingsClose.addEventListener("click", closeSettings);
notificationToggle.addEventListener("click", function(){ applyNotifications(!state.notifications); });

const savedTheme = localStorage.getItem("mangamorph:theme") || "dark";
const savedLanguage = localStorage.getItem("mangamorph:language") || "pt-BR";
applyTheme(savedTheme);
applyLanguage(savedLanguage);
applyFilter(state.filter);
applyNotifications(state.notifications);

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