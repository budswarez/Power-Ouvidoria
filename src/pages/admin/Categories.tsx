import { useState, useEffect, type FormEvent } from 'react';
import { 
  Plus, 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  Gavel, 
  AlertOctagon,
  Loader2, 
  X,
  RefreshCw,
  Edit2,
  Sliders
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { Category } from '../../types/database';

export default function Categories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('MessageSquare');
  const [severity, setSeverity] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIcon('MessageSquare');
    setSeverity('Média');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'MessageSquare');
    setSeverity(cat.default_severity || 'Média');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (cat: Category) => {
    if (!token) return;
    try {
      const { data, error } = await supabase.rpc('rpc_admin_manage_category', {
        p_token: token,
        p_action: 'toggle',
        p_category_id: cat.id
      });

      if (!error && data?.success) {
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
      }
    } catch (err) {
      console.error('Erro ao alternar status da categoria:', err);
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe o nome da categoria.');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (editingCategory) {
        // Update existing category
        const { data, error } = await supabase.rpc('rpc_admin_manage_category', {
          p_token: token,
          p_action: 'update',
          p_category_id: editingCategory.id,
          p_name: name.trim(),
          p_slug: editingCategory.slug,
          p_desc: description.trim() || null,
          p_icon: icon,
          p_severity: severity
        });

        if (error) throw error;

        if (!data?.success) {
          setErrorMsg(data?.error || 'Erro ao atualizar categoria.');
          return;
        }

        if (data?.category) {
          setCategories(prev => prev.map(c => c.id === editingCategory.id ? data.category : c));
          setIsModalOpen(false);
        }
      } else {
        // Create new category
        const { data, error } = await supabase.rpc('rpc_admin_manage_category', {
          p_token: token,
          p_action: 'create',
          p_name: name.trim(),
          p_slug: slug,
          p_desc: description.trim() || null,
          p_icon: icon,
          p_severity: severity
        });

        if (error) throw error;

        if (!data?.success) {
          setErrorMsg(data?.error || 'Erro ao criar categoria.');
          return;
        }

        if (data?.category) {
          setCategories(prev => [...prev, data.category]);
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err);
      setErrorMsg(err.message || 'Erro ao salvar categoria.');
    } finally {
      setSubmitting(false);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    switch (iconName) {
      case 'FileText': return FileText;
      case 'AlertTriangle': return AlertTriangle;
      case 'ShieldAlert': return ShieldAlert;
      case 'Gavel': return Gavel;
      case 'AlertOctagon': return AlertOctagon;
      default: return MessageSquare;
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="px-4 sm:px-8 py-8 lg:px-12 lg:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="font-mono text-xs text-primary tracking-widest uppercase font-medium">Configurações</div>
            <h1 className="font-display text-4xl sm:text-[46px] font-bold text-on-surface leading-none tracking-tight">Categorias de Manifestação</h1>
            <p className="font-body text-base text-on-surface-variant max-w-2xl mt-1">
              Configure as categorias disponíveis, ícones e níveis de gravidade padrão para a Ouvidoria Sua Empresa.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchCategories}
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
              Nova Categoria
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="font-body text-sm text-on-surface-variant">Carregando categorias do Supabase...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const IconComp = getIconComponent(cat.icon);
              const catSeverity = cat.default_severity || 'Média';
              return (
                <div 
                  key={cat.id} 
                  className={cn(
                    "bg-surface p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-xs",
                    cat.active ? "border-surface-variant" : "border-surface-variant/40 opacity-60 bg-surface-container-low"
                  )}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-mono font-medium",
                          catSeverity === 'Alta' ? "bg-error-container text-on-error-container" :
                          catSeverity === 'Média' ? "bg-amber-100 text-amber-900" :
                          "bg-surface-container-high text-on-surface"
                        )}>
                          Gravidade: {catSeverity}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-mono font-medium",
                          cat.active ? "bg-emerald-100 text-emerald-800" : "bg-surface-variant text-on-surface-variant"
                        )}>
                          {cat.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-on-surface">{cat.name}</h3>
                      <span className="font-mono text-xs text-on-surface-variant block mt-0.5">{cat.slug}</span>
                      <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed">
                        {cat.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-surface-variant flex items-center justify-between mt-6">
                    <button 
                      onClick={() => openEditModal(cat)}
                      className="flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" /> Editar
                    </button>
                    <button 
                      onClick={() => handleToggleActive(cat)}
                      className={cn(
                        "text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                        cat.active ? "text-error hover:bg-error/10" : "text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      {cat.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova / Editar Categoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-surface-variant rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-surface-variant pb-4">
              <h2 className="font-display text-xl font-bold text-on-surface flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Nome da Categoria *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Conflito de Interesses" 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Descrição</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explicação breve para orientar o colaborador..." 
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Ícone Visual</label>
                  <select 
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="MessageSquare">Balão (Sugestão)</option>
                    <option value="FileText">Prancheta (Reclamação)</option>
                    <option value="AlertTriangle">Triângulo (Denúncia)</option>
                    <option value="ShieldAlert">Escudo (Assédio)</option>
                    <option value="Gavel">Martelo (Conduta)</option>
                    <option value="AlertOctagon">Octógono (Fraude)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Gravidade Padrão *</label>
                  <select 
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                    className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
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
                  {editingCategory ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
