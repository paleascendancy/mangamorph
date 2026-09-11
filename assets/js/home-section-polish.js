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

  // Base/current MangaMorph UI layers.
  ensureStyle('assets/css/account-menu.css?v=003','accountMenuStyle');
  ensureStyle('assets/css/home-final-fixes.css?v=001','homeFinalFixes');
  ensureStyle('assets/css/card-compact-fix.css?v=001','cardCompactFix');
  ensureStyle('assets/css/hero-actions-reference.css?v=001','heroActionsReference');

  // Theme layers are fully isolated by body.light vs body:not(.light).
  // Keep both loaded so switching themes never flashes the opposite palette.
  ensureStyle('assets/css/dark-theme-final.css?v=002','darkThemeFinal');
  ensureStyle('assets/css/light-theme-final.css?v=001','lightThemeFinal');

  const settingsList=document.querySelector('#settingsPanel .settings-list');
  if(settingsList){
    ['language','notifications','reading'].forEach(name=>{
      settingsList.querySelector('[data-settings-section="'+name+'"]')?.remove();
      document.querySelector('#'+name+'Menu')?.remove();
    });

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

  const keepThemeStylesLast=()=>{
    ['homeFinalFixes','cardCompactFix','heroActionsReference','darkThemeFinal','lightThemeFinal'].forEach(key=>{
      const link=document.querySelector('link[data-'+key+']');
      if(link)document.head.appendChild(link);
    });
  };

  const revealLive=()=>{
    document.documentElement.classList.add('mm-live-ready');
    document.documentElement.classList.remove('mm-prelive');
    document.querySelector('.hero-feature')?.removeAttribute('aria-busy');
    const actions=document.querySelector('.featured-actions');
    if(actions)actions.style.visibility='';
    document.querySelector('#mmNoLegacyFlash')?.remove();
    keepThemeStylesLast();
  };

  window.addEventListener('mangamorph:catalog-loaded',()=>requestAnimationFrame(revealLive),{once:true});
  window.addEventListener('mangamorph:catalog-error',()=>requestAnimationFrame(revealLive),{once:true});

  // Reassert final theme layers after a theme switch, without mixing palettes.
  document.addEventListener('click',event=>{
    const themeChoice=event.target.closest('[data-theme]');
    if(themeChoice){
      requestAnimationFrame(keepThemeStylesLast);
      setTimeout(keepThemeStylesLast,40);
    }

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