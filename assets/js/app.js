let catalog = [
  {id:1,title:"Neon Ronin",genre:"Ação",type:"Mangá",chapter:127,accent:"#3a4162",reads:986400,favorites:48210,newness:72},
  {id:2,title:"Astral Bloom",genre:"Fantasia",type:"Manhwa",chapter:91,accent:"#523b64",reads:941300,favorites:51740,newness:60},
  {id:3,title:"Zero District",genre:"Mistério",type:"Manhua",chapter:68,accent:"#294b52",reads:889700,favorites:39420,newness:48},
  {id:4,title:"Crimson Archive",genre:"Ação",type:"Mangá",chapter:143,accent:"#64363c",reads:842100,favorites:45880,newness:44},
  {id:5,title:"Moon Relay",genre:"Fantasia",type:"Manhwa",chapter:82,accent:"#354561",reads:796800,favorites:42110,newness:38},
  {id:6,title:"Silent Frame",genre:"Mistério",type:"Manhua",chapter:74,accent:"#494b55",reads:741900,favorites:36520,newness:34},
  {id:7,title:"Vector Hearts",genre:"Ação",type:"Mangá",chapter:112,accent:"#593c4f",reads:698500,favorites:33190,newness:31},
  {id:8,title:"Glass Kingdom",genre:"Fantasia",type:"Manhwa",chapter:105,accent:"#36545e",reads:655200,favorites:40570,newness:29},
  {id:9,title:"Night Protocol",genre:"Suspense",type:"Manhua",chapter:57,accent:"#31384a",reads:612700,favorites:29410,newness:26},
  {id:10,title:"Afterlight",genre:"Drama",type:"Mangá",chapter:49,accent:"#5a4650",reads:571300,favorites:31860,newness:22},
  {id:11,title:"Morrow Gate",genre:"Fantasia",type:"Manhwa",chapter:36,accent:"#3e4e66",reads:529800,favorites:27350,newness:95},
  {id:12,title:"Black Signal",genre:"Ação",type:"Manhua",chapter:28,accent:"#52383d",reads:487600,favorites:24590,newness:92},
  {id:13,title:"Lucid Crown",genre:"Mistério",type:"Mangá",chapter:19,accent:"#3a5661",reads:446200,favorites:22740,newness:89},
  {id:14,title:"Echo Garden",genre:"Drama",type:"Manhwa",chapter:16,accent:"#50455f",reads:404900,favorites:21580,newness:87},
  {id:15,title:"Iron Chapel",genre:"Ação",type:"Manhua",chapter:11,accent:"#4c4b50",reads:365400,favorites:19860,newness:84}
];

const state = {
  currentPage: 1,
  pageSize: 30,
  totalPages: 5,
  favorites: new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]")),
  filter: localStorage.getItem("mangamorph:filter") || "Padrão",
  notifications: localStorage.getItem("mangamorph:notifications") === "on",
  history: JSON.parse(localStorage.getItem("mangamorph:history") || "[]"),
  profile: JSON.parse(localStorage.getItem("mangamorph:profile") || "null"),
  profileSession: localStorage.getItem("mangamorph:profile-session") === "on"
};

if (!["Padrão","Mangá","Manhwa","Manhua"].includes(state.filter)) {
  state.filter = "Padrão";
}

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
const rankingFilterLabel = document.querySelector("#rankingFilterLabel");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsClose = document.querySelector("#settingsClose");
const settingsToggle = document.querySelector("#settingsToggle");
const themeValue = document.querySelector("#themeValue");
const filterValue = document.querySelector("#filterValue");
const notificationToggle = document.querySelector("#notificationToggle");
const notificationSwitch = document.querySelector("#notificationSwitch");
const sideMenu = document.querySelector("#sideMenu");
const menuToggle = document.querySelector("#menuToggle");
const sideMenuSettings = document.querySelector("#sideMenuSettings");
const titlesMenuToggle = document.querySelector("#titlesMenuToggle");
const titlesMenu = document.querySelector("#titlesMenu");
const accountPanel = document.querySelector("#accountPanel");
const accountToggle = document.querySelector("#accountToggle");
const accountClose = document.querySelector("#accountClose");
const accountFavorites = document.querySelector("#accountFavorites");
const accountHistory = document.querySelector("#accountHistory");
const accountFavoritesCount = document.querySelector("#accountFavoritesCount");
const accountHistoryCount = document.querySelector("#accountHistoryCount");
const accountLogin = document.querySelector("#accountLogin");
const accountRegister = document.querySelector("#accountRegister");
const accountAuthMessage = document.querySelector("#accountAuthMessage");
const accountTitle = document.querySelector("#accountTitle");
const accountHubSubtitle = document.querySelector(".account-hub-subtitle");
const accountProfileActions = document.querySelector("#accountProfileActions");
const accountAvatarInput = document.querySelector("#accountAvatarInput");
const accountAvatarButtonLabel = document.querySelector("#accountAvatarButtonLabel");
const accountProfileImage = document.querySelector("#accountProfileImage");
const headerProfileImage = document.querySelector("#headerProfileImage");
const accountProfile = document.querySelector("#accountProfile");
const accountPublicProfile = document.querySelector("#accountPublicProfile");
const accountReadingList = document.querySelector("#accountReadingList");
const accountReadingListCount = document.querySelector("#accountReadingListCount");
const accountLogout = document.querySelector("#accountLogout");
const accountAuthActions = document.querySelector("#accountAuthActions");
const accountProfileName = document.querySelector("#accountProfileName");
const accountProfileHandle = document.querySelector("#accountProfileHandle");
const accountProfileBio = document.querySelector("#accountProfileBio");
const accountProfileAvatar = document.querySelector("#accountProfileAvatar");
const accountProfileInitials = document.querySelector("#accountProfileInitials");
const accountGuestAvatar = document.querySelector("#accountGuestAvatar");
const accountSessionBadge = document.querySelector("#accountSessionBadge");
const accountProfileStats = document.querySelector("#accountProfileStats");
const profileStatFavorites = document.querySelector("#profileStatFavorites");
const profileStatHistory = document.querySelector("#profileStatHistory");
const profileStatList = document.querySelector("#profileStatList");
const headerProfileInitials = document.querySelector("#headerProfileInitials");
const headerGuestIcon = document.querySelector("#headerGuestIcon");

const profilePanel = document.querySelector("#profilePanel");
const profileClose = document.querySelector("#profileClose");
const profileCancel = document.querySelector("#profileCancel");
const profileForm = document.querySelector("#profileForm");
const profileTitle = document.querySelector("#profileTitle");
const profileNameInput = document.querySelector("#profileNameInput");
const profileUsernameInput = document.querySelector("#profileUsernameInput");
const profileBioInput = document.querySelector("#profileBioInput");
const profileBioCount = document.querySelector("#profileBioCount");
const profilePreviewAvatar = document.querySelector("#profilePreviewAvatar");
const profilePreviewName = document.querySelector("#profilePreviewName");
const profilePreviewHandle = document.querySelector("#profilePreviewHandle");
const profilePreviewBio = document.querySelector("#profilePreviewBio");
let profileAccent = (state.profile && state.profile.accent) || "#5b8def";

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
  if (state.filter === "Padrão") return catalog;
  return catalog.filter(function(item){ return item.type === state.filter; });
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
  renderRail(popularRail, [...filtered].sort(function(a,b){return b.reads-a.reads;}).slice(0,13), "reads", "mais lidos");
  renderRail(favoriteRail, [...filtered].sort(function(a,b){return b.favorites-a.favorites;}).slice(0,13), "favorites", "mais favoritados");
  renderRail(newRail, [...filtered].sort(function(a,b){return b.newness-a.newness;}).slice(0,13), "newness", "novas obras");
}

function rankingRow(item, index, type) {
  const value = type === "reads"
    ? formatNumber(item.reads) + " leituras"
    : type === "favorites"
      ? formatNumber(item.favorites) + " favoritos"
      : "Nova no catálogo";

  return '<article class="ranking-row" data-manga="' + item.id + '" tabindex="0" role="link" aria-label="Abrir ' + item.title + '">' +
    '<span class="ranking-position">' + (index + 1) + '</span>' +
    '<div class="ranking-thumb" style="--accent:' + item.accent + '"></div>' +
    '<div class="ranking-copy"><strong>' + item.title + '</strong><span>' + item.genre + ' · Cap. ' + item.chapter + '</span></div>' +
    '<span class="ranking-value">' + value + '</span>' +
  '</article>';
}

function renderRanking(type) {
  const items = [...getFilteredCatalog()].sort(function(a,b){
    if (type === "reads") return b.reads - a.reads;
    if (type === "favorites") return b.favorites - a.favorites;
    return b.newness - a.newness;
  });

  rankingTitle.textContent = type === "reads"
    ? "Mais lidas"
    : type === "favorites"
      ? "Mais favoritadas"
      : "Novas obras";

  document.querySelectorAll("[data-ranking-tab]").forEach(function(button){
    const active = button.dataset.rankingTab === type;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  rankingFilterLabel.textContent = state.filter;
  rankingList.innerHTML = items.map(function(item,index){ return rankingRow(item,index,type); }).join("");
}

function openRanking(type) {
  renderRanking(type);
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
  const flag = release.manga.type === "Mangá" ? "🇯🇵" : release.manga.type === "Manhwa" ? "🇰🇷" : "🇨🇳";
  return '<article class="release-row premium-release-row" data-manga="' + release.manga.id + '" tabindex="0" role="link" aria-label="Abrir ' + release.manga.title + ' capítulo ' + release.chapter + '">' +
    '<div class="release-thumb premium-release-thumb" style="--accent:' + release.manga.accent + '"></div>' +
    '<div class="release-copy premium-release-copy">' +
      '<strong>' + release.manga.title + '</strong>' +
      '<span class="release-meta"><span>' + flag + ' ' + release.manga.type + '</span><span>' + release.manga.genre + '</span><span>• ' + release.updated + '</span></span>' +
    '</div>' +
    '<span class="release-chapter premium-release-chapter">Cap. ' + release.chapter + '</span>' +
    '<span class="release-open-arrow" aria-hidden="true">›</span>' +
  '</article>';
}

function renderReleases() {
  const filteredReleases = state.filter === "Padrão" ? releases : releases.filter(function(release){ return release.manga.type === state.filter; });
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
  window.dispatchEvent(new CustomEvent("mangamorph:library-change",{detail:{mangaId:id,favorite:state.favorites.has(id)}}));
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
  } else if (searchMode === "reading-list") {
    const readingIds = new Set(getReadingList());
    source = source.filter(function(item){ return readingIds.has(item.id); });
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

function toggleTitlesMenu() {
  const willOpen = titlesMenu.hidden;
  titlesMenu.hidden = !willOpen;
  titlesMenuToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function sanitizeUsername(value) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20);
}

function profileInitials(name) {
  const parts = String(name || "Manga Morph").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(function(part){ return part[0]; }).join("") || "MM").toUpperCase();
}

function getReadingList() {
  try {
    const value = JSON.parse(localStorage.getItem("mangamorph:marked") || "[]");
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveProfile(profile) {
  state.profile = profile;
  localStorage.setItem("mangamorph:profile", JSON.stringify(profile));
  renderProfileUI();
  window.dispatchEvent(new CustomEvent("mangamorph:profile-save",{detail:profile}));
}

function renderProfileUI() {
  const active = Boolean(state.profileSession);
  const profile = state.profile || {
    name:"Leitor",
    username:"mangamorph",
    bio:"",
    accent:"#5b8def",
    avatarUrl:null
  };
  const readingList = getReadingList();

  accountAuthActions.hidden = active;
  accountLogout.hidden = !active;
  accountProfileStats.hidden = !active;
  accountProfileActions.hidden = !active;
  accountAuthMessage.hidden = true;

  accountTitle.textContent = active ? "Perfil" : "Conta";
  accountHubSubtitle.textContent = active ? "Sua conta, identidade e biblioteca." : "Entre ou crie uma conta para continuar.";

  accountFavoritesCount.textContent = String(state.favorites.size);
  accountHistoryCount.textContent = String(state.history.length);
  accountReadingListCount.textContent = String(readingList.length);
  profileStatFavorites.textContent = String(state.favorites.size);
  profileStatHistory.textContent = String(state.history.length);
  profileStatList.textContent = String(readingList.length);

  if (active) {
    const initials = profileInitials(profile.name);
    const hasAvatar = Boolean(profile.avatarUrl);

    accountProfileName.textContent = profile.name;
    accountProfileHandle.textContent = "@" + profile.username;
    accountProfileHandle.hidden = false;
    accountProfileBio.textContent = profile.bio || "Leitor do MangaMorph.";
    if (accountPublicProfile) accountPublicProfile.href = "profile.html?user=" + encodeURIComponent(profile.username);
    accountSessionBadge.innerHTML = "<span></span> Online";
    accountSessionBadge.classList.add("online");
    accountProfileAvatar.style.setProperty("--profile-accent",profile.accent || "#5b8def");

    accountProfileImage.hidden = !hasAvatar;
    if (hasAvatar) accountProfileImage.src = profile.avatarUrl;
    accountProfileInitials.textContent = initials;
    accountProfileInitials.hidden = hasAvatar;
    accountGuestAvatar.hidden = true;
    accountAvatarButtonLabel.textContent = hasAvatar ? "Trocar foto" : "Adicionar foto";

    headerProfileImage.hidden = !hasAvatar;
    if (hasAvatar) headerProfileImage.src = profile.avatarUrl;
    headerProfileInitials.textContent = initials;
    headerProfileInitials.hidden = hasAvatar;
    headerGuestIcon.hidden = true;
    accountToggle.style.setProperty("--profile-accent",profile.accent || "#5b8def");
  } else {
    accountProfileName.textContent = "Convidado";
    accountProfileHandle.hidden = true;
    accountProfileBio.textContent = "Entre ou crie uma conta para sincronizar seu perfil.";
    accountProfileImage.hidden = true;
    accountProfileInitials.hidden = true;
    accountGuestAvatar.hidden = false;
    accountProfileAvatar.style.removeProperty("--profile-accent");
    accountSessionBadge.innerHTML = "<span></span> Offline";
    accountSessionBadge.classList.remove("online");

    headerProfileImage.hidden = true;
    headerProfileInitials.hidden = true;
    headerGuestIcon.hidden = false;
    accountToggle.style.removeProperty("--profile-accent");
  }
}

function updateProfilePreview() {
  const name = profileNameInput.value.trim() || "Seu nome";
  const username = sanitizeUsername(profileUsernameInput.value) || "usuario";
  const bio = profileBioInput.value.trim() || "Sua bio aparecerá aqui.";
  profilePreviewAvatar.textContent = profileInitials(name);
  profilePreviewAvatar.style.setProperty("--profile-accent",profileAccent);
  profilePreviewName.textContent = name;
  profilePreviewHandle.textContent = "@" + username;
  profilePreviewBio.textContent = bio;
  profileBioCount.textContent = profileBioInput.value.length + "/120";
}

function openProfileEditor(mode) {
  const existing = state.profile;
  profileTitle.textContent = existing ? "Editar perfil" : "Criar perfil";
  profileNameInput.value = existing ? existing.name : "";
  profileUsernameInput.value = existing ? existing.username : "";
  profileBioInput.value = existing ? (existing.bio || "") : "";
  profileAccent = existing ? (existing.accent || "#5b8def") : "#5b8def";
  document.querySelectorAll("[data-profile-accent]").forEach(function(button){
    button.classList.toggle("active",button.dataset.profileAccent === profileAccent);
  });
  updateProfilePreview();
  profilePanel.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(function(){ profileNameInput.focus(); },0);
}

function closeProfileEditor() {
  profilePanel.hidden = true;
  document.body.style.overflow = "";
}

function updateAccountPanel() {
  renderProfileUI();
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
  window.dispatchEvent(new CustomEvent("mangamorph:notifications-global",{detail:{enabled:enabled}}));
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

  const rankingTab = event.target.closest("[data-ranking-tab]");
  if (rankingTab) {
    renderRanking(rankingTab.dataset.rankingTab);
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
    document.querySelectorAll(".side-menu-item, .side-menu-subitem").forEach(function(item){
      item.classList.remove("active");
    });
    menuTarget.classList.add("active");
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
  if (event.target.matches("[data-close-profile]")) closeProfileEditor();
  if (event.target.closest("[data-close-menu]")) closeSideMenu();
});

document.addEventListener("keydown", function(event) {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-manga]")) {
    event.preventDefault();
    openManga(Number(event.target.dataset.manga));
    return;
  }

  if (event.key === "Escape" && !profilePanel.hidden) closeProfileEditor();
  else if (event.key === "Escape" && !accountPanel.hidden) closeAccount();
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
accountRegister.addEventListener("click", function(){
  closeAccount();
  window.dispatchEvent(new CustomEvent("mangamorph:open-register"));
});
accountLogin.addEventListener("click", function(){
  closeAccount();
  window.dispatchEvent(new CustomEvent("mangamorph:open-login"));
});
accountLogout.addEventListener("click", function(){
  window.dispatchEvent(new CustomEvent("mangamorph:sign-out"));
});
accountProfile.addEventListener("click", function(){
  closeAccount();
  if (state.profileSession) openProfileEditor("edit");
  else window.dispatchEvent(new CustomEvent("mangamorph:open-login"));
});
accountReadingList.addEventListener("click", function(){
  closeAccount();
  searchInput.value = "";
  searchGenre = "Todos";
  searchMode = "reading-list";
  searchPanel.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("#searchTitle").textContent = "Minha lista";
  document.querySelector(".search-subtitle").textContent = "Obras que você salvou para acompanhar.";
  renderSearch("");
});
accountAvatarInput.addEventListener("change", function(){
  const file = accountAvatarInput.files && accountAvatarInput.files[0];
  if (!file) return;
  window.dispatchEvent(new CustomEvent("mangamorph:avatar-upload",{detail:{file:file}}));
  accountAvatarInput.value = "";
});
profileClose.addEventListener("click", closeProfileEditor);
profileCancel.addEventListener("click", closeProfileEditor);
profileNameInput.addEventListener("input", updateProfilePreview);
profileUsernameInput.addEventListener("input", function(){
  const clean = sanitizeUsername(profileUsernameInput.value);
  if (profileUsernameInput.value !== clean) profileUsernameInput.value = clean;
  updateProfilePreview();
});
profileBioInput.addEventListener("input", updateProfilePreview);
document.querySelectorAll("[data-profile-accent]").forEach(function(button){
  button.addEventListener("click", function(){
    profileAccent = button.dataset.profileAccent;
    document.querySelectorAll("[data-profile-accent]").forEach(function(item){ item.classList.remove("active"); });
    button.classList.add("active");
    updateProfilePreview();
  });
});
profileForm.addEventListener("submit", function(event){
  event.preventDefault();
  const name = profileNameInput.value.trim();
  const username = sanitizeUsername(profileUsernameInput.value);
  if (!name || username.length < 3) {
    accountAuthMessage.textContent = "Use um nome e um @usuário com pelo menos 3 caracteres.";
    accountAuthMessage.hidden = false;
    return;
  }
  saveProfile({
    name:name.slice(0,32),
    username:username,
    bio:profileBioInput.value.trim().slice(0,120),
    accent:profileAccent,
    createdAt:(state.profile && state.profile.createdAt) || Date.now()
  });
  closeProfileEditor();
  openAccount();
  accountAuthMessage.textContent = state.profileSession ? "Perfil atualizado." : "Perfil salvo localmente.";
  accountAuthMessage.hidden = false;
});

window.addEventListener("mangamorph:auth-state", function(event){
  const detail = event.detail || {};
  state.profileSession = Boolean(detail.session);
  localStorage.setItem("mangamorph:profile-session", state.profileSession ? "on" : "off");

  if (detail.profile) {
    state.profile = detail.profile;
    localStorage.setItem("mangamorph:profile", JSON.stringify(detail.profile));
  }

  renderProfileUI();
});

window.addEventListener("mangamorph:auth-complete", function(){
  if (!accountPanel.hidden) return;
  openAccount();
});

window.addEventListener("mangamorph:auth-message", function(event){
  const detail = event.detail || {};
  accountAuthMessage.textContent = detail.message || "";
  accountAuthMessage.hidden = !detail.message;
});

menuToggle.addEventListener("click", openSideMenu);
titlesMenuToggle.addEventListener("click", toggleTitlesMenu);
sideMenuSettings.addEventListener("click", function(){
  closeSideMenu();
  openSettings();
});
settingsClose.addEventListener("click", closeSettings);
notificationToggle.addEventListener("click", function(){ applyNotifications(!state.notifications); });

const savedTheme = localStorage.getItem("mangamorph:theme") || "dark";
applyTheme(savedTheme);
applyFilter(state.filter);
applyNotifications(state.notifications);

window.addEventListener("mangamorph:library-loaded",function(event){
  const rows=event.detail?.library||[];
  state.favorites=new Set(rows.filter(row=>row.favorite).map(row=>Number(row.manga_id)));
  state.history=(event.detail?.history||[]).map(row=>Number(row.manga_id));
  renderCatalogs();
  renderProfileUI();
});

window.addEventListener("mangamorph:catalog-loaded",function(event){
  if(!Array.isArray(event.detail)||!event.detail.length)return;
  catalog=event.detail;
  state.totalPages=Math.max(1,Math.ceil(catalog.length/state.pageSize));
  state.currentPage=Math.min(state.currentPage,state.totalPages);
  renderCatalogs();
  renderReleases();
  if(!searchPanel.hidden)renderSearch(searchInput.value||"");
});

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) {
  openSearch();
  searchInput.value = initialQuery;
  renderSearch(initialQuery);
}

renderCatalogs();
renderReleases();
renderProfileUI();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){});
  });
}