import { useState, useEffect, type FormEvent } from 'react';
import { 
  Search, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Loader2, 
  Calendar, 
  FileText,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { ReportMessage } from '../types/database';

interface PublicReportData {
  id: string;
  protocol: string;
  category: string;
  status: 'Aberto' | 'Em Análise' | 'Concluído' | 'Arquivado';
  created_at: string;
  updated_at: string;
  public_notes: string | null;
}

interface PublicTimelineItem {
  id: string;
  status: string;
  description: string;
  created_at: string;
}

export default function TrackReport() {
  const [searchParams] = useSearchParams();
  const initialProtocol = searchParams.get('protocolo') || '';

  const [protocolInput, setProtocolInput] = useState(initialProtocol);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Loaded report data
  const [report, setReport] = useState<PublicReportData | null>(null);
  const [timeline, setTimeline] = useState<PublicTimelineItem[]>([]);
  const [messages, setMessages] = useState<ReportMessage[]>([]);

  // Reply message
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchProtocol = async (proto: string) => {
    if (!proto.trim()) return;
    setErrorMsg('');
    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc('rpc_public_track_report', {
        p_protocol: proto.trim()
      });

      if (error) {
        setErrorMsg('Erro ao conectar ao servidor de consulta.');
        return;
      }

      if (!data || !data.success) {
        setErrorMsg(data?.error || 'Protocolo não encontrado. Verifique se digitou corretamente.');
        setReport(null);
        return;
      }

      setReport(data.report);
      setTimeline(data.timeline || []);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Erro na consulta:', err);
      setErrorMsg('Erro inesperado ao consultar protocolo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProtocol) {
      fetchProtocol(initialProtocol);
    }
  }, [initialProtocol]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchProtocol(protocolInput);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !report) return;

    setSendingReply(true);
    try {
      const { data, error } = await supabase.rpc('rpc_public_send_message', {
        p_protocol: report.protocol,
        p_message: replyText.trim()
      });

      if (!error && data?.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setReplyText('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-surface-variant/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-display font-black text-xl tracking-tighter shadow-md">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-on-surface leading-tight">SUA EMPRESA</span>
              <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase font-semibold">Canal de Ouvidoria</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link 
              to="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container font-display text-xs font-semibold transition-colors border border-surface-variant/50 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              Registrar Manifestação
            </Link>
            <Link 
              to="/login" 
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-display text-xs font-semibold transition-colors shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-primary" />
              Acesso Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 md:py-16 flex flex-col gap-8">
        
        {/* Title */}
        <div className="text-center flex flex-col gap-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-medium self-center border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            Consulta Pública & Anônima
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
            Acompanhar Manifestação
          </h1>
          <p className="font-body text-sm text-on-surface-variant">
            Insira o número do seu protocolo para verificar o status de apuração e dialogar com o comitê.
          </p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="bg-surface rounded-2xl p-3 border border-surface-variant/80 shadow-md flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input
              type="text"
              value={protocolInput}
              onChange={(e) => setProtocolInput(e.target.value)}
              placeholder="Ex: #OUV-2026-9054"
              className="w-full bg-surface-container-lowest focus:bg-surface-container-high rounded-xl py-3 pl-12 pr-4 font-mono text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Consultar
          </button>
        </form>

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Report Result Container */}
        {report && (
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-surface-variant/80 shadow-lg flex flex-col gap-8 animate-in fade-in duration-300">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-surface-variant">
              <div className="flex flex-col">
                <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Protocolo</span>
                <span className="font-display text-2xl sm:text-3xl font-bold text-primary">{report.protocol}</span>
                <span className="font-body text-xs text-on-surface-variant mt-1">Categoria: <strong>{report.category}</strong></span>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border",
                report.status === 'Aberto' ? "bg-error-container text-on-error-container border-error/20" :
                report.status === 'Em Análise' ? "bg-amber-100 text-amber-900 border-amber-300" :
                report.status === 'Concluído' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                "bg-surface-variant text-on-surface-variant border-surface-variant"
              )}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {report.status}
              </span>
            </div>

            {/* Public resolution / notes if provided */}
            {report.public_notes && (
              <div className="p-5 rounded-2xl bg-surface-container-low border border-primary/20 flex flex-col gap-2">
                <span className="font-display font-semibold text-sm text-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Parecer Oficial do Comitê de Ouvidoria
                </span>
                <p className="font-body text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                  {report.public_notes}
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Histórico de Tramitação
              </h3>
              <div className="relative border-l-2 border-surface-variant ml-3 space-y-6">
                {timeline.map((item, idx) => (
                  <div key={item.id || idx} className="relative pl-6">
                    <div className={cn(
                      "absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-surface",
                      idx === timeline.length - 1 ? "bg-primary" : "bg-surface-variant"
                    )}></div>
                    <div className="flex flex-col">
                      <span className="font-display font-semibold text-on-surface text-sm">{item.status}</span>
                      <span className="font-mono text-[11px] text-on-surface-variant mb-1">
                        {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="font-body text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anonymous Communication Box */}
            <div className="flex flex-col gap-4 pt-6 border-t border-surface-variant">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Diálogo Confidencial com o Comitê
                </h3>
                <p className="font-body text-xs text-on-surface-variant">
                  Envie mensagens complementares, esclarecimentos ou novas informações sem quebrar o seu anonimato.
                </p>
              </div>

              {/* Messages list */}
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50">
                {messages.length === 0 ? (
                  <div className="text-center py-6 text-on-surface-variant text-xs font-body">
                    Nenhuma mensagem complementar trocada até o momento.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={cn(
                        "flex flex-col gap-1 p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed",
                        m.sender_type === 'USER' 
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

              {/* Send message form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua mensagem ou esclarecimento..."
                  className="flex-1 bg-surface-container-lowest border border-surface-variant rounded-xl px-4 py-2.5 font-body text-xs text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-surface-variant/50 bg-surface py-8 text-center text-xs text-on-surface-variant font-body">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Sua Empresa Informática. Todos os direitos reservados. Canal de Ouvidoria & Ética.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-primary transition-colors">Registrar Manifestação</Link>
            <Link to="/login" className="hover:text-primary transition-colors">Painel Administrativo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
