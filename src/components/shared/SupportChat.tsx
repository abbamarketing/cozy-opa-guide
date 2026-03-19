import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, AlertTriangle, ChevronLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserProject } from '@/hooks/useUserProject';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SupportChatProps {
  role?: 'client' | 'editor' | 'admin';
}

export function SupportChat({ role = 'client' }: SupportChatProps) {
  const { session } = useAuth();
  const { userProject } = useUserProject();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'report'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Oi! Sou a Olívia 👋 Como posso te ajudar hoje? Pode perguntar sobre seu plano, entregas ou qualquer funcionalidade.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          role,
        },
      });
      if (error) throw error;

      const reply =
        (typeof data === 'object' && data && 'reply' in data ? (data as { reply?: string }).reply : null) ||
        (typeof data === 'string' ? data : null) ||
        'Desculpe, não consegui processar sua mensagem.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Ops, tive um probleminha técnico. Tente novamente em instantes 🙏' }]);
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!reportTitle.trim() || !reportDesc.trim() || !session) return;
    setReportLoading(true);
    try {
      await supabase.from('support_tickets').insert({
        user_id: session.user.id,
        user_project_id: userProject?.id ?? null,
        client_type: userProject?.client_type ?? role,
        title: reportTitle.trim(),
        description: reportDesc.trim(),
        status: 'open',
      });
      setReportSent(true);
      setReportTitle('');
      setReportDesc('');
    } catch {
      // noop
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1D1D1F] shadow-lg shadow-black/30 transition-all hover:scale-105 active:scale-95 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-label="Abrir suporte"
      >
        <MessageCircle className="h-5 w-5 text-[#111]" />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0F1115] shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            {view === 'report' && (
              <button
                onClick={() => {
                  setView('chat');
                  setReportSent(false);
                }}
                className="mr-0.5 text-white/40 transition-colors hover:text-white/80"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D1D1F]/15 text-[#1D1D1F]">✦</div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{view === 'chat' ? 'Olívia' : 'Reportar erro'}</p>
              <p className="truncate text-[11px] text-white/50">
                {view === 'chat' ? 'Suporte AbbaVideo' : 'Descreva o problema encontrado'}
              </p>
            </div>

            <button onClick={() => setOpen(false)} className="text-white/40 transition-colors hover:text-white/80">
              <X className="h-4 w-4" />
            </button>
          </div>

          {view === 'chat' && (
            <>
              <div className="h-[340px] space-y-2 overflow-y-auto px-3 py-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                        m.role === 'user' ? 'bg-[#1D1D1F] text-[#111]' : 'bg-white/5 text-white/90'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/5 px-3 py-2 text-white/70">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/10 p-2.5">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[40px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#1D1D1F]/60"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D1D1F] text-[#111] transition-colors hover:brightness-95 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setView('report');
                    setReportSent(false);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 py-1.5 text-[11px] font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Reportar um erro
                </button>
              </div>
            </>
          )}

          {view === 'report' && (
            <div className="space-y-3 p-3">
              {reportSent ? (
                <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-3 text-center">
                  <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-sm text-green-300">
                    ✓
                  </div>
                  <p className="text-sm font-semibold text-green-300">Erro reportado!</p>
                  <p className="mt-1 text-xs text-white/60">Nossa equipe vai analisar em breve. Obrigado por reportar.</p>
                  <button
                    onClick={() => {
                      setView('chat');
                      setReportSent(false);
                    }}
                    className="mt-2 text-xs text-[#1D1D1F] hover:underline"
                  >
                    Voltar ao chat
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-white/60">Título do problema</label>
                    <input
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                      placeholder="Ex.: Não consigo enviar arquivo"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/60">Descrição</label>
                    <textarea
                      className="min-h-[110px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                      placeholder="Descreva o que aconteceu e como reproduzir"
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      maxLength={500}
                    />
                    <p className="text-right text-[10px] text-white/30">{reportDesc.length}/500</p>
                  </div>

                  <button
                    onClick={submitReport}
                    disabled={!reportTitle.trim() || !reportDesc.trim() || reportLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
                  >
                    {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar relatório'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
