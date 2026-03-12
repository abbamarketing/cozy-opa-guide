import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Monitor,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  BarChart3,
  FileText,
  Bot,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import screenshotDesktop from '@/assets/screenshot-dashboard-desktop.jpg';
import screenshotMobile from '@/assets/screenshot-dashboard-mobile.jpg';
import screenshotEditor from '@/assets/screenshot-editor-desktop.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: Video,
    title: 'Edição de Vídeos para YouTube',
    description: 'Vídeos editados profissionalmente com cortes dinâmicos, legendas, transições e identidade visual da sua marca.',
  },
  {
    icon: Camera,
    title: 'Vídeos para Instagram',
    description: 'Reels e conteúdos verticais otimizados para engajamento máximo no Instagram.',
  },
  {
    icon: Image,
    title: 'Thumbnails Profissionais',
    description: 'Thumbnails que convertem — design estratégico para aumentar o CTR dos seus vídeos.',
  },
  {
    icon: Layers,
    title: 'Capas para Instagram',
    description: 'Capas de feed e destaques alinhadas à identidade visual do seu perfil.',
  },
  {
    icon: Calendar,
    title: 'Captação Presencial',
    description: 'Agendamento integrado de captação com equipe profissional — direto pela plataforma.',
  },
  {
    icon: Clock,
    title: 'Prazos com SLA',
    description: 'Entregas com prazo garantido (24h, 48h ou 72h) e countdown em tempo real.',
  },
  {
    icon: MessageSquare,
    title: 'Chat por Entrega',
    description: 'Converse diretamente com seu editor em cada entrega, com suporte a marcadores de tempo.',
  },
  {
    icon: Shield,
    title: 'Revisões Incluídas',
    description: 'Peça revisões com notas detalhadas e acompanhe cada iteração até a aprovação.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Painel Kanban para acompanhar todas as suas entregas em tempo real.',
  },
  {
    icon: FileText,
    title: 'Gerador de Roteiros com IA',
    description: 'Gere roteiros otimizados com inteligência artificial, direto da plataforma.',
  },
  {
    icon: Bot,
    title: 'Assistente IA 24/7',
    description: 'Chat de suporte com IA que conhece todas as funcionalidades da plataforma.',
  },
  {
    icon: Users,
    title: 'Onboarding Guiado',
    description: 'Briefing de marca completo para que o editor capture exatamente a sua identidade.',
  },
];

const FAQ = [
  {
    q: 'Como funciona o processo de edição?',
    a: 'Você solicita uma entrega pela plataforma, preenche o briefing e o editor atribuído começa a trabalhar. Acompanhe o progresso em tempo real pelo painel Kanban.',
  },
  {
    q: 'Quantas revisões estão incluídas?',
    a: 'O número de revisões depende do seu plano personalizado. Você pode solicitar revisões com notas detalhadas e marcadores de tempo até atingir o limite do período.',
  },
  {
    q: 'Como funciona a captação presencial?',
    a: 'Para planos que incluem captação, você agenda uma data pela plataforma respeitando o prazo mínimo de antecedência configurado no seu plano. Após agendar, as entregas do mês são liberadas.',
  },
  {
    q: 'Posso acompanhar o prazo das entregas?',
    a: 'Sim! Cada entrega tem um countdown de SLA em tempo real. Você sabe exatamente quando o editor precisa entregar e pode aprovar ou pedir revisão direto pela plataforma.',
  },
  {
    q: 'Como converso com meu editor?',
    a: 'Cada entrega tem um chat integrado onde você pode trocar mensagens com o editor, incluindo marcadores de tempo para referências específicas no vídeo.',
  },
  {
    q: 'Os vídeos ficam disponíveis por quanto tempo?',
    a: 'Após aprovação, os arquivos ficam disponíveis para download por 90 dias. Recomendamos baixar assim que aprovar a entrega.',
  },
  {
    q: 'Existe um app mobile?',
    a: 'A plataforma é totalmente responsiva e funciona perfeitamente no navegador do celular. Você pode gerenciar tudo do seu smartphone sem precisar instalar nada.',
  },
  {
    q: 'Como começo a usar?',
    a: 'Entre em contato conosco para montar um plano personalizado. Após a configuração, você receberá acesso à plataforma, preencherá o briefing da sua marca e poderá começar a solicitar entregas imediatamente.',
  },
];

const Landing = () => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
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
            Gerencie edições de vídeo, thumbnails, capas e captações presenciais em um só lugar.
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

      {/* Screenshot Preview */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </Button>
          </div>

          <motion.div
            key={previewMode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center"
          >
            {previewMode === 'desktop' ? (
              <div className="w-full rounded-xl border border-border/50 overflow-hidden shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-1.5 bg-card px-4 py-2.5 border-b border-border/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--queue-yellow))]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--queue-green))]/60" />
                  <span className="ml-3 text-[10px] font-mono text-muted-foreground">abbavideo.com — Dashboard</span>
                </div>
                <img
                  src={screenshotDesktop}
                  alt="Dashboard AbbaVideo versão desktop"
                  className="w-full"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-[280px] sm:w-[320px] rounded-[2rem] border-4 border-border/60 overflow-hidden shadow-2xl shadow-primary/5 bg-card">
                <div className="flex items-center justify-center py-2 bg-card border-b border-border/30">
                  <div className="h-4 w-20 rounded-full bg-border/40" />
                </div>
                <img
                  src={screenshotMobile}
                  alt="Dashboard AbbaVideo versão mobile"
                  className="w-full"
                  loading="lazy"
                />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold">
              Tudo o que você precisa,{' '}
              <span className="text-primary">em um só lugar</span>
            </h2>
            <p className="mt-3 text-muted-foreground font-body max-w-xl mx-auto">
              Funcionalidades pensadas para simplificar a produção de conteúdo em vídeo do início ao fim.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                custom={i % 3}
              >
                <Card className="h-full border-border/40 bg-card/60 p-5 hover:border-primary/30 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-card-foreground mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">{f.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editor Screenshot */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs">
                Para Editores
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Painel profissional{' '}
                <span className="text-primary">para editores</span>
              </h2>
              <p className="text-muted-foreground font-body mb-6">
                Editores têm acesso a um painel dedicado com todas as entregas atribuídas, briefings de marca, upload de arquivos e chat com o cliente.
              </p>
              <ul className="space-y-3">
                {[
                  'Kanban com drag & drop para gerenciar status',
                  'Briefing completo com cores, fontes e referências',
                  'Upload direto de arquivos ou link do Google Drive',
                  'Chat integrado com marcadores de tempo',
                  'Checklist de subtarefas por entrega',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-card-foreground font-body">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden shadow-xl shadow-primary/5">
              <img
                src={screenshotEditor}
                alt="Painel do editor AbbaVideo"
                className="w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-14">
            Como <span className="text-primary">funciona</span>
          </h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Plano personalizado', desc: 'Montamos um plano sob medida para sua necessidade de conteúdo.' },
              { step: '02', title: 'Briefing de marca', desc: 'Preencha o briefing para que o editor conheça sua identidade visual.' },
              { step: '03', title: 'Solicite entregas', desc: 'Crie solicitações de vídeos, thumbnails e capas pelo painel.' },
              { step: '04', title: 'Revise e aprove', desc: 'Acompanhe, peça revisões e aprove — tudo em tempo real.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary font-mono">{s.step}</span>
                </div>
                <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground font-body">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 border-t border-border/30">
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
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-4 pb-4"
                    >
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Pronto para profissionalizar seu conteúdo?
            </h2>
            <p className="text-muted-foreground font-body mb-6 max-w-lg mx-auto">
              Entre em contato para montar um plano personalizado com os entregáveis que você precisa.
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
