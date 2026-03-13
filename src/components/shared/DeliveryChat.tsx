import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Clock, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  delivery_id: string;
  sender_id: string;
  message: string;
  timestamp_marker: string | null;
  created_at: string;
}

interface DeliveryChatProps {
  deliveryId: string;
  showTimestampInput?: boolean;
}

// Regex to match MM:SS or H:MM:SS patterns
const TIMESTAMP_REGEX = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

/** Render message text with clickable timestamp highlights */
const renderMessageWithTimestamps = (text: string) => {
  const parts = text.split(TIMESTAMP_REGEX);
  if (parts.length === 1) return <span>{text}</span>;

  return (
    <>
      {parts.map((part, i) => {
        if (TIMESTAMP_REGEX.test(part)) {
          // Reset regex lastIndex
          TIMESTAMP_REGEX.lastIndex = 0;
          return (
            <button
              key={i}
              onClick={() => toast.info(`Ponto crítico no vídeo: ⏱ ${part}`, { duration: 3000 })}
              className="inline-flex items-center gap-0.5 px-1 py-0 rounded bg-primary/15 text-primary font-mono text-[11px] font-semibold hover:bg-primary/25 transition-colors cursor-pointer border border-primary/20"
            >
              ⏱ {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const DeliveryChat = ({ deliveryId, showTimestampInput = false }: DeliveryChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [sending, setSending] = useState(false);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_messages')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data as ChatMessage[]);
      const ids = [...new Set(data.map((m) => m.sender_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ids);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p) => {
            map[p.user_id] = p.full_name || 'Usuário';
          });
          setSenderNames(map);
        }
      }
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_messages',
          filter: `delivery_id=eq.${deliveryId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [deliveryId, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);

    const insertPayload: {
      delivery_id: string;
      sender_id: string;
      message: string;
      timestamp_marker?: string;
    } = {
      delivery_id: deliveryId,
      sender_id: user.id,
      message: newMessage.trim(),
    };
    if (showTimestampInput && timestamp.trim()) {
      insertPayload.timestamp_marker = timestamp.trim();
    }

    const { error } = await supabase
      .from('delivery_messages')
      .insert(insertPayload);

    if (!error) {
      setNewMessage('');
      setTimestamp('');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return 'Você';
    return senderNames[senderId] || 'Usuário';
  };

  const isOwnMessage = (senderId: string) => senderId === user?.id;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chat da Entrega
        </h4>
        <span className="text-[10px] text-muted-foreground">({messages.length})</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3 min-h-[120px] max-h-[240px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground/60">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwnMessage(msg.sender_id);
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${own ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback
                    className={`text-[8px] ${
                      own ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {getSenderName(msg.sender_id)[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-1.5 space-y-0.5 ${
                    own
                      ? 'bg-primary/15 text-card-foreground'
                      : 'bg-muted/40 text-card-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium">
                      {getSenderName(msg.sender_id)}
                    </span>
                    {msg.timestamp_marker && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-0 bg-primary/10 text-primary cursor-pointer"
                        onClick={() => toast.info(`Ponto crítico: ⏱ ${msg.timestamp_marker}`, { duration: 3000 })}
                      >
                        ⏱ {msg.timestamp_marker}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {renderMessageWithTimestamps(msg.message)}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 pt-2">
        {showTimestampInput && (
          <div className="w-20">
            <Input
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="0:00"
              className="h-8 text-xs text-center font-mono"
              maxLength={10}
            />
          </div>
        )}
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="h-8 text-xs flex-1"
          maxLength={2000}
          disabled={sending}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={sending || !newMessage.trim()}
          onClick={handleSend}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default DeliveryChat;
