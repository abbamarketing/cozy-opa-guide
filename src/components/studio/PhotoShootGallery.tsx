import { usePhotoShootGallery, PhotoShoot } from '@/hooks/usePhotoShootGallery';
import { Button } from '@/components/ui/button';
import { Download, Loader2, RefreshCw, Building2, Lightbulb, BarChart3, Armchair, Sunset, Camera, Image, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SCENARIO_ICONS: Record<string, LucideIcon> = {
  executive_office: Building2,
  startup_workspace: Lightbulb,
  boardroom: BarChart3,
  consulting_office: Armchair,
  outdoor_business: Sunset,
  studio: Camera,
  clinic: Building2,
  office: Building2,
  outdoor: Sunset,
};

function ExpiryBadge({ hoursRemaining }: { hoursRemaining: number }) {
  const color = hoursRemaining < 24
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : hoursRemaining < 72
    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    : 'bg-primary/10 text-primary border-primary/20';

  const label = hoursRemaining < 24
    ? `Expira em ${hoursRemaining}h`
    : hoursRemaining < 48
    ? 'Expira amanhã'
    : `${Math.floor(hoursRemaining / 24)} dias restantes`;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${color}`}>
      {label}
    </span>
  );
}

function ShootCard({ shoot }: { shoot: PhotoShoot }) {
  const createdDate = new Date(shoot.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const handleDownloadAll = async () => {
    for (const url of shoot.photo_urls) {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ensaio-${shoot.scenario}-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {(() => { const Icon = SCENARIO_ICONS[shoot.scenario] ?? Image; return <Icon className="h-6 w-6 text-muted-foreground" />; })()}
          <div>
            <p className="text-sm font-mono font-semibold text-foreground">{shoot.scenario_label}</p>
            <p className="text-[10px] text-muted-foreground">
              {createdDate} · {shoot.quantity} foto{shoot.quantity > 1 ? 's' : ''} · {shoot.credits_used} crédito{shoot.credits_used > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ExpiryBadge hoursRemaining={shoot.hours_remaining} />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-1">
        {shoot.photo_urls.map((url, i) => (
          <div key={i} className="relative group aspect-[3/4] overflow-hidden rounded-lg">
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a
                href={url}
                download={`ensaio-${shoot.scenario}-${i + 1}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors"
              >
                <Download className="h-3 w-3" /> Baixar
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: download all */}
      {shoot.photo_urls.length > 1 && (
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs" onClick={handleDownloadAll}>
            <Download className="h-3 w-3" /> Baixar todas as {shoot.photo_urls.length} fotos
          </Button>
        </div>
      )}
    </div>
  );
}

export const PhotoShootGallery = () => {
  const { shoots, isLoading, error, refetch } = usePhotoShootGallery();

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm font-mono">Carregando ensaios...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
        <RefreshCw className="h-3 w-3" /> Tentar novamente
      </Button>
    </div>
  );

  if (shoots.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Camera className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-mono font-semibold text-foreground">Nenhum ensaio ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Suas fotos geradas aparecerão aqui por 7 dias.</p>
      </div>
    </div>
  );

  const totalPhotos = shoots.reduce((acc, s) => acc + s.photo_urls.length, 0);
  const expiringToday = shoots.filter(s => s.hours_remaining < 24).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono font-semibold text-foreground">
            {shoots.length} ensaio{shoots.length > 1 ? 's' : ''}
          </p>
          <p className="text-[10px] text-muted-foreground">{totalPhotos} fotos disponíveis</p>
        </div>
        {expiringToday > 0 && (
          <span className="text-[10px] text-destructive font-mono flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {expiringToday} ensaio{expiringToday > 1 ? 's' : ''} expira{expiringToday > 1 ? 'm' : ''} hoje
          </span>
        )}
      </div>

      {/* Shoot cards */}
      <div className="space-y-4">
        {shoots.map(shoot => (
          <ShootCard key={shoot.id} shoot={shoot} />
        ))}
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        Fotos ficam disponíveis por 7 dias após a geração · Baixe para salvar permanentemente
      </p>
    </div>
  );
};
