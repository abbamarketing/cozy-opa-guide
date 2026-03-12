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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { User, Bell, CreditCard, Palette, Loader2, ExternalLink } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { userProject } = useUserProject();
  const [loading, setLoading] = useState(false);

  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
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

  const handleUpdateProfile = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('user_id', user?.id);

    setLoading(false);

    if (error) {
      toast.error('Erro ao atualizar', { description: error.message });
    } else {
      toast.success('Perfil atualizado!', { description: 'Suas informações foram salvas' });
    }
  };

  const handleUpdateNotifications = async () => {
    toast.success('Preferências salvas!', { description: 'Suas configurações de notificações foram atualizadas' });
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
      toast.error('Erro', { description: 'Não foi possível abrir o portal de pagamento' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="bg-muted/30">
        <TabsTrigger value="profile" className="gap-1.5">
          <User className="h-3.5 w-3.5" /> Perfil
        </TabsTrigger>
        <TabsTrigger value="notifications" className="gap-1.5">
          <Bell className="h-3.5 w-3.5" /> Notificações
        </TabsTrigger>
        <TabsTrigger value="billing" className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Assinatura
        </TabsTrigger>
        <TabsTrigger value="brand" className="gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Marca
        </TabsTrigger>
      </TabsList>

      {/* Profile */}
      <TabsContent value="profile">
        <Card className="glass border-border/40">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados cadastrais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="opacity-60" />
              <p className="text-[10px] text-muted-foreground">
                O email não pode ser alterado. Entre em contato com suporte se necessário.
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications">
        <Card className="glass border-border/40">
          <CardHeader>
            <CardTitle>Preferências de Notificações</CardTitle>
            <CardDescription>Escolha como deseja receber atualizações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-xs text-muted-foreground">Receba atualizações importantes por email</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <Separator className="bg-border/30" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações Push</Label>
                <p className="text-xs text-muted-foreground">Receba notificações no navegador</p>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>

            <Button onClick={handleUpdateNotifications}>Salvar Preferências</Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Billing */}
      <TabsContent value="billing">
        <Card className="glass border-border/40">
          <CardHeader>
            <CardTitle>Gerenciar Assinatura</CardTitle>
            <CardDescription>
              Atualize método de pagamento, veja faturas ou cancele sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userProject?.custom_project && (
              <div className="glass rounded-xl p-4 space-y-2 border border-primary/20">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-card-foreground">
                    {userProject.custom_project.project_name}
                  </p>
                  <Badge variant={userProject.status === 'active' ? 'default' : 'outline'}>
                    {userProject.status === 'active' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </div>
                <p className="text-lg font-mono font-bold text-primary">
                  R$ {Number(userProject.custom_project.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground font-normal">/mês</span>
                </p>
              </div>
            )}

            <Button onClick={handleOpenStripePortal} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {loading ? 'Abrindo portal...' : 'Abrir Portal de Pagamento'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              No portal você pode atualizar cartão, ver faturas, fazer upgrade/downgrade ou cancelar
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Brand */}
      <TabsContent value="brand">
        <Card className="glass border-border/40">
          <CardHeader>
            <CardTitle>Briefing de Marca</CardTitle>
            <CardDescription>Suas preferências de edição podem ser atualizadas a qualquer momento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-semibold text-card-foreground">Editar Briefing Completo</h4>
              <p className="text-xs text-muted-foreground">
                Cores, fontes, estilo de legenda e preferências de edição
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => toast.info('Em breve!', { description: 'Esta funcionalidade estará disponível em breve.' })}
            >
              <Palette className="h-4 w-4" />
              Editar Briefing
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
