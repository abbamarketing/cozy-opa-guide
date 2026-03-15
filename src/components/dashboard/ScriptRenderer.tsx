import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Hash, Lightbulb, MessageSquare, Megaphone, 
  Eye, Video, Sparkles, MapPin
} from 'lucide-react';

interface ScriptRendererProps {
  content: string;
  isStreaming?: boolean;
}

function getSectionIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('título') || lower.includes('variação') || lower.includes('variações')) return <Sparkles className="h-4 w-4 text-primary" />;
  if (lower.includes('hook') || lower.includes('abertura') || lower.includes('gancho')) return <Eye className="h-4 w-4 text-chart-1" />;
  if (lower.includes('desenvolvimento') || lower.includes('roteiro') || lower.includes('corpo')) return <Video className="h-4 w-4 text-chart-2" />;
  if (lower.includes('cta') || lower.includes('chamada')) return <Megaphone className="h-4 w-4 text-chart-3" />;
  if (lower.includes('hashtag') || lower.includes('tag')) return <Hash className="h-4 w-4 text-chart-4" />;
  if (lower.includes('dica') || lower.includes('sugestão') || lower.includes('sugest')) return <Lightbulb className="h-4 w-4 text-chart-5" />;
  if (lower.includes('local') || lower.includes('cenário') || lower.includes('ambiente')) return <MapPin className="h-4 w-4 text-primary" />;
  if (lower.includes('timestamp') || lower.includes('tempo') || lower.includes('segundo') || lower.includes('minuto')) return <Clock className="h-4 w-4 text-muted-foreground" />;
  if (lower.includes('fala') || lower.includes('narração') || lower.includes('texto')) return <MessageSquare className="h-4 w-4 text-chart-2" />;
  return null;
}

export default function ScriptRenderer({ content, isStreaming }: ScriptRendererProps) {
  if (!content && !isStreaming) return null;

  return (
    <div className="script-renderer space-y-1">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border/50">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-lg font-mono font-bold text-foreground">{children}</h1>
            </div>
          ),
          h2: ({ children }) => {
            const text = String(children);
            const icon = getSectionIcon(text);
            return (
              <div className="flex items-center gap-2 mt-5 mb-2 pt-3 border-t border-border/30 first:border-t-0 first:pt-0">
                {icon && <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">{icon}</div>}
                <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wide">{children}</h2>
              </div>
            );
          },
          h3: ({ children }) => {
            const text = String(children);
            const icon = getSectionIcon(text);
            return (
              <div className="flex items-center gap-2 mt-4 mb-1.5">
                {icon && <span className="shrink-0">{icon}</span>}
                <h3 className="text-sm font-mono font-medium text-foreground">{children}</h3>
              </div>
            );
          },
          p: ({ children }) => (
            <p className="text-sm text-card-foreground leading-relaxed pl-0.5">{children}</p>
          ),
          strong: ({ children }) => {
            const text = String(children);
            // Detect timestamp patterns like [00:00] or timestamps
            if (/^\[?\d{1,2}:\d{2}/.test(text) || /^\d{1,2}s\b/.test(text)) {
              return (
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 mr-1 border-primary/30 text-primary">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />{children}
                </Badge>
              );
            }
            // Detect hook/gancho visual indicators
            if (text.toLowerCase().includes('hook') || text.toLowerCase().includes('gancho')) {
              return (
                <span className="inline-flex items-center gap-1 font-semibold text-chart-1">
                  <Eye className="h-3 w-3" />{children}
                </span>
              );
            }
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          ul: ({ children }) => (
            <ul className="space-y-1.5 pl-1 my-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 pl-1 my-2 counter-reset-item">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm text-card-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              <span className="leading-relaxed">{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 bg-primary/5 rounded-r-lg pl-3 pr-3 py-2 my-2 text-sm italic text-card-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <div className="rounded-lg bg-muted/40 border border-border/30 p-3 my-2 font-mono text-xs text-card-foreground overflow-x-auto">
                  <code>{children}</code>
                </div>
              );
            }
            return (
              <code className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          },
          hr: () => (
            <div className="my-4 flex items-center gap-2">
              <div className="flex-1 h-px bg-border/50" />
              <Sparkles className="h-3 w-3 text-muted-foreground/40" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}
