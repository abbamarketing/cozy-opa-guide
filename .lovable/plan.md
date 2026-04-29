## Problema

O card do tour guiado (visto em "Passo 1 de 9 — Aqui você gerencia toda a operação...") está com fundo escuro hardcoded `hsl(220, 20%, 12%)` e textos em `muted-foreground` muito apagados. Em telas claras ou no tema atual, o contraste fica ruim e o conteúdo "some".

## Causa

`src/components/shared/GuidedTour.tsx` usa cores fixas em vez de tokens do design system:

- Linha 167 — card: `bg-[hsl(220,20%,12%)]` + `border-white/10`
- Linha 173 — "seta" do card: `bg-[hsl(220,20%,12%)] border-white/10`
- Linha 192 — texto do conteúdo: `text-muted-foreground` (baixo contraste)
- Linhas 196 / 213 — contador e "Pular tour": `text-muted-foreground` / `text-muted-foreground/60`

## Mudanças

Arquivo único: `src/components/shared/GuidedTour.tsx`

1. **Card e seta** → trocar pelos tokens `bg-card text-card-foreground border border-border`. Isso adapta automaticamente a light/dark mode e usa as cores do design system.
2. **Conteúdo do passo** → `text-foreground/85` (em vez de `text-muted-foreground`) para garantir leitura confortável.
3. **Contador "Passo X de Y"** → `text-muted-foreground` mantido, mas peso `font-medium` para destacar.
4. **"Pular tour"** → `text-muted-foreground hover:text-foreground` (remover o `/60` que deixava quase invisível).
5. **Spotlight border** (linha 156) — manter `border-primary/50` (já está bom).

Resultado: o card respeita o tema da marca (mesma paleta dos outros cards do app), com leitura clara em mobile e desktop.

## Não incluído

- Não vou alterar o conteúdo dos passos do tour (`AdminTour.tsx`, `EditorTour.tsx`).
- Não vou mexer no overlay/spotlight (máscara escura por trás), só no card.