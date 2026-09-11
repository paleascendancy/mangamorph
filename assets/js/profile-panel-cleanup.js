(function(){
  function ensureStyles(){
    if(document.querySelector('#profilePanelCleanupStyles'))return;
    const style=document.createElement('style');
    style.id='profilePanelCleanupStyles';
    style.textContent=`
      #accountAvatarButton{display:none!important}
      .profile-photo-section{display:grid;gap:.55rem;padding:.2rem 0 .15rem}
      .profile-photo-section-head{display:flex;align-items:end;justify-content:space-between;gap:.75rem}
      .profile-photo-section-head>span{font-size:.82rem;font-weight:800;color:var(--mm-text,#16191f)}
      .profile-photo-section-head small{font-size:.7rem;color:var(--mm-text-soft,#69717e)}
      .profile-photo-change{display:grid;grid-template-columns:2.6rem minmax(0,1fr) auto;align-items:center;gap:.8rem;min-height:4rem;padding:.7rem .8rem;border:1px solid var(--mm-border,rgba(22,25,31,.09));border-radius:1rem;background:var(--mm-surface-strong,#fff);color:var(--mm-text,#16191f);cursor:pointer;box-shadow:var(--mm-shadow-sm,0 4px 14px rgba(27,31,38,.05))}
      .profile-photo-change:hover{border-color:var(--mm-border-strong,rgba(22,25,31,.14))}
      .profile-photo-change-icon{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:.85rem;background:var(--mm-accent-soft,#e3e9f1);color:var(--mm-accent-strong,#435f89);font-size:1.25rem;font-weight:700}
      .profile-photo-change>span:nth-child(2){display:grid;gap:.12rem;min-width:0}
      .profile-photo-change strong{font-size:.9rem;color:inherit}
      .profile-photo-change small{font-size:.72rem;color:var(--mm-text-soft,#69717e)}
      .profile-photo-change-arrow{font-size:1.35rem;color:var(--mm-text-faint,#8d95a1)}
      @media(max-width:620px){.profile-photo-section-head{align-items:start;flex-direction:column;gap:.15rem}.profile-photo-change{min-height:3.7rem;padding:.62rem .7rem}}
    `;
    document.head.appendChild(style);
  }

  function moveAvatarIntoEditor(){
    const oldAvatarAction=document.querySelector('#accountAvatarButton');
    const fileInput=document.querySelector('#accountAvatarInput');
    const form=document.querySelector('#profileForm');
    if(!form)return;

    if(oldAvatarAction){
      oldAvatarAction.hidden=true;
      oldAvatarAction.setAttribute('aria-hidden','true');
    }

    const adminLink=document.querySelector('#accountAdminLink');
    if(adminLink)adminLink.remove();

    if(document.querySelector('#profilePhotoSection'))return;

    const section=document.createElement('div');
    section.id='profilePhotoSection';
    section.className='profile-photo-section';
    section.innerHTML=`
      <div class="profile-photo-section-head">
        <span>Foto do perfil</span>
        <small>JPG, PNG ou WebP · até 3 MB</small>
      </div>
      <label class="profile-photo-change" for="accountAvatarInput">
        <span class="profile-photo-change-icon">＋</span>
        <span><strong>Trocar foto</strong><small>Escolher uma nova imagem de perfil</small></span>
        <span class="profile-photo-change-arrow">›</span>
      </label>`;

    const accent=form.querySelector('.profile-accent-section');
    if(accent)form.insertBefore(section,accent);
    else form.prepend(section);

    if(fileInput){
      fileInput.hidden=true;
      section.appendChild(fileInput);
    }
  }

  function updateEditCopy(){
    const button=document.querySelector('#accountProfile');
    const small=button?.querySelector('small');
    if(small)small.textContent='Nome, @usuário, bio, foto e cor';
  }

  function init(){
    ensureStyles();
    moveAvatarIntoEditor();
    updateEditCopy();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  const observer=new MutationObserver(()=>{
    if(document.querySelector('#accountProfileActions')||document.querySelector('#profileForm'))init();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
