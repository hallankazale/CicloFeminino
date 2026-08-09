import { createClient } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

const SUPABASE_URL = 'https://davruybzxyjsxitvibek.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hx1W1p3hZvH_PYJva-Jv5Q_fB9N5Uvg';
const AUTH_CALLBACK = 'br.com.ciclofeminino.luna://auth/callback';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});

let appUrlListener;
let oauthResolver = null;
let oauthRejecter = null;

function normalizeError(error, fallback) {
  if (!error) return new Error(fallback);
  const message = String(error.message || fallback);
  if (/invalid login credentials/i.test(message)) return new Error('E-mail ou senha incorretos.');
  if (/email not confirmed/i.test(message)) return new Error('Confirme seu e-mail antes de entrar.');
  if (/already registered|already been registered/i.test(message)) return new Error('Este e-mail já possui uma conta.');
  if (/rate limit/i.test(message)) return new Error('Muitas tentativas. Aguarde um pouco e tente novamente.');
  return new Error(message);
}

async function finishAuthCallback(url) {
  if (!url || !url.startsWith(AUTH_CALLBACK)) return false;
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = parsed.searchParams.get('code');
  if (!code) throw new Error('O Google não retornou um código de autenticação válido.');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw normalizeError(error, 'Não foi possível concluir a autenticação.');
  try { await Browser.close(); } catch (_) {}
  return data.session;
}

async function ensureUrlListener() {
  if (appUrlListener) return;
  appUrlListener = await App.addListener('appUrlOpen', async ({ url }) => {
    if (!url?.startsWith(AUTH_CALLBACK)) return;
    try {
      const session = await finishAuthCallback(url);
      oauthResolver?.(session);
    } catch (error) {
      oauthRejecter?.(normalizeError(error, 'Falha ao concluir o login.'));
    } finally {
      oauthResolver = null;
      oauthRejecter = null;
    }
  });
}

async function waitForOAuthCallback() {
  await ensureUrlListener();
  return new Promise((resolve, reject) => {
    oauthResolver = resolve;
    oauthRejecter = reject;
    setTimeout(() => {
      if (oauthRejecter === reject) {
        oauthResolver = null;
        oauthRejecter = null;
        reject(new Error('O login não foi concluído. Tente novamente.'));
      }
    }, 120000);
  });
}

async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw normalizeError(error, 'Não foi possível entrar.');
  return data.session;
}

async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: AUTH_CALLBACK
    }
  });
  if (error) throw normalizeError(error, 'Não foi possível criar sua conta.');
  if (!data.session) {
    throw new Error('Conta criada. Confirme o e-mail recebido e depois entre no Luna.');
  }
  return data.session;
}

async function resetPassword({ email }) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: AUTH_CALLBACK });
  if (error) throw normalizeError(error, 'Não foi possível enviar a recuperação de senha.');
  return true;
}

async function signInWithGoogle() {
  await ensureUrlListener();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_CALLBACK,
      skipBrowserRedirect: true,
      scopes: 'openid email profile'
    }
  });
  if (error || !data?.url) throw normalizeError(error, 'Não foi possível iniciar o login com Google.');

  const callback = waitForOAuthCallback();
  await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
  return callback;
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw normalizeError(error, 'Não foi possível recuperar sua sessão.');
  return data.session;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw normalizeError(error, 'Não foi possível sair.');
  return true;
}

window.LUNA_AUTH_ADAPTER = {
  signIn,
  signUp,
  resetPassword,
  signInWithGoogle,
  getSession,
  signOut,
  supabase
};
