import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const supabase = createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

const mangaId = Math.max(1,Number(new URLSearchParams(location.search).get("id")) || 1);

const commentForm = document.querySelector("#commentForm");
const commentInput = document.querySelector("#commentInput");
const commentList = document.querySelector("#commentList");
const commentEmpty = document.querySelector("#commentEmpty");
const commentCharCount = document.querySelector("#commentCharCount");
const commentCountLabel = document.querySelector("#commentCountLabel");
const commentSubmit = document.querySelector("#commentSubmit");
const composerLabel = document.querySelector("#commentComposerLabel");
const composerMeta = document.querySelector("#commentComposerMeta");
const composerAvatar = document.querySelector("#commentComposerAvatar");
const composerImage = document.querySelector("#commentComposerImage");
const composerInitials = document.querySelector("#commentComposerInitials");

const communityOverall = document.querySelector("#communityOverall");
const communityOverallStars = document.querySelector("#communityOverallStars");
const ratingCountLabel = document.querySelector("#ratingCountLabel");
const ratingSummaryText = document.querySelector("#ratingSummaryText");
const ratingStory = document.querySelector("#ratingStory");
const ratingArt = document.querySelector("#ratingArt");
const ratingCharacters = document.querySelector("#ratingCharacters");
const ratingEnjoyment = document.querySelector("#ratingEnjoyment");
const ratingEditor = document.querySelector("#ratingEditor");
const ratingEditorHint = document.querySelector("#ratingEditorHint");
const ratingSaveButton = document.querySelector("#ratingSaveButton");
const reactionButtons = document.querySelector("#reactionButtons");
const reactionTotalLabel = document.querySelector("#reactionTotalLabel");

const RATING_CATEGORIES = [
  ["overall","Nota geral"],
  ["story","História"],
  ["art","Arte"],
  ["characters","Personagens"],
  ["enjoyment","Diversão"]
];

let currentSession = null;
let currentProfile = null;
let comments = [];
let likeRows = [];
let ratings = [];
let reactions = [];
let draftRating = {overall:0,story:0,art:0,characters:0,enjoyment:0};

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function safeAvatarUrl(value){
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
    day:"2-digit",
    month:"short",
    hour:"2-digit",
    minute:"2-digit"
  }).format(new Date(value)).replace(".","");
}

function loginUrl(anchor="#community"){
  const returnTo = "manga.html?id=" + mangaId + anchor;
  return "index.html?auth=login&return=" + encodeURIComponent(returnTo);
}

async function getCurrentProfile(){
  if (!currentSession?.user) return null;
  const {data,error} = await supabase
    .from("mangamorph_profiles")
    .select("id,display_name,username,avatar_url,accent")
    .eq("id",currentSession.user.id)
    .maybeSingle();
  return error ? null : data;
}

function renderComposer(){
  const logged = Boolean(currentSession?.user && currentProfile);
  commentForm.classList.toggle("is-guest",!logged);
  commentInput.disabled = !logged;
  commentSubmit.textContent = logged ? "Publicar" : "Entrar";

  if (!logged) {
    composerLabel.textContent = "Entre para comentar";
    composerMeta.textContent = "Seu nome e foto de perfil aparecem nos comentários";
    composerImage.hidden = true;
    composerInitials.hidden = false;
    composerInitials.textContent = "?";
    composerAvatar.style.setProperty("--avatar-accent","#4d5d72");
    return;
  }

  const name = currentProfile.display_name || "Leitor";
  const avatar = safeAvatarUrl(currentProfile.avatar_url);
  composerLabel.textContent = "Comentar como " + name;
  composerMeta.textContent = "@" + currentProfile.username + " · conta MangaMorph";
  composerAvatar.style.setProperty("--avatar-accent",currentProfile.accent || "#5b8def");
  composerInitials.textContent = initials(name);
  composerInitials.hidden = Boolean(avatar);
  composerImage.hidden = !avatar;
  if (avatar) composerImage.src = avatar;
}

async function loadLikes(){
  if (!comments.length) {
    likeRows = [];
    return;
  }
  const ids = comments.map(comment => comment.id);
  const {data,error} = await supabase
    .from("mangamorph_comment_likes")
    .select("comment_id,user_id")
    .in("comment_id",ids);
  likeRows = error ? [] : (data || []);
}

function likeCount(commentId){
  return likeRows.filter(row => Number(row.comment_id) === Number(commentId)).length;
}

function likedByMe(commentId){
  if (!currentSession?.user) return false;
  return likeRows.some(row =>
    Number(row.comment_id) === Number(commentId) &&
    row.user_id === currentSession.user.id
  );
}

function renderComments(){
  const count = comments.length;
  commentCountLabel.textContent = count + (count === 1 ? " comentário" : " comentários");
  commentEmpty.hidden = count > 0;

  commentList.innerHTML = comments.map(comment => {
    const author = comment.author || {};
    const name = author.display_name || "Leitor";
    const username = author.username || "usuario";
    const avatar = safeAvatarUrl(author.avatar_url);
    const mine = currentSession?.user?.id === comment.user_id;
    const liked = likedByMe(comment.id);
    const countLikes = likeCount(comment.id);
    const avatarHtml = avatar
      ? '<img src="' + escapeHtml(avatar) + '" alt="" loading="lazy">'
      : '<span>' + escapeHtml(initials(name)) + '</span>';

    return '<article class="comment-item" data-comment-id="' + comment.id + '">' +
      '<div class="comment-avatar small" style="--avatar-accent:' + escapeHtml(author.accent || "#5b8def") + '">' + avatarHtml + '</div>' +
      '<div class="comment-body">' +
        '<div class="comment-topline">' +
          '<div class="comment-author"><strong>' + escapeHtml(name) + '</strong>' +
          (mine ? '<span class="comment-you-badge">você</span>' : '') +
          '<span class="comment-handle">@' + escapeHtml(username) + '</span></div>' +
          '<span>' + escapeHtml(formatDate(comment.created_at)) + '</span>' +
        '</div>' +
        '<p>' + escapeHtml(comment.content) + '</p>' +
        '<div class="comment-actions">' +
          '<button type="button" data-like-comment="' + comment.id + '" class="' + (liked ? 'active' : '') + '">♡ <span>' + countLikes + '</span></button>' +
          (mine ? '<button type="button" data-delete-comment="' + comment.id + '">Excluir</button>' : '') +
        '</div>' +
      '</div>' +
    '</article>';
  }).join("");
}

async function loadComments(){
  commentList.innerHTML = '<div class="comment-loading">Carregando comentários...</div>';
  const {data,error} = await supabase
    .from("mangamorph_comments")
    .select('id,manga_id,user_id,content,created_at,updated_at,author:mangamorph_profiles!mangamorph_comments_user_id_fkey(display_name,username,avatar_url,accent)')
    .eq("manga_id",mangaId)
    .order("created_at",{ascending:false})
    .limit(100);

  if (error) {
    commentList.innerHTML = '<div class="comment-error">Não foi possível carregar os comentários agora.</div>';
    commentEmpty.hidden = true;
    return;
  }

  comments = data || [];
  await loadLikes();
  renderComments();
}

function average(field){
  if (!ratings.length) return null;
  return ratings.reduce((sum,row) => sum + Number(row[field] || 0),0) / ratings.length;
}

function starsFor(value){
  if (!value) return "☆☆☆☆☆";
  const rounded = Math.round(value);
  return Array.from({length:5},(_,index) => index < rounded ? "★" : "☆").join("");
}

function renderRatingSummary(){
  const count = ratings.length;
  const overall = average("overall");
  const story = average("story");
  const art = average("art");
  const characters = average("characters");
  const enjoyment = average("enjoyment");

  ratingCountLabel.textContent = count + (count === 1 ? " avaliação" : " avaliações");
  communityOverall.textContent = overall ? overall.toFixed(1).replace(".",",") : "—";
  communityOverallStars.textContent = starsFor(overall);
  ratingSummaryText.textContent = count ? "Média baseada na comunidade" : "Ainda sem avaliações";
  ratingStory.textContent = story ? story.toFixed(1).replace(".",",") : "—";
  ratingArt.textContent = art ? art.toFixed(1).replace(".",",") : "—";
  ratingCharacters.textContent = characters ? characters.toFixed(1).replace(".",",") : "—";
  ratingEnjoyment.textContent = enjoyment ? enjoyment.toFixed(1).replace(".",",") : "—";
}

function myRating(){
  if (!currentSession?.user) return null;
  return ratings.find(row => row.user_id === currentSession.user.id) || null;
}

function renderRatingEditor(){
  const logged = Boolean(currentSession?.user && currentProfile);
  const existing = myRating();

  if (existing) {
    draftRating = {
      overall:Number(existing.overall),
      story:Number(existing.story),
      art:Number(existing.art),
      characters:Number(existing.characters),
      enjoyment:Number(existing.enjoyment)
    };
  } else if (!logged) {
    draftRating = {overall:0,story:0,art:0,characters:0,enjoyment:0};
  }

  ratingEditorHint.textContent = logged
    ? (existing ? "Sua avaliação já está salva. Você pode alterá-la." : "Dê uma nota de 1 a 5 para cada categoria.")
    : "Entre na sua conta para avaliar esta obra.";

  ratingSaveButton.textContent = logged ? (existing ? "Atualizar" : "Salvar") : "Entrar";
  ratingSaveButton.disabled = logged && Object.values(draftRating).some(value => !value);

  ratingEditor.innerHTML = RATING_CATEGORIES.map(([key,label]) => {
    const current = Number(draftRating[key] || 0);
    const buttons = Array.from({length:5},(_,index) => {
      const value = index + 1;
      return '<button type="button" data-rating-category="' + key + '" data-rating-value="' + value + '" class="' + (value <= current ? 'active' : '') + '" aria-label="' + label + ': ' + value + ' de 5">★</button>';
    }).join("");
    return '<div class="rating-editor-row">' +
      '<span>' + label + '</span>' +
      '<div class="rating-star-buttons">' + buttons + '</div>' +
      '<strong class="rating-row-value">' + (current || "—") + '</strong>' +
    '</div>';
  }).join("");
}

async function loadRatings(){
  const {data,error} = await supabase
    .from("mangamorph_ratings")
    .select("manga_id,user_id,overall,story,art,characters,enjoyment,updated_at")
    .eq("manga_id",mangaId);
  ratings = error ? [] : (data || []);
  renderRatingSummary();
  renderRatingEditor();
}

function myReaction(){
  if (!currentSession?.user) return null;
  return reactions.find(row => row.user_id === currentSession.user.id) || null;
}

function renderReactions(){
  const total = reactions.length;
  const mine = myReaction();
  reactionTotalLabel.textContent = total + (total === 1 ? " reação" : " reações");

  reactionButtons.querySelectorAll("[data-reaction]").forEach(button => {
    const key = button.dataset.reaction;
    const count = reactions.filter(row => row.reaction === key).length;
    const countNode = button.querySelector("small");
    if (countNode) countNode.textContent = count;
    button.classList.toggle("active",mine?.reaction === key);
  });
}

async function loadReactions(){
  const {data,error} = await supabase
    .from("mangamorph_reactions")
    .select("manga_id,user_id,reaction,created_at")
    .eq("manga_id",mangaId);
  reactions = error ? [] : (data || []);
  renderReactions();
}

commentInput.addEventListener("input",() => {
  commentCharCount.textContent = commentInput.value.length + "/280";
});

commentForm.addEventListener("submit",async event => {
  event.preventDefault();
  if (!currentSession?.user || !currentProfile) {
    location.href = loginUrl("#comments");
    return;
  }

  const text = commentInput.value.trim();
  if (!text) return;

  commentSubmit.disabled = true;
  commentSubmit.textContent = "Publicando...";

  const {error} = await supabase
    .from("mangamorph_comments")
    .insert({
      manga_id:mangaId,
      user_id:currentSession.user.id,
      content:text.slice(0,280)
    });

  commentSubmit.disabled = false;
  commentSubmit.textContent = "Publicar";

  if (error) {
    commentList.insertAdjacentHTML("afterbegin",'<div class="comment-error">Não foi possível publicar o comentário.</div>');
    return;
  }

  commentInput.value = "";
  commentCharCount.textContent = "0/280";
  await loadComments();
});

commentList.addEventListener("click",async event => {
  const likeButton = event.target.closest("[data-like-comment]");
  const deleteButton = event.target.closest("[data-delete-comment]");

  if (likeButton) {
    if (!currentSession?.user) {
      location.href = loginUrl("#comments");
      return;
    }
    const commentId = Number(likeButton.dataset.likeComment);
    likeButton.disabled = true;

    if (likedByMe(commentId)) {
      await supabase.from("mangamorph_comment_likes")
        .delete()
        .eq("comment_id",commentId)
        .eq("user_id",currentSession.user.id);
    } else {
      await supabase.from("mangamorph_comment_likes")
        .insert({comment_id:commentId,user_id:currentSession.user.id});
    }
    await loadLikes();
    renderComments();
    return;
  }

  if (deleteButton) {
    if (!currentSession?.user) return;
    const commentId = Number(deleteButton.dataset.deleteComment);
    deleteButton.disabled = true;
    await supabase.from("mangamorph_comments")
      .delete()
      .eq("id",commentId)
      .eq("user_id",currentSession.user.id);
    await loadComments();
  }
});

ratingEditor.addEventListener("click",event => {
  const button = event.target.closest("[data-rating-category]");
  if (!button) return;
  if (!currentSession?.user || !currentProfile) {
    location.href = loginUrl("#community");
    return;
  }
  const category = button.dataset.ratingCategory;
  draftRating[category] = Number(button.dataset.ratingValue);
  renderRatingEditor();
});

ratingSaveButton.addEventListener("click",async () => {
  if (!currentSession?.user || !currentProfile) {
    location.href = loginUrl("#community");
    return;
  }
  if (Object.values(draftRating).some(value => !value)) return;

  ratingSaveButton.disabled = true;
  ratingSaveButton.textContent = "Salvando...";

  const {error} = await supabase
    .from("mangamorph_ratings")
    .upsert({
      manga_id:mangaId,
      user_id:currentSession.user.id,
      overall:draftRating.overall,
      story:draftRating.story,
      art:draftRating.art,
      characters:draftRating.characters,
      enjoyment:draftRating.enjoyment
    },{onConflict:"manga_id,user_id"});

  if (error) {
    ratingEditorHint.textContent = "Não foi possível salvar sua avaliação agora.";
  }
  await loadRatings();
});

reactionButtons.addEventListener("click",async event => {
  const button = event.target.closest("[data-reaction]");
  if (!button) return;
  if (!currentSession?.user || !currentProfile) {
    location.href = loginUrl("#community");
    return;
  }

  const reaction = button.dataset.reaction;
  const existing = myReaction();
  reactionButtons.querySelectorAll("button").forEach(item => item.disabled = true);

  if (existing?.reaction === reaction) {
    await supabase.from("mangamorph_reactions")
      .delete()
      .eq("manga_id",mangaId)
      .eq("user_id",currentSession.user.id);
  } else {
    await supabase.from("mangamorph_reactions")
      .upsert({
        manga_id:mangaId,
        user_id:currentSession.user.id,
        reaction
      },{onConflict:"manga_id,user_id"});
  }

  await loadReactions();
  reactionButtons.querySelectorAll("button").forEach(item => item.disabled = false);
});

async function refreshAuthenticatedCommunity(session){
  currentSession = session;
  currentProfile = await getCurrentProfile();
  renderComposer();
  await Promise.all([loadComments(),loadRatings(),loadReactions()]);
}

supabase.auth.onAuthStateChange((event,session) => {
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
    setTimeout(() => refreshAuthenticatedCommunity(session),0);
  } else if (event === "SIGNED_OUT") {
    setTimeout(async () => {
      currentSession = null;
      currentProfile = null;
      renderComposer();
      await Promise.all([loadComments(),loadRatings(),loadReactions()]);
    },0);
  }
});

const {data:{session}} = await supabase.auth.getSession();
await refreshAuthenticatedCommunity(session);

if (location.hash === "#comments") {
  document.querySelector("#comments")?.scrollIntoView({block:"start"});
} else if (location.hash === "#community") {
  document.querySelector("#community")?.scrollIntoView({block:"start"});
}
