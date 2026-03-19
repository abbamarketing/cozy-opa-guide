import { supabase } from '@/integrations/supabase/client';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

const LOG_BATCH_SIZE = 10;
const FLUSH_INTERVAL = 3000;
const logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const redactSensitive = (data: Record<string, unknown>): Record<string, unknown> => {
  const redacted = { ...data };
  if (typeof redacted.email === 'string') {
    const [local, domain] = redacted.email.split('@');
    redacted.email = `${local.slice(0, 2)}***@${domain}`;
  }
  if (typeof redacted.user_id === 'string') {
    redacted.user_id = `${redacted.user_id.slice(0, 8)}...`;
  }
  return redacted;
};

async function flushLogs() {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0, LOG_BATCH_SIZE);
  const { data: { user } } = await supabase.auth.getUser();

  const rows = batch.map((entry) => ({
    level: entry.level,
    message: entry.message,
    context: entry.context ? redactSensitive(entry.context) : {},
    source: entry.source || 'app',
    user_id: user?.id || null,
  }));

  // system_logs é uma tabela de sistema não incluída nos tipos gerados do Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('system_logs').insert(rows);
  if (error) {
    console.error('[Logger] Failed to flush logs:', error.message);
  }

  if (logBuffer.length > 0) {
    scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushLogs();
  }, FLUSH_INTERVAL);
}

function addLog(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length >= LOG_BATCH_SIZE) {
    void flushLogs();
  } else {
    scheduleFlush();
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>, source?: string) =>
    addLog({ level: 'info', message, context, source }),

  warn: (message: string, context?: Record<string, unknown>, source?: string) =>
    addLog({ level: 'warn', message, context, source }),

  error: (message: string, context?: Record<string, unknown>, source?: string) =>
    addLog({ level: 'error', message, context, source }),

  debug: (message: string, context?: Record<string, unknown>, source?: string) =>
    addLog({ level: 'debug', message, context, source }),

  flush: flushLogs,
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) void flushLogs();
  });
}
