import { Play, Zap, Users, BarChart3, ArrowRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Video,
    title: "Edição Colaborativa",
    description: "Trabalhe em equipe em tempo real com controle de versões integrado.",
  },
  {
    icon: Zap,
    title: "Renderização Rápida",
    description: "Pipeline de renderização otimizada com suporte a GPU na nuvem.",
  },
  {
    icon: Users,
    title: "Gestão de Equipe",
    description: "Atribua tarefas, defina prazos e acompanhe o progresso de cada editor.",
  },
  {
    icon: BarChart3,
    title: "Analytics Avançado",
    description: "Métricas detalhadas de produtividade e relatórios automatizados.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Video<span className="text-primary">Flow</span>
            </span>
            <span className="font-mono-code text-xs text-muted-foreground ml-1">v5.0</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Recursos</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Preços</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">Login</Button>
            <Button variant="neon" size="sm">Começar Grátis</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[100px]" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-neon" />
            <span className="text-xs font-medium text-muted-foreground">Versão 5.0 — Totalmente repensado</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
            Gerencie suas edições com{" "}
            <span className="text-primary text-neon-glow">precisão total</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A plataforma SaaS definitiva para equipes de edição de vídeo. 
            Organize projetos, colabore em tempo real e entregue mais rápido.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="neon" size="lg" className="text-base px-8">
              Iniciar Projeto
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="glass" size="lg" className="text-base px-8">
              <Play className="mr-2 h-4 w-4" />
              Ver Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "10K+", label: "Editores" },
              { value: "500K+", label: "Projetos" },
              { value: "99.9%", label: "Uptime" },
              { value: "4.9★", label: "Avaliação" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4">
                <div className="text-2xl font-bold text-primary font-mono-code">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que sua equipe precisa
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ferramentas poderosas para cada etapa do seu fluxo de edição.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass glass-hover rounded-2xl p-6 transition-all duration-300 group cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:neon-glow transition-shadow">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="glass rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Pronto para transformar seu <span className="text-primary">workflow</span>?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Comece gratuitamente. Sem cartão de crédito. Cancele quando quiser.
              </p>
              <Button variant="neon" size="lg" className="text-base px-10">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded gradient-neon flex items-center justify-center">
              <Play className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">
              Video<span className="text-primary">Flow</span>
            </span>
            <span className="font-mono-code text-xs text-muted-foreground">v5.0</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 VideoFlow. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
