import abbaLogo from '@/assets/abba-logo.png';
import { Link } from 'react-router-dom';

const PRIVACY_SECTIONS = [
  { title: '1. Introdução', paragraphs: ['Esta Política de Privacidade descreve como o AbbaVideo ("nós", "nosso") coleta, utiliza, armazena e protege os dados pessoais dos usuários da Plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).'] },
  { title: '2. Dados Coletados', paragraphs: ['Coletamos os seguintes dados:'], items: ['Dados de cadastro: Nome completo, email, telefone, empresa.', 'Dados de marca: Nome da marca, cores, logo, estilo de conteúdo, público-alvo.', 'Dados de uso: Histórico de entregas, revisões e interações na plataforma.', 'Dados de pagamento: Processados exclusivamente pelo Stripe. Não armazenamos dados de cartão de crédito.', 'Dados técnicos: Endereço IP, navegador, sistema operacional (coletados automaticamente para segurança).'] },
  { title: '3. Finalidade do Tratamento', paragraphs: ['Utilizamos seus dados para:'], items: ['Prover e melhorar os serviços da Plataforma.', 'Processar pagamentos e gerenciar assinaturas.', 'Enviar notificações sobre entregas e atualizações.', 'Fornecer ao editor informações necessárias para produzir o conteúdo.', 'Cumprir obrigações legais e regulatórias.'] },
  { title: '4. Compartilhamento de Dados', items: ['Editores: Recebem dados de marca e briefing necessários para a produção.', 'Stripe: Processa pagamentos de forma segura e independente.', 'Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.'] },
  { title: '5. Armazenamento e Segurança', items: ['Dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.', 'Autenticação com hash seguro de senhas.', 'Políticas de segurança garantem que cada usuário só acessa seus próprios dados.', 'Backups diários automáticos.'] },
  { title: '6. Direitos do Titular', paragraphs: ['Conforme a LGPD, você tem direito a:'], items: ['Confirmar a existência de tratamento de dados.', 'Acessar seus dados pessoais.', 'Solicitar correção de dados incompletos ou desatualizados.', 'Solicitar anonimização, bloqueio ou eliminação de dados desnecessários.', 'Solicitar portabilidade dos dados.', 'Revogar consentimento a qualquer momento.'], footer: 'Para exercer seus direitos, entre em contato pelo email: abbaestrategias@gmail.com' },
  { title: '7. Retenção de Dados', items: ['Dados de conta ativa: mantidos enquanto a conta estiver ativa.', 'Após cancelamento: dados mantidos por 90 dias, depois anonimizados.', 'Dados financeiros: mantidos pelo prazo legal (5 anos).', 'Logs de sistema: mantidos por 12 meses.'] },
  { title: '8. Cookies', paragraphs: ['Utilizamos cookies essenciais para autenticação e funcionamento da Plataforma. Não utilizamos cookies de rastreamento ou marketing de terceiros.'] },
  { title: '9. Alterações nesta Política', paragraphs: ['Podemos atualizar esta Política periodicamente. Alterações significativas serão comunicadas via email ou notificação na Plataforma.'] },
  { title: '10. Contato', paragraphs: ['Para dúvidas sobre esta Política ou sobre o tratamento dos seus dados, entre em contato:'], items: ['Email: abbaestrategias@gmail.com'] },
];

const Privacy = () => {
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
            <h1 className="text-2xl font-bold font-mono mb-2">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground">Última atualização: 12 de março de 2026</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>Razão Social: AML ESTRATEGIAS DIGITAIS E COMERCIAIS LTDA</p>
              <p>CNPJ: 61.872.918/0001-15</p>
              <p>E-mail: abbaestrategias@gmail.com</p>
            </div>
          </header>

          {PRIVACY_SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h2 className="text-base font-semibold font-mono text-foreground border-b border-border/40 pb-2">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                {s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
                {s.items && (
                  <ul className="list-disc pl-6 space-y-1">
                    {s.items.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
                {s.footer && <p>{s.footer}</p>}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground font-mono space-x-4">
          <Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link>
          <span>·</span>
          <Link to="/auth" className="hover:text-primary transition-colors">Voltar</Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
