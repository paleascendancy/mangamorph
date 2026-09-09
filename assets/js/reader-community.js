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
let likes = [];
let reactions = [];

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

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function avatarUrl(value){
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
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
  if (!session?.user) return null;
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

  if (!logged) {
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
  commentLabel.textContent = "Comentar como " + name;
  commentMeta.textContent = "@" + profile.username;
  commentAvatar.style.setProperty("--avatar-accent",profile.accent || "#5b8def");
  commentInitials.textContent = initials(name);
  commentInitials.hidden = Boolean(image);
  commentImage.hidden = !image;
  if (image) commentImage.src = image;
}

async function loadLikes(){
  if (!comments.length) {
    likes = [];
    return;
  }
  const ids = comments.map(item => item.id);
  const {data,error} = await supabase
    .from("mangamorph_comment_likes")
    .select("comment_id,user_id")
    .in("comment_id",ids);
  likes = error ? [] : (data || []);
}

function likedByMe(commentId){
  return Boolean(session?.user && likes.some(row =>
    Number(row.comment_id) === Number(commentId) &&
    row.user_id === session.user.id
  ));
}

function likeCount(commentId){
  return likes.filter(row => Number(row.comment_id) === Number(commentId)).length;
}

function renderComments(){
  const count = comments.length;
  commentCount.textContent = count + (count === 1 ? " comentário" : " comentários");
  commentEmpty.hidden = count > 0;

  commentList.innerHTML = comments.map(item => {
    const author = item.author || {};
    const name = author.display_name || "Leitor";
    const username = author.username || "usuario";
    const image = avatarUrl(author.avatar_url);
    const mine = session?.user?.id === item.user_id;
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
          '<button type="button" data-like-comment="' + item.id + '" class="' + (likedByMe(item.id) ? 'active' : '') + '">♡ <span>' + likeCount(item.id) + '</span></button>' +
          (mine ? '<button type="button" data-delete-comment="' + item.id + '">Excluir</button>' : '') +
        '</div>' +
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

  if (error) {
    commentList.innerHTML = '<div class="chapter-community-error">Não foi possível carregar os comentários.</div>';
    commentEmpty.hidden = true;
    return;
  }

  comments = data || [];
  await loadLikes();
  renderComments();
}

function myReaction(){
  if (!session?.user) return null;
  return reactions.find(row => row.user_id === session.user.id) || null;
}

function renderReactions(){
  const mine = myReaction();
  const total = reactions.length;
  reactionTotal.textContent = total + (total === 1 ? " reação" : " reações");

  reactionButtons.querySelectorAll("[data-reaction]").forEach(button => {
    const key = button.dataset.reaction;
    button.querySelector("small").textContent = reactions.filter(row => row.reaction === key).length;
    button.classList.toggle("active",mine?.reaction === key);
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
  if (!session?.user || !profile) {
    location.href = loginUrl();
    return;
  }

  const content = commentText.value.trim();
  if (!content) return;

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

  if (!error) {
    commentText.value = "";
    commentChars.textContent = "0/280";
    await loadComments();
  }
});

commentList.addEventListener("click",async event => {
  const like = event.target.closest("[data-like-comment]");
  const remove = event.target.closest("[data-delete-comment]");

  if (like) {
    if (!session?.user) {
      location.href = loginUrl();
      return;
    }
    const id = Number(like.dataset.likeComment);
    like.disabled = true;

    if (likedByMe(id)) {
      await supabase.from("mangamorph_comment_likes")
        .delete()
        .eq("comment_id",id)
        .eq("user_id",session.user.id);
    } else {
      await supabase.from("mangamorph_comment_likes")
        .insert({comment_id:id,user_id:session.user.id});
    }
    await loadLikes();
    renderComments();
  }

  if (remove && session?.user) {
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
  if (!button) return;

  if (!session?.user || !profile) {
    location.href = loginUrl();
    return;
  }

  const reaction = button.dataset.reaction;
  const existing = myReaction();
  reactionButtons.querySelectorAll("button").forEach(item => item.disabled = true);

  if (existing?.reaction === reaction) {
    await supabase.from("mangamorph_reactions")
      .delete()
      .eq("manga_id",mangaId)
      .eq("chapter_number",chapter)
      .eq("user_id",session.user.id);
  } else {
    await supabase.from("mangamorph_reactions").upsert({
      manga_id:mangaId,
      chapter_number:chapter,
      user_id:session.user.id,
      reaction
    },{onConflict:"manga_id,chapter_number,user_id"});
  }

  await loadReactions();
  reactionButtons.querySelectorAll("button").forEach(item => item.disabled = false);
});

window.addEventListener("mangamorph:reader-chapter-change",async event => {
  mangaId = Number(event.detail?.mangaId) || mangaId;
  chapter = Number(event.detail?.chapter) || chapter;
  comments = [];
  likes = [];
  reactions = [];
  await refreshChapter();
});

supabase.auth.onAuthStateChange((event,nextSession) => {
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
    setTimeout(async () => {
      session = nextSession;
      profile = await loadProfile();
      renderComposer();
      await refreshChapter();
    },0);
  } else if (event === "SIGNED_OUT") {
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

if (location.hash === "#chapter-community") {
  document.querySelector("#chapterCommunity")?.scrollIntoView({block:"start"});
}
