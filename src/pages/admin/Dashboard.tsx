import { useState, useEffect } from 'react';
import { 
  Download, 
  Plus, 
  Inbox, 
  Clock, 
  Clock3, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight, 
  Loader2, 
  Calendar, 
  FileText,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { cn } from '../../lib/utils';
import type { Category, Report } from '../../types/database';

const PALETTE = [
  '#e60012', // Sua Empresa Red
  '#5e5e5e', // Slate Gray
  '#b7000c', // Dark Crimson
  '#d97706', // Amber
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#9333ea', // Purple
  '#0284c7', // Cyan / Sky
  '#ea580c', // Orange
];

type PeriodType = '30_dias' | '60_dias' | '90_dias' | 'mes_atual' | 'todos';

export default function Dashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30_dias');
  
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ label: string; total: number }[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pendentes: 0,
    emAnalise: 0,
    finalizadas: 0,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!token) return;
      try {
        setLoading(true);

        // 1. Fetch categories
        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: true });

        const activeCategories: Category[] = cats || [];
        setCategories(activeCategories);

        // 2. Fetch reports for metrics via secure RPC
        const { data: res, error: reportsError } = await supabase.rpc('rpc_admin_get_reports', { p_token: token });

        if (!reportsError && res?.success && Array.isArray(res.data)) {
          setAllReports(res.data);
        }

      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [token]);

  // Recalculate metrics and chart whenever allReports, categories, or selectedPeriod changes
  useEffect(() => {
    const now = new Date();
    
    const filtered = allReports.filter((r) => {
      const reportDate = new Date(r.created_at);
      
      if (selectedPeriod === '30_dias') {
        const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return reportDate >= limit;
      }
      if (selectedPeriod === '60_dias') {
        const limit = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        return reportDate >= limit;
      }
      if (selectedPeriod === '90_dias') {
        const limit = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return reportDate >= limit;
      }
      if (selectedPeriod === 'mes_atual') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return reportDate >= startOfMonth;
      }
      return true;
    });

    const total = filtered.length;
    const pendentes = filtered.filter(r => r.status === 'Aberto').length;
    const emAnalise = filtered.filter(r => r.status === 'Em Análise').length;
    const finalizadas = filtered.filter(r => r.status === 'Concluído').length;

    setMetrics({
      total,
      pendentes,
      emAnalise,
      finalizadas,
    });

    // 1. Dynamic category bars
    if (categories.length > 0) {
      const dynamicBars = categories.map((cat, idx) => {
        const count = filtered.filter(r => 
          r.category?.toLowerCase().trim() === cat.name?.toLowerCase().trim() ||
          r.type?.toLowerCase().trim() === cat.slug?.toLowerCase().trim()
        ).length;

        return {
          name: cat.name,
          value: count,
          color: PALETTE[idx % PALETTE.length],
        };
      });
      setChartData(dynamicBars);
    }

    // 2. Dynamic temporal trend line (by days/weeks)
    const trendMap: { [key: string]: number } = {};
    const sorted = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sorted.forEach((r) => {
      const d = new Date(r.created_at);
      const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      trendMap[label] = (trendMap[label] || 0) + 1;
    });

    const trendPoints = Object.keys(trendMap).map(k => ({
      label: k,
      total: trendMap[k]
    }));

    // Fallback point if single date
    if (trendPoints.length === 1) {
      trendPoints.unshift({ label: 'Início', total: 0 });
    }

    setTrendData(trendPoints);

  }, [allReports, categories, selectedPeriod]);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '30_dias': return 'Últimos 30 dias';
      case '60_dias': return 'Últimos 60 dias';
      case '90_dias': return 'Últimos 90 dias';
      case 'mes_atual': return 'Mês Atual';
      default: return 'Todo o período';
    }
  };

  const exportReport = () => {
    const headers = ['Categoria', 'Quantidade'];
    const rows = chartData.map(c => `"${c.name}",${c.value}`);
    const csvContent = '\uFEFF' + [
      `"Relatório de Ouvidoria - Período: ${getPeriodLabel()}"`,
      headers.join(','), 
      ...rows, 
      `"Total de Registros",${metrics.total}`,
      `"Pendentes",${metrics.pendentes}`,
      `"Em Análise",${metrics.emAnalise}`,
      `"Finalizadas",${metrics.finalizadas}`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ouvidoria_metricas_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPercent = (value: number) => {
    if (metrics.total === 0) return '0%';
    return `${Math.round((value / metrics.total) * 100)}% do total`;
  };

  return (
    <div className="flex flex-col w-full px-4 sm:px-8 py-8 gap-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between w-full gap-4">
        <div className="flex flex-col gap-2 relative">
          <div className="hidden sm:block absolute -left-6 top-1 w-1 h-12 bg-primary rounded-full"></div>
          <h1 className="font-display text-4xl sm:text-[48px] font-bold text-on-surface leading-none">Visão Geral</h1>
          <p className="font-body text-base text-on-surface-variant max-w-xl">
            Acompanhe o volume e o status de tramitação de todas as manifestações por período.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button 
            onClick={exportReport}
            className="flex-1 lg:flex-none justify-center px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-display font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-5 h-5" />
            Exportar Relatório ({selectedPeriod === '30_dias' ? '30d' : selectedPeriod === '60_dias' ? '60d' : selectedPeriod === '90_dias' ? '90d' : 'Mês'})
          </button>
          <Link 
            to="/admin/categorias"
            className="flex-1 lg:flex-none justify-center px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-display font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Gerenciar Categorias
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Main Status KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {/* 1. Total Registros (Branco/Neutro) */}
            <MetricCard
              icon={Inbox}
              title="Total de Registros"
              value={metrics.total.toString()}
              badge={getPeriodLabel()}
              colorClass="bg-surface-container-low text-on-surface-variant"
            />

            {/* 2. Ouvidorias Pendentes (Vermelho Destaque) */}
            <div className="bg-primary rounded-2xl p-6 shadow-md flex flex-col gap-4 relative overflow-hidden group text-on-primary">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-on-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-transparent to-black/20 pointer-events-none"></div>
              <div className="flex justify-between items-start z-10">
                <div className="p-3 bg-on-primary/20 rounded-xl text-on-primary backdrop-blur-sm">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <span className="font-mono text-xs px-3 py-1 bg-on-primary/20 backdrop-blur-sm rounded-full text-on-primary uppercase tracking-wider font-medium">Aguardando Triagem</span>
              </div>
              <div className="flex flex-col z-10 mt-2">
                <span className="font-body text-sm text-on-primary/90 mb-1 uppercase tracking-wider font-medium">Ouvidorias Pendentes</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-on-primary tracking-tight">{metrics.pendentes}</span>
                  <span className="font-body text-xs bg-on-primary text-primary px-2 py-0.5 rounded font-semibold flex items-center">
                    {getPercent(metrics.pendentes)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Ouvidorias em Análise (Amarelo Opaco Suave) */}
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4 relative overflow-hidden group">
              <div className="flex justify-between items-start z-10">
                <div className="p-3 bg-amber-100/90 text-amber-700 rounded-xl">
                  <Clock3 className="w-7 h-7" />
                </div>
                <span className="font-mono text-xs px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-200/60 uppercase tracking-wider font-medium">Em Averiguação</span>
              </div>
              <div className="flex flex-col z-10 mt-2">
                <span className="font-body text-sm text-amber-950/80 mb-1 uppercase tracking-wider font-semibold">Ouvidorias em Análise</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-amber-950 tracking-tight">{metrics.emAnalise}</span>
                  <span className="font-body text-xs bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded font-semibold flex items-center">
                    {getPercent(metrics.emAnalise)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Ouvidorias Finalizadas (Verde Esmeralda Concluído) */}
            <div className="bg-emerald-600 rounded-2xl p-6 shadow-md flex flex-col gap-4 relative overflow-hidden group text-white">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-transparent to-black/15 pointer-events-none"></div>
              <div className="flex justify-between items-start z-10">
                <div className="p-3 bg-white/20 rounded-xl text-white backdrop-blur-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <span className="font-mono text-xs px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white uppercase tracking-wider font-medium">Concluídas</span>
              </div>
              <div className="flex flex-col z-10 mt-2">
                <span className="font-body text-sm text-white/90 mb-1 uppercase tracking-wider font-medium">Ouvidorias Finalizadas</span>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">{metrics.finalizadas}</span>
                  <span className="font-body text-xs bg-white text-emerald-800 px-2 py-0.5 rounded font-semibold flex items-center">
                    {getPercent(metrics.finalizadas)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Lists Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 relative border border-surface-variant/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full border-b border-surface-variant pb-4 gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-on-surface">Distribuição por Categoria</h2>
                  <p className="font-body text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Exibindo dados de: <strong className="text-on-surface">{getPeriodLabel()}</strong>
                  </p>
                </div>
                
                {/* Period Selector Tabs */}
                <div className="flex flex-wrap gap-1.5 bg-surface-container p-1 rounded-xl">
                  <button 
                    onClick={() => setSelectedPeriod('30_dias')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all cursor-pointer",
                      selectedPeriod === '30_dias' 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    30 dias
                  </button>
                  <button 
                    onClick={() => setSelectedPeriod('60_dias')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all cursor-pointer",
                      selectedPeriod === '60_dias' 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    60 dias
                  </button>
                  <button 
                    onClick={() => setSelectedPeriod('90_dias')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all cursor-pointer",
                      selectedPeriod === '90_dias' 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    90 dias
                  </button>
                  <button 
                    onClick={() => setSelectedPeriod('mes_atual')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all cursor-pointer",
                      selectedPeriod === 'mes_atual' 
                        ? "bg-primary text-on-primary shadow-xs" 
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    Mês Atual
                  </button>
                </div>
              </div>
              
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 25 }} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e2e4" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#5f3f3b', fontSize: 11, fontFamily: 'JetBrains Mono' }} 
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      dy={10}
                    />
                    <YAxis 
                      allowDecimals={false}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#5f3f3b', fontSize: 12, fontFamily: 'JetBrains Mono' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e2e4', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {
                        chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Temporal Evolution Trend Chart */}
              {trendData.length > 0 && (
                <div className="pt-6 border-t border-surface-variant/60 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-semibold text-sm text-on-surface">Evolução Temporal no Período</h3>
                  </div>
                  <div className="w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e60012" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#e60012" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e2e4" />
                        <XAxis dataKey="label" stroke="#5f3f3b" fontSize={10} fontFamily="JetBrains Mono" />
                        <YAxis allowDecimals={false} stroke="#5f3f3b" fontSize={10} fontFamily="JetBrains Mono" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e2e4', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="total" stroke="#e60012" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" name="Novos Relatos" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>

            {/* Categories List */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 border border-surface-variant/50">
              <div className="flex flex-col gap-1 pb-4 border-b border-surface-variant">
                <h3 className="font-display text-xl font-medium text-on-surface">Categorias Cadastradas</h3>
                <p className="font-body text-sm text-on-surface-variant">Categorias ativas no banco de dados.</p>
              </div>
              
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[280px]">
                {categories.map((cat) => (
                  <CategoryItem 
                    key={cat.id}
                    title={cat.name} 
                    desc={cat.description || 'Configurada no sistema'} 
                  />
                ))}
              </div>

              <Link 
                to="/admin/categorias"
                className="mt-auto w-full py-3.5 text-center text-on-surface-variant font-display font-medium hover:text-primary transition-colors flex items-center justify-center gap-2 border border-surface-variant rounded-xl border-dashed"
              >
                Gerenciar Todas as Categorias
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, badge, subtitle, trend, colorClass }: any) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group border border-surface-variant/50">
      <div className="flex justify-between items-start z-10">
        <div className={cn("p-3 rounded-xl", colorClass)}>
          <Icon className="w-7 h-7" />
        </div>
        {badge && (
          <span className="font-mono text-xs px-3 py-1 bg-surface-container rounded-full text-on-surface-variant tracking-wider font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col z-10 mt-2">
        <span className="font-body text-sm text-on-surface-variant mb-1 uppercase tracking-wider">{title}</span>
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl sm:text-5xl font-bold text-on-surface tracking-tight">{value}</span>
          {trend && (
            <span className="font-body text-xs text-primary flex items-center bg-primary/10 px-2 py-0.5 rounded font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> {trend}
            </span>
          )}
          {subtitle && (
            <span className="font-body text-sm text-on-surface-variant">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryItem({ title, desc }: any) {
  return (
    <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl hover:bg-surface-container-low transition-colors border border-surface-variant/30">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-xs">
          {title.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="font-body font-medium text-on-surface text-sm">{title}</span>
          <span className="font-body text-xs text-on-surface-variant line-clamp-1">{desc}</span>
        </div>
      </div>
    </div>
  );
}
