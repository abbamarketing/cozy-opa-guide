// Referência programática dos tokens de design do AbbaVideo.
// Importe e use esses valores em componentes para manter consistência.

export const DS = {
  // Tipografia — tamanhos permitidos por contexto
  text: {
    pageTitle: 'text-xl font-bold',
    sectionTitle: 'text-base font-semibold',
    cardTitle: 'text-sm font-semibold',
    body: 'text-sm',
    meta: 'text-xs text-muted-foreground',
    badge: 'text-xs font-semibold',
  },

  // Espaçamento de cards
  card: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  },

  // Tamanhos de ícone
  icon: {
    badge: 'h-3 w-3',
    card: 'h-4 w-4',
    nav: 'h-5 w-5',
  },

  // Status — cores por estado
  status: {
    active:     { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20'  },
    progress:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
    pending:    { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20'  },
    cancelled:  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20'    },
    queue:      { bg: 'bg-muted',         text: 'text-muted-foreground', border: 'border-border'  },
  },

  // Banners — sempre compactos
  banner: {
    info:     'border-amber-500/25 bg-amber-500/8',
    success:  'border-green-500/25 bg-green-500/8',
    error:    'border-red-500/25 bg-red-500/8',
    upgrade:  'border-purple-500/25 bg-purple-500/8',
  },

  // Estrutura padrão de badge
  badge: 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
} as const;
