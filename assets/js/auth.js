import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
});

const loginPanel = document.querySelector("#loginPanel");
const registerPanel = document.querySelector("#registerPanel");
const loginForm = document.querySelector("#authLoginForm");
const registerForm = document.querySelector("#authRegisterForm");
const forgotForm = document.querySelector("#authForgotForm");
const recoveryForm = document.querySelector("#authRecoveryForm");
const loginMessage = document.querySelector("#loginMessage");
const registerMessage = document.querySelector("#registerMessage");
const loginEmail = document.querySelector("#authLoginEmail");
const loginPassword = document.querySelector("#authLoginPassword");
const registerName = document.querySelector("#authRegisterName");
const registerUsername = document.querySelector("#authRegisterUsername");
const registerEmail = document.querySelector("#authRegisterEmail");
const registerPassword = document.querySelector("#authRegisterPassword");
const registerPasswordConfirm = document.querySelector("#authRegisterPasswordConfirm");
const forgotEmail = document.querySelector("#authForgotEmail");
const recoveryPassword = document.querySelector("#authRecoveryPassword");

function baseRedirect(){
  const url = new URL("./",window.location.href);
  url.hash = "";
  url.search = "";
  return url.href;
}

function normalizeUsername(value){
  return String(value || "").toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20);
}

function mapError(error){
  const msg = String(error?.message || error || "");
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/user already registered/i.test(msg)) return "Já existe uma conta com este e-mail.";
  if (/duplicate key|23505/i.test(msg)) return "Esse @usuário já está em uso. Escolha outro.";
  if (/password/i.test(msg) && /weak|short|least/i.test(msg)) return "Use uma senha mais forte, com pelo menos 8 caracteres.";
  if (/provider|oauth/i.test(msg)) return "Esse login social ainda precisa ser habilitado no provedor.";
  if (/redirect/i.test(msg)) return "O endereço de retorno ainda precisa ser autorizado no Supabase.";
  return msg || "Não foi possível concluir a operação.";
}

function setMessage(element,message,isError=false){
  element.textContent = message || "";
  element.hidden = !message;
  element.classList.toggle("error",Boolean(isError));
}

function setLoading(form,loading){
  form.querySelectorAll("button,input").forEach(el => el.disabled = loading);
}

function closePanels(){
  loginPanel.hidden = true;
  registerPanel.hidden = true;
  document.body.style.overflow = "";
}

function openLogin(mode="login"){
  registerPanel.hidden = true;
  loginPanel.hidden = false;
  document.body.style.overflow = "hidden";
  const forgot = mode === "forgot";
  const recovery = mode === "recovery";
  loginForm.hidden = forgot || recovery;
  forgotForm.hidden = !forgot;
  recoveryForm.hidden = !recovery;
  document.querySelector("#openRegisterFromLogin").hidden = recovery;
  setMessage(loginMessage,"");
  requestAnimationFrame(() => {
    (recovery ? recoveryPassword : forgot ? forgotEmail : loginEmail)?.focus();
  });
}

function openRegister(){
  loginPanel.hidden = true;
  registerPanel.hidden = false;
  document.body.style.overflow = "hidden";
  setMessage(registerMessage,"");
  const local = JSON.parse(localStorage.getItem("mangamorph:profile") || "null");
  if (local) {
    registerName.value ||= local.name || "";
    registerUsername.value ||= local.username || "";
  }
  requestAnimationFrame(() => registerName.focus());
}

async function loadProfile(session){
  if (!session?.user) return null;
  const user = session.user;
  const pendingRaw = localStorage.getItem("mangamorph:pending-profile");
  let pending = null;
  try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch {}

  if (pending) {
    const username = normalizeUsername(pending.username);
    if (username.length >= 3) {
      const { error } = await supabase.from("mangamorph_profiles").update({
        username,
        display_name:String(pending.name || "Leitor").slice(0,32),
        bio:String(pending.bio || "").slice(0,120),
        accent:pending.accent || "#5b8def"
      }).eq("id",user.id);
      if (!error) localStorage.removeItem("mangamorph:pending-profile");
    }
  }

  let { data, error } = await supabase
    .from("mangamorph_profiles")
    .select("id,username,display_name,bio,accent,avatar_url,created_at")
    .eq("id",user.id)
    .maybeSingle();

  if (error) {
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
    return null;
  }

  if (!data) {
    const fallback = {
      id:user.id,
      username:"reader_" + user.id.replace(/-/g,"").slice(0,6),
      display_name:(user.user_metadata?.full_name || user.email?.split("@")[0] || "Leitor").slice(0,32),
      bio:"",
      accent:"#5b8def",
      avatar_url:user.user_metadata?.avatar_url || null
    };
    const created = await supabase.from("mangamorph_profiles").upsert(fallback,{onConflict:"id"}).select().single();
    if (!created.error) data = created.data;
  }

  if (!data) return null;
  return {
    name:data.display_name,
    username:data.username,
    bio:data.bio || "",
    accent:data.accent || "#5b8def",
    avatarUrl:data.avatar_url || null,
    createdAt:data.created_at ? new Date(data.created_at).getTime() : Date.now()
  };
}

async function publishSession(session){
  if (!session) {
    localStorage.setItem("mangamorph:profile-session","off");
    window.dispatchEvent(new CustomEvent("mangamorph:auth-state",{detail:{session:false,profile:null}}));
    return null;
  }
  const profile = await loadProfile(session);
  if (profile) localStorage.setItem("mangamorph:profile",JSON.stringify(profile));
  localStorage.setItem("mangamorph:profile-session","on");
  window.dispatchEvent(new CustomEvent("mangamorph:auth-state",{detail:{session:true,profile}}));
  return profile;
}

loginForm.addEventListener("submit",async event => {
  event.preventDefault();
  setLoading(loginForm,true);
  setMessage(loginMessage,"");
  const { data,error } = await supabase.auth.signInWithPassword({
    email:loginEmail.value.trim(),
    password:loginPassword.value
  });
  setLoading(loginForm,false);
  if (error) return setMessage(loginMessage,mapError(error),true);
  await publishSession(data.session);
  closePanels();
  window.dispatchEvent(new CustomEvent("mangamorph:auth-complete"));
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Login realizado com sucesso."}}));
});

registerForm.addEventListener("submit",async event => {
  event.preventDefault();
  const name = registerName.value.trim();
  const username = normalizeUsername(registerUsername.value);
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if (username.length < 3) return setMessage(registerMessage,"O @usuário precisa ter pelo menos 3 caracteres.",true);
  if (password.length < 8) return setMessage(registerMessage,"A senha precisa ter pelo menos 8 caracteres.",true);
  if (password !== registerPasswordConfirm.value) return setMessage(registerMessage,"As senhas não são iguais.",true);

  setLoading(registerForm,true);
  setMessage(registerMessage,"");
  localStorage.setItem("mangamorph:pending-profile",JSON.stringify({name,username,bio:"",accent:"#5b8def"}));
  localStorage.setItem("mangamorph:open-profile-after-auth","1");

  const { data,error } = await supabase.auth.signUp({
    email,
    password,
    options:{
      emailRedirectTo:baseRedirect(),
      data:{display_name:name,username,app:"mangamorph"}
    }
  });
  setLoading(registerForm,false);

  if (error) {
    localStorage.removeItem("mangamorph:open-profile-after-auth");
    return setMessage(registerMessage,mapError(error),true);
  }

  if (data.session) {
    await publishSession(data.session);
    localStorage.removeItem("mangamorph:open-profile-after-auth");
    closePanels();
    window.dispatchEvent(new CustomEvent("mangamorph:auth-complete"));
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Conta criada. Bem-vindo ao seu perfil."}}));
  } else {
    setMessage(registerMessage,"Conta criada. Confirme seu e-mail; depois você será levado ao seu perfil.");
  }
});

forgotForm.addEventListener("submit",async event => {
  event.preventDefault();
  setLoading(forgotForm,true);
  const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.value.trim(),{
    redirectTo:baseRedirect() + "?reset=1"
  });
  setLoading(forgotForm,false);
  if (error) return setMessage(loginMessage,mapError(error),true);
  setMessage(loginMessage,"Enviamos um link de recuperação para o seu e-mail.");
});

recoveryForm.addEventListener("submit",async event => {
  event.preventDefault();
  if (recoveryPassword.value.length < 8) return setMessage(loginMessage,"A senha precisa ter pelo menos 8 caracteres.",true);
  setLoading(recoveryForm,true);
  const { error } = await supabase.auth.updateUser({password:recoveryPassword.value});
  setLoading(recoveryForm,false);
  if (error) return setMessage(loginMessage,mapError(error),true);
  setMessage(loginMessage,"Senha atualizada com sucesso.");
  setTimeout(() => {
    closePanels();
    window.dispatchEvent(new CustomEvent("mangamorph:auth-complete"));
  },800);
});

async function oauth(provider,source){
  localStorage.setItem("mangamorph:open-profile-after-auth","1");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options:{redirectTo:baseRedirect()}
  });
  if (error) {
    localStorage.removeItem("mangamorph:open-profile-after-auth");
    setMessage(source === "register" ? registerMessage : loginMessage,mapError(error),true);
  }
}

document.querySelector("#authGoogleLogin").addEventListener("click",() => oauth("google","login"));
document.querySelector("#authGithubLogin").addEventListener("click",() => oauth("github","login"));
document.querySelector("#authGoogleRegister").addEventListener("click",() => oauth("google","register"));
document.querySelector("#authGithubRegister").addEventListener("click",() => oauth("github","register"));

document.querySelector("#authMagicLink").addEventListener("click",async () => {
  const email = loginEmail.value.trim();
  if (!email) return setMessage(loginMessage,"Digite seu e-mail primeiro.",true);
  setLoading(loginForm,true);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:false,emailRedirectTo:baseRedirect()}
  });
  setLoading(loginForm,false);
  if (error) return setMessage(loginMessage,mapError(error),true);
  localStorage.setItem("mangamorph:open-profile-after-auth","1");
  setMessage(loginMessage,"Enviamos um link de acesso para o seu e-mail.");
});

document.querySelectorAll("[data-toggle-password]").forEach(button => {
  button.addEventListener("click",() => {
    const input = document.querySelector("#" + button.dataset.togglePassword);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Mostrar" : "Ocultar";
  });
});

document.querySelector("#loginClose").addEventListener("click",closePanels);
document.querySelector("#registerClose").addEventListener("click",closePanels);
document.querySelector("[data-close-login]").addEventListener("click",closePanels);
document.querySelector("[data-close-register]").addEventListener("click",closePanels);
document.querySelector("#openRegisterFromLogin").addEventListener("click",openRegister);
document.querySelector("#openLoginFromRegister").addEventListener("click",() => openLogin());
document.querySelector("#openForgotPassword").addEventListener("click",() => openLogin("forgot"));
document.querySelector("#backToLogin").addEventListener("click",() => openLogin());

window.addEventListener("mangamorph:open-login",() => openLogin());
window.addEventListener("mangamorph:open-register",openRegister);

window.addEventListener("mangamorph:sign-out",async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
  await publishSession(null);
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Você saiu da conta."}}));
});

window.addEventListener("mangamorph:profile-save",async event => {
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) return;
  const profile = event.detail || {};
  const { error } = await supabase.from("mangamorph_profiles").update({
    username:normalizeUsername(profile.username),
    display_name:String(profile.name || "Leitor").slice(0,32),
    bio:String(profile.bio || "").slice(0,120),
    accent:profile.accent || "#5b8def"
  }).eq("id",session.user.id);

  if (error) {
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
    return;
  }
  const updated = await publishSession(session);
  window.dispatchEvent(new CustomEvent("mangamorph:auth-state",{detail:{session:true,profile:updated}}));
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Perfil atualizado."}}));
});

window.addEventListener("mangamorph:avatar-upload",async event => {
  const file = event.detail?.file;
  if (!file) return;
  const allowed = ["image/jpeg","image/png","image/webp"];
  if (!allowed.includes(file.type)) {
    return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Use uma imagem JPG, PNG ou WebP."}}));
  }
  if (file.size > 3 * 1024 * 1024) {
    return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"A foto precisa ter no máximo 3 MB."}}));
  }

  const { data:{session} } = await supabase.auth.getSession();
  if (!session) return openLogin();

  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Enviando foto..."}}));
  const path = session.user.id + "/avatar";
  const { error:uploadError } = await supabase.storage
    .from("mangamorph-avatars")
    .upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
  if (uploadError) {
    return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(uploadError)}}));
  }

  const { data:publicData } = supabase.storage.from("mangamorph-avatars").getPublicUrl(path);
  const avatarUrl = publicData.publicUrl + "?v=" + Date.now();
  const { error:updateError } = await supabase
    .from("mangamorph_profiles")
    .update({avatar_url:avatarUrl})
    .eq("id",session.user.id);

  if (updateError) {
    return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(updateError)}}));
  }

  await publishSession(session);
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Foto de perfil atualizada."}}));
});

supabase.auth.onAuthStateChange((event,session) => {
  if (event === "PASSWORD_RECOVERY") {
    setTimeout(() => openLogin("recovery"),0);
    return;
  }
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
    setTimeout(async () => {
      await publishSession(session);
      if (session && localStorage.getItem("mangamorph:open-profile-after-auth") === "1") {
        localStorage.removeItem("mangamorph:open-profile-after-auth");
        closePanels();
        window.dispatchEvent(new CustomEvent("mangamorph:auth-complete"));
      }
    },0);
  } else if (event === "SIGNED_OUT") {
    setTimeout(() => publishSession(null),0);
  }
});

document.addEventListener("keydown",event => {
  if (event.key === "Escape" && (!loginPanel.hidden || !registerPanel.hidden)) closePanels();
});

const { data:{session} } = await supabase.auth.getSession();
await publishSession(session);
if (new URLSearchParams(location.search).get("reset") === "1" && session) openLogin("recovery");
