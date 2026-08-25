import { useState, useEffect, type FormEvent } from 'react';
import { 
  Plus, 
  Building2, 
  Search, 
  Loader2, 
  X, 
  RefreshCw, 
  Edit2, 
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { Branch } from '../../types/database';

export default function Branches() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setBranches(data);
      }
    } catch (err) {
      console.error('Erro ao buscar unidades/filiais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreateModal = () => {
    setEditingBranch(null);
    setName('');
    setDescription('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setName(b.name);
    setDescription(b.description || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (b: Branch) => {
    if (!token) return;
    try {
      const { data, error } = await supabase.rpc('rpc_admin_manage_branch', {
        p_token: token,
        p_action: 'toggle',
        p_branch_id: b.id
      });

      if (!error && data?.success) {
        setBranches(prev => prev.map(item => item.id === b.id ? { ...item, active: !item.active } : item));
      }
    } catch (err) {
      console.error('Erro ao alternar status da unidade:', err);
    }
  };

  const handleDelete = async (b: Branch) => {
    if (!token) return;
    if (!window.confirm(`Tem certeza que deseja excluir a unidade/departamento "${b.name}"?`)) return;

    try {
      const { data, error } = await supabase.rpc('rpc_admin_manage_branch', {
        p_token: token,
        p_action: 'delete',
        p_branch_id: b.id
      });

      if (!error && data?.success) {
        setBranches(prev => prev.filter(item => item.id !== b.id));
      }
    } catch (err) {
      console.error('Erro ao excluir unidade:', err);
    }
  };

  const handleSaveBranch = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o nome da unidade ou departamento.');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      if (editingBranch) {
        // Update
        const { data, error } = await supabase.rpc('rpc_admin_manage_branch', {
          p_token: token,
          p_action: 'update',
          p_branch_id: editingBranch.id,
          p_name: name.trim(),
          p_desc: description.trim() || null
        });

        if (error) throw error;

        if (!data?.success) {
          setErrorMsg(data?.error || 'Erro ao atualizar unidade.');
          return;
        }

        if (data?.branch) {
          setBranches(prev => prev.map(item => item.id === editingBranch.id ? data.branch : item));
          setIsModalOpen(false);
        }
      } else {
        // Create
        const { data, error } = await supabase.rpc('rpc_admin_manage_branch', {
          p_token: token,
          p_action: 'create',
          p_name: name.trim(),
          p_desc: description.trim() || null
        });

        if (error) throw error;

        if (!data?.success) {
          setErrorMsg(data?.error || 'Erro ao cadastrar unidade.');
          return;
        }

        if (data?.branch) {
          setBranches(prev => [...prev, data.branch]);
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar unidade:', err);
      setErrorMsg(err.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col w-full">
      <div className="px-4 sm:px-8 py-8 lg:px-12 lg:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="font-mono text-xs text-primary tracking-widest uppercase font-medium">Estrutura Organizacional</div>
            <h1 className="font-display text-4xl sm:text-[46px] font-bold text-on-surface leading-none tracking-tight">Unidades & Filiais</h1>
            <p className="font-body text-base text-on-surface-variant max-w-2xl mt-1">
              Cadastre, edite e organize as filiais, lojas físicas, centros de distribuição e departamentos da Sua Empresa.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchBranches}
              className="p-3 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors text-on-surface cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md font-display font-semibold text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Unidade / Filial
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-surface p-4 sm:p-6 rounded-2xl shadow-sm mb-6 flex items-center border border-surface-variant/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low focus:bg-surface-container-high transition-colors rounded-xl py-3 pl-12 pr-4 font-body text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none" 
              placeholder="Buscar por nome da unidade, filial ou departamento..." 
              type="text"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="font-body text-sm text-on-surface-variant">Carregando unidades do Supabase...</span>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-16 text-center text-on-surface-variant text-sm font-body bg-surface rounded-2xl border border-surface-variant/50">
            Nenhuma unidade ou filial encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.map((b) => (
              <div 
                key={b.id} 
                className={cn(
                  "bg-surface p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-xs",
                  b.active ? "border-surface-variant" : "border-surface-variant/40 opacity-60 bg-surface-container-low"
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-mono font-medium",
                      b.active ? "bg-emerald-100 text-emerald-800" : "bg-surface-variant text-on-surface-variant"
                    )}>
                      {b.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-on-surface">{b.name}</h3>
                    {b.description ? (
                      <p className="font-body text-xs text-on-surface-variant mt-1 line-clamp-2">
                        {b.description}
                      </p>
                    ) : (
                      <span className="font-mono text-[11px] text-on-surface-variant block mt-1">
                        Cadastrada em {new Date(b.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-5 border-t border-surface-variant flex items-center justify-between mt-5">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openEditModal(b)}
                      className="p-2 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                      title="Editar Unidade"
                    >
                      <Edit2 className="w-4 h-4 text-primary" />
                    </button>
                    <button 
                      onClick={() => handleDelete(b)}
                      className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-lg transition-colors cursor-pointer"
                      title="Excluir Unidade"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>
                  </div>

                  <button 
                    onClick={() => handleToggleActive(b)}
                    className={cn(
                      "text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                      b.active ? "text-error hover:bg-error/10" : "text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    {b.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova / Editar Unidade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-surface-variant rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-surface-variant pb-4">
              <h2 className="font-display text-xl font-bold text-on-surface flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {editingBranch ? 'Editar Unidade / Filial' : 'Nova Unidade / Filial'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">
                  Nome da Unidade / Filial / Departamento *
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Matriz Joinville, CD Logística, TI, SAC..." 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">
                  Descrição / Observações (Opcional)
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre a localização ou departamento..." 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary min-h-[70px]"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-error font-medium">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-variant">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-surface-variant font-display text-sm font-medium hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-primary text-on-primary font-display text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingBranch ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
