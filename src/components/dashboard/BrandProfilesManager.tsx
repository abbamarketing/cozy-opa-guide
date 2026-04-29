import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Star, Trash2, Loader2, Building2, ArrowLeft } from 'lucide-react';
import BrandProfile from './BrandProfile';

interface BrandRow {
  id: string;
  brand_name: string;
  display_label: string | null;
  is_primary: boolean;
  logo_url: string | null;
  created_at: string;
}

export default function BrandProfilesManager() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined);
  // undefined = list view; null = creating new; string = editing
  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('onboarding_briefings')
      .select('id, brand_name, display_label, is_primary, logo_url, created_at')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    setBrands((data ?? []) as BrandRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSetPrimary = async (id: string) => {
    if (!user) return;
    setSettingPrimary(id);
    // Unset all, then set the chosen one (partial unique index allows this in two steps via update)
    await supabase
      .from('onboarding_briefings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new column not in generated types yet
      .update({ is_primary: false } as any)
      .eq('user_id', user.id);
    const { error } = await supabase
      .from('onboarding_briefings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new column not in generated types yet
      .update({ is_primary: true } as any)
      .eq('id', id);
    setSettingPrimary(null);
    if (error) {
      toast.error('Erro ao definir marca principal');
    } else {
      toast.success('Marca principal atualizada');
      fetchBrands();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_primary && brands.length > 1) {
      toast.error('Defina outra marca como principal antes de excluir esta');
      setDeleteTarget(null);
      return;
    }
    const { error } = await supabase
      .from('onboarding_briefings')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error('Erro ao excluir marca');
    } else {
      toast.success('Marca excluída');
      fetchBrands();
    }
  };

  // Edit mode
  if (selectedId !== undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedId(undefined); fetchBrands(); }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para minhas marcas
          </Button>
        </div>
        <BrandProfile
          briefingId={selectedId}
          onSaved={() => {
            // After first save of a new brand, switch to edit mode of the same id
            fetchBrands();
          }}
        />
      </div>
    );
  }

  // List mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Minhas Marcas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastre múltiplas marcas e selecione qual usar em cada entrega
          </p>
        </div>
        <Button
          onClick={() => setSelectedId(null)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova marca
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : brands.length === 0 ? (
        <Card className="glass border-border/40 p-12 flex flex-col items-center justify-center gap-3">
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada</p>
          <Button onClick={() => setSelectedId(null)} variant="outline" className="gap-2 mt-2">
            <Plus className="h-3.5 w-3.5" />
            Cadastrar primeira marca
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card
              key={b.id}
              className="glass border-border/40 p-4 cursor-pointer hover:border-primary/40 transition-colors group"
              onClick={() => setSelectedId(b.id)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 shrink-0 bg-secondary flex items-center justify-center overflow-hidden">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {b.display_label || b.brand_name || 'Sem nome'}
                  </p>
                  {b.display_label && b.brand_name && b.display_label !== b.brand_name && (
                    <p className="text-xs text-muted-foreground truncate">{b.brand_name}</p>
                  )}
                  {b.is_primary && (
                    <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0 gap-1">
                      <Star className="h-2.5 w-2.5" />
                      Principal
                    </Badge>
                  )}
                </div>
              </div>
              <div
                className="flex items-center justify-end gap-1 pt-2 border-t border-border/30"
                onClick={(e) => e.stopPropagation()}
              >
                {!b.is_primary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleSetPrimary(b.id)}
                    disabled={settingPrimary === b.id}
                  >
                    {settingPrimary === b.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Star className="h-3 w-3" />
                    }
                    Tornar principal
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(b)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir marca</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong className="text-foreground">
                {deleteTarget?.display_label || deleteTarget?.brand_name}
              </strong>?
              As entregas vinculadas a esta marca não serão excluídas, mas perderão a associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
