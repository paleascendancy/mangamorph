import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if(!window.__mangamorphPageCommentsLoaded){
  window.__mangamorphPageCommentsLoaded=true;

  const supabase=createClient(
    "https://fnyellunugdfesprmvzm.supabase.co",
    "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const mangaId=Math.max(1,Number(new URLSearchParams(location.search).get("id"))||1);
  const ratings=document.querySelector("#ratings");
  const existing=document.querySelector("#comments");

  const section=document.createElement("section");
  section.className="manga-comments-direct";
  section.id="comments";
  section.innerHTML=`
    <div class="mm-comments-head">
      <div>
        <p class="eyebrow">COMUNIDADE</p>
        <h2>Comentários da obra</h2>
        <p>Converse sobre a obra com outros leitores.</p>
      </div>
      <span id="mmCommentCount">0 comentários</span>
    </div>

    <form class="mm-comment-composer" id="mmCommentForm">
      <div class="mm-comment-avatar" id="mmCommentAvatar"><span id="mmCommentInitials">?</span><img id="mmCommentAvatarImage" alt="" hidden></div>
      <div class="mm-comment-compose-main">
        <div class="mm-comment-compose-meta">
          <strong id="mmCommentComposerName">Entre para comentar</strong>
          <span id="mmCommentComposerHandle">Sua conta MangaMorph será exibida.</span>
        </div>
        <textarea id="mmCommentInput" maxlength="280" rows="3" placeholder="Escreva um comentário sobre esta obra…"></textarea>
        <div class="mm-comment-compose-footer">
          <span id="mmCommentChars">0/280</span>
          <button id="mmCommentSubmit" type="submit">Entrar para comentar</button>
        </div>
      </div>
    </form>

    <div class="mm-comments-state" id="mmCommentState">Carregando comentários…</div>
    <div class="mm-comments-list" id="mmCommentsList"></div>
  `;

  if(existing)existing.replaceWith(section);
  else if(ratings)ratings.insertAdjacentElement("beforebegin",section);
  else document.querySelector("#mangaPage")?.append(section);

  const style=document.createElement("style");
  style.id="mangamorphDirectCommentsStyles";
  style.textContent=`
    .manga-comments-direct{margin-top:1.2rem;padding:1rem;border:1px solid rgba(255,255,255,.06);border-radius:1rem;background:#0d1219}
    .mm-comments-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.8rem}
    .mm-comments-head h2{margin:0;font-size:clamp(1.55rem,3vw,2.2rem);letter-spacing:-.04em}
    .mm-comments-head p:not(.eyebrow){margin:.22rem 0 0;color:#748195;font-size:.72rem}
    .mm-comments-head>span{color:#788496;font-size:.66rem;white-space:nowrap}
    .mm-comment-composer{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.72rem;padding:.78rem;border:1px solid rgba(92,145,229,.13);border-radius:.88rem;background:#101720}
    .mm-comment-avatar{width:2.65rem;height:2.65rem;display:grid;place-items:center;overflow:hidden;border-radius:.78rem;background:linear-gradient(145deg,#244b7b,#17263a);color:#eaf3ff;font-size:.78rem;font-weight:900;flex:none}
    .mm-comment-avatar img{width:100%;height:100%;object-fit:cover}
    .mm-comment-compose-main{min-width:0}
    .mm-comment-compose-meta{display:flex;align-items:baseline;gap:.45rem;flex-wrap:wrap;margin-bottom:.48rem}
    .mm-comment-compose-meta strong{font-size:.72rem}.mm-comment-compose-meta span{color:#748195;font-size:.6rem}
    #mmCommentInput{display:block;width:100%;min-height:5.1rem;resize:vertical;padding:.72rem .78rem;border:1px solid rgba(255,255,255,.065);border-radius:.72rem;outline:0;background:#0b1118;color:#eef4fb;font:inherit;font-size:.75rem;line-height:1.5;transition:.16s}
    #mmCommentInput:focus{border-color:rgba(78,142,239,.52);box-shadow:0 0 0 3px rgba(78,142,239,.08)}
    #mmCommentInput::placeholder{color:#5f6e82}
    #mmCommentInput:disabled{opacity:.72;cursor:pointer}
    .mm-comment-compose-footer{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-top:.5rem}
    .mm-comment-compose-footer>span{color:#6e7c90;font-size:.58rem}
    #mmCommentSubmit{min-height:2.35rem;padding:0 .8rem;border:1px solid rgba(98,153,240,.22);border-radius:.66rem;background:#2d6ac6;color:white;font-size:.64rem;font-weight:850;cursor:pointer}
    #mmCommentSubmit:disabled{opacity:.55;cursor:wait}
    .mm-comments-state{padding:1.1rem .6rem;color:#718096;text-align:center;font-size:.68rem}
    .mm-comments-list{display:grid;gap:.48rem;margin-top:.75rem}
    .mm-comment-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.65rem;padding:.72rem;border:1px solid rgba(255,255,255,.05);border-radius:.78rem;background:#0f151d}
    .mm-comment-item-avatar{width:2.2rem;height:2.2rem;display:grid;place-items:center;overflow:hidden;border-radius:.65rem;background:#192536;color:#d8e8ff;font-size:.68rem;font-weight:850}
    .mm-comment-item-avatar img{width:100%;height:100%;object-fit:cover}
    .mm-comment-item-body{min-width:0}.mm-comment-item-top{display:flex;align-items:center;gap:.38rem;flex-wrap:wrap}
    .mm-comment-item-top strong{font-size:.7rem}.mm-comment-handle{color:#738197;font-size:.57rem}.mm-comment-date{margin-left:auto;color:#667488;font-size:.55rem}
    .mm-comment-item-body p{margin:.34rem 0 0;color:#c4ceda;font-size:.72rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
    .mm-comment-actions{display:flex;align-items:center;gap:.35rem;margin-top:.48rem}
    .mm-comment-actions button{min-height:1.8rem;padding:0 .5rem;border:1px solid rgba(255,255,255,.055);border-radius:.52rem;background:#141c26;color:#8c9bb0;font-size:.57rem;cursor:pointer}
    .mm-comment-actions button.active{color:#8eb9ff;border-color:rgba(85,147,239,.2);background:rgba(70,126,210,.08)}
    .mm-comment-you{padding:.12rem .3rem;border-radius:999px;background:rgba(72,137,232,.1);color:#80aff7;font-size:.48rem;font-weight:850;text-transform:uppercase}
    body.light .manga-comments-direct,body.light .mm-comment-composer,body.light .mm-comment-item{background:#fff;border-color:rgba(0,0,0,.07)}
    body.light #mmCommentInput{background:#f6f8fb;color:#171b22;border-color:rgba(0,0,0,.08)}
    body.light .mm-comment-item-body p{color:#343b47}
    body.light .mm-comment-actions button{background:#f3f5f8;color:#657184;border-color:rgba(0,0,0,.06)}
    body.light .mm-comments-head p:not(.eyebrow),body.light .mm-comment-compose-meta span{color:#697486}
    @media(max-width:560px){
      .manga-comments-direct{padding:.78rem;border-radius:.88rem}.mm-comments-head{align-items:flex-start;flex-direction:column;gap:.32rem}
      .mm-comment-composer{grid-template-columns:1fr}.mm-comment-avatar{width:2.35rem;height:2.35rem}.mm-comment-compose-footer{align-items:flex-end}
      #mmCommentSubmit{max-width:70%;padding:0 .65rem}.mm-comment-date{width:100%;margin-left:0}.mm-comment-item{padding:.65rem}
    }
  `;
  document.head.append(style);

  const form=document.querySelector("#mmCommentForm");
  const input=document.querySelector("#mmCommentInput");
  const submit=document.querySelector("#mmCommentSubmit");
  const list=document.querySelector("#mmCommentsList");
  const state=document.querySelector("#mmCommentState");
  const count=document.querySelector("#mmCommentCount");
  const chars=document.querySelector("#mmCommentChars");
  const composerName=document.querySelector("#mmCommentComposerName");
  const composerHandle=document.querySelector("#mmCommentComposerHandle");
  const avatar=document.querySelector("#mmCommentAvatar");
  const avatarImage=document.querySelector("#mmCommentAvatarImage");
  const initialsNode=document.querySelector("#mmCommentInitials");

  let session=null;
  let profile=null;
  let comments=[];
  let likes=[];

  function esc(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
  function initials(value){const parts=String(value||"Leitor").trim().split(/\s+/).filter(Boolean);return(parts.slice(0,2).map(x=>x[0]).join("")||"L").toUpperCase()}
  function safeImage(value){try{const u=new URL(String(value||""));return u.protocol==="https:"?u.toString():""}catch{return""}}
  function dateLabel(value){try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value)).replace(".","")}catch{return""}}
  function login(){const returnTo="manga.html?id="+mangaId+"#comments";location.href="index.html?auth=login&return="+encodeURIComponent(returnTo)}

  function updateComposer(){
    const logged=Boolean(session?.user&&profile);
    if(logged){
      const name=profile.display_name||profile.username||"Leitor";
      const image=safeImage(profile.avatar_url);
      composerName.textContent="Comentar como "+name;
      composerHandle.textContent=profile.username?"@"+profile.username+" · MangaMorph":"Conta MangaMorph";
      submit.textContent="Publicar";
      input.disabled=false;
      initialsNode.textContent=initials(name);
      if(image){avatarImage.src=image;avatarImage.hidden=false;initialsNode.hidden=true}else{avatarImage.hidden=true;initialsNode.hidden=false}
      avatar.style.background=profile.accent||"linear-gradient(145deg,#244b7b,#17263a)";
    }else{
      composerName.textContent="Entre para comentar";
      composerHandle.textContent="Faça login para participar da conversa.";
      submit.textContent="Entrar para comentar";
      input.disabled=true;
      input.placeholder="Entre na sua conta para escrever um comentário…";
      avatarImage.hidden=true;initialsNode.hidden=false;initialsNode.textContent="?";
    }
  }

  function likeCount(id){return likes.filter(x=>Number(x.comment_id)===Number(id)).length}
  function likedByMe(id){return Boolean(session?.user&&likes.some(x=>Number(x.comment_id)===Number(id)&&x.user_id===session.user.id))}

  function render(){
    const total=comments.length;
    count.textContent=total+(total===1?" comentário":" comentários");
    state.hidden=total>0;
    if(!total){state.textContent="Ainda não há comentários. Seja o primeiro a comentar.";list.innerHTML="";return}
    list.innerHTML=comments.map(comment=>{
      const author=comment.author||{};
      const name=author.display_name||author.username||"Leitor";
      const image=safeImage(author.avatar_url);
      const mine=session?.user?.id===comment.user_id;
      const liked=likedByMe(comment.id);
      const avatarHtml=image?`<img src="${esc(image)}" alt="" loading="lazy">`:`<span>${esc(initials(name))}</span>`;
      return `<article class="mm-comment-item" data-comment-id="${Number(comment.id)}">
        <div class="mm-comment-item-avatar">${avatarHtml}</div>
        <div class="mm-comment-item-body">
          <div class="mm-comment-item-top">
            <strong>${esc(name)}</strong>
            ${mine?'<span class="mm-comment-you">você</span>':''}
            ${author.username?`<span class="mm-comment-handle">@${esc(author.username)}</span>`:""}
            <span class="mm-comment-date">${esc(dateLabel(comment.created_at))}</span>
          </div>
          <p>${esc(comment.content)}</p>
          <div class="mm-comment-actions">
            <button type="button" data-mm-like="${Number(comment.id)}" class="${liked?"active":""}">♡ ${likeCount(comment.id)}</button>
            ${mine?`<button type="button" data-mm-delete="${Number(comment.id)}">Excluir</button>`:""}
          </div>
        </div>
      </article>`;
    }).join("");
  }

  async function loadLikes(){
    const ids=comments.map(x=>x.id);
    if(!ids.length){likes=[];return}
    const {data,error}=await supabase.from("mangamorph_comment_likes").select("comment_id,user_id").in("comment_id",ids);
    likes=error?[]:(data||[]);
  }

  async function loadComments(){
    state.hidden=false;state.textContent="Carregando comentários…";list.innerHTML="";
    const {data,error}=await supabase
      .from("mangamorph_comments")
      .select('id,manga_id,user_id,content,created_at,updated_at,author:mangamorph_profiles!mangamorph_comments_user_id_fkey(display_name,username,avatar_url,accent)')
      .eq("manga_id",mangaId)
      .order("created_at",{ascending:false})
      .limit(100);
    if(error){state.hidden=false;state.textContent="Não foi possível carregar os comentários agora.";return}
    comments=data||[];
    await loadLikes();
    render();
  }

  async function loadAccount(){
    const {data:{session:current}}=await supabase.auth.getSession();
    session=current;
    profile=null;
    if(session?.user){
      const {data}=await supabase.from("mangamorph_profiles").select("id,display_name,username,avatar_url,accent").eq("id",session.user.id).maybeSingle();
      profile=data||null;
    }
    updateComposer();
  }

  input.addEventListener("input",()=>{chars.textContent=input.value.length+"/280"});
  input.addEventListener("click",()=>{if(!session?.user)login()});

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!session?.user||!profile){login();return}
    const text=String(input.value||"").trim();
    if(!text)return;
    submit.disabled=true;submit.textContent="Publicando…";
    const {error}=await supabase.from("mangamorph_comments").insert({manga_id:mangaId,user_id:session.user.id,content:text.slice(0,280)});
    submit.disabled=false;submit.textContent="Publicar";
    if(error){state.hidden=false;state.textContent="Não foi possível publicar o comentário.";return}
    input.value="";chars.textContent="0/280";
    await loadComments();
  });

  list.addEventListener("click",async event=>{
    const like=event.target.closest("[data-mm-like]");
    const remove=event.target.closest("[data-mm-delete]");
    if(like){
      if(!session?.user){login();return}
      const id=Number(like.dataset.mmLike);like.disabled=true;
      if(likedByMe(id))await supabase.from("mangamorph_comment_likes").delete().eq("comment_id",id).eq("user_id",session.user.id);
      else await supabase.from("mangamorph_comment_likes").insert({comment_id:id,user_id:session.user.id});
      await loadLikes();render();return;
    }
    if(remove){
      if(!session?.user)return;
      const id=Number(remove.dataset.mmDelete);
      const target=comments.find(x=>Number(x.id)===id);
      if(!target||target.user_id!==session.user.id)return;
      remove.disabled=true;
      await supabase.from("mangamorph_comments").delete().eq("id",id).eq("user_id",session.user.id);
      await loadComments();
    }
  });

  await loadAccount();
  await loadComments();

  supabase.auth.onAuthStateChange(async(_event,newSession)=>{
    session=newSession;
    await loadAccount();
    await loadComments();
  });
}
