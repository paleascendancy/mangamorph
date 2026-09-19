import { signIn, signInWithGoogle, signUp } from './actions';

type AuthPageProps = {
  searchParams: Promise<{ mode?: string; error?: string; message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const signup = params.mode === 'signup';

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="auth-eyebrow">MangaMorph</span>
          <h1>{signup ? 'Criar conta' : 'Entrar'}</h1>
          <p>{signup ? 'Crie sua conta para salvar suas obras.' : 'Acesse sua conta para continuar.'}</p>
        </div>

        {params.error && <p className="auth-feedback" role="alert">Não foi possível concluir. Confira os dados e tente novamente.</p>}
        {params.message === 'check-email' && <p className="auth-feedback">Confira seu e-mail para confirmar o cadastro.</p>}

        <form className="auth-form">
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required /></label>
          <button className="auth-primary" formAction={signup ? signUp : signIn}>{signup ? 'Cadastrar' : 'Entrar'}</button>
        </form>

        <div className="auth-divider"><span>ou</span></div>
        <form><button className="auth-google" formAction={signInWithGoogle} type="submit">Continuar com Google</button></form>

        <p className="auth-switch">{signup ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'} <a href={signup ? '/auth' : '/auth?mode=signup'}>{signup ? 'Entrar' : 'Cadastrar'}</a></p>
      </div>
    </section>
  );
}
