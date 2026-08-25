# Roadmap & Planejamento do Sistema de Ouvidoria Sua Empresa

Este documento consolida o planejamento de melhorias, novos recursos e funcionalidades alinhadas às normas de compliance (ISO 37002 e LGPD).

---

## 🚀 Fase 1: Funcionalidades Aprovadas para Implementação Imediata

### 1. Upload Seguro de Evidências no Formulário Público (Item 1C)
- [ ] **Configuração do Supabase Storage:**
  - Criação do bucket `report-attachments` com políticas de segurança restritas (upload público, visualização restrita a administradores).
- [ ] **Limites e Regras de Proteção:**
  - Quantidade máxima: até 3 arquivos por relato.
  - Tamanho máximo: 5 MB por arquivo (evita sobrecarga no banco e storage).
  - Formatos permitidos: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.mp3`, `.m4a`, `.wav`, `.docx`, `.txt`.
- [ ] **Visualização no Painel Admin:**
  - Listagem dos anexos na página de detalhes com download seguro e pré-visualização.

---

### 2. Gestão de SLA e Prazos de Atendimento (Item 2A)
- [ ] **Definição de Prazos Padrão:**
  - **Triagem Inicial (Status Aberto):** 3 dias úteis.
  - **Conclusão de Análise (Status Em Análise):** 30 dias corridos.
- [ ] **Badges de SLA no Painel e Listagem:**
  - 🟢 **No Prazo:** Dias restantes exibidos.
  - 🟡 **Atenção:** Faltando menos de 48h para o vencimento.
  - 🔴 **Atrasado:** Indicador de tempo excedido com destaque visual.

---

### 3. Atribuição de Responsável / Analista ao Chamado (Item 2B)
- [ ] Campo no banco de dados e função RPC para vincular `assigned_to` (ID do usuário admin/analista).
- [ ] Dropdown na página de detalhes da manifestação para definir ou reatribuir o responsável.
- [ ] Filtro na listagem de ouvidorias por analista responsável ("Meus Relatos Atribuídos").

---

### 4. Gráfico de Evolução Temporal no Dashboard (Item 2D)
- [ ] Gráfico de linha / área temporal exibindo a evolução do volume de manifestações semana a semana e mês a mês.
- [ ] Sincronização em tempo real com o seletor de período (30d, 60d, 90d, Mês Atual).

---

### 5. Alertas e Notificações ao Comitê (Item 3A)
- [ ] Integração com serviço de e-mail (Resend / SMTP / Supabase Edge Functions).
- [ ] Disparo automático de e-mail de alerta para o e-mail do Comitê de Ética quando for registrada uma manifestação com **Gravidade Alta** ou denúncia crítica.

---

### 6. Trilha de Auditoria de Acessos - Audit Trail (Item 3B)
- [ ] Criação da tabela `admin_audit_logs` no Supabase com campos: `user_id`, `user_name`, `action`, `resource_id`, `ip_address`, `created_at`.
- [ ] Registro automático de ações críticas:
  - Visualização de relato confidencial.
  - Alteração de status e atribuição.
  - Exportação de planilhas CSV com dados sensíveis.
  - Cadastro ou alteração de usuários.

---

## 🔮 Fase 2: Funcionalidades Futuras (Backlog)

### 1. Consulta Pública de Protocolo (Item 1A)
- [ ] Página pública `/acompanhar` onde o colaborador anônimo insere o protocolo `#OUV-YYYY-XXXX`.
- [ ] Exibição do status atual da manifestação e parecer público sem revelar dados internos.

### 2. Comunicação Bidirecional Anônima (Item 1B)
- [ ] Canal de mensagens dentro da consulta de protocolo permitindo que o comitê solicite evidências e o colaborador responda anonimamente.

### 3. Categorização por Sub-unidades / Filiais (Item 2C)
- [ ] Cadastro e seleção de filiais, lojas físicas, centros de distribuição (CD) e departamentos.

### 4. Rotina Automática de Limpeza e Retenção de Dados (Item 3C)
- [ ] Configuração no painel para definir período de retenção (ex: 180 dias).
- [ ] Rotina periódica / Cron job para expurgo seguro de manifestações antigas arquivadas, mantendo apenas estatísticas anonimizadas conforme a LGPD.
