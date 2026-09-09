import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const supabase=createClient("https://fnyellunugdfesprmvzm.supabase.co","sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK");
const username=new URLSearchParams(location.search).get("user")||"";
const $=id=>document.querySelector("#"+id);
function initials(name){return String(name||"MM").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"MM"}
function safeUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:""}catch{return""}}
function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
async function load(){
  if(!username)return fail();
  const {data:profile,error}=await supabase.from("mangamorph_profiles").select("id,username,display_name,bio,accent,avatar_url,is_public,show_activity").eq("username",username).maybeSingle();
  if(error||!profile||!profile.is_public)return fail();
  document.title="MangaMorph — "+profile.display_name;
  $("publicDisplayName").textContent=profile.display_name;$("publicUsername").textContent="@"+profile.username;$("publicBio").textContent=profile.bio||"Leitor do MangaMorph.";
  $("publicAvatar").style.setProperty("--accent",profile.accent||"#5b8def");
  const image=safeUrl(profile.avatar_url);$("publicAvatarInitials").textContent=initials(profile.display_name);$("publicAvatarImage").hidden=!image;$("publicAvatarInitials").hidden=!!image;if(image)$("publicAvatarImage").src=image;
  const {data:stats}=await supabase.rpc("get_mangamorph_public_profile_stats",{profile_username:profile.username});
  const s=stats?.[0]||{};$("publicRatingCount").textContent=s.ratings_count||0;$("publicCommentCount").textContent=s.comments_count||0;$("publicReactionCount").textContent=s.reactions_count||0;
  if(!profile.show_activity){$("publicActivity").innerHTML='<div class="public-empty">Este usuário ocultou a atividade pública.</div>';return}
  const {data:ratings}=await supabase.from("mangamorph_ratings").select("manga_id,overall,story,art,characters,enjoyment,updated_at").eq("user_id",profile.id).order("updated_at",{ascending:false}).limit(12);
  if(!ratings?.length){$("publicActivity").innerHTML='<div class="public-empty">Nenhuma avaliação pública ainda.</div>';return}
  const ids=[...new Set(ratings.map(r=>r.manga_id))];
  const {data:mangas}=await supabase.from("mangamorph_mangas").select("id,title,type").in("id",ids);
  const map=new Map((mangas||[]).map(m=>[m.id,m]));
  $("publicActivity").innerHTML=ratings.map(r=>{const m=map.get(r.manga_id)||{title:"Obra",type:""};return '<a class="public-activity-row" href="manga.html?id='+r.manga_id+'"><div><strong>'+esc(m.title)+'</strong><span>'+esc(m.type)+' · '+new Date(r.updated_at).toLocaleDateString("pt-BR")+'</span></div><span class="public-score">★ '+Number(r.overall).toFixed(1).replace(".",",")+'</span></a>'}).join("");
}
function fail(){$("publicProfileCard").hidden=true;document.querySelector(".public-stats").hidden=true;document.querySelector(".public-section").hidden=true;$("publicError").hidden=false}
await load();