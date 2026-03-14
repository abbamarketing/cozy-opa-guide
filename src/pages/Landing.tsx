import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Scissors, CheckCircle, Play, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

const PLANS = [
  { name: 'Standard', price: 490, videos: 4, sla: '72h úteis', popular: false },
  { name: 'Pro', price: 660, videos: 8, sla: '48h úteis', popular: true },
  { name: 'Business', price: 1100, videos: 16, sla: '48h úteis', popular: false },
  { name: 'Premium', price: 2970, videos: 30, sla: '24h úteis', popular: false },
  { name: 'Agency', price: 5590, videos: 60, sla: '24h úteis', popular: false },
];

const STEPS = [
  { icon: Upload, title: 'Você envia', desc: 'Arquivos brutos, briefing de marca e pauta do vídeo' },
  { icon: Scissors, title: 'A gente edita', desc: 'Equipe de editores profissionais com SLA por plano' },
  { icon: CheckCircle, title: 'Você recebe', desc: 'Vídeo aprovado na plataforma, pronto para publicar' },
];

const FAQ = [
  {
    q: 'Posso pedir qualquer tipo de vídeo?',
    a: 'O plano cobre short videos até 90 segundos para Reels, Shorts e TikTok. Para outros formatos, temos projetos customizados.',
  },
  {
    q: 'Qual o prazo de entrega?',
    a: 'Depende do seu plano. Standard: 72h úteis. Pro/Business: 48h úteis. Premium/Agency: 24h úteis.',
  },
  {
    q: 'Como envio os arquivos brutos?',
    a: 'Diretamente pela plataforma, via upload ou link do Google Drive.',
  },
  {
    q: 'Posso pedir revisões?',
    a: 'Sim. Cada entrega inclui 2 rodadas de revisão gratuitas.',
  },
];

const KANBAN_COLS = [
  {
    title: 'Aguardando edição',
    color: 'border-yellow-500/40',
    cards: [
      { type: 'Reel', title: 'Rotina de manhã', sla: '71h restantes', slaColor: 'bg-yellow-500/20 text-yellow-400' },
    ],
  },
  {
    title: 'Em produção',
    color: 'border-primary/40',
    cards: [
      { type: 'Short', title: 'Dica rápida #12', sla: '23h restantes', slaColor: 'bg-primary/20 text-primary' },
      { type: 'TikTok', title: 'Trend challenge', sla: '46h restantes', slaColor: 'bg-primary/20 text-primary' },
    ],
  },
  {
    title: 'Aprovado',
    color: 'border-primary/60',
    cards: [
      { type: 'Reel', title: 'Unboxing produto X', sla: 'Entregue', slaColor: 'bg-primary/20 text-primary' },
    ],
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl space-y-6"
        >
          <motion.div variants={fadeUp} custom={0} className="mx-auto flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Play className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Abba<span className="text-primary">Video</span>
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
          >
            Seus Reels, Shorts e TikToks.{' '}
            <span className="text-primary">Editados por profissionais.</span>{' '}
            Entregues toda semana.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            Assine um plano, envie seus arquivos brutos, e receba seus vídeos
            prontos para publicar — com SLA garantido.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild>
              <a href="#planos">Ver Planos</a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth">
                Entrar na plataforma <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section className="border-t border-border/30 bg-muted/20 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center text-2xl font-bold sm:text-3xl"
          >
            Como funciona
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                >
                  <Card className="flex flex-col items-center gap-4 border-border/40 bg-card p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── O QUE É ENTREGUE ─── */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center space-y-4"
        >
          <Badge variant="secondary" className="text-xs">
            Plano de Assinatura — Short Videos até 90s
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl">O que está incluso</h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/50 px-3 py-1">Instagram Reels</span>
            <span className="rounded-full border border-border/50 px-3 py-1">YouTube Shorts</span>
            <span className="rounded-full border border-border/50 px-3 py-1">TikTok</span>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Precisa de outros formatos?{' '}
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Fale com a gente sobre projetos customizados.
            </Link>
          </p>
        </motion.div>
      </section>

      {/* ─── PLANOS ─── */}
      <section id="planos" className="border-t border-border/30 bg-muted/20 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-center text-2xl font-bold sm:text-3xl"
          >
            Planos e Preços
          </motion.h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-sm text-muted-foreground">
            Todos os planos incluem edição profissional de short videos até 90s,
            2 rodadas de revisão por entrega e acesso à plataforma.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <Card
                  className={`relative flex flex-col border-border/40 bg-card p-6 ${
                    plan.popular ? 'border-primary ring-1 ring-primary/30' : ''
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                      Mais Popular
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-extrabold text-primary">
                    R$ {plan.price.toLocaleString('pt-BR')}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {plan.videos} vídeos/mês
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      SLA: {plan.sla}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      2 revisões/entrega
                    </li>
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link to="/auth">Assinar</Link>
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLATAFORMA (MOCK) ─── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 text-center text-2xl font-bold sm:text-3xl"
          >
            Acompanhe tudo pela plataforma
          </motion.h2>
          <p className="mx-auto mb-10 max-w-lg text-center text-sm text-muted-foreground">
            Kanban em tempo real com status de cada entrega e contagem regressiva do SLA.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {KANBAN_COLS.map((col) => (
              <div key={col.title} className={`rounded-xl border ${col.color} bg-card/60 p-4`}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.title}
                </p>
                <div className="space-y-3">
                  {col.cards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-lg border border-border/30 bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">
                          {card.type}
                        </Badge>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${card.slaColor}`}>
                          {card.sla}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-card-foreground">{card.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="border-t border-border/30 bg-muted/20 py-20 px-6">
        <div className="mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center text-2xl font-bold sm:text-3xl"
          >
            Perguntas Frequentes
          </motion.h2>

          <Accordion type="single" collapsible className="space-y-2">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border/40 rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/30 py-10 px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} AbbaVideo. Edição profissional de short videos.</p>
          <div className="flex gap-4">
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
            <a href="#planos" className="hover:text-foreground transition-colors">
              Ver Planos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
