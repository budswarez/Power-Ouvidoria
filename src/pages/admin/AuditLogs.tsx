import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Download, 
  Loader2, 
  RefreshCw, 
  User, 
  Eye, 
  FileSpreadsheet, 
  Edit3, 
  UserPlus,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { cn } from '../../lib/utils';
import type { AdminAuditLog } from '../../types/database';

export default function AuditLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('rpc_admin_get_audit_logs', { p_token: token });

      if (!error && data?.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.user_name?.toLowerCase().includes(q) ||
        log.resource_id?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportAuditCSV = () => {
    const headers = ['Data / Hora', 'Usuário', 'Ação', 'Recurso / Protocolo', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.created_at).toLocaleString('pt-BR')}"`,
      `"${l.user_name}"`,
      `"${l.action}"`,
      `"${l.resource_id || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ouvidoria_trilha_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'VIEW_REPORT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-container text-on-surface"><Eye className="w-3 h-3" /> Visualização</span>;
      case 'EXPORT_CSV':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary"><FileSpreadsheet className="w-3 h-3" /> Exportação CSV</span>;
      case 'CHANGE_STATUS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-900"><Edit3 className="w-3 h-3" /> Alteração Status</span>;
      case 'ASSIGN_REPORT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-100 text-indigo-900"><User className="w-3 h-3" /> Atribuição</span>;
      case 'CREATE_USER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-100 text-emerald-900"><UserPlus className="w-3 h-3" /> Novo Usuário</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-variant text-on-surface-variant">{action}</span>;
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="px-4 sm:px-8 py-8 lg:px-12 lg:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="font-mono text-xs text-primary tracking-widest uppercase font-medium">Compliance & LGPD</div>
            <h1 className="font-display text-4xl sm:text-[46px] font-bold text-on-surface leading-none tracking-tight">Trilha de Auditoria</h1>
            <p className="font-body text-base text-on-surface-variant max-w-2xl mt-1">
              Registro cronológico e imutável de todas as ações administrativas executadas na plataforma.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchLogs}
              className="p-3 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors text-on-surface cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={exportAuditCSV}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md font-display font-semibold text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar Trilha (CSV)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface p-4 sm:p-6 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center border border-surface-variant/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low focus:bg-surface-container-high transition-colors rounded-xl py-3 pl-12 pr-4 font-body text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none" 
              placeholder="Buscar por analista, protocolo ou ação..." 
              type="text"
            />
          </div>
          <div className="w-full md:w-56">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl py-3 px-4 font-body text-sm text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="">Todas as Ações</option>
              <option value="VIEW_REPORT">Visualização de Relato</option>
              <option value="EXPORT_CSV">Exportação de CSV</option>
              <option value="CHANGE_STATUS">Alteração de Status</option>
              <option value="ASSIGN_REPORT">Atribuição de Analista</option>
              <option value="CREATE_USER">Criação de Usuário</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-surface rounded-2xl shadow-sm border border-surface-variant/50 overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="font-body text-sm text-on-surface-variant">Carregando trilha de auditoria...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant text-sm font-body">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-low border-b-2 border-surface-variant">
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Data / Hora</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Usuário / Analista</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Ação Realizada</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Recurso / Protocolo</th>
                    <th className="p-4 font-mono text-xs text-on-surface-variant uppercase tracking-wider font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="font-body text-sm text-on-surface divide-y divide-surface-variant/40">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-mono text-xs text-on-surface-variant">
                        {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-4 font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {log.user_name?.charAt(0) || 'A'}
                        </div>
                        {log.user_name}
                      </td>
                      <td className="p-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-primary">
                        {log.resource_id || '—'}
                      </td>
                      <td className="p-4 text-xs text-on-surface-variant max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
