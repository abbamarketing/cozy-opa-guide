import { Play } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const Editor = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">
              Video<span className="text-primary">Flow</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
        <div className="glass rounded-2xl p-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Editor</h1>
          <p className="text-muted-foreground">Painel do editor — em construção.</p>
        </div>
      </div>
    </div>
  );
};

export default Editor;
