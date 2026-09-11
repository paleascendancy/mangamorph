(() => {
  const hero = document.querySelector('.manga-hero-premium');
  if (!hero || hero.dataset.mmLayoutV2 === 'true') return;
  hero.dataset.mmLayoutV2 = 'true';
  hero.classList.add('mm-organized-hero');

  const top = hero.querySelector('.hero-top');
  const primary = hero.querySelector('.hero-primary');
  const secondary = hero.querySelector('.hero-secondary');
  const cover = document.querySelector('#detailCover');

  if (top && primary && cover) {
    const identity = document.createElement('div');
    identity.className = 'mm-work-identity';

    const eyebrow = primary.querySelector(':scope > .eyebrow');
    const title = primary.querySelector('#mangaTitle');
    const alt = primary.querySelector('#mangaAltTitle');
    const badges = primary.querySelector('.hero-badges');
    [eyebrow, title, alt, badges].forEach(node => node && identity.appendChild(node));

    top.appendChild(identity);

    const stats = primary.querySelector('.detail-meta-compact');
    if (stats) {
      stats.classList.add('mm-stats-grid');
      if (secondary) hero.insertBefore(stats, secondary);
      else hero.appendChild(stats);
    }

    const description = primary.querySelector('#mangaDescription');
    const toggle = primary.querySelector('#toggleDescription');
    if (description || toggle) {
      const synopsis = document.createElement('section');
      synopsis.className = 'mm-synopsis-card';
      synopsis.innerHTML = '<div class="mm-block-heading"><span>Sinopse</span><small>Sobre a obra</small></div>';
      if (description) synopsis.appendChild(description);
      if (toggle) synopsis.appendChild(toggle);
      if (secondary) hero.insertBefore(synopsis, secondary);
      else hero.appendChild(synopsis);
    }

    const actions = primary.querySelector('.hero-actions-premium');
    if (actions) {
      actions.classList.add('mm-actions-bar');
      if (secondary) hero.insertBefore(actions, secondary);
      else hero.appendChild(actions);
    }

    primary.remove();
  }

  if (secondary) secondary.classList.add('mm-details-bottom');

  const facts = document.querySelector('.detail-facts-grid');
  if (facts && !facts.closest('.mm-facts-card')) {
    const wrapper = document.createElement('section');
    wrapper.className = 'mm-facts-card';
    wrapper.innerHTML = '<div class="mm-facts-heading"><div><span class="eyebrow">FICHA DA OBRA</span><strong>Informações</strong></div></div>';
    facts.parentNode.insertBefore(wrapper, facts);
    wrapper.appendChild(facts);
  }
})();
