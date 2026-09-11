(()=>{
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
  };

  clearLegacyCatalog();

  const reveal=()=>{
    document.documentElement.classList.remove('mm-prelive');
    document.documentElement.classList.add('mm-live-ready');
    document.querySelector('#mmNoLegacyFlash')?.remove();
  };

  window.addEventListener('mangamorph:catalog-loaded',()=>requestAnimationFrame(reveal),{once:true});
  window.addEventListener('mangamorph:catalog-error',()=>requestAnimationFrame(reveal),{once:true});

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
