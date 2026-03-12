import { useState } from 'react';
import { BookOpen, Monitor, Film, Users, FileText, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const DOC_TABS = [
  { id: 'admin', label: 'Manual do Admin', icon: Monitor },
  { id: 'editor', label: 'Manual do Editor', icon: Film },
  { id: 'client', label: 'Manual do Cliente', icon: Users },
  { id: 'terms', label: 'Termos de Uso', icon: FileText },
  { id: 'privacy', label: 'Política de Privacidade', icon: Shield },
];

/* ─────── Conteúdos ─────── */

const AdminManual = () => (
  <article className="prose-doc space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-foreground">Manual do Administrador</h1>
      <p className="text-muted-foreground">Guia completo para gerenciar o AbbaVideo.</p>
    </header>

    <Section title="1. Visão Geral">
      <p>O painel administrativo permite gerenciar clientes, editores, projetos, entregas e métricas do AbbaVideo. Acesse em <code>/admin</code> com uma conta que possua a role <strong>admin</strong>.</p>
    </Section>

    <Section title="2. Gestão de Projetos">
      <p>Na aba <strong>Projetos</strong>, você pode:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Criar projeto:</strong> Defina nome, quantidade de vídeos YouTube/Instagram, thumbnails, capas, valor mensal, SLA (24h/48h/72h), limite de revisões e frequência de pagamento.</li>
        <li><strong>Editar projeto:</strong> Altere qualquer campo de um projeto existente.</li>
        <li><strong>Duplicar projeto:</strong> Crie uma cópia com "(Cópia)" no nome para reutilizar configurações.</li>
        <li><strong>Ativar/Desativar:</strong> Projetos inativos não podem ser atribuídos a novos clientes.</li>
      </ul>
    </Section>

    <Section title="3. Gestão de Clientes">
      <p>Na aba <strong>Clientes</strong> você encontra:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Atribuição de projeto:</strong> Vincule um projeto personalizado a um cliente. Isso cria um registro em <em>user_projects</em> com status "Pendente Pagamento".</li>
        <li><strong>Suspender/Reativar:</strong> Suspenda clientes inadimplentes (com modal de confirmação). Reative quando o pagamento for regularizado.</li>
        <li><strong>Filtros:</strong> Busque por nome, email ou status do projeto.</li>
      </ul>
    </Section>

    <Section title="4. Gestão de Editores">
      <p>Na aba <strong>Editores</strong>:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Adicionar editor:</strong> Crie uma conta com email e senha. O sistema automaticamente configura a role "editor" e o registro na tabela de editores.</li>
        <li><strong>Status:</strong> Disponível, Ocupado ou Inativo. Editores inativos não recebem novas atribuições automáticas.</li>
        <li><strong>Carga de trabalho:</strong> O sistema atribui automaticamente entregas ao editor com menor carga (trigger <code>auto_assign_editor</code>).</li>
      </ul>
    </Section>

    <Section title="5. Gestão de Entregas">
      <p>Na aba <strong>Entregas</strong> você visualiza todas as entregas com filtros por status, tipo e cliente. Pode:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Reatribuir editor em qualquer entrega.</li>
        <li>Acompanhar prazos e revisões.</li>
        <li>Ver histórico completo de cada entrega.</li>
      </ul>
    </Section>

    <Section title="6. Métricas">
      <p>A aba <strong>Métricas</strong> exibe:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>MRR (Receita Recorrente Mensal):</strong> Gráfico de tendência.</li>
        <li><strong>Distribuição de entregas:</strong> Por tipo (YouTube, Instagram, Thumbnail, Capa).</li>
        <li><strong>KPIs de satisfação:</strong> Baseados na taxa de revisões por entrega.</li>
        <li><strong>Crescimento de assinaturas:</strong> Novos clientes por mês.</li>
      </ul>
    </Section>

    <Section title="7. Logs do Sistema">
      <p>A aba <strong>Logs</strong> registra todas as ações do sistema. Filtre por nível (info, warn, error) e busque por mensagem ou contexto.</p>
    </Section>

    <Section title="8. Triggers Automáticos">
      <p>O sistema possui triggers que automatizam operações críticas:</p>
      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
        <thead className="bg-muted/50">
          <tr><th className="p-2 text-left">Trigger</th><th className="p-2 text-left">Função</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr><td className="p-2 font-mono text-xs">auto_assign_editor</td><td className="p-2">Atribui editor com menor carga ao criar entrega</td></tr>
          <tr><td className="p-2 font-mono text-xs">reserve_quota_trigger</td><td className="p-2">Reserva cota ao criar entrega</td></tr>
          <tr><td className="p-2 font-mono text-xs">approve_quota_trigger</td><td className="p-2">Move cota de "reservada" para "aprovada"</td></tr>
          <tr><td className="p-2 font-mono text-xs">notify_*</td><td className="p-2">Cria notificações automáticas</td></tr>
          <tr><td className="p-2 font-mono text-xs">handle_new_user</td><td className="p-2">Cria perfil e role ao registrar usuário</td></tr>
        </tbody>
      </table>
    </Section>
  </article>
);

const EditorManual = () => (
  <article className="prose-doc space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-foreground">Manual do Editor</h1>
      <p className="text-muted-foreground">Guia para editores de vídeo do AbbaVideo.</p>
    </header>

    <Section title="1. Acesso">
      <p>Faça login em <code>/auth</code> com as credenciais fornecidas pelo administrador. Você será redirecionado automaticamente para <code>/editor</code>.</p>
    </Section>

    <Section title="2. Painel do Editor">
      <p>Seu painel exibe um <strong>Kanban</strong> com as entregas atribuídas a você, organizadas por status:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>A Fazer:</strong> Entregas novas aguardando início.</li>
        <li><strong>Em Produção:</strong> Entregas em andamento.</li>
        <li><strong>Entregue:</strong> Entregas concluídas aguardando revisão do cliente.</li>
        <li><strong>Revisão:</strong> Cliente solicitou ajustes.</li>
        <li><strong>Aprovado:</strong> Entrega finalizada.</li>
      </ul>
    </Section>

    <Section title="3. Fluxo de Trabalho">
      <ol className="list-decimal pl-6 space-y-2">
        <li><strong>Receber entrega:</strong> Clique no card para ver o briefing completo, incluindo dados da marca do cliente (cores, logo, estilo).</li>
        <li><strong>Iniciar produção:</strong> Mova o card para "Em Produção" para sinalizar que está trabalhando.</li>
        <li><strong>Entregar:</strong> Faça upload do arquivo ou cole o link do Drive. Clique em "Marcar como Entregue".</li>
        <li><strong>Revisão:</strong> Se o cliente solicitar revisão, você verá as notas e o marcador de timestamp. Faça os ajustes e reentregue.</li>
      </ol>
    </Section>

    <Section title="4. Upload de Arquivos">
      <p>Formatos aceitos: MP4, MOV, AVI (vídeos) e PNG, JPG, PSD (thumbnails/capas). Tamanho máximo: 500 MB. Alternativamente, cole um link do Google Drive.</p>
    </Section>

    <Section title="5. Prazos (SLA)">
      <p>Cada entrega possui um prazo definido pelo projeto do cliente:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>24h:</strong> Urgente – priorize esta entrega.</li>
        <li><strong>48h:</strong> Normal – prazo padrão.</li>
        <li><strong>72h:</strong> Estendido – mais tempo para produções complexas.</li>
      </ul>
      <p>O indicador no card mostra: 🟢 dentro do prazo, 🟡 próximo do prazo, 🔴 atrasado.</p>
    </Section>

    <Section title="6. Notificações">
      <p>Você receberá notificações automáticas quando:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Uma nova entrega for atribuída a você.</li>
        <li>O cliente solicitar uma revisão.</li>
        <li>O cliente aprovar a entrega.</li>
      </ul>
    </Section>
  </article>
);

const ClientManual = () => (
  <article className="prose-doc space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-foreground">Manual do Cliente</h1>
      <p className="text-muted-foreground">Guia completo para usar o AbbaVideo como cliente.</p>
    </header>

    <Section title="1. Cadastro e Primeiro Acesso">
      <ol className="list-decimal pl-6 space-y-2">
        <li>Acesse <code>/auth</code> e crie sua conta com email e senha.</li>
        <li>Aguarde o administrador vincular um projeto à sua conta.</li>
        <li>Quando vinculado, você será direcionado ao <strong>Onboarding</strong>.</li>
      </ol>
    </Section>

    <Section title="2. Onboarding">
      <p>O processo de onboarding tem 2 etapas:</p>
      <ol className="list-decimal pl-6 space-y-2">
        <li><strong>Briefing da Marca:</strong> Informe nome, cores, logo, público-alvo e estilo de conteúdo. Essas informações serão usadas pelo editor em todas as suas entregas.</li>
        <li><strong>Pagamento:</strong> Revise o resumo do projeto e realize o pagamento via Stripe.</li>
      </ol>
    </Section>

    <Section title="3. Dashboard">
      <p>Após o pagamento, seu dashboard inclui:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Card de Quotas:</strong> Mostra quantas entregas você tem disponíveis no mês para cada tipo (YouTube, Instagram, Thumbnails, Capas).</li>
        <li><strong>Kanban:</strong> Visualize todas as suas entregas por status.</li>
        <li><strong>Calendário:</strong> Veja os prazos das entregas no calendário mensal.</li>
        <li><strong>Roteiros:</strong> Gere ideias de roteiro com IA.</li>
        <li><strong>Configurações:</strong> Edite perfil, notificações e gerencie assinatura.</li>
      </ul>
    </Section>

    <Section title="4. Criar Solicitação">
      <ol className="list-decimal pl-6 space-y-2">
        <li>Clique em <strong>"Nova Solicitação"</strong>.</li>
        <li>Selecione o tipo (Vídeo YouTube, Vídeo Instagram, Thumbnail ou Capa).</li>
        <li>Preencha título (min 5 caracteres) e briefing detalhado (min 20 caracteres).</li>
        <li>Opcionalmente: adicione roteiro e link do material bruto (Google Drive).</li>
        <li>Escolha o prazo: Normal (grátis) ou Urgente (+R$50, 24h).</li>
        <li>Clique em "Criar Solicitação".</li>
      </ol>
      <p>A cota do tipo selecionado será automaticamente reservada.</p>
    </Section>

    <Section title="5. Revisão e Aprovação">
      <p>Quando o editor entregar, a solicitação aparece na coluna <strong>"REVISAR"</strong>:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Aprovar:</strong> Clique em "Aprovar Entrega". A cota passa de "reservada" para "aprovada".</li>
        <li><strong>Solicitar Revisão:</strong> Descreva o que precisa ser ajustado e, opcionalmente, indique o timestamp. Cada projeto tem um limite de revisões.</li>
      </ul>
    </Section>

    <Section title="6. Notificações">
      <p>O sino no canto superior mostra notificações em tempo real:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Projeto atribuído à sua conta.</li>
        <li>Entrega concluída pelo editor.</li>
        <li>Atualizações de status.</li>
      </ul>
    </Section>

    <Section title="7. Configurações">
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Perfil:</strong> Edite nome, empresa e telefone.</li>
        <li><strong>Assinatura:</strong> Veja detalhes do projeto e acesse o portal de pagamento Stripe.</li>
        <li><strong>Marca:</strong> Atualize cores, logo e preferências de edição.</li>
      </ul>
    </Section>
  </article>
);

const TermsOfUse = () => (
  <article className="prose-doc space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-foreground">Termos de Uso e Condições do Serviço</h1>
      <p className="text-muted-foreground">Última atualização: 12 de março de 2026</p>
      <div className="text-sm text-muted-foreground mt-2 space-y-1">
        <p>Razão Social: AML ESTRATEGIAS DIGITAIS E COMERCIAIS LTDA</p>
        <p>CNPJ: 61.872.918/0001-15</p>
        <p>E-mail: abbaestrategias@gmail.com</p>
      </div>
    </header>

    <Section title="1. Aceitação dos Termos">
      <p>Ao acessar e utilizar a plataforma AbbaVideo ("Plataforma"), você concorda em cumprir e estar vinculado aos seguintes termos e condições. Caso não concorde com qualquer parte destes termos, não poderá acessar o serviço.</p>
    </Section>

    <Section title="2. Descrição do Serviço">
      <p>O AbbaVideo é uma plataforma SaaS de gestão de entregas de conteúdo audiovisual que conecta criadores de conteúdo (Clientes) a editores de vídeo (Editores) por meio de um sistema de assinatura mensal. Os serviços incluídos são:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Upload e gerenciamento de materiais brutos para edição.</li>
        <li>Configuração de preferências de edição e briefing de marca.</li>
        <li>Acompanhamento do status de edição em tempo real via Kanban.</li>
        <li>Sistema de revisões para ajustes finais.</li>
        <li>Download e aprovação do conteúdo editado finalizado.</li>
      </ul>
    </Section>

    <Section title="3. Cadastro e Conta">
      <ul className="list-disc pl-6 space-y-1">
        <li>Você deve fornecer informações verdadeiras e manter seus dados atualizados.</li>
        <li>Você é responsável por manter a confidencialidade da sua senha.</li>
        <li>Uma conta não pode ser compartilhada entre múltiplos usuários.</li>
      </ul>
    </Section>

    <Section title="4. Contagem do Período de Serviço e Pagamento">
      <ul className="list-disc pl-6 space-y-1">
        <li>Os planos são personalizados e definidos pelo administrador.</li>
        <li>O pagamento é processado via Stripe de forma segura.</li>
        <li>A assinatura é renovada automaticamente conforme a frequência contratada (mensal, trimestral ou anual).</li>
        <li>As cotas de entrega são renovadas a cada período de faturamento.</li>
        <li>Cotas não utilizadas não são acumuláveis para o próximo ciclo.</li>
        <li>Não há extensão de prazo por inatividade após o início do período.</li>
      </ul>
    </Section>

    <Section title="5. Entregas e Prazos">
      <ul className="list-disc pl-6 space-y-1">
        <li>Todas as solicitações de edição são aceitas automaticamente ao serem enviadas.</li>
        <li>Os prazos de entrega (SLA) são definidos no projeto contratado: 24h, 48h ou 72h úteis.</li>
        <li>O prazo começa a contar a partir da criação da solicitação.</li>
        <li>Os prazos são contados em dias úteis (segunda a sexta-feira, exceto feriados nacionais).</li>
        <li>Revisões reiniciam o prazo de entrega.</li>
      </ul>
    </Section>

    <Section title="6. Sistema de Revisões e Aprovação">
      <ul className="list-disc pl-6 space-y-1">
        <li>O número de revisões é limitado conforme o plano contratado.</li>
        <li>Revisões devem ser solicitadas dentro de 72 horas após a entrega.</li>
        <li>Se não houver manifestação em 72 horas, o projeto será considerado aprovado automaticamente.</li>
      </ul>
    </Section>

    <Section title="7. Upload e Armazenamento de Arquivos">
      <ul className="list-disc pl-6 space-y-1">
        <li>Formatos aceitos: MP4, MOV, AVI (vídeos) e PNG, JPG, PSD (thumbnails/capas).</li>
        <li>Os arquivos brutos são excluídos após a aprovação do projeto.</li>
        <li>O cliente deve fazer o download do conteúdo finalizado em até 14 dias após a aprovação.</li>
      </ul>
    </Section>

    <Section title="8. Propriedade Intelectual">
      <ul className="list-disc pl-6 space-y-1">
        <li>O cliente mantém todos os direitos sobre o conteúdo original enviado.</li>
        <li>O conteúdo entregue pelo editor é de propriedade do Cliente após aprovação.</li>
        <li>O VideoFlow não reivindica propriedade sobre os vídeos editados ou brutos.</li>
        <li>O Cliente garante que possui os direitos sobre todo material enviado (brutos, logos, músicas).</li>
        <li>O VideoFlow não se responsabiliza por violações de direitos autorais no material fornecido pelo Cliente.</li>
      </ul>
    </Section>

    <Section title="9. Privacidade e Dados Pessoais">
      <p>Coletamos dados pessoais necessários para a prestação do serviço, que são protegidos conforme a Lei Geral de Proteção de Dados (LGPD). Dados não são compartilhados com terceiros, exceto quando necessário para a operação do serviço. Consulte a Política de Privacidade para detalhes completos.</p>
    </Section>

    <Section title="10. Cancelamento e Reembolso">
      <ul className="list-disc pl-6 space-y-1">
        <li>O Cliente pode cancelar a assinatura a qualquer momento via portal de pagamento, com efeito na próxima fatura.</li>
        <li>Após o cancelamento, o acesso permanece ativo até o fim do período já pago.</li>
        <li>Entregas em andamento serão concluídas normalmente.</li>
        <li>Não há reembolso proporcional para períodos não utilizados.</li>
      </ul>
    </Section>

    <Section title="11. Suspensão e Rescisão">
      <p>O VideoFlow reserva-se o direito de suspender ou encerrar contas em caso de:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Inadimplência por mais de 7 dias.</li>
        <li>Uso abusivo ou fora dos fins previstos.</li>
        <li>Violação destes Termos.</li>
      </ul>
    </Section>

    <Section title="12. Limitação de Responsabilidade">
      <p>O VideoFlow não garante disponibilidade ininterrupta da Plataforma. Não nos responsabilizamos por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso da Plataforma ou por falhas fora de nosso controle.</p>
    </Section>

    <Section title="13. Alterações nos Termos">
      <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento, com comunicação prévia de 15 dias para alterações significativas via email ou notificação na Plataforma. O uso continuado após alterações constitui aceitação.</p>
    </Section>

    <Section title="14. Foro e Lei Aplicável">
      <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias.</p>
    </Section>

    <Section title="15. Contato">
      <p>Para dúvidas sobre estes termos ou questões gerais, entre em contato pelo e-mail: <strong>abbaestrategias@gmail.com</strong></p>
    </Section>
  </article>
);

const PrivacyPolicy = () => (
  <article className="prose-doc space-y-8">
    <header>
      <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
      <p className="text-muted-foreground">Última atualização: 12 de março de 2026</p>
    </header>

    <Section title="1. Introdução">
      <p>Esta Política de Privacidade descreve como o VideoFlow ("nós", "nosso") coleta, utiliza, armazena e protege os dados pessoais dos usuários da Plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
    </Section>

    <Section title="2. Dados Coletados">
      <p>Coletamos os seguintes dados:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Dados de cadastro:</strong> Nome completo, email, telefone, empresa.</li>
        <li><strong>Dados de marca:</strong> Nome da marca, cores, logo, estilo de conteúdo, público-alvo.</li>
        <li><strong>Dados de uso:</strong> Histórico de entregas, revisões e interações na plataforma.</li>
        <li><strong>Dados de pagamento:</strong> Processados exclusivamente pelo Stripe. Não armazenamos dados de cartão de crédito.</li>
        <li><strong>Dados técnicos:</strong> Endereço IP, navegador, sistema operacional (coletados automaticamente para segurança).</li>
      </ul>
    </Section>

    <Section title="3. Finalidade do Tratamento">
      <p>Utilizamos seus dados para:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Prover e melhorar os serviços da Plataforma.</li>
        <li>Processar pagamentos e gerenciar assinaturas.</li>
        <li>Enviar notificações sobre entregas e atualizações.</li>
        <li>Fornecer ao editor informações necessárias para produzir o conteúdo.</li>
        <li>Cumprir obrigações legais e regulatórias.</li>
      </ul>
    </Section>

    <Section title="4. Compartilhamento de Dados">
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Editores:</strong> Recebem dados de marca e briefing necessários para a produção.</li>
        <li><strong>Stripe:</strong> Processa pagamentos de forma segura e independente.</li>
        <li><strong>Supabase:</strong> Infraestrutura de banco de dados e autenticação.</li>
        <li>Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.</li>
      </ul>
    </Section>

    <Section title="5. Armazenamento e Segurança">
      <ul className="list-disc pl-6 space-y-1">
        <li>Dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.</li>
        <li>Autenticação com hash seguro de senhas (bcrypt).</li>
        <li>Políticas de Row Level Security (RLS) garantem que cada usuário só acessa seus próprios dados.</li>
        <li>Backups diários automáticos.</li>
      </ul>
    </Section>

    <Section title="6. Direitos do Titular">
      <p>Conforme a LGPD, você tem direito a:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Confirmar a existência de tratamento de dados.</li>
        <li>Acessar seus dados pessoais.</li>
        <li>Solicitar correção de dados incompletos ou desatualizados.</li>
        <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários.</li>
        <li>Solicitar portabilidade dos dados.</li>
        <li>Revogar consentimento a qualquer momento.</li>
      </ul>
      <p>Para exercer seus direitos, entre em contato pelo email: <strong>privacidade@videoflow.com.br</strong></p>
    </Section>

    <Section title="7. Retenção de Dados">
      <ul className="list-disc pl-6 space-y-1">
        <li>Dados de conta ativa: mantidos enquanto a conta estiver ativa.</li>
        <li>Após cancelamento: dados mantidos por 90 dias, depois anonimizados.</li>
        <li>Dados financeiros: mantidos pelo prazo legal (5 anos).</li>
        <li>Logs de sistema: mantidos por 12 meses.</li>
      </ul>
    </Section>

    <Section title="8. Cookies">
      <p>Utilizamos cookies essenciais para autenticação e funcionamento da Plataforma. Não utilizamos cookies de rastreamento ou marketing de terceiros.</p>
    </Section>

    <Section title="9. Alterações nesta Política">
      <p>Podemos atualizar esta Política periodicamente. Alterações significativas serão comunicadas via email ou notificação na Plataforma.</p>
    </Section>

    <Section title="10. Contato">
      <p>Para dúvidas sobre esta Política ou sobre o tratamento dos seus dados, entre em contato:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Email:</strong> privacidade@videoflow.com.br</li>
        <li><strong>Encarregado (DPO):</strong> dpo@videoflow.com.br</li>
      </ul>
    </Section>
  </article>
);

/* ─────── Helpers ─────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground border-b border-border/40 pb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

/* ─────── Main Component ─────── */

const AdminDocs = () => {
  const [activeDoc, setActiveDoc] = useState('admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      {/* Sidebar */}
      <nav className="glass rounded-xl p-3 space-y-1 h-fit md:sticky md:top-20">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Documentação</span>
        </div>
        {DOC_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveDoc(tab.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              activeDoc === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <ScrollArea className="glass rounded-xl p-8 max-h-[80vh]">
        {activeDoc === 'admin' && <AdminManual />}
        {activeDoc === 'editor' && <EditorManual />}
        {activeDoc === 'client' && <ClientManual />}
        {activeDoc === 'terms' && <TermsOfUse />}
        {activeDoc === 'privacy' && <PrivacyPolicy />}
      </ScrollArea>
    </div>
  );
};

export default AdminDocs;
