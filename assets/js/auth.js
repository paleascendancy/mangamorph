import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fnyellunugdfesprmvzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_clf6HlhhxdftO1_XZU7YsA_pRmkCEJK";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const authPanel = document.querySelector("#authPanel");
const authClose = document.querySelector("#authClose");
const authTitle = document.querySelector("#authTitle");
const authSubtitle = document.querySelector("#authSubtitle");
const authTabs = document.querySelector("#authTabs");
const authSocial = document.querySelector("#authSocial");
const authDivider = document.querySelector("#authDivider");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#authLoginForm");
const registerForm = document.querySelector("#authRegisterForm");
const forgotForm = document.querySelector("#authForgotForm");
const recoveryForm = document.querySelector("#authRecoveryForm");
const loginEmail = document.querySelector("#authLoginEmail");
const loginPassword = document.querySelector("#authLoginPassword");
const registerName = document.querySelector("#authRegisterName");
const registerUsername = document.querySelector("#authRegisterUsername");
const registerEmail = document.querySelector("#authRegisterEmail");
const registerPassword = document.querySelector("#authRegisterPassword");
const registerPasswordConfirm = document.querySelector("#authRegisterPasswordConfirm");
const forgotEmail = document.querySelector("#authForgotEmail");
const recoveryPassword = document.querySelector("#authRecoveryPassword");

function baseRedirect() {
  const url = new URL("./", window.location.href);
  url.hash = "";
  url.search = "";
  return url.href;
}

function setMessage(message, isError=false) {
  authMessage.textContent = message || "";
  authMessage.hidden = !message;
  authMessage.classList.toggle("error", Boolean(isError));
}

function normalizeUsername(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20);
}

function mapError(error) {
  const msg = String(error?.message || error || "");
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/user already registered/i.test(msg)) return "Já existe uma conta com este e-mail.";
  if (/password/i.test(msg) && /weak|short|least/i.test(msg)) return "Use uma senha mais forte, com pelo menos 8 caracteres.";
  if (/duplicate key|23505/i.test(msg)) return "Esse @usuário já está em uso. Escolha outro.";
  if (/provider|oauth/i.test(msg)) return "Esse login social ainda precisa ser habilitado no provedor.";
  if (/redirect/i.test(msg)) return "O endereço de retorno ainda precisa ser autorizado no Supabase.";
  return msg || "Não foi possível concluir a operação.";
}

function setLoading(form, loading) {
  form.querySelectorAll("button,input").forEach(el => el.disabled = loading);
}

function switchMode(mode) {
  const normal = mode === "login" || mode === "register";
  authTabs.hidden = !normal;
  authSocial.hidden = !normal;
  authDivider.hidden = !normal;
  loginForm.hidden = mode !== "login";
  registerForm.hidden = mode !== "register";
  forgotForm.hidden = mode !== "forgot";
  recoveryForm.hidden = mode !== "recovery";
  setMessage("");

  document.querySelectorAll("[data-auth-mode].auth-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.authMode === mode);
  });

  if (mode === "register") {
    authTitle.textContent = "Criar conta";
    authSubtitle.textContent = "Cadastre seus dados e crie seu MangaMorph ID.";
    const local = JSON.parse(localStorage.getItem("mangamorph:profile") || "null");
    if (local) {
      registerName.value ||= local.name || "";
      registerUsername.value ||= local.username || "";
    }
  } else if (mode === "forgot") {
    authTitle.textContent = "Recuperar senha";
    authSubtitle.textContent = "Receba um link seguro no seu e-mail.";
  } else if (mode === "recovery") {
    authTitle.textContent = "Nova senha";
    authSubtitle.textContent = "Defina uma nova senha para sua conta.";
  } else {
    authTitle.textContent = "Entrar";
    authSubtitle.textContent = "Acesse sua biblioteca e perfil.";
  }
}

function openAuth(mode="login") {
  switchMode(mode);
  authPanel.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    const target = mode === "register" ? registerName : mode === "forgot" ? forgotEmail : mode === "recovery" ? recoveryPassword : loginEmail;
    target?.focus();
  });
}

function closeAuth() {
  authPanel.hidden = true;
  document.body.style.overflow = "";
  setMessage("");
}

async function loadProfile(session) {
  if (!session?.user) return null;
  const user = session.user;
  const pendingRaw = localStorage.getItem("mangamorph:pending-profile");
  let pending = null;
  try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch {}

  if (pending) {
    const username = normalizeUsername(pending.username);
    if (username.length >= 3) {
      const { error } = await supabase
        .from("mangamorph_profiles")
        .update({
          username,
          display_name: String(pending.name || "Leitor").slice(0,32),
          bio: String(pending.bio || "").slice(0,120),
          accent: pending.accent || "#5b8def"
        })
        .eq("id", user.id);
      if (!error) localStorage.removeItem("mangamorph:pending-profile");
    }
  }

  let { data, error } = await supabase
    .from("mangamorph_profiles")
    .select("id,username,display_name,bio,accent,avatar_url,created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
    return null;
  }

  if (!data) {
    const fallbackUsername = "reader_" + user.id.replace(/-/g,"").slice(0,6);
    const profile = {
      id:user.id,
      username:fallbackUsername,
      display_name:(user.user_metadata?.full_name || user.email?.split("@")[0] || "Leitor").slice(0,32),
      bio:"",
      accent:"#5b8def",
      avatar_url:user.user_metadata?.avatar_url || null
    };
    const created = await supabase.from("mangamorph_profiles").upsert(profile,{onConflict:"id"}).select().single();
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

async function publishSession(session) {
  if (!session) {
    window.dispatchEvent(new CustomEvent("mangamorph:auth-state",{detail:{session:false,profile:null}}));
    return;
  }
  const profile = await loadProfile(session);
  if (profile) localStorage.setItem("mangamorph:profile", JSON.stringify(profile));
  localStorage.setItem("mangamorph:profile-session","on");
  window.dispatchEvent(new CustomEvent("mangamorph:auth-state",{detail:{session:true,profile}}));
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  setLoading(loginForm,true);
  setMessage("");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value
  });
  setLoading(loginForm,false);
  if (error) return setMessage(mapError(error),true);
  await publishSession(data.session);
  closeAuth();
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Login realizado com sucesso."}}));
});

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const name = registerName.value.trim();
  const username = normalizeUsername(registerUsername.value);
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if (username.length < 3) return setMessage("O @usuário precisa ter pelo menos 3 caracteres.",true);
  if (password.length < 8) return setMessage("A senha precisa ter pelo menos 8 caracteres.",true);
  if (password !== registerPasswordConfirm.value) return setMessage("As senhas não são iguais.",true);

  setLoading(registerForm,true);
  setMessage("");
  localStorage.setItem("mangamorph:pending-profile", JSON.stringify({name,username,bio:"",accent:"#5b8def"}));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: baseRedirect(),
      data: { display_name:name, username, app:"mangamorph" }
    }
  });
  setLoading(registerForm,false);

  if (error) return setMessage(mapError(error),true);
  if (data.session) {
    await publishSession(data.session);
    closeAuth();
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Conta criada e conectada."}}));
  } else {
    setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro.");
  }
});

forgotForm.addEventListener("submit", async event => {
  event.preventDefault();
  setLoading(forgotForm,true);
  const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.value.trim(), {
    redirectTo: baseRedirect() + "?reset=1"
  });
  setLoading(forgotForm,false);
  if (error) return setMessage(mapError(error),true);
  setMessage("Enviamos um link de recuperação para o seu e-mail.");
});

recoveryForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (recoveryPassword.value.length < 8) return setMessage("A senha precisa ter pelo menos 8 caracteres.",true);
  setLoading(recoveryForm,true);
  const { error } = await supabase.auth.updateUser({ password: recoveryPassword.value });
  setLoading(recoveryForm,false);
  if (error) return setMessage(mapError(error),true);
  setMessage("Senha atualizada. Você já pode continuar usando sua conta.");
  setTimeout(closeAuth,900);
});

document.querySelector("#authGoogle").addEventListener("click", async () => {
  setMessage("");
  const { error } = await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{ redirectTo:baseRedirect() }
  });
  if (error) setMessage(mapError(error),true);
});

document.querySelector("#authGithub").addEventListener("click", async () => {
  setMessage("");
  const { error } = await supabase.auth.signInWithOAuth({
    provider:"github",
    options:{ redirectTo:baseRedirect() }
  });
  if (error) setMessage(mapError(error),true);
});

document.querySelector("#authMagicLink").addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  if (!email) return setMessage("Digite seu e-mail primeiro.",true);
  setLoading(loginForm,true);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options:{ shouldCreateUser:false, emailRedirectTo:baseRedirect() }
  });
  setLoading(loginForm,false);
  if (error) return setMessage(mapError(error),true);
  setMessage("Enviamos um link de acesso para o seu e-mail.");
});

document.querySelectorAll("[data-auth-mode]").forEach(button => {
  button.addEventListener("click", () => switchMode(button.dataset.authMode));
});
document.querySelectorAll("[data-toggle-password]").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.querySelector("#" + button.dataset.togglePassword);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Mostrar" : "Ocultar";
  });
});

authClose.addEventListener("click",closeAuth);
document.querySelector("[data-close-auth]").addEventListener("click",closeAuth);
document.addEventListener("keydown",event => {
  if (event.key === "Escape" && !authPanel.hidden) closeAuth();
});

window.addEventListener("mangamorph:open-auth", event => openAuth(event.detail?.mode || "login"));
window.addEventListener("mangamorph:sign-out", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
  localStorage.setItem("mangamorph:profile-session","off");
  await publishSession(null);
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Você saiu da conta."}}));
});

window.addEventListener("mangamorph:profile-save", async event => {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) return;
  const profile = event.detail || {};
  const username = normalizeUsername(profile.username);
  const { error } = await supabase
    .from("mangamorph_profiles")
    .update({
      username,
      display_name:String(profile.name || "Leitor").slice(0,32),
      bio:String(profile.bio || "").slice(0,120),
      accent:profile.accent || "#5b8def"
    })
    .eq("id",session.user.id);
  if (error) {
    window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:mapError(error)}}));
    return;
  }
  window.dispatchEvent(new CustomEvent("mangamorph:auth-message",{detail:{message:"Perfil sincronizado com sua conta."}}));
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    setTimeout(() => openAuth("recovery"), 0);
    return;
  }
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
    setTimeout(() => { publishSession(session); }, 0);
  } else if (event === "SIGNED_OUT") {
    setTimeout(() => { publishSession(null); }, 0);
  }
});

const { data:{ session } } = await supabase.auth.getSession();
await publishSession(session);

if (new URLSearchParams(location.search).get("reset") === "1" && session) openAuth("recovery");
