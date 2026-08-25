import { useState, useEffect, type FormEvent } from 'react';
import { 
  ArrowLeft, 
  Info, 
  Clock, 
  AlertTriangle, 
  User, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  Archive, 
  Loader2, 
  Send,
  Calendar,
  Mail,
  ShieldCheck,
  Printer,
  Paperclip,
  Download,
  UserCheck,
  Building2,
  Lock
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { Report, ReportComment, ReportTimeline, ReportMessage, AdminUser } from '../../types/database';
import { cn } from '../../lib/utils';

export default function ReportDetail() {
  const { id } = useParams();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [timeline, setTimeline] = useState<ReportTimeline[]>([]);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Public messages & resolution
  const [publicMessage, setPublicMessage] = useState('');
  const [publicNotes, setPublicNotes] = useState('');
  const [savingPublicNotes, setSavingPublicNotes] = useState(false);
  const [sendingPublicMsg, setSendingPublicMsg] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const fetchReportData = async () => {
    if (!id || !token) return;
    try {
      setLoading(true);

      // 1. Fetch report details
      const { data, error } = await supabase.rpc('rpc_admin_get_report_detail', {
        p_token: token,
        p_identifier: decodeURIComponent(id)
      });

      if (error) {
        console.error('Erro na chamada RPC:', error);
        return;
      }

      if (data && !data.success) {
        if (data.error?.includes('não autorizada')) {
          logout();
          navigate('/login', { replace: true });
        }
        return;
      }

      if (data && data.success) {
        setReport(data.report);
        setComments(data.comments || []);
        setTimeline(data.timeline || []);
        setMessages(data.messages || []);
        setPublicNotes(data.report.public_notes || '');
      }

      // 2. Fetch admin users for assignment
      const { data: usersData } = await supabase.rpc('rpc_admin_get_users', { p_token: token });
      if (usersData && usersData.success && Array.isArray(usersData.data)) {
        setAdminUsers(usersData.data);
      }

    } catch (err) {
      console.error('Erro ao carregar detalhes do relato:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [id, token]);

  const handleStatusChange = async (newStatus: 'Aberto' | 'Em Análise' | 'Concluído' | 'Arquivado') => {
    if (!report || !token) return;
    setStatusUpdating(true);

    try {
      const { data, error } = await supabase.rpc('rpc_admin_update_report_status', {
        p_token: token,
        p_report_id: report.id,
        p_status: newStatus
      });

      if (!error && data?.success) {
        setReport(prev => prev ? { ...prev, status: newStatus } : null);
        fetchReportData();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssigneeChange = async (assignedToId: string) => {
    if (!report || !token) return;
    try {
      const targetId = assignedToId === '' ? null : assignedToId;
      const { data, error } = await supabase.rpc('rpc_admin_assign_report', {
        p_token: token,
        p_report_id: report.id,
        p_assigned_to: targetId
      });

      if (!error && data?.success) {
        setReport(prev => prev ? { 
          ...prev, 
          assigned_to: targetId,
          assigned_name: data.report?.assigned_name || null 
        } : null);
        fetchReportData();
      }
    } catch (err) {
      console.error('Erro ao atribuir analista:', err);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!report || !token || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase.rpc('rpc_admin_add_comment', {
        p_token: token,
        p_report_id: report.id,
        p_content: newComment.trim()
      });

      if (!error && data?.success && data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSavePublicNotes = async (e: FormEvent) => {
    e.preventDefault();
    if (!report || !token) return;

    setSavingPublicNotes(true);
    try {
      const { data, error } = await supabase.rpc('rpc_admin_send_public_message', {
        p_token: token,
        p_report_id: report.id,
        p_message: '',
        p_public_notes: publicNotes.trim()
      });

      if (!error && data?.success) {
        setReport(prev => prev ? { ...prev, public_notes: publicNotes.trim() } : null);
      }
    } catch (err) {
      console.error('Erro ao salvar parecer público:', err);
    } finally {
      setSavingPublicNotes(false);
    }
  };

  const handleSendPublicMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!report || !token || !publicMessage.trim()) return;

    setSendingPublicMsg(true);
    try {
      const { data, error } = await supabase.rpc('rpc_admin_send_public_message', {
        p_token: token,
        p_report_id: report.id,
        p_message: publicMessage.trim()
      });

      if (!error && data?.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setPublicMessage('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem ao denunciante:', err);
    } finally {
      setSendingPublicMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="font-body text-sm text-on-surface-variant">Carregando dados da manifestação com segurança...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
        <AlertTriangle className="w-12 h-12 text-primary" />
        <h2 className="font-display text-2xl font-bold">Relato não encontrado</h2>
        <p className="font-body text-sm text-on-surface-variant">Não foi possível encontrar o registro correspondente no banco de dados.</p>
        <Link to="/admin/ouvidorias" className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-display font-medium text-sm">
          Voltar aos Relatos
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 1. CLEAN TEXTUAL TEMPLATE - VISIBLE ONLY WHEN PRINTING */}
      <div className="hidden print:block text-black bg-white p-6 max-w-4xl mx-auto leading-normal">
        <div className="border-b-2 border-black pb-3 mb-5 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-black">Ouvidoria Sua Empresa</h1>
            <p className="text-xs text-gray-700 uppercase font-medium tracking-wider">Relatório Oficial de Manifestação</p>
          </div>
          <div className="text-right">
            <div className="text-base font-mono font-bold text-black">{report.protocol}</div>
            <div className="text-xs text-gray-800 font-medium">
              Status: <span className="font-bold uppercase text-black">{report.status}</span>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2.5 text-black">
            1. Dados Gerais do Registro
          </h2>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-xs text-gray-900">
            <div><strong>Data / Hora de Registro:</strong> {new Date(report.created_at).toLocaleString('pt-BR')}</div>
            <div><strong>Unidade / Setor:</strong> {report.branch || 'Não especificada'}</div>
            <div><strong>Categoria:</strong> {report.category}</div>
            <div><strong>Gravidade:</strong> {report.severity}</div>
            <div><strong>Responsável Designado:</strong> {report.assigned_name || 'Não atribuído'}</div>
            <div><strong>Prazo SLA:</strong> {report.due_date ? new Date(report.due_date).toLocaleDateString('pt-BR') : '—'}</div>
            <div><strong>Modalidade:</strong> {report.is_anonymous ? 'Anônimo (Sigilo Total)' : 'Identificado'}</div>
            <div><strong>Nome do Colaborador:</strong> {report.is_anonymous ? 'Sigilo Preservado' : (report.name || 'Não informado')}</div>
            <div><strong>E-mail de Contato:</strong> {report.email || 'Não informado'}</div>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2.5 text-black">
            2. Descrição da Manifestação
          </h2>
          <div className="text-xs whitespace-pre-wrap leading-relaxed text-black border border-gray-300 p-3.5 bg-gray-50 rounded">
            {report.description}
          </div>
        </div>

        {report.attachments && report.attachments.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2 text-black">
              Evidências & Anexos ({report.attachments.length})
            </h2>
            <ul className="list-disc pl-5 text-xs text-gray-800 space-y-1">
              {report.attachments.map((att, idx) => (
                <li key={idx}>
                  <strong>{att.name}</strong> ({(att.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        {comments.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2.5 text-black">
              3. Pareceres Técnicos & Notas Internas
            </h2>
            <div className="space-y-2.5">
              {comments.map((c, idx) => (
                <div key={c.id || idx} className="text-xs border-l-2 border-gray-600 pl-3 py-1">
                  <div className="font-bold text-black">
                    {c.author_name} — <span className="text-gray-600 font-normal">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2.5 text-black">
            4. Histórico de Tramitação
          </h2>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-700">
                <th className="py-1 font-bold">Data / Hora</th>
                <th className="py-1 font-bold">Status</th>
                <th className="py-1 font-bold">Ação / Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeline.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-1.5 font-mono text-gray-700">{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                  <td className="py-1.5 font-bold text-black">{item.status}</td>
                  <td className="py-1.5 text-gray-900">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-400 pt-2 text-[10px] text-gray-600 flex justify-between items-center">
          <span>Documento Confidencial — Comitê de Ética e Ouvidoria Sua Empresa</span>
          <span>Data de Emissão: {new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* 2. INTERACTIVE SCREEN VIEW - HIDDEN WHEN PRINTING */}
      <div className="print:hidden flex flex-col w-full max-w-7xl mx-auto">
        <div className="px-4 sm:px-8 py-8 lg:px-12 lg:py-12 flex flex-col lg:flex-row gap-8">
          
          {/* Main Content Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to="/admin/ouvidorias" className="p-2.5 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant bg-surface border border-surface-variant/50 shadow-xs">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest font-medium">Protocolo Oficial</span>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl font-bold text-on-surface">{report.protocol}</h1>
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                      report.status === 'Aberto' ? "bg-error-container text-on-error-container border-error/20" :
                      report.status === 'Em Análise' ? "bg-amber-100 text-amber-900 border-amber-300" :
                      report.status === 'Concluído' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                      "bg-surface-variant text-on-surface-variant border-surface-variant"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"></span>
                      {report.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-variant text-on-surface font-display text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-primary" />
                  Imprimir / PDF
                </button>
                {report.status !== 'Em Análise' && (
                  <button 
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange('Em Análise')}
                    className="px-4 py-2 rounded-xl bg-surface-container border border-surface-variant text-on-surface font-display text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Mover para Em Análise
                  </button>
                )}
                {report.status !== 'Concluído' && (
                  <button 
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange('Concluído')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-display text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Relato
                  </button>
                )}
                {report.status !== 'Arquivado' && (
                  <button 
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange('Arquivado')}
                    className="px-4 py-2 rounded-xl border border-surface-variant text-on-surface font-display text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" /> Arquivar
                  </button>
                )}
                {report.status === 'Concluído' && (
                  <button 
                    disabled={statusUpdating}
                    onClick={() => handleStatusChange('Aberto')}
                    className="px-4 py-2 rounded-xl bg-surface-container border border-surface-variant text-on-surface font-display text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reabrir Manifestação
                  </button>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-on-surface">
                <Info className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Informações do Relato</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Categoria</span>
                  <span className="font-body text-base font-semibold text-on-surface">{report.category}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Unidade / Setor</span>
                  <span className="font-body text-base font-medium text-on-surface flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" />
                    {report.branch || 'Não informada'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Data de Envio</span>
                  <span className="font-body text-base font-medium text-on-surface flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-on-surface-variant" />
                    {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Gravidade</span>
                  <span className={cn(
                    "font-body text-base font-semibold flex items-center gap-1",
                    report.severity === 'Alta' ? "text-error" : report.severity === 'Média' ? "text-primary" : "text-emerald-600"
                  )}>
                    <AlertTriangle className="w-4 h-4" /> {report.severity}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Identificação</span>
                  <span className="font-body text-base font-medium text-on-surface flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-on-surface-variant" />
                    </div>
                    {report.is_anonymous ? (
                      <span className="italic text-on-surface-variant">Relato Anônimo</span>
                    ) : (
                      <span>{report.name || 'Não informado'}</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Contato Informado</span>
                  <span className="font-body text-base text-on-surface flex items-center gap-2">
                    {report.email ? (
                      <>
                        <Mail className="w-4 h-4 text-on-surface-variant" />
                        <a href={`mailto:${report.email}`} className="text-primary hover:underline">{report.email}</a>
                      </>
                    ) : (
                      <span className="text-on-surface-variant italic">Sigilo preservado</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-on-surface">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Descrição do Ocorrido</h2>
              </div>
              
              <div className="font-body text-base text-on-surface whitespace-pre-wrap leading-relaxed bg-surface-container-lowest p-5 rounded-xl border border-surface-variant/40">
                {report.description}
              </div>
            </div>

            {/* Attachments Section */}
            {report.attachments && report.attachments.length > 0 && (
              <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-on-surface">
                  <Paperclip className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Evidências e Anexos ({report.attachments.length})</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.attachments.map((att, idx) => {
                    const isImg = att.type?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(att.name);
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-surface-container-lowest border border-surface-variant flex flex-col justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-body text-sm font-semibold text-on-surface truncate">{att.name}</span>
                            <span className="font-mono text-[11px] text-on-surface-variant">{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>

                        {isImg && (
                          <img 
                            src={att.url} 
                            alt={att.name} 
                            className="w-full h-32 object-cover rounded-lg border border-surface-variant/50"
                          />
                        )}

                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-center rounded-lg font-display text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Abrir / Baixar Arquivo
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Public Notes / Parecer Oficial para o Denunciante */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-on-surface">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Parecer Oficial do Comitê (Visível ao Denunciante)</h2>
                </div>
                <span className="text-xs font-mono text-primary font-semibold">Acompanhamento Público</span>
              </div>
              <p className="font-body text-xs text-on-surface-variant mb-3">
                Este texto ficará visível para o manifestante quando ele consultar o protocolo na página pública.
              </p>
              
              <form onSubmit={handleSavePublicNotes} className="flex flex-col gap-3">
                <textarea
                  value={publicNotes}
                  onChange={(e) => setPublicNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: A ocorrência foi apurada pela auditoria e as medidas cabíveis foram aplicadas..."
                  className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3.5 font-body text-sm text-on-surface focus:outline-none focus:border-primary"
                ></textarea>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPublicNotes}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-display text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingPublicNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Salvar Parecer Público
                  </button>
                </div>
              </form>
            </div>

            {/* Anonymous Communication Channel */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-on-surface">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Diálogo Confidencial com o Denunciante</h2>
              </div>
              <p className="font-body text-xs text-on-surface-variant mb-4">
                Envie perguntas de esclarecimento ao colaborador anônimo. Ele responderá ao consultar o protocolo.
              </p>

              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto p-4 rounded-xl bg-surface-container-lowest border border-surface-variant/50 mb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-on-surface-variant text-xs font-body">
                    Nenhuma mensagem enviada ao denunciante ainda.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={cn(
                        "flex flex-col gap-1 p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed",
                        m.sender_type === 'ADMIN' 
                          ? "self-end bg-primary text-on-primary rounded-tr-none" 
                          : "self-start bg-surface-container border border-surface-variant/80 text-on-surface rounded-tl-none"
                      )}
                    >
                      <div className="flex justify-between items-center gap-4 text-[10px] opacity-80 font-mono">
                        <span>{m.sender_name}</span>
                        <span>{new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-body text-xs whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendPublicMessage} className="flex gap-2">
                <input
                  type="text"
                  value={publicMessage}
                  onChange={(e) => setPublicMessage(e.target.value)}
                  placeholder="Solicitar esclarecimentos ao denunciante..."
                  className="flex-1 bg-surface-container-low border border-surface-variant rounded-xl px-4 py-2.5 font-body text-xs text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingPublicMsg || !publicMessage.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sendingPublicMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar Mensagem
                </button>
              </form>
            </div>

            {/* Internal Comments */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-on-surface">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Notas e Pareceres Internos (Sigilo do Comitê)</h2>
              </div>
              
              <form onSubmit={handleAddComment} className="bg-surface-container-low rounded-xl p-4 mb-6 border border-surface-variant/50">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 resize-y font-body text-sm text-on-surface placeholder:text-on-surface-variant min-h-[80px] focus:outline-none"
                  placeholder="Adicione um parecer técnico ou nota interna (visível apenas para analistas)..."
                ></textarea>
                <div className="flex justify-end mt-2">
                  <button 
                    type="submit" 
                    disabled={submittingComment || !newComment.trim()}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-display text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Salvar Nota Interna
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-on-surface-variant text-sm font-body">
                    Nenhum comentário interno adicionado ainda.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-4 p-4 rounded-xl bg-surface-container-lowest border border-surface-variant/50">
                      {c.author_avatar ? (
                        <img src={c.author_avatar} alt={c.author_name} className="w-10 h-10 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                          {c.author_name?.charAt(0) || 'A'}
                        </div>
                      )}
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-medium text-on-surface text-sm">{c.author_name}</span>
                          <span className="font-body text-xs text-on-surface-variant">
                            {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            
            {/* Responsible Analyst Assignment */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface">
                <UserCheck className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-base">Analista Responsável</h3>
              </div>
              <p className="font-body text-xs text-on-surface-variant">
                Atribua este chamado para acompanhamento individualizado.
              </p>

              <select
                value={report.assigned_to || ''}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-variant rounded-xl p-3 font-body text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="">Nenhum (Não Atribuído)</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* SLA Due Date Box */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-on-surface">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-base">Prazo de Resolução (SLA)</h3>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="font-mono text-xs text-on-surface-variant uppercase">Data Limite:</span>
                <span className="font-mono text-sm font-bold text-on-surface">
                  {report.due_date ? new Date(report.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '30 dias do envio'}
                </span>
              </div>
            </div>

            {/* History Timeline */}
            <div className="bg-surface rounded-2xl border border-surface-variant/50 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-on-surface">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Linha do Tempo</h2>
              </div>
              
              <div className="relative border-l-2 border-surface-variant ml-3 space-y-6">
                {timeline.map((item, idx) => (
                  <div key={item.id} className="relative pl-6">
                    <div className={cn(
                      "absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-surface",
                      idx === 0 ? "bg-primary" : "bg-surface-variant"
                    )}></div>
                    <div className="flex flex-col">
                      <span className="font-display font-semibold text-on-surface text-sm">{item.status}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant mb-1">
                        {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="font-body text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl border border-surface-variant/50 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-display font-semibold text-sm">Garantia de Sigilo</span>
              </div>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                Todas as ações executadas neste chamado são registradas na trilha imutável de auditoria.
              </p>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
