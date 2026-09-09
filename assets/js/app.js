const catalog = [
  { id: 1, title: "Neon Ronin", genre: "Ação", chapter: 27, accent: "#3a4162", updated: "Hoje, 10:42" },
  { id: 2, title: "Astral Bloom", genre: "Fantasia", chapter: 41, accent: "#4a365a", updated: "Hoje, 09:18" },
  { id: 3, title: "Zero District", genre: "Mistério", chapter: 18, accent: "#29444a", updated: "Ontem, 23:05" },
  { id: 4, title: "Crimson Archive", genre: "Ação", chapter: 63, accent: "#5a3438", updated: "Ontem, 20:11" },
  { id: 5, title: "Moon Relay", genre: "Fantasia", chapter: 12, accent: "#35415d", updated: "Ontem, 18:27" },
  { id: 6, title: "Silent Frame", genre: "Mistério", chapter: 34, accent: "#44464f", updated: "2 dias atrás" },
  { id: 7, title: "Vector Hearts", genre: "Ação", chapter: 22, accent: "#4f3949", updated: "2 dias atrás" },
  { id: 8, title: "Glass Kingdom", genre: "Fantasia", chapter: 55, accent: "#344b55", updated: "3 dias atrás" }
];

const state = {
  filter: "Todos",
  favorites: new Set(JSON.parse(localStorage.getItem("mangamorph:favorites") || "[]"))
};

const featuredGrid = document.querySelector("#featuredGrid");
const updatesList = document.querySelector("#updatesList");
const favoriteGrid = document.querySelector("#favoriteGrid");
const favoriteCount = document.querySelector("#favoriteCount");
const catalogCount = document.querySelector("#catalogCount");
const searchPanel = document.querySelector("#searchPanel");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");

catalogCount.textContent = catalog.length;

function cardTemplate(item) {
  const active = state.favorites.has(item.id);
  return `
    <article class="manga-card">
      <div class="manga-cover" style="--accent:${item.accent}">
        <span class="manga-index">${String(item.id).padStart(2, "0")}</span>
      </div>
      <div class="manga-info">
        <h3>${item.title}</h3>
        <p>${item.genre}</p>
        <div class="card-actions">
          <span class="chapter-badge">Cap. ${item.chapter}</span>
          <button class="favorite-button ${active ? "active" : ""}" data-favorite="${item.id}" aria-label="${active ? "Remover dos favoritos" : "Adicionar aos favoritos"}">${active ? "★" : "☆"}</button>
        </div>
      </div>
    </article>`;
}

function renderCatalog() {
  const items = state.filter === "Todos" ? catalog : catalog.filter(item => item.genre === state.filter);
  featuredGrid.innerHTML = items.map(cardTemplate).join("");
}

function renderUpdates() {
  updatesList.innerHTML = catalog.slice(0, 6).map(item => `
    <article class="update-row">
      <strong>${item.title}</strong>
      <span>${item.genre}</span>
      <span>Cap. ${item.chapter} · ${item.updated}</span>
    </article>`).join("");
}

function renderFavorites() {
  const items = catalog.filter(item => state.favorites.has(item.id));
  favoriteCount.textContent = items.length;
  favoriteGrid.innerHTML = items.length ? items.map(cardTemplate).join("") : '<p class="section-note">Nenhum favorito ainda. Toque na estrela de uma obra para salvar.</p>';
}

function toggleFavorite(id) {
  state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
  localStorage.setItem("mangamorph:favorites", JSON.stringify([...state.favorites]));
  renderCatalog();
  renderFavorites();
}

document.addEventListener("click", event => {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) toggleFavorite(Number(favorite.dataset.favorite));

  const pill = event.target.closest("[data-filter]");
  if (pill) {
    state.filter = pill.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(button => button.classList.toggle("active", button === pill));
    renderCatalog();
  }

  if (event.target.matches("[data-close-search]")) closeSearch();
});

function openSearch() {
  searchPanel.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => searchInput.focus(), 0);
  renderSearch("");
}

function closeSearch() {
  searchPanel.hidden = true;
  document.body.style.overflow = "";
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? catalog.filter(item => `${item.title} ${item.genre}`.toLowerCase().includes(normalized))
    : catalog.slice(0, 5);

  searchResults.innerHTML = matches.length
    ? matches.map(item => `<div class="search-result"><strong>${item.title}</strong><small>${item.genre} · Capítulo ${item.chapter}</small></div>`).join("")
    : '<div class="search-result">Nenhum resultado encontrado.</div>';
}

document.querySelector("#searchToggle").addEventListener("click", openSearch);
document.querySelector("#mobileSearch").addEventListener("click", openSearch);
document.querySelector("#searchClose").addEventListener("click", closeSearch);
searchInput.addEventListener("input", event => renderSearch(event.target.value));

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !searchPanel.hidden) closeSearch();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
});

document.querySelector("#surpriseButton").addEventListener("click", () => {
  const item = catalog[Math.floor(Math.random() * catalog.length)];
  openSearch();
  searchInput.value = item.title;
  renderSearch(item.title);
});

const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("mangamorph:theme");
if (savedTheme === "light") document.body.classList.add("light");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("mangamorph:theme", document.body.classList.contains("light") ? "light" : "dark");
});

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) {
  openSearch();
  searchInput.value = initialQuery;
  renderSearch(initialQuery);
}

renderCatalog();
renderUpdates();
renderFavorites();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}