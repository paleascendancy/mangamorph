import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const supabase = createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

const mangaId = Math.max(1,Number(new URLSearchParams(location.search).get("id")) || 1);
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

const CATEGORIES = [
  ["overall","Nota geral"],
  ["story","História"],
  ["art","Arte"],
  ["characters","Personagens"],
  ["enjoyment","Diversão"]
];

let session = null;
let profile = null;
let ratings = [];
let draft = {overall:0,story:0,art:0,characters:0,enjoyment:0};

function loginUrl(){
  const returnTo = "manga.html?id=" + mangaId + "#ratings";
  return "index.html?auth=login&return=" + encodeURIComponent(returnTo);
}

async function loadProfile(){
  if (!session?.user) return null;
  const {data,error} = await supabase
    .from("mangamorph_profiles")
    .select("id,display_name,username")
    .eq("id",session.user.id)
    .maybeSingle();
  return error ? null : data;
}

function average(field){
  if (!ratings.length) return null;
  return ratings.reduce((sum,row) => sum + Number(row[field] || 0),0) / ratings.length;
}

function stars(value){
  if (!value) return "☆☆☆☆☆";
  const rounded = Math.round(value);
  return Array.from({length:5},(_,index) => index < rounded ? "★" : "☆").join("");
}

function myRating(){
  if (!session?.user) return null;
  return ratings.find(row => row.user_id === session.user.id) || null;
}

function renderSummary(){
  const count = ratings.length;
  const overall = average("overall");
  const story = average("story");
  const art = average("art");
  const characters = average("characters");
  const enjoyment = average("enjoyment");

  ratingCountLabel.textContent = count + (count === 1 ? " avaliação" : " avaliações");
  communityOverall.textContent = overall ? overall.toFixed(1).replace(".",",") : "—";
  communityOverallStars.textContent = stars(overall);
  ratingSummaryText.textContent = count ? "Média baseada na comunidade" : "Ainda sem avaliações";
  ratingStory.textContent = story ? story.toFixed(1).replace(".",",") : "—";
  ratingArt.textContent = art ? art.toFixed(1).replace(".",",") : "—";
  ratingCharacters.textContent = characters ? characters.toFixed(1).replace(".",",") : "—";
  ratingEnjoyment.textContent = enjoyment ? enjoyment.toFixed(1).replace(".",",") : "—";
}

function renderEditor(){
  const logged = Boolean(session?.user && profile);
  const existing = myRating();

  if (existing) {
    draft = {
      overall:Number(existing.overall),
      story:Number(existing.story),
      art:Number(existing.art),
      characters:Number(existing.characters),
      enjoyment:Number(existing.enjoyment)
    };
  } else if (!logged) {
    draft = {overall:0,story:0,art:0,characters:0,enjoyment:0};
  }

  ratingEditorHint.textContent = logged
    ? (existing ? "Sua avaliação já está salva. Você pode alterá-la." : "Dê de 1 a 5 estrelas em cada categoria.")
    : "Entre na sua conta para avaliar esta obra.";

  ratingSaveButton.textContent = logged ? (existing ? "Atualizar" : "Salvar") : "Entrar";
  ratingSaveButton.disabled = logged && Object.values(draft).some(value => !value);

  ratingEditor.innerHTML = CATEGORIES.map(([key,label]) => {
    const current = Number(draft[key] || 0);
    const controls = Array.from({length:5},(_,index) => {
      const value = index + 1;
      return '<button type="button" data-rating-category="' + key + '" data-rating-value="' + value + '" class="' + (value <= current ? 'active' : '') + '" aria-label="' + label + ': ' + value + ' de 5">★</button>';
    }).join("");
    return '<div class="rating-editor-row">' +
      '<span>' + label + '</span>' +
      '<div class="rating-star-buttons">' + controls + '</div>' +
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
  renderSummary();
  renderEditor();
}

ratingEditor.addEventListener("click",event => {
  const button = event.target.closest("[data-rating-category]");
  if (!button) return;
  if (!session?.user || !profile) {
    location.href = loginUrl();
    return;
  }
  draft[button.dataset.ratingCategory] = Number(button.dataset.ratingValue);
  renderEditor();
});

ratingSaveButton.addEventListener("click",async () => {
  if (!session?.user || !profile) {
    location.href = loginUrl();
    return;
  }
  if (Object.values(draft).some(value => !value)) return;

  ratingSaveButton.disabled = true;
  ratingSaveButton.textContent = "Salvando...";

  const {error} = await supabase.from("mangamorph_ratings").upsert({
    manga_id:mangaId,
    user_id:session.user.id,
    overall:draft.overall,
    story:draft.story,
    art:draft.art,
    characters:draft.characters,
    enjoyment:draft.enjoyment
  },{onConflict:"manga_id,user_id"});

  if (error) ratingEditorHint.textContent = "Não foi possível salvar sua avaliação agora.";
  await loadRatings();
});

async function refresh(nextSession){
  session = nextSession;
  profile = await loadProfile();
  await loadRatings();
}

supabase.auth.onAuthStateChange((event,nextSession) => {
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
    setTimeout(() => refresh(nextSession),0);
  } else if (event === "SIGNED_OUT") {
    setTimeout(() => refresh(null),0);
  }
});

const {data:{session:initialSession}} = await supabase.auth.getSession();
await refresh(initialSession);

if (location.hash === "#ratings") {
  document.querySelector("#ratings")?.scrollIntoView({block:"start"});
}
