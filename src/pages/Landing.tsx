import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Video,
  Camera,
  Image,
  Layers,
  Calendar,
  Clock,
  MessageSquare,
  Shield,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  BarChart3,
  FileText,
  Bot,
  Mail,
  Upload,
  GripVertical,
  Send,
  Sparkles,
  Eye,
  ThumbsUp,
  Home,
  Settings,
  Bell,
  Plus,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

/* ─── Mock data ─── */
const KANBAN_COLUMNS = [
  {
    title: 'A FAZER',
    items: [
      { title: 'Vlog viagem SP', type: 'youtube_video', deadline: '24h', client: 'Marina S.' },
    ],
  },
  {
    title: 'PRODUÇÃO',
    items: [
      { title: 'Reel lançamento', type: 'instagram_video', deadline: '48h', client: 'Pedro L.' },
      { title: 'Thumbnail ep. 42', type: 'thumbnail', deadline: '24h', client: 'Ana C.' },
    ],
  },
  {
    title: 'REVISÃO',
    items: [
      { title: 'Review iPhone 16', type: 'youtube_video', deadline: '72h', client: 'Lucas M.' },
    ],
  },
  {
    title: 'APROVADO',
    items: [
      { title: 'Capa Stories', type: 'cover', deadline: '—', client: 'Juliana R.' },
    ],
  },
];

const TYPE_ICON: Record<string, { icon: typeof Video; color: string }> = {
  youtube_video: { icon: Video, color: 'text-destructive' },
  instagram_video: { icon: Camera, color: 'text-primary' },
  thumbnail: { icon: Image, color: 'text-primary' },
  cover: { icon: Layers, color: 'text-primary' },
};

const FEATURES = [
  { icon: Video, title: 'Edição para YouTube', desc: 'Cortes dinâmicos, legendas e identidade visual.' },
  { icon: Camera, title: 'Vídeos para Instagram', desc: 'Reels otimizados para engajamento.' },
  { icon: Image, title: 'Thumbnails', desc: 'Design estratégico para CTR.' },
  { icon: Layers, title: 'Capas de Feed', desc: 'Alinhadas à identidade visual.' },
  { icon: Calendar, title: 'Captação Presencial', desc: 'Agendamento integrado.' },
  { icon: Clock, title: 'SLA Garantido', desc: 'Prazos com countdown em horas úteis.' },
  { icon: MessageSquare, title: 'Chat por Entrega', desc: 'Marcadores de tempo inclusos.' },
  { icon: Shield, title: 'Revisões Incluídas', desc: 'Ajustes até a aprovação.' },
  { icon: BarChart3, title: 'Dashboard Kanban', desc: 'Visão completa em tempo real.' },
  { icon: FileText, title: 'Roteiros com IA', desc: 'Geração automática de scripts.' },
  { icon: Bot, title: 'Assistente IA', desc: 'Suporte 24/7 na plataforma.' },
  { icon: Users, title: 'Onboarding Guiado', desc: 'Briefing completo da marca.' },
];

const FAQ = [
  { q: 'Por que eu deveria terceirizar minha edição?', a: 'Porque seu tempo vale mais criando conteúdo do que editando. Cada hora que você gasta cortando vídeo é uma hora a menos produzindo, vendendo ou vivendo. Deixe a edição com quem faz isso o dia todo.' },
  { q: 'Quanto tempo eu economizo por mês?', a: 'Criadores que editam sozinhos gastam em média 8–15 horas por vídeo. Com a AbbaVideo, você só grava, envia o bruto e aprova. São dezenas de horas devolvidas todo mês.' },
  { q: 'E se eu não gostar do resultado?', a: 'Revisões estão incluídas no seu plano. Peça ajustes com notas detalhadas e marcadores de tempo — o editor corrige exatamente o que você precisa, quantas vezes for necessário.' },
  { q: 'Os prazos são em horas corridas?', a: 'Não! Contamos apenas horas úteis (8h–18h, seg–sex). Se você pedir na sexta à noite, o prazo só começa segunda de manhã. Justo e transparente.' },
  { q: 'Funciona para empresas também?', a: 'Sim! Empresas usam a plataforma para gerenciar conteúdo de múltiplos canais. Cada projeto tem seu editor, briefing e cotas independentes.' },
  { q: 'Preciso instalar alguma coisa?', a: 'Zero instalação. A plataforma roda no navegador — desktop ou celular. Você gerencia tudo do sofá, do Uber ou do escritório.' },
  { q: 'Quanto custa?', a: 'Cada plano é montado sob medida. Você paga pelo que precisa — sem pacotes inflados, sem surpresas na fatura. Fale conosco para um orçamento em minutos.' },
];

type DemoTab = 'dashboard' | 'entrega' | 'editor';

/* ─── App Shell: Wraps all demos in a realistic interface ─── */
const AppShell = ({ activeTab, onTabChange, children }: {
  activeTab: DemoTab;
  onTabChange: (tab: DemoTab) => void;
  children: React.ReactNode;
}) => {
  const sidebarItems = [
    { id: 'dashboard' as const, icon: Home, label: 'Dashboard' },
    { id: 'entrega' as const, icon: Video, label: 'Entregas' },
    { id: 'editor' as const, icon: Users, label: 'Editor' },
  ];

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden shadow-2xl shadow-primary/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 bg-card px-4 py-2 border-b border-border/50">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-queue-yellow/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-queue-green/60" />
        <span className="ml-3 text-[10px] font-mono text-muted-foreground">abbavideo.com</span>
      </div>

      <div className="flex bg-background min-h-[380px] sm:min-h-[420px]">
        {/* Sidebar */}
        <div className="hidden sm:flex w-[180px] shrink-0 flex-col border-r border-border/30 bg-sidebar p-3 gap-1">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="h-6 w-6 rounded-md gradient-neon flex items-center justify-center">
              <Play className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-bold font-mono">
              Abba<span className="text-primary">Video</span>
            </span>
          </div>

          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}

          <div className="mt-auto space-y-1">
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-sidebar-foreground/40">
              <Settings className="h-3.5 w-3.5" /> Configurações
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-sidebar-foreground/40">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
            <div className="flex items-center gap-2">
              {/* Mobile tabs */}
              <div className="flex sm:hidden gap-1 bg-secondary rounded-md p-0.5">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`px-2 py-1 rounded text-[9px] font-mono font-medium transition-colors ${
                      activeTab === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <h2 className="hidden sm:block text-xs font-semibold text-foreground">
                {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'entrega' ? 'Detalhes da Entrega' : 'Painel do Editor'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary">MC</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Dashboard View ─── */
const DashboardView = () => (
  <div className="space-y-4">
    {/* Quotas */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {[
        { label: 'YouTube', used: 3, total: 6, icon: Video, color: 'text-destructive' },
        { label: 'Instagram', used: 5, total: 8, icon: Camera, color: 'text-primary' },
        { label: 'Thumbnails', used: 3, total: 6, icon: Image, color: 'text-primary' },
        { label: 'Capas', used: 1, total: 4, icon: Layers, color: 'text-primary' },
      ].map((q) => (
        <Card key={q.label} className="border-border/30 bg-card/80 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <q.icon className={`h-3 w-3 ${q.color}`} />
            <span className="text-[9px] font-medium text-card-foreground">{q.label}</span>
          </div>
          <p className="text-sm font-bold text-card-foreground font-mono">
            {q.used}<span className="text-muted-foreground text-[10px]">/{q.total}</span>
          </p>
          <Progress value={(q.used / q.total) * 100} className="h-1" />
        </Card>
      ))}
    </div>

    {/* New delivery button */}
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Minhas Entregas</span>
      <div className="h-6 px-2 rounded-md bg-primary flex items-center gap-1 text-primary-foreground">
        <Plus className="h-3 w-3" />
        <span className="text-[9px] font-medium">Nova Entrega</span>
      </div>
    </div>

    {/* Kanban */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.title} className="rounded-lg border border-border/30 bg-muted/15 p-1.5">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[8px] sm:text-[9px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              {col.title}
            </span>
            <Badge variant="secondary" className="h-3.5 min-w-[14px] px-1 text-[7px]">{col.items.length}</Badge>
          </div>
          <div className="space-y-1">
            {col.items.map((item) => {
              const cfg = TYPE_ICON[item.type];
              const Icon = cfg?.icon || Video;
              return (
                <Card key={item.title} className="border-border/20 bg-card/80 p-1.5 space-y-0.5">
                  <div className="flex items-start gap-1">
                    <GripVertical className="mt-0.5 h-2.5 w-2.5 shrink-0 text-muted-foreground/20" />
                    <Icon className={`mt-0.5 h-2.5 w-2.5 shrink-0 ${cfg?.color || 'text-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-medium text-card-foreground">{item.title}</p>
                      <p className="text-[7px] text-muted-foreground">{item.client}</p>
                    </div>
                  </div>
                  {item.deadline !== '—' && (
                    <div className="flex items-center gap-0.5 text-[7px] pl-5">
                      <Clock className="h-2 w-2 text-muted-foreground" />
                      <span className="text-muted-foreground">SLA {item.deadline}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Delivery Detail View ─── */
const DeliveryDetailView = () => (
  <div className="space-y-4">
    {/* Delivery header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-destructive" />
        <div>
          <p className="text-xs font-semibold text-card-foreground">Review iPhone 16</p>
          <p className="text-[10px] text-muted-foreground">YouTube · Ana C.</p>
        </div>
      </div>
      <Badge className="bg-queue-yellow/20 text-queue-yellow border-queue-yellow/30 text-[10px] w-fit">
        Em revisão
      </Badge>
    </div>

    {/* SLA bar */}
    <Card className="border-border/30 bg-card/80 p-3 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> SLA 48h (horas úteis)
        </span>
        <span className="font-mono font-medium text-primary">6h 30min restantes</span>
      </div>
      <Progress value={73} className="h-1.5" />
    </Card>

    <div className="grid sm:grid-cols-2 gap-3">
      {/* Revision notes */}
      <Card className="border-border/30 bg-card/80 p-3 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Notas de Revisão</p>
        <div className="rounded-lg bg-muted/20 p-2.5 text-[11px] text-card-foreground font-body leading-relaxed space-y-1.5">
          <p>• Ajustar cor da legenda no <span className="font-mono text-primary">02:35</span></p>
          <p>• Trocar música de fundo por algo mais energético</p>
          <p>• Corrigir transição no <span className="font-mono text-primary">04:12</span></p>
        </div>
      </Card>

      {/* Chat */}
      <Card className="border-border/30 bg-card/80 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/20 flex items-center gap-2">
          <MessageSquare className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold text-card-foreground">Chat com editor</span>
        </div>
        <div className="p-2.5 space-y-1.5">
          {[
            { role: 'client', text: 'Pode ajustar a legenda no 2:35?', time: '14:22' },
            { role: 'editor', text: 'Feito! Usei a fonte do briefing. Confere?', time: '14:28' },
            { role: 'client', text: 'Ficou perfeito! Pode aprovar 👍', time: '14:30' },
          ].map((m, i) => (
            <div key={i} className={`flex ${m.role === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-2 py-1 text-[9px] leading-relaxed ${
                m.role === 'client'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted/60 text-card-foreground rounded-bl-sm'
              }`}>
                <p>{m.text}</p>
                <p className={`text-[7px] mt-0.5 ${m.role === 'client' ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/20 px-2.5 py-1.5 flex items-center gap-1.5">
          <div className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[9px] text-muted-foreground">
            Mensagem...
          </div>
          <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center">
            <Send className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        </div>
      </Card>
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1">
        <Eye className="h-3 w-3" /> Ver arquivo
      </Button>
      <Button size="sm" className="flex-1 text-xs gap-1">
        <ThumbsUp className="h-3 w-3" /> Aprovar
      </Button>
    </div>
  </div>
);

/* ─── Editor Panel View ─── */
const EditorPanelView = () => (
  <div className="space-y-4">
    {/* Delivery being worked */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-card-foreground">Reel lançamento produto</p>
          <p className="text-[10px] text-muted-foreground">Pedro L. · Instagram</p>
        </div>
      </div>
      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Em produção</Badge>
    </div>

    <div className="grid sm:grid-cols-2 gap-3">
      {/* Briefing */}
      <Card className="border-border/30 bg-card/80 p-3 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Briefing da Marca</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/20 p-2">
            <p className="text-[8px] text-muted-foreground">Estilo</p>
            <p className="text-[10px] font-medium text-card-foreground">Dinâmico, moderno</p>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <p className="text-[8px] text-muted-foreground">Cores</p>
            <div className="flex gap-1 mt-0.5">
              <div className="h-3.5 w-3.5 rounded-full bg-primary" />
              <div className="h-3.5 w-3.5 rounded-full bg-foreground" />
              <div className="h-3.5 w-3.5 rounded-full bg-queue-yellow" />
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <p className="text-[8px] text-muted-foreground">Legendas</p>
            <p className="text-[10px] font-medium text-card-foreground">Com emojis ✅</p>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <p className="text-[8px] text-muted-foreground">Cortes</p>
            <p className="text-[10px] font-medium text-card-foreground">Jump cuts</p>
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card className="border-border/30 bg-card/80 p-3 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Checklist</p>
        <div className="space-y-1">
          {[
            { name: 'Cortar silêncios', done: true },
            { name: 'Adicionar legendas', done: true },
            { name: 'Inserir intro/outro', done: false },
            { name: 'Ajustar áudio', done: false },
            { name: 'Color grading', done: false },
          ].map((t) => (
            <div key={t.name} className="flex items-center gap-2 rounded-md bg-muted/15 px-2 py-1.5">
              <div className={`h-3 w-3 rounded border flex items-center justify-center ${t.done ? 'bg-primary border-primary' : 'border-border'}`}>
                {t.done && <CheckCircle2 className="h-2 w-2 text-primary-foreground" />}
              </div>
              <span className={`text-[10px] ${t.done ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>{t.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {/* Upload */}
    <Card className="border-border/30 bg-card/80 p-3">
      <div className="rounded-lg border-2 border-dashed border-border/30 p-4 text-center">
        <Upload className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
        <p className="text-[10px] text-muted-foreground">Arraste o arquivo ou cole o link do Google Drive</p>
        <p className="text-[8px] text-muted-foreground/60 mt-0.5">MP4, MOV até 5GB</p>
      </div>
    </Card>
  </div>
);

/* ─── Main Landing ─── */
const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDemo, setActiveDemo] = useState<DemoTab>('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold font-mono">
              Abba<span className="text-primary">Video</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5">
                Fale Conosco <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs border-primary/30 text-primary">
              <Zap className="h-3 w-3 mr-1.5" /> Pare de editar. Comece a crescer.
            </Badge>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
          >
            Vídeos profissionais{' '}
            <span className="text-primary">sem você precisar editar</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground font-body"
          >
            Você grava. A gente edita, entrega e surpreende. Thumbnails, Reels, capas — 
            tudo com prazo garantido, revisões inclusas e um editor dedicado à sua marca.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 text-sm px-8">
                <Mail className="h-4 w-4" /> Quero um Orçamento Grátis
              </Button>
            </a>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="gap-2 text-sm px-8">
                Já sou cliente <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Interactive App Demo — single unified section */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <div className="text-center mb-6">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Explore a plataforma</p>
              <h2 className="text-xl sm:text-2xl font-bold">
                Veja como funciona <span className="text-primary">na prática</span>
              </h2>
            </div>

            <AppShell activeTab={activeDemo} onTabChange={setActiveDemo}>
              {activeDemo === 'dashboard' && <DashboardView />}
              {activeDemo === 'entrega' && <DeliveryDetailView />}
              {activeDemo === 'editor' && <EditorPanelView />}
            </AppShell>

            {/* Context labels below demo */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { tab: 'dashboard' as const, title: 'Dashboard do Cliente', desc: 'Cotas, Kanban e entregas em tempo real.' },
                { tab: 'entrega' as const, title: 'Detalhe da Entrega', desc: 'SLA, revisões, chat e aprovação.' },
                { tab: 'editor' as const, title: 'Painel do Editor', desc: 'Briefing, checklist e upload.' },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveDemo(item.tab)}
                  className={`text-left rounded-lg p-3 border transition-colors ${
                    activeDemo === item.tab
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/30 bg-card/30 hover:border-border/60'
                  }`}
                >
                  <p className={`text-[10px] sm:text-xs font-semibold ${activeDemo === item.tab ? 'text-primary' : 'text-card-foreground'}`}>
                    {item.title}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-body mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold">
              Tudo o que você precisa,{' '}
              <span className="text-primary">em um só lugar</span>
            </h2>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                variants={fadeUp}
                custom={i % 4}
              >
                <Card className="h-full border-border/40 bg-card/60 p-4 hover:border-primary/30 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mb-2">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-xs font-semibold text-card-foreground mb-1">{f.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-body leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works + Olívia */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* How it works */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-8">
                Como <span className="text-primary">funciona</span>
              </h2>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Plano personalizado', desc: 'Montamos sob medida para sua necessidade de conteúdo.' },
                  { step: '02', title: 'Briefing de marca', desc: 'Preencha uma vez — cores, fontes, estilo e referências.' },
                  { step: '03', title: 'Solicite entregas', desc: 'Vídeos, thumbnails e capas pelo Dashboard.' },
                  { step: '04', title: 'Revise e aprove', desc: 'Acompanhe o SLA, peça revisões e aprove em tempo real.' },
                ].map((s, i) => (
                  <motion.div
                    key={s.step}
                    initial="hidden" whileInView="visible" viewport={{ once: true }}
                    variants={fadeUp} custom={i}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-[10px] font-bold text-primary font-mono">{s.step}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{s.title}</h3>
                      <p className="text-xs text-muted-foreground font-body">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Olívia */}
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Assistente IA
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Conheça a <span className="text-primary">Olívia</span>
              </h2>
              <p className="text-muted-foreground font-body text-sm mb-4">
                Suporte inteligente 24/7 — esperta, direta e disponível direto na plataforma.
              </p>

              <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-xl">
                <div className="px-4 py-2.5 border-b border-border/30 bg-primary/5 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-card-foreground">Olívia ✨</p>
                    <p className="text-[8px] text-muted-foreground">Online</p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-[10px] text-card-foreground">
                      Olá! Eu sou a Olívia 💃 Como posso te ajudar?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-[10px] text-primary-foreground">
                      Quantos vídeos ainda posso pedir?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-[10px] text-card-foreground leading-relaxed">
                      Você usou <strong>3 de 6</strong> vídeos YouTube e <strong>5 de 8</strong> Reels. Ainda tem crédito! 📊
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-10">
            Perguntas <span className="text-primary">Frequentes</span>
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <Card
                  key={i}
                  className="border-border/40 bg-card/60 overflow-hidden cursor-pointer"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                >
                  <div className="flex items-center justify-between p-4">
                    <span className="text-sm font-medium text-card-foreground pr-4">{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Pronto para profissionalizar seu conteúdo?
            </h2>
            <p className="text-muted-foreground font-body mb-6 max-w-lg mx-auto">
              Entre em contato para montar um plano personalizado.
            </p>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 px-10">
                <Mail className="h-4 w-4" /> Fale Conosco
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md gradient-neon flex items-center justify-center">
              <Play className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold font-mono">
              Abba<span className="text-primary">Video</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AbbaVideo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
