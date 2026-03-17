import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ArrowRight, ArrowDown, Camera, Calendar, MessageSquare, Send, Zap } from 'lucide-react';
import abbaLogo from '@/assets/abba-logo.png';
import screenshotDashboard from '@/assets/screenshot-dashboard-desktop.jpg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
} as const;

const FAQ = [
  {
    q: 'O que é fila ilimitada?',
    a: 'Você envia quantos vídeos quiser, quando quiser. Não existe cota mensal de quantidade. Processamos um por vez, na ordem de envio, dentro do prazo garantido do seu plano.',
  },
  {
    q: 'Como funciona o SLA?',
    a: 'Cada vídeo tem um prazo contado em horas úteis a partir do envio. O countdown fica visível no seu dashboard em tempo real. No plano mais avançado, seu vídeo sai em até 4 horas.',
  },
  {
    q: 'O que a edição inclui?',
    a: 'Short videos de até 90 segundos: Reels, Shorts e TikTok. Corte, legenda, ritmo e identidade visual. Não inclui vídeos longos, thumbnails ou capas.',
  },
  {
    q: 'E se eu não gostar da edição?',
    a: 'Pede revisão no app, marca o segundo exato se precisar, e o vídeo volta para produção — com o mesmo prazo garantido. Sem limite de revisões, sem custo adicional.',
  },
  {
    q: 'Posso cancelar?',
    a: 'Sim. A qualquer momento pelo portal do cliente. Sem multa, sem burocracia.',
  },
];

const KANBAN_COLS = [
  {
    title: 'Fila',
    cards: [
      { type: 'Reel', title: 'Rotina de manhã', sla: 'Na fila', slaColor: 'bg-white/10 text-white/50' },
      { type: 'Short', title: 'Review produto X', sla: 'Na fila', slaColor: 'bg-white/10 text-white/50' },
    ],
  },
  {
    title: 'Em produção',
    cards: [
      { type: 'TikTok', title: 'Trend challenge', sla: '3h 42min restantes', slaColor: 'bg-abba-lime/20 text-abba-lime' },
    ],
  },
  {
    title: 'Revisar',
    cards: [
      { type: 'Reel', title: 'Dica rápida #12', sla: 'Pronto', slaColor: 'bg-abba-lime/20 text-abba-lime' },
    ],
  },
  {
    title: 'Aprovado',
    cards: [
      { type: 'Short', title: 'Unboxing novo setup', sla: 'Entregue', slaColor: 'bg-abba-lime/20 text-abba-lime' },
    ],
  },
];

const Landing = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) {
      localStorage.setItem('affiliate_ref', ref.trim().toLowerCase());
    }
  }, []);

  return (
    <div className="min-h-screen bg-abba-dark text-foreground">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-abba-dark/90 backdrop-blur-lg border-b border-abba-surface">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={abbaLogo} alt="AbbaVideo" className="h-8 w-8" />
            <span className="text-lg font-sans font-bold">
              Abba<span className="text-abba-lime">Video</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-white/60 hover:text-white hidden sm:inline-flex">
              <a href="#planos">Planos</a>
            </Button>
            <Button size="sm" asChild className="bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl space-y-6"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-sm font-sans text-white/50 tracking-wide"
          >
            Edição profissional de vídeo sempre foi cara, lenta e imprevisível.
          </motion.p>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-3xl font-sans font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl"
          >
            A tecnologia{' '}
            <span className="text-abba-lime"><em className="font-light">mudou</em></span>{' '}
            isso.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto max-w-2xl text-base text-white/70 sm:text-lg font-sans leading-relaxed"
          >
            AbbaVideo entrega short videos editados com sua identidade visual em até 4 horas
            — fila ilimitada, sem cota, sem surpresa.
          </motion.p>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="text-sm font-sans text-abba-lime font-semibold"
          >
            7 dias grátis. Cancela quando quiser.
          </motion.p>

          <motion.div variants={fadeUp} custom={4} className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild className="bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light">
              <Link to="/auth">Começar agora</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border border-white/20 text-white rounded-full hover:bg-abba-surface">
              <a href="#o-que-mudou">
                Ver como funciona <ArrowDown className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── O QUE MUDOU ─── */}
      <section id="o-que-mudou" className="border-t border-abba-surface py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl space-y-6 text-center"
        >
          <h2 className="text-2xl font-sans font-bold sm:text-3xl">O que mudou</h2>
          <div className="space-y-4 text-sm sm:text-base font-sans text-white/70 leading-relaxed text-left">
            <p>
              Durante anos, ter uma equipe de edição profissional era privilégio de quem tinha orçamento de agência.
            </p>
            <p>
              Freelancer era a alternativa. E quem usou sabe o que significa: prazo que "depende da demanda",
              qualidade inconsistente, nenhuma memória de marca entre um vídeo e outro.
            </p>
            <p className="text-white font-medium">
              AbbaVideo existe porque bom serviço não deveria funcionar assim.
            </p>
            <p>
              Tecnologia aplicada com inteligência muda a equação.{' '}
              <span className="text-abba-lime font-semibold">Fila ilimitada. Prazo garantido. Identidade visual aplicada em todo vídeo — sempre.</span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── CAPTAÇÃO PROFISSIONAL ─── */}
      <section className="border-t border-abba-surface bg-abba-surface/30 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <Badge variant="secondary" className="text-xs font-sans rounded-full">
              <Camera className="h-3 w-3 mr-1" /> Captação Profissional
            </Badge>
            <h2 className="text-2xl font-sans font-bold sm:text-3xl">Do briefing à entrega</h2>
            <p className="text-white/50 font-sans text-sm">Agende sua sessão, acompanhe cada etapa no kanban e aprove o resultado final.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[20px] bg-abba-surface border border-white/8 p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step: '1', icon: <Calendar className="h-5 w-5 text-abba-lime" />, label: 'Briefing', desc: 'Defina identidade, tom e referências do projeto.' },
                { step: '2', icon: <Camera className="h-5 w-5 text-abba-lime" />, label: 'Captação', desc: 'Agende a sessão e acompanhe o status em tempo real.' },
                { step: '3', icon: <CheckCircle className="h-5 w-5 text-abba-lime" />, label: 'Entrega', desc: 'Revise, peça ajustes e aprove com um clique.' },
              ].map((item) => (
                <div key={item.step} className="rounded-xl bg-abba-dark/60 border border-white/6 p-5 space-y-3 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-abba-lime/15">
                    {item.icon}
                  </div>
                  <p className="text-sm font-sans font-semibold text-white">{item.step}. {item.label}</p>
                  <p className="text-xs font-sans text-white/50">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center space-y-3"
          >
            <p className="text-sm font-sans text-white/70">
              Todo o processo acontece dentro do seu dashboard — do agendamento da captação até a aprovação final, sem sair da plataforma.
            </p>
            <p className="text-sm font-sans text-white font-medium">
              Transparência total. Controle total. Do início ao fim.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── ENVIE E ACOMPANHE ─── */}
      <section className="border-t border-abba-surface py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <h2 className="text-2xl font-sans font-bold sm:text-3xl">Envie e acompanhe</h2>
            <p className="text-white/50 font-sans text-sm">Sem email. Sem WhatsApp. Sem ruído.</p>
          </motion.div>

          {/* Kanban mock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {KANBAN_COLS.map((col) => (
              <div key={col.title} className="rounded-[20px] bg-abba-surface/60 border border-white/8 p-4">
                <p className="mb-3 text-xs font-sans font-semibold uppercase tracking-wider text-white/60">
                  {col.title}
                </p>
                <div className="space-y-3">
                  {col.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-[20px] bg-abba-surface border border-white/8 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px] font-sans rounded-full">
                          {card.type}
                        </Badge>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-sans font-medium ${card.slaColor}`}>
                          {card.sla}
                        </span>
                      </div>
                      <p className="text-sm font-sans font-medium text-white">{card.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center space-y-3 max-w-2xl mx-auto"
          >
            <p className="text-sm font-sans text-white/70">
              Cada vídeo tem um status em tempo real. Você sabe exatamente onde está, quando chega e quanto tempo falta
              — sem precisar perguntar para ninguém.
            </p>
            <p className="text-sm font-sans text-white/70">
              Envia o arquivo bruto ou um link. O briefing de marca já está salvo. Sua equipe sabe o que fazer.
            </p>
            <p className="text-sm font-sans text-abba-lime font-semibold">
              Fila ilimitada. Sem cota mensal. Envia quantos quiser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── VÍDEO PRONTO EM HORAS ─── */}
      <section className="border-t border-abba-surface bg-abba-surface/30 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <h2 className="text-2xl font-sans font-bold sm:text-3xl">Vídeo pronto em horas</h2>
            <p className="text-white/50 font-sans text-sm">Não em dias. Em horas.</p>
          </motion.div>

          {/* SLA card mock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[20px] bg-abba-surface border border-white/8 p-6 sm:p-8 max-w-md mx-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="text-[10px] font-sans rounded-full">TikTok</Badge>
              <Badge className="bg-abba-lime/20 text-abba-lime text-[10px] rounded-full border-0">Standard</Badge>
            </div>
            <p className="text-sm font-sans font-semibold text-white mb-3">Trend challenge — edição rápida</p>
            <div className="progress-track" style={{ height: '36px' }}>
              <div className="progress-fill text-[12px]" style={{ width: '62%' }}>
                3h 42min restantes
              </div>
            </div>
            <p className="text-[11px] font-sans text-white/40 mt-2">SLA: 72h úteis · Enviado há 44h</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center space-y-3 max-w-2xl mx-auto"
          >
            <p className="text-sm font-sans text-white/70">
              Dependendo do plano, seu vídeo sai editado em até 4 horas.
            </p>
            <p className="text-sm font-sans text-white/70">
              Cada entrega tem um prazo garantido contado em horas úteis a partir do momento do envio.
              Você acompanha o countdown em tempo real. Quando o vídeo chega, você recebe uma notificação
              — e aprova com um clique.
            </p>
            <p className="text-sm font-sans text-white font-medium">
              Isso não existia antes. Agora existe.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── REVISE COM PRECISÃO ─── */}
      <section className="border-t border-abba-surface py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <h2 className="text-2xl font-sans font-bold sm:text-3xl">Revise com precisão</h2>
            <p className="text-white/50 font-sans text-sm">Pediu ajuste, foi ajustado.</p>
          </motion.div>

          {/* Revision mock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[20px] bg-abba-surface border border-white/8 p-6 sm:p-8 max-w-md mx-auto space-y-4"
          >
            <div className="rounded-xl bg-abba-dark/60 border border-white/6 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-abba-lime" />
                <p className="text-[11px] font-sans font-semibold text-white/40 uppercase tracking-wider">Revisão</p>
              </div>
              <div className="rounded-lg bg-abba-dark border border-white/6 p-3">
                <p className="text-xs font-sans text-white/60 mb-1">
                  <span className="text-abba-lime font-mono">00:14</span> — cortar pausa
                </p>
                <p className="text-xs font-sans text-white/60">
                  <span className="text-abba-lime font-mono">00:32</span> — legenda cortou o texto
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-sans text-white/40">
              <Clock className="h-3 w-3" />
              Revisão anterior: 2h atrás · Entregue com sucesso
            </div>
            <Button className="bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light w-full">
              <Send className="h-4 w-4 mr-2" /> Enviar revisão
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center space-y-3 max-w-2xl mx-auto"
          >
            <p className="text-sm font-sans text-white/70">
              Cada entrega tem um canal próprio. Você indica o ajuste, marca o segundo exato se precisar,
              e o vídeo volta para produção — com o mesmo prazo garantido.
            </p>
            <p className="text-sm font-sans text-abba-lime font-semibold">
              Sem limite de revisões. Sem cobranças extras. Sem atrito.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── PLANOS ─── */}
      <section id="planos" className="border-t border-abba-surface bg-abba-surface/30 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-12"
          >
            <h2 className="text-2xl font-sans font-bold sm:text-3xl">Planos</h2>
            <p className="text-white/50 font-sans text-sm">Escolha pela velocidade que o seu ritmo exige.</p>
          </motion.div>

          <div className="max-w-md mx-auto">
            {/* Standard Plan */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
            >
              <div className="relative flex flex-col rounded-[20px] kpi-dark border-2 border-abba-lime p-6 h-full" style={{ minHeight: 'auto' }}>
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-abba-lime text-[#111] font-bold rounded-full px-3 py-0.5 text-[11px] uppercase tracking-widest flex items-center gap-1">
                  <Zap className="h-3 w-3" /> 7 dias grátis
                </span>
                <div className="flex items-center gap-2 mb-1 mt-2">
                  <h3 className="text-lg font-sans font-bold text-white">Standard</h3>
                  <span className="text-abba-lime text-lg">★</span>
                </div>
                <p className="text-sm font-sans text-white/70 mb-4">
                  Para quem quer escalar sem depender de ninguém.
                </p>
                <ul className="space-y-2 text-sm font-sans text-white/60 flex-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-abba-lime shrink-0 mt-0.5" />
                    Reels, Shorts e TikTok de até 90 segundos
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-abba-lime shrink-0 mt-0.5" />
                    Fila ilimitada — sem cota mensal
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-abba-lime shrink-0 mt-0.5" />
                    Vídeo pronto em até 72 horas
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-abba-lime shrink-0 mt-0.5" />
                    Identidade visual aplicada em todo vídeo
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-abba-lime shrink-0 mt-0.5" />
                    Briefing de marca salvo — sem explicar de novo
                  </li>
                </ul>
                <p className="text-xs font-sans text-white/40 mt-4 mb-4">
                  Cancele quando quiser, sem multa.
                </p>
                <Button
                  className="w-full rounded-full font-bold bg-abba-lime text-[#111] hover:bg-abba-light"
                  asChild
                >
                  <Link to="/auth">Começar 7 dias grátis</Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* More speed CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 text-center rounded-[20px] bg-abba-surface border border-white/8 p-6 max-w-xl mx-auto"
          >
            <p className="text-sm font-sans text-white font-medium mb-2">
              Precisa de mais velocidade?
            </p>
            <p className="text-xs font-sans text-white/50 mb-4">
              Temos planos com entrega em 48h, 24h, 8h e até 4 horas — para criadores e times que
              produzem em alto volume e não podem esperar.
            </p>
            <Button
              variant="outline"
              className="rounded-full border border-white/20 text-white hover:bg-abba-surface"
              asChild
            >
              <Link to="/auth">Falar com a equipe <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── MANIFESTO ─── */}
      <section className="border-t border-abba-surface py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center space-y-6"
        >
          <h2 className="text-2xl font-sans font-bold sm:text-3xl">Manifesto</h2>
          <div className="space-y-4 text-sm sm:text-base font-sans text-white/70 leading-relaxed">
            <p>Acreditamos que produção profissional deveria ser acessível.</p>
            <p>
              Não como desconto. Não como versão inferior.
              <br />
              Como serviço real, com prazo real, para criadores reais.
            </p>
            <p className="text-white font-medium">
              É isso que a tecnologia permite quando usada do jeito certo.
              <br />
              É isso que o AbbaVideo entrega.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="border-t border-abba-surface bg-abba-surface/30 py-20 px-6">
        <div className="mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center text-2xl font-sans font-bold sm:text-3xl"
          >
            FAQ
          </motion.h2>

          <Accordion type="single" collapsible className="space-y-2">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-white/8 rounded-[20px] px-4">
                <AccordionTrigger className="text-sm font-sans font-medium text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm font-sans text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="border-t border-abba-surface py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center space-y-6"
        >
          <h2 className="text-2xl font-sans font-bold sm:text-3xl">
            O próximo vídeo do seu canal poderia estar em produção agora.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="bg-abba-lime text-[#111] font-bold rounded-full hover:bg-abba-light">
              <Link to="/auth">Começar 7 dias grátis</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border border-white/20 text-white rounded-full hover:bg-abba-surface">
              <a href="#planos">
                Ver planos <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs font-sans text-white/40">
            Fila ilimitada. Prazo garantido. Identidade visual em todo vídeo.
          </p>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-abba-surface py-10 px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-sm font-sans text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <img src={abbaLogo} alt="AbbaVideo" className="h-6 w-6" />
            <p>© {new Date().getFullYear()} AbbaVideo</p>
          </div>
          <div className="flex gap-4">
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
            <a href="#planos" className="hover:text-foreground transition-colors">
              Planos
            </a>
            <Link to="/termos" className="hover:text-foreground transition-colors">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
