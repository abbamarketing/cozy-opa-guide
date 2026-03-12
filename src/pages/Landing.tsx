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

/* ─── Mock data for interactive sections ─── */
const KANBAN_COLUMNS = [
  {
    title: 'A FAZER',
    items: [
      { title: 'Vlog viagem SP', type: 'youtube_video', deadline: '24h', client: 'Marina S.' },
    ],
  },
  {
    title: 'EM PRODUÇÃO',
    items: [
      { title: 'Reel lançamento produto', type: 'instagram_video', deadline: '48h', client: 'Pedro L.' },
      { title: 'Thumbnail ep. 42', type: 'thumbnail', deadline: '24h', client: 'Ana C.' },
    ],
  },
  {
    title: 'REVISÃO',
    items: [
      { title: 'Vídeo review tech', type: 'youtube_video', deadline: '72h', client: 'Lucas M.' },
    ],
  },
  {
    title: 'APROVADO',
    items: [
      { title: 'Capa destaque Stories', type: 'cover', deadline: '—', client: 'Juliana R.' },
    ],
  },
];

const TYPE_CONFIG: Record<string, { icon: typeof Video; label: string; color: string }> = {
  youtube_video: { icon: Video, label: 'YouTube', color: 'text-red-400' },
  instagram_video: { icon: Camera, label: 'Instagram', color: 'text-pink-400' },
  thumbnail: { icon: Image, label: 'Thumb', color: 'text-blue-400' },
  cover: { icon: Layers, label: 'Capa', color: 'text-purple-400' },
};

const CHAT_MESSAGES = [
  { role: 'client', text: 'Pode adicionar uma legenda no minuto 2:35?', time: '14:22' },
  { role: 'editor', text: 'Feito! Coloquei a legenda com a fonte do briefing. Confere?', time: '14:28' },
  { role: 'client', text: 'Ficou perfeito! Pode aprovar 👍', time: '14:30' },
];

const FEATURES = [
  { icon: Video, title: 'Edição para YouTube', desc: 'Cortes dinâmicos, legendas, transições e identidade visual da marca.' },
  { icon: Camera, title: 'Vídeos para Instagram', desc: 'Reels otimizados para engajamento máximo.' },
  { icon: Image, title: 'Thumbnails', desc: 'Design estratégico para aumentar o CTR.' },
  { icon: Layers, title: 'Capas de Feed', desc: 'Capas alinhadas à identidade do perfil.' },
  { icon: Calendar, title: 'Captação Presencial', desc: 'Agende captações direto pela plataforma.' },
  { icon: Clock, title: 'SLA Garantido', desc: 'Prazos de 24h, 48h ou 72h com countdown.' },
  { icon: MessageSquare, title: 'Chat por Entrega', desc: 'Converse com o editor com marcadores de tempo.' },
  { icon: Shield, title: 'Revisões Incluídas', desc: 'Peça ajustes detalhados até aprovar.' },
  { icon: BarChart3, title: 'Dashboard Kanban', desc: 'Acompanhe tudo em tempo real.' },
  { icon: FileText, title: 'Roteiros com IA', desc: 'Gere roteiros otimizados automaticamente.' },
  { icon: Bot, title: 'Assistente IA 24/7', desc: 'Suporte inteligente direto na plataforma.' },
  { icon: Users, title: 'Onboarding Guiado', desc: 'Briefing completo para capturar sua marca.' },
];

const FAQ = [
  { q: 'Como funciona o processo de edição?', a: 'Solicite uma entrega, preencha o briefing e acompanhe pelo Kanban. Simples assim.' },
  { q: 'Quantas revisões estão incluídas?', a: 'Depende do seu plano. Você pode solicitar revisões com notas e marcadores de tempo.' },
  { q: 'Como funciona a captação presencial?', a: 'Agende pela plataforma respeitando o prazo mínimo do seu plano.' },
  { q: 'Posso acompanhar os prazos?', a: 'Sim! Cada entrega tem countdown de SLA em horas úteis (8h–18h).' },
  { q: 'Como converso com meu editor?', a: 'Cada entrega tem um chat integrado com suporte a marcadores de tempo.' },
  { q: 'Existe app mobile?', a: 'A plataforma é responsiva e funciona perfeitamente no navegador do celular.' },
];

/* ─── Interactive Kanban Mockup ─── */
const KanbanMockup = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
    {KANBAN_COLUMNS.map((col) => (
      <div key={col.title} className="rounded-xl border border-border/40 bg-muted/20 p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            {col.title}
          </span>
          <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[8px]">{col.items.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {col.items.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            const Icon = cfg?.icon || Video;
            return (
              <Card key={item.title} className="border-border/30 bg-card/80 p-2 space-y-1">
                <div className="flex items-start gap-1.5">
                  <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/30" />
                  <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${cfg?.color || 'text-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] sm:text-xs font-medium text-card-foreground">{item.title}</p>
                    <p className="text-[8px] sm:text-[9px] text-muted-foreground">{item.client}</p>
                  </div>
                </div>
                {item.deadline !== '—' && (
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px]">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
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
);

/* ─── Interactive Chat Mockup ─── */
const ChatMockup = () => (
  <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden max-w-sm mx-auto">
    <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
        <MessageSquare className="h-3 w-3 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-card-foreground">Vlog viagem SP</p>
        <p className="text-[8px] text-muted-foreground">Chat com editor</p>
      </div>
    </div>
    <div className="p-3 space-y-2">
      {CHAT_MESSAGES.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'client' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed ${
            m.role === 'client'
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted/60 text-card-foreground rounded-bl-sm'
          }`}>
            <p>{m.text}</p>
            <p className={`text-[8px] mt-0.5 ${m.role === 'client' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{m.time}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="border-t border-border/30 px-3 py-2 flex items-center gap-2">
      <div className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-[10px] text-muted-foreground">
        Digite sua mensagem...
      </div>
      <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
        <Send className="h-3 w-3 text-primary-foreground" />
      </div>
    </div>
  </div>
);

/* ─── Interactive Editor Panel Mockup ─── */
const EditorPanelMockup = () => (
  <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
    <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Video className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-card-foreground">Reel lançamento produto</p>
          <p className="text-[10px] text-muted-foreground">Pedro L. · Instagram</p>
        </div>
      </div>
      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Em produção</Badge>
    </div>
    <div className="p-4 space-y-4">
      {/* Briefing summary */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Briefing</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[9px] text-muted-foreground">Estilo</p>
            <p className="text-[11px] font-medium text-card-foreground">Dinâmico, moderno</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="text-[9px] text-muted-foreground">Cores</p>
            <div className="flex gap-1 mt-0.5">
              <div className="h-4 w-4 rounded-full bg-blue-500" />
              <div className="h-4 w-4 rounded-full bg-white" />
              <div className="h-4 w-4 rounded-full bg-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks checklist */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Checklist</p>
        {[
          { name: 'Cortar silêncios', done: true },
          { name: 'Adicionar legendas', done: true },
          { name: 'Inserir intro/outro', done: false },
          { name: 'Ajustar áudio', done: false },
        ].map((t) => (
          <div key={t.name} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5">
            <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${t.done ? 'bg-primary border-primary' : 'border-border'}`}>
              {t.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
            <span className={`text-[11px] ${t.done ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>{t.name}</span>
          </div>
        ))}
      </div>

      {/* Upload area */}
      <div className="rounded-lg border-2 border-dashed border-border/40 p-4 text-center">
        <Upload className="h-5 w-5 mx-auto text-muted-foreground/50 mb-1" />
        <p className="text-[10px] text-muted-foreground">Arraste o arquivo ou cole o link do Drive</p>
      </div>
    </div>
  </div>
);

/* ─── Delivery Card Mockup ─── */
const DeliveryCardMockup = () => (
  <Card className="border-border/40 bg-card/60 p-4 max-w-sm mx-auto space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-card-foreground">Review iPhone 16</p>
          <p className="text-[10px] text-muted-foreground">YouTube · Ana C.</p>
        </div>
      </div>
      <Badge className="bg-[hsl(var(--queue-yellow))]/20 text-[hsl(var(--queue-yellow))] border-[hsl(var(--queue-yellow))]/30 text-[10px]">
        Revisão
      </Badge>
    </div>

    {/* SLA */}
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> SLA 48h
        </span>
        <span className="font-mono font-medium text-primary">6h 30min restantes</span>
      </div>
      <Progress value={73} className="h-1.5" />
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1">
        <Eye className="h-3 w-3" /> Ver entrega
      </Button>
      <Button size="sm" className="flex-1 text-xs gap-1">
        <ThumbsUp className="h-3 w-3" /> Aprovar
      </Button>
    </div>
  </Card>
);

/* ─── Quota Card Mockup ─── */
const QuotaMockup = () => (
  <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
    {[
      { label: 'YouTube', used: 3, total: 6, icon: Video, color: 'text-red-400' },
      { label: 'Instagram', used: 5, total: 8, icon: Camera, color: 'text-pink-400' },
      { label: 'Thumbnails', used: 3, total: 6, icon: Image, color: 'text-blue-400' },
      { label: 'Capas', used: 1, total: 4, icon: Layers, color: 'text-purple-400' },
    ].map((q) => (
      <Card key={q.label} className="border-border/40 bg-card/60 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <q.icon className={`h-3.5 w-3.5 ${q.color}`} />
          <span className="text-[10px] font-medium text-card-foreground">{q.label}</span>
        </div>
        <p className="text-lg font-bold text-card-foreground font-mono">
          {q.used}<span className="text-muted-foreground text-xs">/{q.total}</span>
        </p>
        <Progress value={(q.used / q.total) * 100} className="h-1" />
      </Card>
    ))}
  </div>
);

/* ─── Main Landing Component ─── */
const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDemo, setActiveDemo] = useState<'kanban' | 'delivery' | 'chat'>('kanban');

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
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs border-primary/30 text-primary">
              <Zap className="h-3 w-3 mr-1.5" /> Plataforma de Edição Profissional
            </Badge>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
          >
            Suas entregas de vídeo,{' '}
            <span className="text-primary">organizadas e profissionais</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground font-body"
          >
            Gerencie edições, thumbnails, capas e captações em um só lugar.
            Acompanhe prazos, converse com editores e aprove entregas — tudo em tempo real.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2 text-sm px-8">
                <Mail className="h-4 w-4" /> Solicitar Orçamento
              </Button>
            </a>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="gap-2 text-sm px-8">
                Já tenho conta <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Interactive Software Demo */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            {/* Demo tabs */}
            <div className="flex items-center justify-center gap-1 mb-6 bg-secondary rounded-lg p-1 max-w-md mx-auto">
              {[
                { id: 'kanban' as const, label: 'Kanban', icon: BarChart3 },
                { id: 'delivery' as const, label: 'Entrega', icon: Video },
                { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDemo(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-mono font-medium transition-colors ${
                    activeDemo === tab.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Browser chrome */}
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-1.5 bg-card px-4 py-2.5 border-b border-border/50">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--queue-yellow))]/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--queue-green))]/60" />
                <span className="ml-3 text-[10px] font-mono text-muted-foreground">
                  abbavideo.com — {activeDemo === 'kanban' ? 'Dashboard' : activeDemo === 'delivery' ? 'Entrega' : 'Chat'}
                </span>
              </div>
              <div className="bg-background p-4 sm:p-6 min-h-[280px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDemo}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeDemo === 'kanban' && <KanbanMockup />}
                    {activeDemo === 'delivery' && <DeliveryCardMockup />}
                    {activeDemo === 'chat' && <ChatMockup />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real Situations Section */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold">
              Situações reais,{' '}
              <span className="text-primary">resolvidas com facilidade</span>
            </h2>
            <p className="mt-3 text-muted-foreground font-body max-w-xl mx-auto">
              Veja como a plataforma transforma o dia a dia de quem produz conteúdo em vídeo.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Situation 1: Quota tracking */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <Card className="border-border/40 bg-card/60 p-6 h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      "Quantos vídeos ainda posso pedir este mês?"
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      Acompanhe suas cotas em tempo real. Sem surpresas, sem planilhas.
                    </p>
                  </div>
                </div>
                <QuotaMockup />
              </Card>
            </motion.div>

            {/* Situation 2: Editor panel */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
            >
              <Card className="border-border/40 bg-card/60 p-6 h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      "Preciso ver o briefing e começar a editar"
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      O editor tem acesso a tudo: briefing, checklist, upload e chat com o cliente.
                    </p>
                  </div>
                </div>
                <EditorPanelMockup />
              </Card>
            </motion.div>

            {/* Situation 3: SLA urgency */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <Card className="border-border/40 bg-card/60 p-6 h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      "Meu vídeo está pronto? Quanto tempo falta?"
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      Countdown em horas úteis (8h–18h BRT). Você sabe exatamente quando esperar.
                    </p>
                  </div>
                </div>
                <DeliveryCardMockup />
              </Card>
            </motion.div>

            {/* Situation 4: Communication */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
            >
              <Card className="border-border/40 bg-card/60 p-6 h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      "Preciso pedir um ajuste no minuto 2:35"
                    </h3>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      Chat integrado por entrega com marcadores de tempo. Sem e-mails, sem WhatsApp.
                    </p>
                  </div>
                </div>
                <ChatMockup />
              </Card>
            </motion.div>
          </div>
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

      {/* How it works */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-12">
            Como <span className="text-primary">funciona</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { step: '01', title: 'Plano personalizado', desc: 'Montamos sob medida para você.' },
              { step: '02', title: 'Briefing de marca', desc: 'Identidade visual capturada.' },
              { step: '03', title: 'Solicite entregas', desc: 'Vídeos, thumbs e capas pelo painel.' },
              { step: '04', title: 'Revise e aprove', desc: 'Acompanhe e aprove em tempo real.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-bold text-primary font-mono">{s.step}</span>
                </div>
                <h3 className="text-xs font-semibold mb-1">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground font-body">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant preview */}
      <section className="py-16 sm:py-24 border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Assistente IA
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Conheça a <span className="text-primary">Olívia</span>
              </h2>
              <p className="text-muted-foreground font-body text-sm mb-4">
                Assistente inteligente disponível 24/7, direto na plataforma. Esperta, direta e com um toque de humor — como toda boa parceira criativa.
              </p>
              <ul className="space-y-2">
                {[
                  'Tira dúvidas sobre funcionalidades',
                  'Ajuda com prazos e cotas',
                  'Conteúdo adaptado ao seu perfil',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-card-foreground font-body">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Olívia mockup */}
            <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-xl max-w-xs mx-auto w-full">
              <div className="px-4 py-3 border-b border-border/30 bg-primary/5 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-card-foreground">Olívia ✨</p>
                  <p className="text-[9px] text-muted-foreground">Online</p>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-[10px] text-card-foreground leading-relaxed">
                    Olá! Eu sou a Olívia 💃 Como posso te ajudar hoje?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-[10px] text-primary-foreground">
                    Onde vejo minhas cotas do mês?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-[10px] text-card-foreground leading-relaxed">
                    No seu <strong>Dashboard</strong>, os cards de cota mostram tudo! YouTube, Instagram, thumbs e capas — cada um com barra de progresso 📊
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
