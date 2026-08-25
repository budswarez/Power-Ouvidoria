export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  default_severity?: 'Baixa' | 'Média' | 'Alta';
  active: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  active: boolean;
  created_at: string;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Report {
  id: string;
  protocol: string;
  category: string;
  type: string;
  description: string;
  name: string | null;
  email: string | null;
  is_anonymous: boolean;
  status: 'Aberto' | 'Em Análise' | 'Concluído' | 'Arquivado';
  severity: 'Baixa' | 'Média' | 'Alta';
  branch?: string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
  due_date?: string | null;
  public_notes?: string | null;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface ReportTimeline {
  id: string;
  report_id: string;
  status: string;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface ReportMessage {
  id: string;
  report_id: string;
  sender_type: 'ADMIN' | 'USER';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Administrador' | 'Analista Sênior' | 'Analista Pleno' | 'Analista Júnior';
  status: 'Ativo' | 'Inativo';
  avatar: string | null;
  initials: string | null;
  permissions: string[];
  last_access: string;
  created_at: string;
}
