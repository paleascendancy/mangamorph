import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const supabase = createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

let mangaId = Math.max(1,Number(new URLSearchParams(location.search).get("id")) || 1);
let chapter = Math.max(1,Number(new URLSearchParams(location.search).get("chapter")) || 1);
let session = null;
let profile = null;
let comments = [];
let votes = [];
let reactions = [];
let replies = [];
let replyingTo = null;
let commentSort = "recent";

const title = document.querySelector("#chapterCommunityTitle");
const reactionTotal = document.querySelector("#chapterReactionTotal");
const reactionButtons = document.querySelector("#chapterReactionButtons");
const commentCount = document.querySelector("#chapterCommentCount");
const commentForm = document.querySelector("#chapterCommentForm");
const commentAvatar = document.querySelector("#chapterCommentAvatar");
const commentImage = document.querySelector("#chapterCommentImage");
const commentInitials = document.querySelector("#chapterCommentInitials");
const commentLabel = document.querySelector("#chapterCommentLabel");
const commentText = document.querySelector("#chapterCommentText");
const commentChars = document.querySelector("#chapterCommentChars");
const commentMeta = document.querySelector("#chapterCommentMeta");
const commentSubmit = document.querySelector("#chapterCommentSubmit");
const commentList = document.querySelector("#chapterCommentList");
const commentEmpty = document.querySelector("#chapterCommentEmpty");
const commentSortSelect = document.querySelector("#chapterCommentSort");

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function avatarUrl(value){
  try{
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  }catch{
    return "";
  }
}

function initials(name){
  const parts = String(name || "Leitor").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(part => part[0]).join("") || "L").toUpperCase();
}

function formatDate(value){
  return new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"
  }).format(new Date(value)).replace(".","");
}

function loginUrl(){
  const returnTo = "reader.html?id=" + mangaId + "&chapter=" + chapter + "#chapter-community";
  return "index.html?auth=login&return=" + encodeURIComponent(returnTo);
}

async function loadProfile(){
  if(!session?.user) return null;
  const {data,error} = await supabase
    .from("mangamorph_profiles")
    .select("id,display_name,username,avatar_url,accent")
    .eq("id",session.user.id)
    .maybeSingle();
  return error ? null : data;
}

function renderComposer(){
  const logged = Boolean(session?.user && profile);
  commentText.disabled = !logged;
  commentSubmit.textContent = logged ? "Publicar" : "Entrar";

  if(!logged){
    commentLabel.textContent = "Entre para comentar";
    commentMeta.textContent = "Seu perfil aparece no comentário";
    commentImage.hidden = true;
    commentInitials.hidden = false;
    commentInitials.textContent = "?";
    commentAvatar.style.setProperty("--avatar-accent","#4d5d72");
    return;
  }

  const name = profile.display_name || "Leitor";
  const image = avatarUrl(profile.avatar_url);
  commentLabel.textContent = name;
  commentMeta.textContent = "@" + profile.username;
  commentAvatar.style.setProperty("--avatar-accent",profile.accent || "#5b8def");
  commentInitials.textContent = initials(name);
  commentInitials.hidden = Boolean(image);
  commentImage.hidden = !image;
  if(image) commentImage.src = image;
}

async function loadVotes(){
  if(!comments.length){
    votes = [];
    return;
  }
  const ids = comments.map(item => item.id);
  const {data,error} = await supabase
    .from("mangamorph_comment_votes")
    .select("comment_id,user_id,vote")
    .in("comment_id",ids);
  votes = error ? [] : (data || []);
}

function voteCount(commentId,value){
  return votes.filter(row =>
    Number(row.comment_id) === Number(commentId) &&
    Number(row.vote) === Number(value)
  ).length;
}

function myVote(commentId){
  if(!session?.user) return 0;
  const row = votes.find(row =>
    Number(row.comment_id) === Number(commentId) &&
    row.user_id === session.user.id
  );
  return row ? Number(row.vote) : 0;
}

function repliesFor(commentId){
  return replies.filter(row=>Number(row.comment_id)===Number(commentId));
}

function renderReplies(commentId){
  const rows=repliesFor(commentId);
  if(!rows.length)return "";
  return '<div class="chapter-replies">'+rows.map(reply=>{
    const author=reply.author||{},name=author.display_name||"Leitor",image=avatarUrl(author.avatar_url);
    const mine=session?.user?.id===reply.user_id;
    const avatar=image?'<img src="'+escapeHtml(image)+'" alt="" loading="lazy">':'<span>'+escapeHtml(initials(name))+'</span>';
    return '<div class="chapter-reply-item"><div class="chapter-comment-avatar reply" style="--avatar-accent:'+escapeHtml(author.accent||"#5b8def")+'">'+avatar+'</div><div><div class="chapter-reply-top"><strong>'+escapeHtml(name)+'</strong><span>@'+escapeHtml(author.username||"usuario")+'</span><time>'+escapeHtml(formatDate(reply.created_at))+'</time></div><p>'+escapeHtml(reply.content)+'</p>'+(mine?'<button type="button" data-delete-reply="'+reply.id+'">Excluir</button>':'')+'</div></div>';
  }).join("")+'</div>';
}

function renderReplyComposer(commentId){
  if(replyingTo!==Number(commentId))return "";
  return '<form class="chapter-reply-form" data-reply-form="'+commentId+'"><textarea maxlength="280" rows="2" placeholder="Escreva uma resposta..." required></textarea><div><button type="button" data-cancel-reply>Cancelar</button><button type="submit">Responder</button></div></form>';
}

function renderComments(){
  const count = comments.length;
  commentCount.textContent = count + (count === 1 ? " comentário" : " comentários");
  commentEmpty.hidden = count > 0;

  const ordered=comments.slice().sort((a,b)=>{
    if(commentSort==="top"){
      const scoreA=voteCount(a.id,1)-voteCount(a.id,-1),scoreB=voteCount(b.id,1)-voteCount(b.id,-1);
      return scoreB-scoreA||new Date(b.created_at)-new Date(a.created_at);
    }
    return new Date(b.created_at)-new Date(a.created_at);
  });

  commentList.innerHTML = ordered.map(item => {
    const author = item.author || {};
    const name = author.display_name || "Leitor";
    const username = author.username || "usuario";
    const image = avatarUrl(author.avatar_url);
    const mine = session?.user?.id === item.user_id;
    const currentVote = myVote(item.id);
    const avatar = image
      ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy">'
      : '<span>' + escapeHtml(initials(name)) + '</span>';

    return '<article class="chapter-comment-item">' +
      '<div class="chapter-comment-avatar small" style="--avatar-accent:' + escapeHtml(author.accent || "#5b8def") + '">' + avatar + '</div>' +
      '<div class="chapter-comment-body">' +
        '<div class="chapter-comment-top"><div><strong>' + escapeHtml(name) + '</strong>' +
          (mine ? '<b>você</b>' : '') +
          '<span>@' + escapeHtml(username) + '</span></div><time>' + escapeHtml(formatDate(item.created_at)) + '</time></div>' +
        '<p>' + escapeHtml(item.content) + '</p>' +
        '<div class="chapter-comment-actions">' +
          '<button type="button" data-vote-comment="' + item.id + '" data-vote-value="1" class="' + (currentVote === 1 ? 'active like' : '') + '">👍 <span>' + voteCount(item.id,1) + '</span></button>' +
          '<button type="button" data-vote-comment="' + item.id + '" data-vote-value="-1" class="' + (currentVote === -1 ? 'active dislike' : '') + '">👎 <span>' + voteCount(item.id,-1) + '</span></button>' +
          '<button type="button" data-reply-comment="' + item.id + '">Responder</button>' +
          (mine ? '<button type="button" data-edit-comment="' + item.id + '">Editar</button><button type="button" data-delete-comment="' + item.id + '" class="delete">Excluir</button>' : '<button type="button" data-report-comment="' + item.id + '" class="report">Denunciar</button>') +
        '</div>' +
        renderReplies(item.id) +
        renderReplyComposer(item.id) +
      '</div>' +
    '</article>';
  }).join("");
}

async function loadComments(){
  commentList.innerHTML = '<div class="chapter-community-loading">Carregando comentários...</div>';
  const {data,error} = await supabase
    .from("mangamorph_comments")
    .select('id,manga_id,chapter_number,user_id,content,created_at,author:mangamorph_profiles!mangamorph_comments_user_id_fkey(display_name,username,avatar_url,accent)')
    .eq("manga_id",mangaId)
    .eq("chapter_number",chapter)
    .order("created_at",{ascending:false})
    .limit(100);

  if(error){
    commentList.innerHTML = '<div class="chapter-community-error">Não foi possível carregar os comentários.</div>';
    commentEmpty.hidden = true;
    return;
  }

  comments = data || [];
  await Promise.all([loadVotes(),loadReplies()]);
  renderComments();
}

async function loadReplies(){
  if(!comments.length){replies=[];return}
  const ids=comments.map(item=>item.id);
  const {data,error}=await supabase
    .from("mangamorph_comment_replies")
    .select('id,comment_id,user_id,content,created_at,author:mangamorph_profiles!mangamorph_comment_replies_user_id_fkey(display_name,username,avatar_url,accent)')
    .in("comment_id",ids)
    .order("created_at",{ascending:true});
  replies=error?[]:(data||[]);
}

function myReactions(){
  if(!session?.user) return [];
  return reactions.filter(row => row.user_id === session.user.id).map(row => row.reaction);
}

function renderReactions(){
  const mine = new Set(myReactions());
  const total = reactions.length;
  reactionTotal.textContent = total + (total === 1 ? " reação" : " reações");

  reactionButtons.querySelectorAll("[data-reaction]").forEach(button => {
    const key = button.dataset.reaction;
    button.querySelector("small").textContent = reactions.filter(row => row.reaction === key).length;
    button.classList.toggle("active",mine.has(key));
  });
}

async function loadReactions(){
  const {data,error} = await supabase
    .from("mangamorph_reactions")
    .select("manga_id,chapter_number,user_id,reaction,created_at")
    .eq("manga_id",mangaId)
    .eq("chapter_number",chapter);
  reactions = error ? [] : (data || []);
  renderReactions();
}

async function refreshChapter(){
  title.textContent = "Capítulo " + chapter;
  await Promise.all([loadComments(),loadReactions()]);
}

commentText.addEventListener("input",() => {
  commentChars.textContent = commentText.value.length + "/280";
});

commentForm.addEventListener("submit",async event => {
  event.preventDefault();

  if(!session?.user || !profile){
    location.href = loginUrl();
    return;
  }

  const content = commentText.value.trim();
  if(!content) return;

  commentSubmit.disabled = true;
  commentSubmit.textContent = "Publicando...";

  const {error} = await supabase.from("mangamorph_comments").insert({
    manga_id:mangaId,
    chapter_number:chapter,
    user_id:session.user.id,
    content:content.slice(0,280)
  });

  commentSubmit.disabled = false;
  commentSubmit.textContent = "Publicar";

  if(!error){
    commentText.value = "";
    commentChars.textContent = "0/280";
    await loadComments();
  }
});

commentSortSelect.addEventListener("change",()=>{commentSort=commentSortSelect.value;renderComments()});

commentList.addEventListener("submit",async event=>{
  const form=event.target.closest("[data-reply-form]");if(!form)return;
  event.preventDefault();
  if(!session?.user||!profile){location.href=loginUrl();return}
  const text=form.querySelector("textarea").value.trim();if(!text)return;
  const commentId=Number(form.dataset.replyForm);
  const {error}=await supabase.from("mangamorph_comment_replies").insert({comment_id:commentId,user_id:session.user.id,content:text.slice(0,280)});
  if(!error){replyingTo=null;await loadReplies();renderComments()}
});

commentList.addEventListener("click",async event => {
  const voteButton = event.target.closest("[data-vote-comment]");
  const remove = event.target.closest("[data-delete-comment]");
  const replyButton=event.target.closest("[data-reply-comment]");
  const cancelReply=event.target.closest("[data-cancel-reply]");
  const editButton=event.target.closest("[data-edit-comment]");
  const reportButton=event.target.closest("[data-report-comment]");
  const deleteReply=event.target.closest("[data-delete-reply]");

  if(replyButton){if(!session?.user){location.href=loginUrl();return}replyingTo=Number(replyButton.dataset.replyComment);renderComments();return}
  if(cancelReply){replyingTo=null;renderComments();return}
  if(editButton&&session?.user){
    const id=Number(editButton.dataset.editComment),item=comments.find(x=>Number(x.id)===id);if(!item)return;
    const next=prompt("Editar comentário",item.content);if(next===null)return;
    const text=next.trim();if(!text)return;
    await supabase.from("mangamorph_comments").update({content:text.slice(0,280)}).eq("id",id).eq("user_id",session.user.id);
    await loadComments();return;
  }
  if(reportButton){
    if(!session?.user){location.href=loginUrl();return}
    if(!confirm("Denunciar este comentário para a moderação?"))return;
    await supabase.from("mangamorph_reports").insert({reporter_id:session.user.id,target_type:"comment",target_id:String(reportButton.dataset.reportComment),reason:"Conteúdo inadequado",details:"Denúncia enviada pelo leitor do capítulo."});
    reportButton.textContent="Denunciado";reportButton.disabled=true;return;
  }
  if(deleteReply&&session?.user){
    await supabase.from("mangamorph_comment_replies").delete().eq("id",Number(deleteReply.dataset.deleteReply)).eq("user_id",session.user.id);
    await loadReplies();renderComments();return;
  }

  if(voteButton){
    if(!session?.user){
      location.href = loginUrl();
      return;
    }

    const commentId = Number(voteButton.dataset.voteComment);
    const nextVote = Number(voteButton.dataset.voteValue);
    const currentVote = myVote(commentId);
    voteButton.disabled = true;

    if(currentVote === nextVote){
      await supabase.from("mangamorph_comment_votes")
        .delete()
        .eq("comment_id",commentId)
        .eq("user_id",session.user.id);
    }else{
      await supabase.from("mangamorph_comment_votes").upsert({
        comment_id:commentId,
        user_id:session.user.id,
        vote:nextVote
      },{onConflict:"comment_id,user_id"});
    }

    await loadVotes();
    renderComments();
    return;
  }

  if(remove && session?.user){
    const id = Number(remove.dataset.deleteComment);
    remove.disabled = true;
    await supabase.from("mangamorph_comments")
      .delete()
      .eq("id",id)
      .eq("user_id",session.user.id);
    await loadComments();
  }
});

reactionButtons.addEventListener("click",async event => {
  const button = event.target.closest("[data-reaction]");
  if(!button) return;

  if(!session?.user || !profile){
    location.href = loginUrl();
    return;
  }

  const reaction = button.dataset.reaction;
  const mine = new Set(myReactions());
  button.disabled = true;

  if(mine.has(reaction)){
    await supabase.from("mangamorph_reactions")
      .delete()
      .eq("manga_id",mangaId)
      .eq("chapter_number",chapter)
      .eq("user_id",session.user.id)
      .eq("reaction",reaction);
  }else{
    if(reaction === "like" || reaction === "dislike"){
      const opposite = reaction === "like" ? "dislike" : "like";
      await supabase.from("mangamorph_reactions")
        .delete()
        .eq("manga_id",mangaId)
        .eq("chapter_number",chapter)
        .eq("user_id",session.user.id)
        .eq("reaction",opposite);
    }

    await supabase.from("mangamorph_reactions").insert({
      manga_id:mangaId,
      chapter_number:chapter,
      user_id:session.user.id,
      reaction
    });
  }

  await loadReactions();
  button.disabled = false;
});

window.addEventListener("mangamorph:reader-chapter-change",async event => {
  mangaId = Number(event.detail?.mangaId) || mangaId;
  chapter = Number(event.detail?.chapter) || chapter;
  comments = [];
  votes = [];
  reactions = [];
  replies = [];
  replyingTo = null;
  await refreshChapter();
});

supabase.auth.onAuthStateChange((event,nextSession) => {
  if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED"){
    setTimeout(async () => {
      session = nextSession;
      profile = await loadProfile();
      renderComposer();
      await refreshChapter();
    },0);
  }else if(event === "SIGNED_OUT"){
    setTimeout(async () => {
      session = null;
      profile = null;
      renderComposer();
      await refreshChapter();
    },0);
  }
});

const {data:{session:initialSession}} = await supabase.auth.getSession();
session = initialSession;
profile = await loadProfile();
renderComposer();
await refreshChapter();

if(location.hash === "#chapter-community"){
  document.querySelector("#chapterCommunity")?.scrollIntoView({block:"start"});
}
