import("./theme-system.js?v=111").catch(()=>{});

const SUPABASE_URL="https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY="sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const $=id=>document.getElementById(id);
const page=$("publicProfilePage");
const card=$("publicProfileCard");
const stats=document.querySelector(".public-stats");
const activitySection=$("publicActivitySection");
const errorBox=$("publicError");
const errorMessage=$("publicErrorMessage");
let supabase=null;
let profileId=null;
let liveChannel=null;
let loadTimer=null;

function initials(name){
  return String(name||"MM").trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"MM";
}

function safeUrl(value){
  try{
    const url=new URL(String(value||""));
    return url.protocol==="https:"?url.href:"";
  }catch{return""}
}

function esc(value){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function requestedUsername(){
  const fromUrl=(new URLSearchParams(location.search).get("user")||"").trim().replace(/^@/,"").toLowerCase();
  if(fromUrl)return fromUrl;
  try{
    const local=JSON.parse(localStorage.getItem("mangamorph:profile")||"null");
    return String(local?.username||"").trim().replace(/^@/,"").toLowerCase();
  }catch{return""}
}

function setBusy(value){
  page?.setAttribute("aria-busy",value?"true":"false");
}

function showProfile(){
  if(card)card.hidden=false;
  if(stats)stats.hidden=false;
  if(activitySection)activitySection.hidden=false;
  if(errorBox)errorBox.hidden=true;
}

function fail(message="Este perfil pode estar privado, ter sido renomeado ou estar temporariamente indisponível."){
  setBusy(false);
  if(card)card.hidden=true;
  if(stats)stats.hidden=true;
  if(activitySection)activitySection.hidden=true;
  if(errorMessage)errorMessage.textContent=message;
  if(errorBox)errorBox.hidden=false;
}

function isOwnProfile(profile){
  if(localStorage.getItem("mangamorph:profile-session")!=="on")return false;
  try{
    const local=JSON.parse(localStorage.getItem("mangamorph:profile")||"null");
    return Boolean(local?.username&&String(local.username).toLowerCase()===String(profile.username).toLowerCase());
  }catch{return false}
}

function renderIdentity(profile){
  document.title=`MangaMorph — ${profile.display_name||profile.username}`;
  $("publicDisplayName").textContent=profile.display_name||profile.username;
  $("publicUsername").textContent="@"+profile.username;
  $("publicBio").textContent=profile.bio||"Leitor do MangaMorph.";
  card?.style.setProperty("--accent",profile.accent||"#5d769c");

  const image=safeUrl(profile.avatar_url);
  const avatarImage=$("publicAvatarImage");
  const avatarInitials=$("publicAvatarInitials");
  avatarInitials.textContent=initials(profile.display_name||profile.username);
  avatarImage.hidden=!image;
  avatarInitials.hidden=Boolean(image);
  if(image){
    avatarImage.src=image;
    avatarImage.alt=`Foto de perfil de ${profile.display_name||profile.username}`;
  }else{
    avatarImage.removeAttribute("src");
  }

  const own=isOwnProfile(profile);
  const badge=$("publicProfileBadge");
  if(badge)badge.textContent=own?"Seu perfil":"Público";
  const manage=$("publicManageProfile");
  if(manage)manage.hidden=!own;
}

function renderStats(data){
  const value=Array.isArray(data)?data[0]:(data||{});
  $("publicRatingCount").textContent=Number(value?.ratings_count||0).toLocaleString("pt-BR");
  $("publicCommentCount").textContent=Number(value?.comments_count||0).toLocaleString("pt-BR");
  $("publicReactionCount").textContent=Number(value?.reactions_count||0).toLocaleString("pt-BR");
}

function renderActivity(profile,ratings,mangas){
  const root=$("publicActivity");
  if(!profile.show_activity){
    root.innerHTML='<div class="public-empty">Este leitor optou por ocultar a atividade pública.</div>';
    return;
  }
  if(!ratings?.length){
    root.innerHTML='<div class="public-empty">Nenhuma avaliação pública ainda.</div>';
    return;
  }

  const mangaMap=new Map((mangas||[]).map(manga=>[String(manga.id),manga]));
  root.innerHTML=ratings.map(rating=>{
    const manga=mangaMap.get(String(rating.manga_id))||{title:"Obra",type:""};
    const date=rating.updated_at?new Date(rating.updated_at).toLocaleDateString("pt-BR"):"";
    const score=Number(rating.overall);
    const scoreText=Number.isFinite(score)?score.toFixed(1).replace(".",","):"—";
    const meta=[manga.type,date].filter(Boolean).join(" · ");
    return `<a class="public-activity-row" href="manga.html?id=${encodeURIComponent(rating.manga_id)}"><div><strong>${esc(manga.title||"Obra")}</strong><span>${esc(meta)}</span></div><span class="public-score">★ ${scoreText}</span></a>`;
  }).join("");
}

async function load(){
  const username=requestedUsername();
  if(!username){
    fail("Abra o perfil a partir de uma conta do MangaMorph ou informe um @usuário válido.");
    return;
  }

  setBusy(true);
  try{
    const {data:profile,error}=await supabase
      .from("mangamorph_profiles")
      .select("id,username,display_name,bio,accent,avatar_url,is_public,show_activity,show_favorites")
      .eq("username",username)
      .maybeSingle();

    if(error)throw error;
    if(!profile||!profile.is_public){
      fail("Este perfil não existe ou está configurado como privado.");
      return;
    }

    profileId=profile.id;
    showProfile();
    renderIdentity(profile);

    const statsPromise=supabase.rpc("get_mangamorph_public_profile_stats",{profile_username:profile.username});
    const ratingsPromise=profile.show_activity
      ? supabase.from("mangamorph_ratings").select("manga_id,overall,updated_at").eq("user_id",profile.id).order("updated_at",{ascending:false}).limit(12)
      : Promise.resolve({data:[],error:null});

    const [statsResult,ratingsResult]=await Promise.all([statsPromise,ratingsPromise]);
    if(!statsResult.error)renderStats(statsResult.data);else renderStats({});

    let ratings=ratingsResult.error?[]:(ratingsResult.data||[]);
    let mangas=[];
    if(ratings.length){
      const ids=[...new Set(ratings.map(item=>item.manga_id))];
      const mangaResult=await supabase.from("mangamorph_mangas").select("id,title,type").in("id",ids);
      if(!mangaResult.error)mangas=mangaResult.data||[];
    }
    renderActivity(profile,ratings,mangas);
    setBusy(false);
  }catch(error){
    console.warn("MangaMorph public profile unavailable:",error);
    fail("Não foi possível carregar este perfil agora. Tente novamente em instantes.");
  }
}

function queueLoad(){
  clearTimeout(loadTimer);
  loadTimer=setTimeout(load,140);
}

async function boot(){
  try{
    const module=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabase=module.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  }catch(error){
    console.warn("MangaMorph profile service unavailable:",error);
    fail("Não foi possível conectar ao serviço de perfis. Verifique sua conexão e tente novamente.");
    return;
  }

  await load();
  if(profileId){
    liveChannel=supabase
      .channel("mangamorph-public-profile-"+profileId)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"mangamorph_profiles",filter:"id=eq."+profileId},queueLoad)
      .on("postgres_changes",{event:"*",schema:"public",table:"mangamorph_ratings",filter:"user_id=eq."+profileId},queueLoad)
      .subscribe();
  }
}

window.addEventListener("focus",()=>{if(supabase)queueLoad()});
window.addEventListener("pageshow",event=>{if(event.persisted&&supabase)queueLoad()});
window.addEventListener("beforeunload",()=>{if(liveChannel&&supabase)try{supabase.removeChannel(liveChannel)}catch{}});

boot();
