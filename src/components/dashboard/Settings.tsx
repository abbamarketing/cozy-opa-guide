import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserProject } from '@/hooks/useUserProject';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Bell, CreditCard, Palette, Loader2, ExternalLink } from 'lucide-react';
import BrandProfile from '@/components/dashboard/BrandProfile';

export default function Settings() {
  const { user } = useAuth();
  const { userProject } = useUserProject();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadPreferences();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setName(data.full_name || '');
    }
    setEmail(user?.email || '');
  };

  const loadPreferences = async () => {
    setPrefsLoading(true);
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (prefs) {
      setEmailNotifications((prefs as any).notify_delivery_approved);
      setPushNotifications((prefs as any).notify_delivery_revision);
      setNotifyNewMessage((prefs as any).notify_new_message);
    }
    setPrefsLoading(false);
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('user_id', user?.id);

      if (error) {
        toast.error('Erro ao atualizar', { description: error.message });
      } else {
        toast.success('Perfil atualizado');
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      toast.error('Erro ao atualizar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user!.id,
          notify_delivery_approved: emailNotifications,
          notify_delivery_revision: pushNotifications,
          notify_new_message: notifyNewMessage,
          updated_at: new Date().toISOString(),
        } as any);
      if (error) {
        toast.error('Erro ao salvar preferências.', { description: error.message });
      } else {
        toast.success('Preferências salvas com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      toast.error('Erro ao salvar preferências. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStripePortal = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error('Erro ao abrir portal de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'PERFIL', icon: User },
    { id: 'notifications', label: 'NOTIF.', icon: Bell },
    { id: 'billing', label: 'PLANO', icon: CreditCard },
    { id: 'brand', label: 'MARCA', icon: Palette },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs - horizontal scroll on mobile */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto no-scrollbar">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-mono font-medium tracking-wider whitespace-nowrap transition-colors min-h-[36px] ${
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Profile */}
      {activeSection === 'profile' && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-mono">Informações Pessoais</CardTitle>
            <CardDescription className="text-xs">Atualize seus dados cadastrais</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Nome Completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Email</Label>
              <Input value={email} disabled className="opacity-60" />
              <p className="text-[10px] text-muted-foreground font-mono">
                Email não pode ser alterado.
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full gap-2 h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      {activeSection === 'notifications' && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-mono">Notificações</CardTitle>
            <CardDescription className="text-xs">Como deseja receber atualizações</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {prefsLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between min-h-[44px]">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between min-h-[44px]">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between min-h-[44px]">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between min-h-[44px]">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-mono">Entrega aprovada</Label>
                    <p className="text-[10px] text-muted-foreground">Aviso quando uma entrega for aprovada</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <Separator className="bg-border" />

                <div className="flex items-center justify-between min-h-[44px]">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-mono">Revisão solicitada</Label>
                    <p className="text-[10px] text-muted-foreground">Aviso quando pedirem revisão</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <Separator className="bg-border" />

                <div className="flex items-center justify-between min-h-[44px]">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-mono">Nova mensagem</Label>
                    <p className="text-[10px] text-muted-foreground">Aviso de novas mensagens no chat</p>
                  </div>
                  <Switch checked={notifyNewMessage} onCheckedChange={setNotifyNewMessage} />
                </div>
              </>
            )}

            <Button onClick={handleUpdateNotifications} disabled={loading || prefsLoading} className="w-full h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Preferências
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing */}
      {activeSection === 'billing' && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-mono">Assinatura</CardTitle>
            <CardDescription className="text-xs">
              Pagamento, faturas e gerenciamento do plano
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {userProject?.custom_project && (
              <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-semibold text-foreground">
                    {userProject.custom_project.project_name}
                  </p>
                  <Badge variant={userProject.status === 'active' ? 'default' : 'outline'}>
                    {userProject.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </div>
                <p className="text-base font-mono font-bold text-primary">
                  R$ {Number(userProject.custom_project.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-[10px] text-muted-foreground font-normal">/mês</span>
                </p>
              </div>
            )}

            <Button onClick={handleOpenStripePortal} disabled={loading} className="w-full gap-2 h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {loading ? 'Abrindo portal...' : 'Portal de Pagamento'}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              Atualizar cartão, faturas, upgrade ou cancelar
            </p>
          </CardContent>
        </Card>
      )}

      {/* Brand */}
      {activeSection === 'brand' && <BrandProfile />}
    </div>
  );
}
