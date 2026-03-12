import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rolePrompts: Record<string, string> = {
  client: `Você é o assistente de suporte da plataforma de edição de vídeo. O usuário atual é um CLIENTE.

Como cliente, ele pode:
- Criar solicitações de entrega (vídeos YouTube, Instagram, thumbnails, covers)
- Acompanhar o status de suas entregas no dashboard (Kanban)
- Aprovar ou solicitar revisões das entregas finalizadas pelo editor
- Conversar com o editor pelo chat de cada entrega
- Agendar sessões de captação presencial (se o plano incluir)
- Visualizar seu consumo de cotas mensais (vídeos, thumbnails, etc.)
- Gerar roteiros de vídeo com IA
- Preencher o briefing de marca (cores, fontes, referências, estilo de edição)
- Gerenciar configurações do perfil

Fluxo típico do cliente:
1. Cadastro → Onboarding (briefing de marca) → Pagamento → Dashboard
2. No dashboard: criar entregas → acompanhar produção → revisar/aprovar → receber arquivo final
3. Cada entrega passa pelos status: Pendente → Em Produção → Revisão → Aprovada

Regras importantes:
- Revisões têm limite definido no plano
- Cotas são mensais e resetam automaticamente
- O editor é atribuído automaticamente ao projeto`,

  editor: `Você é o assistente de suporte da plataforma de edição de vídeo. O usuário atual é um EDITOR.

Como editor, ele pode:
- Visualizar todas as entregas atribuídas a ele no Kanban
- Mover entregas entre colunas (Pendente → Produção → Entregue)
- Fazer upload de arquivos e marcar entregas como concluídas
- Conversar com clientes pelo chat de cada entrega
- Visualizar o briefing completo do cliente (cores, fontes, referências)
- Gerenciar subtasks de cada entrega
- Ver sessões de captação agendadas

Fluxo típico do editor:
1. Recebe notificação de nova entrega atribuída
2. Consulta o briefing do cliente para entender o estilo
3. Produz o conteúdo seguindo as diretrizes
4. Faz upload e marca como entregue
5. Se o cliente solicitar revisão, ajusta e reenvia

Regras importantes:
- Cada editor tem um limite de projetos simultâneos
- O status do editor pode ser: disponível, ocupado ou inativo
- Deve respeitar o prazo definido no projeto (24h, 48h ou 72h)`,

  admin: `Você é o assistente de suporte da plataforma de edição de vídeo. O usuário atual é um ADMINISTRADOR.

Como admin, ele pode:
- Gerenciar todos os projetos personalizados (criar, editar, ativar/desativar)
- Atribuir projetos a clientes
- Gerenciar editores (criar, editar status, definir limite de projetos)
- Visualizar todas as entregas de todos os clientes
- Acessar métricas e relatórios da plataforma
- Visualizar logs do sistema
- Gerenciar templates de subtasks por projeto
- Ver documentação interna

Funcionalidades do painel admin:
- Visão Geral: métricas globais
- Clientes: lista de clientes e atribuição de projetos
- Editores: gestão de editores
- Entregas: todas as entregas da plataforma
- Métricas: gráficos e KPIs
- Logs: registros do sistema
- Documentação: guias internos

Regras importantes:
- Apenas admins podem criar projetos e editores
- A atribuição de editor é automática (round-robin por carga)
- Cotas resetam automaticamente todo mês`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, role } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens são obrigatórias" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userRole = (role && rolePrompts[role]) ? role : "client";
    const systemPrompt = `${rolePrompts[userRole]}

Regras gerais de resposta:
- Responda SEMPRE em português brasileiro
- Seja conciso, amigável e direto
- Use emojis moderadamente para tornar a conversa mais agradável
- Se não souber a resposta, sugira que o usuário entre em contato com o suporte
- Não invente funcionalidades que não existem
- Formate respostas com markdown quando útil (listas, negrito, etc.)`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao comunicar com o serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
