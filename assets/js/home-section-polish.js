(()=>{
  const ensureStyle=(href,key)=>{
    let link=document.querySelector('link[data-'+key+']');
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset[key]='true';
      document.head.appendChild(link);
    }
    link.href=href;
    requestAnimationFrame(()=>document.head.appendChild(link));
    setTimeout(()=>document.head.appendChild(link),250);
    setTimeout(()=>document.head.appendChild(link),900);
  };

  // Current MangaMorph-native profile drawer + final home guardrails.
  ensureStyle('assets/css/account-menu.css?v=002','accountMenuStyle');
  ensureStyle('assets/css/home-final-fixes.css?v=001','homeFinalFixes');
  ensureStyle('assets/css/card-compact-fix.css?v=001','cardCompactFix');
  ensureStyle('assets/css/hero-actions-reference.css?v=001','heroActionsReference');

  // Remove settings that no longer belong to the current product before the
  // settings sheet can ever be opened. This replaces the old "render then hide"
  // behavior that caused legacy rows to flash on slower phones.
  const settingsList=document.querySelector('#settingsPanel .settings-list');
  if(settingsList){
    ['language','notifications','reading'].forEach(name=>{
      settingsList.querySelector('[data-settings-section="'+name+'"]')?.remove();
      document.querySelector('#'+name+'Menu')?.remove();
    });

    // Keep one canonical catalog-origin filter. Delete any older copy first.
    settingsList.querySelector('[data-settings-section="filter"]')?.remove();
    document.querySelector('#filterMenu')?.remove();

    const current=localStorage.getItem('mangamorph:filter')||'Padrão';
    const labels={Padrão:'Todos',Mangá:'Mangá · Japão',Manhwa:'Manhwa · Coreia',Manhua:'Manhua · China'};
    const aboutRow=settingsList.querySelector('[data-settings-section="about"]');

    const row=document.createElement('button');
    row.className='settings-row';
    row.type='button';
    row.dataset.settingsSection='filter';
    row.innerHTML='<span class="settings-row-icon" aria-hidden="true">⌘</span><span class="settings-row-copy"><strong>Tipo de obra</strong><span>Filtrar catálogo por origem</span></span><span class="settings-row-end"><span id="filterValue">'+(labels[current]||'Todos')+'</span><span class="settings-chevron">›</span></span>';

    const menu=document.createElement('div');
    menu.className='settings-submenu';
    menu.id='filterMenu';
    menu.hidden=true;
    menu.innerHTML=[
      ['Padrão','Todos','Mostrar todo o catálogo'],
      ['Mangá','Mangá · Japão','Obras japonesas'],
      ['Manhwa','Manhwa · Coreia','Obras coreanas'],
      ['Manhua','Manhua · China','Obras chinesas']
    ].map(item=>'<button class="settings-choice '+(item[0]===current?'active':'')+'" type="button" data-filter="'+item[0]+'"><span>'+item[1]+'</span><small>'+item[2]+'</small></button>').join('');

    if(aboutRow){
      settingsList.insertBefore(row,aboutRow);
      settingsList.insertBefore(menu,aboutRow);
    }else{
      settingsList.append(row,menu);
    }
  }

  // app.js still contains an old offline/demo catalog for fallback logic. Never
  // allow that data to be visible while the real Supabase catalog is loading.
  const clearLegacyCatalog=()=>{
    ['#favoriteRail','#popularRail','#newRail','#releaseList','#rankingList','#searchResults'].forEach(selector=>{
      const node=document.querySelector(selector);
      if(node)node.replaceChildren();
    });
    const indicator=document.querySelector('#pageIndicator');
    if(indicator)indicator.textContent='Carregando…';

    const hero=document.querySelector('.hero-feature');
    if(hero&&!document.documentElement.classList.contains('mm-live-ready')){
      hero.setAttribute('aria-busy','true');
      const title=document.querySelector('#featuredTitle');
      const meta=document.querySelector('.featured-meta');
      const desc=document.querySelector('.featured-description');
      const actions=document.querySelector('.featured-actions');
      const cover=document.querySelector('.featured-cover');
      if(title)title.textContent='';
      if(meta)meta.replaceChildren();
      if(desc)desc.textContent='';
      if(actions)actions.style.visibility='hidden';
      if(cover){cover.removeAttribute('style');cover.replaceChildren();}
    }
  };

  clearLegacyCatalog();

  const revealLive=()=>{
    document.documentElement.classList.add('mm-live-ready');
    document.documentElement.classList.remove('mm-prelive');
    document.querySelector('.hero-feature')?.removeAttribute('aria-busy');
    const actions=document.querySelector('.featured-actions');
    if(actions)actions.style.visibility='';
    document.querySelector('#mmNoLegacyFlash')?.remove();
    ['home-final-fixes','card-compact-fix','hero-actions-reference'].forEach(key=>{
      const link=document.querySelector('link[data-'+key+']');
      if(link)document.head.appendChild(link);
    });
  };

  window.addEventListener('mangamorph:catalog-loaded',()=>requestAnimationFrame(revealLive),{once:true});
  window.addEventListener('mangamorph:catalog-error',()=>requestAnimationFrame(revealLive),{once:true});

  // Keep filter labels synchronized with app.js without recreating old menus.
  document.addEventListener('click',event=>{
    const choice=event.target.closest('[data-filter]');
    if(!choice)return;
    const labels={Padrão:'Todos',Mangá:'Mangá · Japão',Manhwa:'Manhwa · Coreia',Manhua:'Manhua · China'};
    requestAnimationFrame(()=>{
      const value=document.querySelector('#filterValue');
      if(value)value.textContent=labels[choice.dataset.filter]||choice.dataset.filter;
      document.querySelectorAll('#filterMenu [data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===choice.dataset.filter));
    });
  });
})();