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
        <div className="glass rounded-2xl p-12">
          <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
          <p className="text-muted-foreground leading-relaxed">
            Os termos de uso do VideoFlow v5.0 serão exibidos aqui. Esta página está em construção.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
