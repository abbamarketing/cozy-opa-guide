import { Play } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg gradient-neon flex items-center justify-center">
            <Play className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            Video<span className="text-primary">Flow</span>
          </span>
        </div>
        <div className="glass rounded-2xl p-8 md:p-12 space-y-8">
          <header>
            <h1 className="text-2xl font-bold font-mono mb-2">Termos de Uso e Condições do Serviço</h1>
            <p className="text-sm text-muted-foreground">Última atualização: 12 de março de 2026</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>Razão Social: AML ESTRATEGIAS DIGITAIS E COMERCIAIS LTDA</p>
              <p>CNPJ: 61.872.918/0001-15</p>
              <p>E-mail: abbaestrategias@gmail.com</p>
            </div>
          </header>

          {TERMS_SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h2 className="text-base font-semibold font-mono text-foreground border-b border-border/40 pb-2">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                {s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
                {s.items && (
                  <ul className="list-disc pl-6 space-y-1">
                    {s.items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Terms;
