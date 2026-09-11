import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://fnyellunugdfesprmvzm.supabase.co",
  "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);

function removeAdminLink(){
  document.querySelector('#accountAdminLink')?.remove();
}

function ensureAdminLink(){
  const actions=document.querySelector('#accountProfileActions');
  if(!actions||document.querySelector('#accountAdminLink'))return;

  const link=document.createElement('a');
  link.id='accountAdminLink';
  link.href='admin.html';
  link.className='account-profile-action account-admin-action';
  link.setAttribute('aria-label','Abrir painel administrativo');
  link.innerHTML=`
    <span>⌘</span>
    <span><strong>Administração</strong><small>Obras, capítulos e moderação</small></span>
  `;
  actions.appendChild(link);
}

async function syncAdminAccess(session){
  if(!session){removeAdminLink();return;}
  const {data,error}=await supabase.rpc('is_mangamorph_admin');
  if(error||data!==true){removeAdminLink();return;}
  ensureAdminLink();
}

supabase.auth.onAuthStateChange((_event,session)=>{
  setTimeout(()=>syncAdminAccess(session),0);
});

const {data:{session}}=await supabase.auth.getSession();
await syncAdminAccess(session);

window.addEventListener('mangamorph:profile-rendered',()=>{
  supabase.auth.getSession().then(({data:{session}})=>syncAdminAccess(session));
});
