import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Gavel,
  AlertOctagon,
  ChevronRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  Loader2,
  Lock,
  ArrowRight,
  HelpCircle,
  Paperclip,
  X,
  File,
  Search,
  Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Category, Attachment, Branch } from '../types/database';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PublicForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [branch, setBranch] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Success Modal State
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingCategories(true);
        // 1. Categories
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: true });

        if (!catError && catData && catData.length > 0) {
          setCategories(catData);
          setSelectedCategory(catData[0]);
        }

        // 2. Branches
        const { data: branchData } = await supabase
          .from('branches')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true });

        if (branchData) {
          setBranches(branchData);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadData();
  }, []);

  const getCategoryIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'FileText': return FileText;
      case 'AlertTriangle': return AlertTriangle;
      case 'ShieldAlert': return ShieldAlert;
      case 'Gavel': return Gavel;
      case 'AlertOctagon': return AlertOctagon;
      default: return MessageSquare;
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setErrorMessage('');
    
    const incomingFiles = Array.from(e.target.files) as File[];
    
    if (files.length + incomingFiles.length > MAX_FILES) {
      setErrorMessage(`Você pode anexar no máximo ${MAX_FILES} arquivos por manifestação.`);
      return;
    }

    for (const f of incomingFiles) {
      if (f.size > MAX_FILE_SIZE) {
        setErrorMessage(`O arquivo "${f.name}" excede o tamanho máximo de 5 MB.`);
        return;
      }
    }

    setFiles(prev => [...prev, ...incomingFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedCategory) {
      setErrorMessage('Por favor, selecione uma categoria para a manifestação.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Por favor, descreva detalhadamente a ocorrência.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate protocol: #OUV-YYYY-XXXX
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const protocol = `#OUV-${year}-${randomNum}`;

      const isAnonymous = !name.trim() && !email.trim();
      
      const slug = selectedCategory.slug.toLowerCase();
      const severity: 'Baixa' | 'Média' | 'Alta' = selectedCategory.default_severity || (
        slug.includes('denuncia') || slug.includes('assedio') || slug.includes('fraude') || slug.includes('conduta')
          ? 'Alta'
          : slug.includes('sugestao')
          ? 'Baixa'
          : 'Média'
      );

      // Upload attachments if any
      const uploadedAttachments: Attachment[] = [];

      if (files.length > 0) {
        setUploadProgress('Enviando anexos de forma segura...');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${protocol.replace('#', '')}_${Date.now()}_${cleanName}`;

          const { error: uploadError } = await supabase.storage
            .from('report-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.warn('Erro ao subir arquivo:', uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('report-attachments')
              .getPublicUrl(filePath);

            uploadedAttachments.push({
              name: file.name,
              url: publicUrlData.publicUrl,
              size: file.size,
              type: file.type || 'application/octet-stream'
            });
          }
        }
      }

      setUploadProgress('Registrando manifestação...');

      // Call secure RPC to create report and initial timeline atomically
      const { data: res, error: rpcError } = await supabase.rpc('rpc_public_create_report', {
        p_protocol: protocol,
        p_category: selectedCategory.name,
        p_type: selectedCategory.slug,
        p_description: description.trim(),
        p_name: name.trim() || null,
        p_email: email.trim() || null,
        p_branch: branch.trim() || null,
        p_is_anonymous: isAnonymous,
        p_severity: severity,
        p_attachments: uploadedAttachments
      });

      if (rpcError || !res || !res.success) {
        throw new Error(rpcError?.message || res?.error || 'Falha ao registrar manifestação');
      }

      setSubmittedProtocol(protocol);
      // Reset form
      setDescription('');
      setName('');
      setEmail('');
      setBranch('');
      setFiles([]);
      if (categories.length > 0) setSelectedCategory(categories[0]);
    } catch (err: any) {
      console.error('Erro ao enviar relato:', err);
      setErrorMessage(err.message || 'Erro inesperado ao enviar manifestação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  const copyToClipboard = () => {
    if (submittedProtocol) {
      navigator.clipboard.writeText(submittedProtocol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-surface-variant/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-display font-black text-xl tracking-tighter shadow-md">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-on-surface leading-tight">SUA EMPRESA</span>
              <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase font-semibold">Canal de Ouvidoria</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/acompanhar"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-on-surface hover:bg-surface-container font-display text-xs font-semibold transition-colors border border-surface-variant/50 shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              Consultar Protocolo
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 md:py-16">
        
        {/* Intro Hero */}
        <div className="flex flex-col gap-4 mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-medium self-center border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            Canal Seguro & 100% Confidencial
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-on-surface leading-tight">
            Sua voz faz a <span className="text-primary">Sua Empresa</span> melhor.
          </h1>
          <p className="font-body text-base text-on-surface-variant leading-relaxed">
            Espaço ético, independente e seguro para enviar sugestões, tirar dúvidas, fazer reclamações ou relatar desvios de conduta com total sigilo.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-3xl p-6 sm:p-10 border border-surface-variant/60 shadow-xl flex flex-col gap-10">
          
          {/* Step 1: Dynamic Category Selector */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-primary font-bold tracking-wider uppercase">Etapa 1 de 4</span>
              <h2 className="font-display text-2xl font-bold text-on-surface">Qual é o assunto da sua manifestação?</h2>
              <p className="font-body text-sm text-on-surface-variant">Selecione a categoria que melhor representa seu relato.</p>
            </div>

            {loadingCategories ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  const isSelected = selectedCategory?.id === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20" 
                          : "border-surface-variant/80 hover:border-surface-variant bg-surface hover:bg-surface-container-low"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant group-hover:text-primary"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-display font-semibold text-base text-on-surface leading-snug">{cat.name}</span>
                        <span className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                          {cat.description || 'Manifestação registrada na ouvidoria.'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-surface-variant/60"></div>

          {/* Step 2: Unidade / Filial & Description */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-primary font-bold tracking-wider uppercase">Etapa 2 de 4</span>
              <h2 className="font-display text-2xl font-bold text-on-surface">Conte-nos os detalhes</h2>
              <p className="font-body text-sm text-on-surface-variant">
                Seja o mais específico possível. Descreva datas aproximadas, setores ou pessoas envolvidas se desejar.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="font-mono text-xs text-on-surface-variant uppercase font-medium flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                Unidade / Filial / Departamento (Opcional)
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-variant rounded-2xl p-3.5 font-body text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Selecione a unidade (opcional)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
                <option value="Outro / Não especificado">Outro / Não especificado</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Relato detalhado *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                required
                placeholder="Escreva sua mensagem com clareza. Não é obrigatório se identificar, relate o que aconteceu livremente..."
                className="w-full bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 font-body text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y leading-relaxed"
              ></textarea>
            </div>
          </div>

          <div className="h-px bg-surface-variant/60"></div>

          {/* Step 3: Evidências / Anexos (Upload Seguro) */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-primary font-bold tracking-wider uppercase">Etapa 3 de 4</span>
              <h2 className="font-display text-2xl font-bold text-on-surface">Evidências e Anexos (Opcional)</h2>
              <p className="font-body text-sm text-on-surface-variant">
                Adicione fotos, prints, PDFs ou documentos que comprovem ou esclareçam os fatos (máximo 3 arquivos, até 5MB cada).
              </p>
            </div>

            {/* Upload Area */}
            <div className="flex flex-col gap-3">
              {files.length < MAX_FILES && (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-variant hover:border-primary/60 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer group">
                  <Paperclip className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors mb-2" />
                  <span className="font-display text-sm font-semibold text-on-surface">Clique para selecionar arquivos</span>
                  <span className="font-body text-xs text-on-surface-variant mt-1">PNG, JPG, WEBP, PDF, DOCX, TXT, MP3 (até 5MB)</span>
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.docx,.doc,.txt,.mp3,.wav" 
                    className="hidden" 
                  />
                </label>
              )}

              {/* Uploaded files list */}
              {files.length > 0 && (
                <div className="flex flex-col gap-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-variant/50">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-primary" />
                        <div className="flex flex-col">
                          <span className="font-body text-sm font-medium text-on-surface line-clamp-1">{file.name}</span>
                          <span className="font-mono text-[11px] text-on-surface-variant">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(idx)}
                        className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
                        title="Remover anexo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-surface-variant/60"></div>

          {/* Step 4: Identification (Optional) */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-primary font-bold tracking-wider uppercase">Etapa 4 de 4</span>
              <h2 className="font-display text-2xl font-bold text-on-surface">Identificação (Opcional)</h2>
              <p className="font-body text-sm text-on-surface-variant">
                Se optar por não preencher, sua manifestação será registrada como <strong>100% Anônima</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Deixe em branco para anonimato"
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-2xl p-3.5 font-body text-base text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-on-surface-variant uppercase font-medium">E-mail para Retorno</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com.br"
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-2xl p-3.5 font-body text-base text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-variant/60">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs font-body">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Seus dados trafegam por criptografia de ponta a ponta.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadProgress || 'Processando envio...'}
                </>
              ) : (
                <>
                  Enviar Manifestação
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-variant/50 bg-surface py-8 text-center text-xs text-on-surface-variant font-body">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Sua Empresa Informática. Todos os direitos reservados. Canal de Ouvidoria & Ética.</p>
          <div className="flex gap-4">
            <Link to="/acompanhar" className="hover:text-primary transition-colors">Consultar Protocolo</Link>
            <Link to="/login" className="hover:text-primary transition-colors">Painel Administrativo</Link>
          </div>
        </div>
      </footer>

      {/* Success Modal */}
      {submittedProtocol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl p-8 max-w-md w-full border border-surface-variant shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-display text-2xl font-bold text-on-surface">Manifestação Recebida!</h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                Seu relato foi gravado com segurança. Guarde o número de protocolo abaixo para acompanhar o andamento.
              </p>
            </div>

            <div className="w-full bg-surface-container-low border border-surface-variant p-4 rounded-2xl flex items-center justify-between">
              <span className="font-mono text-xl font-bold text-primary tracking-wider">{submittedProtocol}</span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-2 hover:bg-surface-container-high rounded-xl text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Copiar Protocolo"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex flex-col w-full gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/acompanhar?protocolo=${encodeURIComponent(submittedProtocol)}`)}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-display font-semibold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Acompanhar Este Protocolo
              </button>
              <button
                type="button"
                onClick={() => setSubmittedProtocol(null)}
                className="w-full py-3 rounded-xl border border-surface-variant text-on-surface hover:bg-surface-container font-display font-medium text-sm transition-all cursor-pointer"
              >
                Concluir e Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
