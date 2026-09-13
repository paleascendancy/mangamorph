/* Profile layout is local and synchronous: it never waits for the catalog API. */
(() => {
  const hero = document.querySelector('.manga-hero-premium');
  if (!hero || hero.dataset.mmLayoutV2) return;
  hero.dataset.mmLayoutV2 = 'true';
  hero.classList.add('mm-organized-hero');
  const top = hero.querySelector('.hero-top');
  const primary = hero.querySelector('.hero-primary');
  const secondary = hero.querySelector('.hero-secondary');
  const identity = document.createElement('div');
  identity.className = 'mm-work-identity';
  ['.eyebrow','#mangaTitle','#mangaAltTitle','.hero-badges'].forEach(selector => {
    const node = primary.querySelector(selector);
    if (node) identity.append(node);
  });
  top.append(identity);
  const stats = primary.querySelector('.detail-meta');
  stats.classList.add('mm-stats-grid');
  hero.insertBefore(stats, secondary);
  const actions = primary.querySelector('.hero-actions-premium');
  actions.classList.add('mm-actions-bar');
  hero.insertBefore(actions, secondary);
  // Sharing remains available in the header; the reading row stays compact.
  document.querySelector('.topbar-actions').prepend(document.querySelector('#shareDetail'));
  const synopsis = document.createElement('section');
  synopsis.className = 'mm-synopsis-card';
  synopsis.innerHTML = '<h2>Sinopse</h2>';
  synopsis.append(primary.querySelector('#mangaDescription'), primary.querySelector('#toggleDescription'));
  hero.insertBefore(synopsis, secondary);
  primary.remove();
  secondary.classList.add('mm-details-bottom');
  const status = secondary.querySelector('.status-picker');
  const statusHeading = document.createElement('h2');
  statusHeading.textContent = 'Minha leitura';
  status.prepend(statusHeading);
  document.querySelector('.status-leading > span:last-child').textContent = 'Status de leitura';
  const facts = document.querySelector('.detail-facts');
  const factsHeading = document.createElement('h2');
  factsHeading.className = 'mm-facts-heading';
  factsHeading.textContent = 'Sobre a obra';
  facts.before(factsHeading);
  ['mangaStatusFact','latestChapter'].forEach(id => document.getElementById(id).parentElement.hidden = true);
  const author = document.querySelector('#mangaAuthorFact');
  const artist = document.querySelector('#mangaArtistFact');
  function groupCredits() {
    const same = author.textContent.trim() === artist.textContent.trim();
    artist.parentElement.hidden = same;
    author.previousElementSibling.textContent = same ? 'Autor e artista' : 'Autor';
  }
  const creditObserver = new MutationObserver(groupCredits);
  [author,artist].forEach(node => creditObserver.observe(node,{childList:true,subtree:true,characterData:true}));
  groupCredits();
  // Reflect the actual cover and keep its original ratio without cropping it.
  const cover = document.querySelector('#detailCover');
  const coverFallback = cover.querySelectorAll('.detail-cover-kicker,#coverTitle,#coverType');
  const backdrop = document.createElement('div');
  backdrop.className = 'mm-profile-backdrop';
  backdrop.setAttribute('aria-hidden','true');
  document.body.prepend(backdrop);
  let currentImage = '';
  function reflectCover() {
    const value = cover.style.backgroundImage || '';
    const url = value.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || '';
    const hasImage = Boolean(url);
    coverFallback.forEach(node => { node.hidden = hasImage; });
    if (!hasImage) {
      currentImage = '';
      backdrop.style.removeProperty('--profile-cover');
      cover.style.removeProperty('--cover-ratio');
      return;
    }
    if (value === currentImage) return;
    currentImage = value;
    backdrop.style.setProperty('--profile-cover', value);
    const img = new Image();
    img.onload = () => {
      if (cover.style.backgroundImage === value && img.naturalWidth && img.naturalHeight)
        cover.style.setProperty('--cover-ratio', `${img.naturalWidth} / ${img.naturalHeight}`);
    };
    img.src = url;
  }
  new MutationObserver(reflectCover).observe(cover,{attributes:true,attributeFilter:['style']});
  reflectCover();
  // Fold long tag lists, retaining every tag behind an accessible toggle.
  const tags = document.querySelector('#mangaTags');
  const more = document.createElement('button');
  more.type = 'button'; more.className = 'mm-tags-toggle'; more.textContent = '+ tags';
  more.setAttribute('aria-expanded','false');
  more.addEventListener('click',() => {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded',String(expanded));
    tags.classList.toggle('mm-tags-expanded',expanded);
    more.textContent = expanded ? 'Menos tags' : '+ tags';
  });
  function foldTags() {
    if (!tags.contains(more)) tags.append(more);
    more.hidden = tags.querySelectorAll(':scope > span').length <= 4;
  }
  new MutationObserver(foldTags).observe(tags,{childList:true});
  foldTags();
  const toggle = document.querySelector('#toggleDescription');
  function labelDescription() {
    const label = toggle.getAttribute('aria-expanded') === 'true' ? 'Ler menos ↑' : 'Ler mais ↓';
    if (toggle.textContent !== label) toggle.textContent = label;
  }
  new MutationObserver(labelDescription).observe(toggle,{attributes:true,childList:true,characterData:true,subtree:true});
  labelDescription();
  // Keep the profile theme synchronized with legacy components that still read body.light.
  function setProfileTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    document.body.dataset.profileTheme = normalized;
    document.body.classList.toggle('light', normalized === 'light');
  }
  try { setProfileTheme(localStorage.getItem('mangamorph:profile-theme') || 'dark'); }
  catch { setProfileTheme('dark'); }
  window.addEventListener('click', event => {
    if (!event.target.closest?.('#themeToggle')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const theme = document.body.dataset.profileTheme === 'dark' ? 'light' : 'dark';
    setProfileTheme(theme);
    try { localStorage.setItem('mangamorph:profile-theme',theme); } catch {}
  },true);
})();
