import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/authContext';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Informe o e-mail e a senha de acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/admin', { replace: true });
      } else {
        setErrorMsg(res.error || 'Credenciais inválidas.');
      }
    } catch (err: any) {
      setErrorMsg('Ocorreu um erro ao tentar realizar login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col gap-8 relative z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-3">
          <Link to="/" className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
            <span className="font-display font-bold text-white text-2xl">P</span>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-on-surface">Painel Administrativo</h1>
            <p className="font-body text-sm text-on-surface-variant mt-1">
              Ouvidoria & Canal de Ética Sua Empresa
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-surface-variant/60 rounded-3xl p-8 shadow-xl flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@suaempresa.com.br"
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl py-3 pl-11 pr-4 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Senha</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl py-3 pl-11 pr-11 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 font-body text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-sm transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Acessando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-variant/50 flex flex-col gap-1.5">
            <span className="font-mono text-[11px] text-primary font-semibold uppercase tracking-wider">Acesso administrativo</span>
            <div className="font-body text-xs text-on-surface-variant">As credenciais devem ser configuradas fora do repositório.</div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Canal Público de Ouvidoria
          </Link>
        </div>

      </div>
    </div>
  );
}
