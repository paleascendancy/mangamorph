(function(){
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
