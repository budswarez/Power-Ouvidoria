import { useState, useEffect } from 'react';
import { 
  Table as TableIcon, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Loader2, 
  AlertCircle, 
  User as UserIcon, 
  RefreshCw,
  Clock,
  Paperclip,
  Building2,
  UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { Report, Category } from '../../types/database';

export default function Reports() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [activeTab, setActiveTab] = useState<'abertas' | 'finalizadas' | 'arquivadas' | 'todas'>('abertas');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchReports = async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // 1. Fetch categories
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      // 2. Fetch reports via secure RPC
      const { data, error } = await supabase.rpc('rpc_admin_get_reports', { p_token: token });

      if (error) {
        console.error('Erro na chamada RPC:', error);
        return;
      }

      if (data && !data.success) {
        logout();
        navigate('/login', { replace: true });
        return;
      }

      if (data && data.success && Array.isArray(data.data)) {
        setReports(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar relatos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  // Filter logic
  const filteredReports = reports.filter((report) => {
    // Tab filter
    if (activeTab === 'abertas') {
      if (report.status === 'Concluído' || report.status === 'Arquivado') return false;
    } else if (activeTab === 'finalizadas') {
      if (report.status !== 'Concluído') return false;
    } else if (activeTab === 'arquivadas') {
      if (report.status !== 'Arquivado') return false;
    }

    // Category filter
    if (selectedCategory && report.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (selectedStatus && report.status !== selectedStatus) {
      return false;
    }

    // Assignee filter
    if (selectedAssignee === 'mine') {
      if (report.assigned_to !== user?.id) return false;
    } else if (selectedAssignee === 'unassigned') {
      if (report.assigned_to) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchProtocol = report.protocol?.toLowerCase().includes(q);
      const matchDesc = report.description?.toLowerCase().includes(q);
      const matchName = report.name ? report.name.toLowerCase().includes(q) : false;
      const matchCategory = report.category?.toLowerCase().includes(q);
      const matchAssignee = report.assigned_name?.toLowerCase().includes(q);
      const matchBranch = report.branch?.toLowerCase().includes(q);
      if (!matchProtocol && !matchDesc && !matchName && !matchCategory && !matchAssignee && !matchBranch) {
        return false;
      }
    }

    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = async () => {
    // Log audit event
    if (token) {
      void Promise.resolve(supabase.rpc('rpc_admin_log_audit', {
        p_token: token,
        p_action: 'EXPORT_CSV',
        p_resource_id: `${filteredReports.length} registros`,
        p_details: `Exportou planilha CSV com filtros aplicados.`
      })).catch(() => {});
    }

    const headers = ['Protocolo', 'Data', 'Unidade', 'Categoria', 'Gravidade', 'Status', 'SLA / Prazo', 'Responsável', 'Identificação', 'Email', 'Descrição'];
    const rows = filteredReports.map(r => [
      `"${r.protocol}"`,
      `"${new Date(r.created_at).toLocaleString('pt-BR')}"`,
      `"${r.branch || 'Não informada'}"`,
      `"${r.category}"`,
      `"${r.severity}"`,
      `"${r.status}"`,
      `"${r.due_date ? new Date(r.due_date).toLocaleDateString('pt-BR') : '—'}"`,
      `"${r.assigned_name || 'Não atribuído'}"`,
      `"${r.is_anonymous ? 'Anônimo' : (r.name || 'Identificado')}"`,
      `"${r.email || ''}"`,
      `"${r.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ouvidoria_relatos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSlaBadge = (report: Report) => {
    if (report.status === 'Concluído') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          Encerrado
        </span>
      );
    }
    if (report.status === 'Arquivado') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-on-surface-variant font-medium bg-surface-variant/40 px-2 py-0.5 rounded-md">
          Arquivado
        </span>
      );
    }

    if (!report.due_date) return <span className="text-xs text-on-surface-variant">—</span>;

    const now = new Date().getTime();
    const due = new Date(report.due_date).getTime();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-error font-bold bg-error/10 px-2 py-0.5 rounded-md border border-error/30 animate-pulse">
          <Clock className="w-3 h-3" /> Atrasado ({Math.abs(diffDays)}d)
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
          <Clock className="w-3 h-3" /> Vence em {diffDays === 0 ? 'Hoje' : `${diffDays}d`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <Clock className="w-3 h-3" /> {diffDays}d restantes
      </span>
    );
  };

  return (
    <div className="flex flex-col w-full">
      <div className="px-4 sm:px-8 py-8 lg:px-12 lg:py-12">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl sm:text-[46px] font-bold text-on-background mb-3 leading-none tracking-tight">Registro de Ouvidorias</h1>
            <p className="font-body text-base text-on-surface-variant">
              Gerencie todas as manifestações com controle de SLA, atribuição de analistas e anexos de evidências.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button 
              onClick={fetchReports} 
              className="p-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl transition-colors cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={exportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 transition-colors rounded-xl font-display font-medium text-on-primary shadow-md cursor-pointer"
            >
              <TableIcon className="w-5 h-5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-surface p-4 sm:p-6 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center border border-surface-variant/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-surface-container-low focus:bg-surface-container-high transition-colors rounded-xl py-3 pl-12 pr-4 font-body text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none" 
              placeholder="Buscar por protocolo, autor, analista, filial ou relato..." 
              type="text"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
            {/* Assignee Filter */}
            <div className="relative w-full sm:w-44">
              <select 
                value={selectedAssignee}
                onChange={(e: any) => { setSelectedAssignee(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl py-3 px-4 pr-10 font-body text-xs text-on-surface focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">Todos Responsáveis</option>
                <option value="mine">Meus Relatos</option>
                <option value="unassigned">Não Atribuídos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none w-4 h-4" />
            </div>

            {/* Category Filter */}
            <div className="relative w-full sm:w-44">
              <select 
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl py-3 px-4 pr-10 font-body text-xs text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none w-4 h-4" />
            </div>

            {/* Status Filter */}
            <div className="relative w-full sm:w-40">
              <select 
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl py-3 px-4 pr-10 font-body text-xs text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="">Todos Status</option>
                <option value="Aberto">Aberto</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Concluído">Concluído</option>
                <option value="Arquivado">Arquivado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 p-1 bg-surface-container-low rounded-2xl w-fit overflow-x-auto max-w-full">
          <button 
            onClick={() => { setActiveTab('abertas'); setCurrentPage(1); }}
            className={cn(
              "whitespace-nowrap px-6 py-2 rounded-xl font-display font-medium text-sm transition-all cursor-pointer",
              activeTab === 'abertas' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            Abertas
          </button>
          <button 
            onClick={() => { setActiveTab('finalizadas'); setCurrentPage(1); }}
            className={cn(
              "whitespace-nowrap px-6 py-2 rounded-xl font-display font-medium text-sm transition-all cursor-pointer",
              activeTab === 'finalizadas' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            Finalizadas
          </button>
          <button 
            onClick={() => { setActiveTab('arquivadas'); setCurrentPage(1); }}
            className={cn(
              "whitespace-nowrap px-6 py-2 rounded-xl font-display font-medium text-sm transition-all cursor-pointer",
              activeTab === 'arquivadas' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            Arquivadas
          </button>
          <button 
            onClick={() => { setActiveTab('todas'); setCurrentPage(1); }}
            className={cn(
              "whitespace-nowrap px-6 py-2 rounded-xl font-display font-medium text-sm transition-all cursor-pointer",
              activeTab === 'todas' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            Todas
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-surface rounded-2xl shadow-sm border border-surface-variant/50 overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="font-body text-sm text-on-surface-variant">Carregando relatos com segurança...</span>
            </div>
          ) : paginatedReports.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-on-surface-variant/60" />
              <h3 className="font-display text-lg font-semibold text-on-surface">Nenhuma manifestação encontrada</h3>
              <p className="font-body text-sm text-on-surface-variant max-w-md">
                Não há relatos para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-low border-b-2 border-surface-variant">
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Protocolo</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Data</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Categoria</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Prazo / SLA</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Responsável</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Gravidade</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Status</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-body text-sm text-on-surface">
                  {paginatedReports.map((report, idx) => (
                    <tr key={report.id} className={cn("hover:bg-surface-container-lowest transition-colors border-b border-surface-variant/50 group", idx % 2 !== 0 && "bg-surface-bright/30")}>
                      <td className="p-4 font-mono text-primary font-bold">
                        <Link to={`/admin/ouvidorias/${encodeURIComponent(report.protocol || report.id)}`} className="hover:underline flex items-center gap-1.5">
                          {report.protocol}
                          {report.attachments && report.attachments.length > 0 && (
                            <span title={`${report.attachments.length} anexo(s)`}>
                              <Paperclip className="w-3.5 h-3.5 text-on-surface-variant" />
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-4 text-on-surface-variant text-xs font-mono">
                        {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="p-4 font-medium">
                        <div className="flex flex-col">
                          <span>{report.category}</span>
                          {report.branch && (
                            <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {report.branch}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {getSlaBadge(report)}
                      </td>
                      <td className="p-4">
                        {report.assigned_name ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface">
                            <UserCheck className="w-3.5 h-3.5 text-primary" /> {report.assigned_name}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Não atribuído</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-md font-mono text-xs font-medium",
                          report.severity === 'Alta' ? "bg-error-container text-on-error-container" :
                          report.severity === 'Média' ? "bg-amber-100 text-amber-900" :
                          "bg-surface-container-low text-on-surface-variant"
                        )}>
                          {report.severity}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="p-4 text-right">
                        <Link 
                          to={`/admin/ouvidorias/${encodeURIComponent(report.protocol || report.id)}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary hover:text-on-primary bg-surface-container rounded-lg transition-colors text-on-surface font-display text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          <div className="px-4 sm:px-6 py-4 bg-surface-container-low border-t border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-body text-sm text-on-surface-variant">
              Mostrando {filteredReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredReports.length)} de {filteredReports.length} relatos
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-container-high text-on-surface shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl shadow-sm font-display font-medium cursor-pointer transition-colors",
                    currentPage === page ? "bg-primary text-on-primary shadow-md" : "bg-surface hover:bg-surface-container-high text-on-surface"
                  )}
                >
                  {page}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-container-high text-on-surface shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "";
  let dotColor = "";
  
  switch(status) {
    case "Aberto":
      color = "bg-error-container text-on-error-container";
      dotColor = "bg-error";
      break;
    case "Em Análise":
      color = "bg-amber-100 text-amber-900";
      dotColor = "bg-amber-500";
      break;
    case "Concluído":
      color = "bg-emerald-100 text-emerald-800";
      dotColor = "bg-emerald-600";
      break;
    case "Arquivado":
      color = "bg-surface-variant text-on-surface-variant";
      dotColor = "bg-surface-variant";
      break;
    default:
      color = "bg-surface-variant text-on-surface-variant";
      dotColor = "bg-tertiary";
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-display font-medium text-xs", color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)}></span>
      {status}
    </span>
  );
}
