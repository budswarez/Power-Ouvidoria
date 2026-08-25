import { useState, useEffect, type FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Users as UsersIcon, 
  Shield, 
  Brain, 
  X, 
  Loader2, 
  RefreshCw,
  UserCheck,
  Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { AdminUser } from '../../types/database';

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Administrador' | 'Analista Sênior' | 'Analista Pleno' | 'Analista Júnior'>('Analista Pleno');
  const [permissions, setPermissions] = useState<string[]>(['view_reports']);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('rpc_admin_get_users', { p_token: token });

      if (!error && data?.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'Administrador').length;
  const activeAnalysts = users.filter(u => u.role !== 'Administrador' && u.status === 'Ativo').length;

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const togglePermission = (perm: string) => {
    setPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Preencha o nome, e-mail e a senha inicial do novo usuário.');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('rpc_admin_create_user', {
        p_token: token,
        p_name: newName.trim(),
        p_email: newEmail.trim(),
        p_password: newPassword.trim(),
        p_role: newRole,
        p_permissions: permissions
      });

      if (error) throw error;

      if (!data?.success) {
        setFormError(data?.error || 'Erro ao cadastrar usuário.');
        return;
      }

      if (data.user) {
        setUsers(prev => [data.user, ...prev]);
        setIsModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('Analista Pleno');
        setPermissions(['view_reports']);
      }
    } catch (err: any) {
      console.error('Erro ao cadastrar usuário:', err);
      setFormError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Header */}
      <div className="px-4 sm:px-8 py-6 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-variant bg-surface">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-xs text-primary tracking-widest uppercase font-medium">Controle de Acesso</div>
          <h1 className="font-display text-4xl sm:text-[46px] font-bold text-on-surface leading-none tracking-tight">Gestão de Usuários</h1>
          <p className="font-body text-base text-on-surface-variant max-w-2xl mt-1">
            Gerencie analistas e administradores protegidos com hash criptográfico (Bcrypt) e controle de permissões.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchUsers}
            className="p-3 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors text-on-surface cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md font-display font-semibold text-sm whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            Adicionar Usuário
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 w-full flex flex-col gap-6 bg-background flex-1">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-surface-variant flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
            <UsersIcon className="text-primary w-6 h-6 mb-2" />
            <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider font-medium">Total de Usuários</span>
            <span className="font-display text-4xl font-bold text-on-surface">{totalUsers}</span>
          </div>
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-surface-variant flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-tertiary/5 rounded-bl-full -mr-8 -mt-8"></div>
            <Shield className="text-amber-600 w-6 h-6 mb-2" />
            <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider font-medium">Administradores</span>
            <span className="font-display text-4xl font-bold text-on-surface">{adminCount}</span>
          </div>
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-surface-variant flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-8 -mt-8"></div>
            <UserCheck className="text-emerald-600 w-6 h-6 mb-2" />
            <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider font-medium">Analistas Ativos</span>
            <span className="font-display text-4xl font-bold text-on-surface">{activeAnalysts}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface rounded-2xl shadow-sm border border-surface-variant overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-surface-variant flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-surface-container-low">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-surface-variant rounded-xl py-2 pl-10 pr-4 text-sm font-body text-on-surface focus:outline-none focus:border-primary transition-colors" 
                placeholder="Buscar por nome, email ou cargo..." 
                type="text"
              />
            </div>
            <span className="font-body text-xs text-on-surface-variant">Protegido por Bcrypt & RPC seguro</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="font-body text-sm text-on-surface-variant">Carregando usuários do Supabase...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm font-body">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="py-4 px-6 w-12"></th>
                    <th className="py-4 px-6 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Usuário</th>
                    <th className="py-4 px-6 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Cargo / Papel</th>
                    <th className="py-4 px-6 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Status</th>
                    <th className="py-4 px-6 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Último Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant font-body">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.id || idx} className={cn("hover:bg-surface-container-lowest transition-colors group", user.status === 'Inativo' && "opacity-60 grayscale hover:grayscale-0", idx % 2 !== 0 && "bg-surface-container-low/30")}>
                      <td className="py-4 px-6">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-xs" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                            {user.initials || user.name?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-body text-base font-medium text-on-surface">{user.name}</span>
                          <span className="font-body text-sm text-on-surface-variant">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {user.role === 'Administrador' ? <Shield className="w-4 h-4 text-amber-600" /> : <Brain className="w-4 h-4 text-primary" />}
                          <span className="text-sm font-medium text-on-surface">{user.role}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.status === 'Ativo' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Ativo</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant">Inativo</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-on-surface-variant">
                        {new Date(user.last_access || user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 border-t border-surface-variant flex items-center justify-between bg-surface-container-low text-sm font-body text-on-surface-variant">
            <span>Total de {filteredUsers.length} usuários cadastrados</span>
          </div>
        </div>
      </div>

      {/* Slide-over Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200 border-l border-surface-variant z-10">
            <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
              <h2 className="font-display text-xl font-semibold text-on-surface">Adicionar Novo Usuário</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={handleCreateUser} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Nome Completo *</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo" 
                    className="w-full bg-surface border border-surface-variant rounded-xl px-4 py-3 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">E-mail Corporativo *</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="carlos.eduardo@suaempresa.com.br"
                    className="w-full bg-surface border border-surface-variant rounded-xl px-4 py-3 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Senha Inicial de Acesso *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" 
                      className="w-full bg-surface border border-surface-variant rounded-xl py-3 pl-10 pr-4 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Papel no Sistema *</label>
                  <select 
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full bg-surface border border-surface-variant rounded-xl px-4 py-3 font-body text-base text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Analista Sênior">Analista Sênior</option>
                    <option value="Analista Pleno">Analista Pleno</option>
                    <option value="Analista Júnior">Analista Júnior</option>
                  </select>
                </div>

                <div className="p-4 bg-surface-container-low rounded-xl border border-surface-variant mt-2">
                  <h3 className="font-mono text-xs text-on-surface uppercase mb-3 font-semibold">Permissões de Acesso</h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={permissions.includes('view_reports')}
                        onChange={() => togglePermission('view_reports')}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="font-body text-sm text-on-surface">Visualizar todos os relatórios</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={permissions.includes('manage_categories')}
                        onChange={() => togglePermission('manage_categories')}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="font-body text-sm text-on-surface">Gerenciar Categorias</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={permissions.includes('export_data')}
                        onChange={() => togglePermission('export_data')}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span className="font-body text-sm text-on-surface">Exportar Dados Sensíveis</span>
                    </label>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-error font-medium">{formError}</p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-variant">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-surface-variant text-on-surface font-display font-medium text-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-display font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Salvar Usuário
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
