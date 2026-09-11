import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

if(!window.__mangamorphPageCommentsLoaded){
  window.__mangamorphPageCommentsLoaded=true;

  const supabase=createClient(
    "https://fnyellunugdfesprmvzm.supabase.co",
    "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK",
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
  );

  const mangaId=Math.max(1,Number(new URLSearchParams(location.search).get("id"))||1);
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const safeUrl=value=>{try{const url=new URL(String(value||""));return url.protocol==="https:"?url.href:""}catch{return""}};
  const initials=name=>(String(name||"Leitor").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("")||"L").toUpperCase();
  const fmtDate=value=>{try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value)).replace(".","")}catch{return""}};

  let session=null;
  let profile=null;
  let comments=[];
  let likes=[];
  let sending=false;

  function removeLegacyComments(){
    $("#tabComments")?.remove();
    $("#panelComments")?.remove();
    document.querySelectorAll(".work-comments-section,.work-comments-note").forEach(node=>node.closest("#panelComments")?.remove());
  }

  removeLegacyComments();
  const cleanupObserver=new MutationObserver(removeLegacyComments);
  cleanupObserver.observe(document.body,{childList:true,subtree:true});

  const ratings=$("#ratings");
  const oldDirect=$("#comments");
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
      <div class="mm-comment-avatar" id="mmCommentAvatar">
        <span id="mmCommentInitials">?</span>
        <img id="mmCommentAvatarImage" alt="" hidden>
      </div>
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

  if(oldDirect)oldDirect.replaceWith(section);
  else if(ratings)ratings.insertAdjacentElement("beforebegin",section);
  else $("#mangaPage")?.append(section);

  const style=document.createElement("style");
  style.id="mangamorphDirectCommentsStyles";
  style.textContent=`
    .manga-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .manga-comments-direct{margin-top:1.2rem;padding:1rem;border:1px solid rgba(255,255,255,.06);border-radius:1rem;background:#0d1219}
    .mm-comments-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.8rem}
    .mm-comments-head h2{margin:0;font-size:clamp(1.55rem,3vw,2.2rem);letter-spacing:-.04em}
    .mm-comments-head p:not(.eyebrow){margin:.22rem 0 0;color:#748195;font-size:.72rem}
    .mm-comments-head>span{color:#788496;font-size:.66rem;white-space:nowrap}
    .mm-comment-composer{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.72rem;padding:.8rem;border:1px solid rgba(92,145,229,.14);border-radius:.9rem;background:#101720}
    .mm-comment-avatar{width:2.8rem;height:2.8rem;display:grid;place-items:center;overflow:hidden;border-radius:.85rem;background:linear-gradient(145deg,var(--avatar-accent,#526782),#202a38);color:#fff;font-size:.72rem;font-weight:900;flex:none}
    .mm-comment-avatar img{width:100%;height:100%;object-fit:cover}
    .mm-comment-compose-main{min-width:0}.mm-comment-compose-meta{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem}.mm-comment-compose-meta strong{font-size:.72rem}.mm-comment-compose-meta span{color:#748195;font-size:.6rem}
    #mmCommentInput{width:100%;min-height:6.4rem;resize:vertical;padding:.7rem .75rem;border:1px solid rgba(255,255,255,.065);border-radius:.72rem;outline:0;background:#0c121a;color:#edf3fb;font:inherit;font-size:.75rem;line-height:1.5;box-sizing:border-box}
    #mmCommentInput:focus{border-color:rgba(74,132,224,.5);box-shadow:0 0 0 3px rgba(74,132,224,.08)}#mmCommentInput:disabled{opacity:.62;cursor:not-allowed}
    .mm-comment-compose-footer{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-top:.5rem}.mm-comment-compose-footer>span{color:#718096;font-size:.62rem}.mm-comment-compose-footer button{min-height:2.35rem;padding:0 .85rem;border:0;border-radius:.68rem;background:#2f70d3;color:#fff;font-size:.66rem;font-weight:850;cursor:pointer}.mm-comment-compose-footer button:disabled{opacity:.58;cursor:wait}
    .mm-comments-state{padding:1rem 0;color:#7b8799;text-align:center;font-size:.68rem}.mm-comments-state[hidden]{display:none}
    .mm-comments-list{display:grid;gap:.5rem;margin-top:.78rem}.mm-comment-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.65rem;padding:.72rem;border:1px solid rgba(255,255,255,.055);border-radius:.8rem;background:#0f151d}.mm-comment-card-avatar{width:2.35rem;height:2.35rem;display:grid;place-items:center;overflow:hidden;border-radius:.72rem;background:linear-gradient(145deg,var(--comment-accent,#526782),#202a38);color:#fff;font-size:.65rem;font-weight:900}.mm-comment-card-avatar img{width:100%;height:100%;object-fit:cover}.mm-comment-card-main{min-width:0}.mm-comment-card-head{display:flex;align-items:center;justify-content:space-between;gap:.7rem}.mm-comment-card-author{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}.mm-comment-card-author strong{font-size:.7rem}.mm-comment-card-author span,.mm-comment-card-head>span{color:#748195;font-size:.56rem}.mm-comment-scope{padding:.13rem .32rem;border-radius:999px;background:rgba(75,132,224,.1);color:#78a7ef!important;font-size:.5rem!important;font-weight:800}.mm-comment-card p{margin:.3rem 0 0;color:#b9c3d1;font-size:.68rem;line-height:1.52;white-space:pre-wrap;overflow-wrap:anywhere}.mm-comment-card-actions{display:flex;gap:.4rem;margin-top:.45rem}.mm-comment-card-actions button{min-height:1.85rem;padding:0 .48rem;border:1px solid rgba(255,255,255,.055);border-radius:.52rem;background:#151d27;color:#9aa8ba;font-size:.55rem;font-weight:750;cursor:pointer}.mm-comment-card-actions button.active{color:#7eaeff;border-color:rgba(76,139,255,.18);background:rgba(76,139,255,.08)}
    body.light .manga-comments-direct,body.light .mm-comment-composer,body.light .mm-comment-card{background:#fff;border-color:rgba(0,0,0,.07);color:#11151d}body.light #mmCommentInput{background:#f7f9fc;color:#11151d;border-color:rgba(0,0,0,.08)}body.light .mm-comment-card p{color:#5f6877}body.light .mm-comment-card-actions button{background:#f3f6fa;border-color:rgba(0,0,0,.06);color:#657286}
    @media(max-width:560px){.manga-comments-direct{padding:.8rem}.mm-comments-head{align-items:flex-start;flex-direction:column;gap:.35rem}.mm-comment-composer{grid-template-columns:1fr}.mm-comment-avatar{width:2.55rem;height:2.55rem}.mm-comment-compose-footer button{min-height:2.6rem}.manga-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  `;
  document.head.append(style);

  const form=$("#mmCommentForm");
  const input=$("#mmCommentInput");
  const submit=$("#mmCommentSubmit");
  const chars=$("#mmCommentChars");
  const count=$("#mmCommentCount");
  const state=$("#mmCommentState");
  const list=$("#mmCommentsList");
  const avatar=$("#mmCommentAvatar");
  const avatarImage=$("#mmCommentAvatarImage");
  const avatarInitials=$("#mmCommentInitials");
  const composerName=$("#mmCommentComposerName");
  const composerHandle=$("#mmCommentComposerHandle");

  function loginUrl(){
    return "index.html?auth=login&return="+encodeURIComponent("manga.html?id="+mangaId+"#comments");
  }

  function renderComposer(){
    const logged=Boolean(session?.user&&profile);
    input.disabled=!logged;
    submit.disabled=false;
    submit.textContent=logged?"Publicar":"Entrar para comentar";
    if(!logged){
      composerName.textContent="Entre para comentar";
      composerHandle.textContent="Sua conta MangaMorph será exibida.";
      avatarImage.hidden=true;
      avatarInitials.hidden=false;
      avatarInitials.textContent="?";
      return;
    }
    const name=profile.display_name||profile.username||"Leitor";
    const image=safeUrl(profile.avatar_url);
    composerName.textContent="Comentar como "+name;
    composerHandle.textContent="@"+(profile.username||"leitor")+" · MangaMorph";
    avatar.style.setProperty("--avatar-accent",profile.accent||"#5b8def");
    avatarInitials.textContent=initials(name);
    avatarInitials.hidden=Boolean(image);
    avatarImage.hidden=!image;
    if(image)avatarImage.src=image;
  }

  function likeCount(commentId){return likes.filter(row=>Number(row.comment_id)===Number(commentId)).length}
  function likedByMe(commentId){return Boolean(session?.user&&likes.some(row=>Number(row.comment_id)===Number(commentId)&&row.user_id===session.user.id))}

  function renderComments(){
    count.textContent=comments.length+(comments.length===1?" comentário":" comentários");
    if(!comments.length){
      state.hidden=false;
      state.textContent="Ainda não há comentários nesta obra.";
      list.innerHTML="";
      return;
    }
    state.hidden=true;
    list.innerHTML=comments.map(comment=>{
      const author=comment.author||{};
      const name=author.display_name||author.username||"Leitor";
      const image=safeUrl(author.avatar_url);
      const mine=session?.user?.id===comment.user_id;
      const liked=likedByMe(comment.id);
      const scope=comment.chapter_number==null?"Obra":"Cap. "+comment.chapter_number;
      return `<article class="mm-comment-card" data-comment-id="${comment.id}">
        <div class="mm-comment-card-avatar" style="--comment-accent:${esc(author.accent||"#526782")}">${image?`<img src="${esc(image)}" alt="" loading="lazy">`:`<span>${esc(initials(name))}</span>`}</div>
        <div class="mm-comment-card-main">
          <div class="mm-comment-card-head">
            <div class="mm-comment-card-author"><strong>${esc(name)}</strong><span>@${esc(author.username||"leitor")}</span><span class="mm-comment-scope">${esc(scope)}</span></div>
            <span>${esc(fmtDate(comment.created_at))}</span>
          </div>
          <p>${esc(comment.content)}</p>
          <div class="mm-comment-card-actions">
            <button type="button" data-mm-like="${comment.id}" class="${liked?"active":""}">♡ ${likeCount(comment.id)}</button>
            ${mine?`<button type="button" data-mm-delete="${comment.id}">Excluir</button>`:""}
          </div>
        </div>
      </article>`;
    }).join("");
  }

  async function loadLikes(){
    const ids=comments.map(row=>row.id);
    if(!ids.length){likes=[];return}
    const {data,error}=await supabase.from("mangamorph_comment_likes").select("comment_id,user_id").in("comment_id",ids);
    likes=error?[]:(data||[]);
  }

  async function loadComments(){
    state.hidden=false;
    state.textContent="Carregando comentários…";
    const {data,error}=await supabase.from("mangamorph_comments")
      .select('id,manga_id,chapter_number,user_id,content,created_at,author:mangamorph_profiles!mangamorph_comments_user_id_fkey(display_name,username,avatar_url,accent)')
      .eq("manga_id",mangaId)
      .order("created_at",{ascending:false})
      .limit(100);
    if(error){
      state.hidden=false;
      state.textContent="Não foi possível carregar os comentários agora.";
      console.error("MangaMorph comments load:",error);
      return;
    }
    comments=data||[];
    await loadLikes();
    renderComments();
  }

  input.addEventListener("input",()=>{chars.textContent=input.value.length+"/280"});

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!session?.user||!profile){location.href=loginUrl();return}
    const text=input.value.trim();
    if(!text||sending)return;
    sending=true;
    submit.disabled=true;
    submit.textContent="Publicando…";
    state.hidden=true;

    const {error}=await supabase.from("mangamorph_comments").insert({
      manga_id:mangaId,
      user_id:session.user.id,
      content:text.slice(0,280),
      chapter_number:null
    });

    sending=false;
    submit.disabled=false;
    submit.textContent="Publicar";

    if(error){
      console.error("MangaMorph comment publish:",error);
      state.hidden=false;
      state.textContent="Não foi possível publicar o comentário. Tente novamente.";
      return;
    }

    input.value="";
    chars.textContent="0/280";
    state.hidden=false;
    state.textContent="Comentário publicado.";
    await loadComments();
  });

  list.addEventListener("click",async event=>{
    const like=event.target.closest("[data-mm-like]");
    const del=event.target.closest("[data-mm-delete]");
    if(like){
      if(!session?.user){location.href=loginUrl();return}
      const id=Number(like.dataset.mmLike);
      like.disabled=true;
      if(likedByMe(id)){
        await supabase.from("mangamorph_comment_likes").delete().eq("comment_id",id).eq("user_id",session.user.id);
      }else{
        await supabase.from("mangamorph_comment_likes").insert({comment_id:id,user_id:session.user.id});
      }
      await loadComments();
      return;
    }
    if(del){
      if(!session?.user)return;
      const id=Number(del.dataset.mmDelete);
      const row=comments.find(item=>Number(item.id)===id);
      if(!row||row.user_id!==session.user.id)return;
      del.disabled=true;
      const {error}=await supabase.from("mangamorph_comments").delete().eq("id",id).eq("user_id",session.user.id);
      if(error){state.hidden=false;state.textContent="Não foi possível excluir o comentário.";return}
      await loadComments();
    }
  });

  const {data:{session:currentSession}}=await supabase.auth.getSession();
  session=currentSession;
  if(session?.user){
    const {data}=await supabase.from("mangamorph_profiles").select("id,display_name,username,avatar_url,accent").eq("id",session.user.id).maybeSingle();
    profile=data||null;
  }
  renderComposer();
  await loadComments();

  supabase.auth.onAuthStateChange(async(_event,nextSession)=>{
    session=nextSession;
    profile=null;
    if(session?.user){
      const {data}=await supabase.from("mangamorph_profiles").select("id,display_name,username,avatar_url,accent").eq("id",session.user.id).maybeSingle();
      profile=data||null;
    }
    renderComposer();
    await loadComments();
  });
}