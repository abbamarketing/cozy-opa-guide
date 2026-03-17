import abbaLogo from '@/assets/abba-logo.png';
import { Link } from 'react-router-dom';

const TERMS_SECTIONS = [
  { title: '1. Aceitação dos Termos', paragraphs: ['Ao acessar e utilizar a plataforma AbbaVideo ("Plataforma"), você concorda em cumprir e estar vinculado aos seguintes termos e condições. Caso não concorde com qualquer parte destes termos, não poderá acessar o serviço.'] },
  { title: '2. Descrição do Serviço', paragraphs: ['O AbbaVideo é uma plataforma SaaS de gestão de entregas de conteúdo audiovisual que conecta criadores de conteúdo (Clientes) a editores de vídeo (Editores) por meio de um sistema de assinatura mensal. Os serviços incluídos são:'], items: ['Upload e gerenciamento de materiais brutos para edição.', 'Configuração de preferências de edição e briefing de marca.', 'Acompanhamento do status de edição em tempo real via Kanban.', 'Sistema de revisões para ajustes finais.', 'Download e aprovação do conteúdo editado finalizado.'] },
  { title: '3. Cadastro e Conta', items: ['Você deve fornecer informações verdadeiras e manter seus dados atualizados.', 'Você é responsável por manter a confidencialidade da sua senha.', 'Uma conta não pode ser compartilhada entre múltiplos usuários.'] },
  { title: '4. Contagem do Período de Serviço e Pagamento', items: ['Os planos são personalizados e definidos pelo administrador.', 'O pagamento é processado via Stripe de forma segura.', 'A assinatura é renovada automaticamente conforme a frequência contratada (mensal, trimestral ou anual).', 'As cotas de entrega são renovadas a cada período de faturamento.', 'Cotas não utilizadas não são acumuláveis para o próximo ciclo.', 'Não há extensão de prazo por inatividade após o início do período.'] },
  { title: '5. Entregas e Prazos', items: ['Todas as solicitações de edição são aceitas automaticamente ao serem enviadas.', 'Os prazos de entrega (SLA) são definidos no projeto contratado: 24h, 48h ou 72h úteis.', 'O prazo começa a contar a partir da criação da solicitação.', 'Os prazos são contados em dias úteis (segunda a sexta-feira, exceto feriados nacionais).', 'Revisões reiniciam o prazo de entrega.'] },
  { title: '6. Sistema de Revisões e Aprovação', items: ['O número de revisões é limitado conforme o plano contratado.', 'Revisões devem ser solicitadas dentro de 72 horas após a entrega.', 'Se não houver manifestação em 72 horas, o projeto será considerado aprovado automaticamente.'] },
  { title: '7. Upload e Armazenamento de Arquivos', items: ['Formatos aceitos: MP4, MOV, AVI (vídeos) e PNG, JPG, PSD (thumbnails/capas).', 'Os arquivos brutos são excluídos após a aprovação do projeto.', 'O cliente deve fazer o download do conteúdo finalizado em até 14 dias após a aprovação.'] },
  { title: '8. Propriedade Intelectual', items: ['O cliente mantém todos os direitos sobre o conteúdo original enviado.', 'O conteúdo entregue pelo editor é de propriedade do Cliente após aprovação.', 'O AbbaVideo não reivindica propriedade sobre os vídeos editados ou brutos.', 'O Cliente garante que possui os direitos sobre todo material enviado (brutos, logos, músicas).', 'O AbbaVideo não se responsabiliza por violações de direitos autorais no material fornecido pelo Cliente.'] },
  { title: '9. Privacidade e Dados Pessoais', paragraphs: ['Coletamos dados pessoais necessários para a prestação do serviço, que são protegidos conforme a Lei Geral de Proteção de Dados (LGPD). Dados não são compartilhados com terceiros, exceto quando necessário para a operação do serviço. Consulte a Política de Privacidade para detalhes completos.'] },
  { title: '10. Cancelamento e Reembolso', items: ['O Cliente pode cancelar a assinatura a qualquer momento via portal de pagamento, com efeito na próxima fatura.', 'Após o cancelamento, o acesso permanece ativo até o fim do período já pago.', 'Entregas em andamento serão concluídas normalmente.', 'Não há reembolso proporcional para períodos não utilizados.'] },
  { title: '11. Suspensão e Rescisão', paragraphs: ['O AbbaVideo reserva-se o direito de suspender ou encerrar contas em caso de:'], items: ['Inadimplência por mais de 7 dias.', 'Uso abusivo ou fora dos fins previstos.', 'Violação destes Termos.'] },
  { title: '12. Limitação de Responsabilidade', paragraphs: ['O AbbaVideo não garante disponibilidade ininterrupta da Plataforma. Não nos responsabilizamos por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso da Plataforma ou por falhas fora de nosso controle.'] },
  { title: '13. Alterações nos Termos', paragraphs: ['Reservamo-nos o direito de modificar estes Termos a qualquer momento, com comunicação prévia de 15 dias para alterações significativas via email ou notificação na Plataforma. O uso continuado após alterações constitui aceitação.'] },
  { title: '14. Foro e Lei Aplicável', paragraphs: ['Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias.'] },
  { title: '15. Contato', paragraphs: ['Para dúvidas sobre estes termos ou questões gerais, entre em contato pelo e-mail: abbaestrategias@gmail.com'] },
];

const Terms = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <img src={abbaLogo} alt="AbbaVideo" className="h-8 w-8" />
          <span className="text-lg font-bold">
            Abba<span className="text-primary">Video</span>
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

        <div className="mt-6 text-center text-xs text-muted-foreground font-mono space-x-4">
          <Link to="/privacy" className="hover:text-primary transition-colors">Política de Privacidade</Link>
          <span>·</span>
          <Link to="/auth" className="hover:text-primary transition-colors">Voltar</Link>
        </div>
      </div>
    </div>
  );
};

export default Terms;
