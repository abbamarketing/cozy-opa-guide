# AbbaVideo — Design System

> Este documento é a fonte da verdade para todas as decisões de UI/UX.
> Toda alteração de componente deve seguir estas regras sem exceção.

---

## Tipografia

| Contexto | Tamanho permitido | Peso |
|----------|-------------------|------|
| Título de página (h1) | `text-xl` ou `text-2xl` | `font-bold` |
| Título de seção (h2) | `text-base` ou `text-lg` | `font-semibold` |
| Título de card | `text-sm` ou `text-base` | `font-semibold` |
| Corpo / label | `text-sm` | `font-normal` ou `font-medium` |
| Metadata / hint | `text-xs` | qualquer |
| Badge / tag | `text-xs` | `font-semibold` |

**Regra:** Nunca usar `text-lg` ou maior dentro de cards laterais, banners secundários ou componentes de status.
Textos grandes (`text-xl`+) são exclusivos de títulos de página.

---

## Espaçamento

| Contexto | Padding | Gap interno |
|----------|---------|-------------|
| Card padrão | `p-4` | `gap-2` ou `gap-3` |
| Card compacto (sidebar, banner) | `p-3` ou `px-4 py-2.5` | `gap-2` |
| Card grande (tela cheia) | `p-5` | `gap-4` |
| Seção de página | `p-6` | `gap-6` |

**Regra:** Nunca usar `p-6` ou mais dentro de cards. `p-6`+ é reservado para containers de página.

---

## Ícones

| Contexto | Tamanho |
|----------|---------|
| Dentro de badge ou label | `h-3 w-3` ou `h-3.5 w-3.5` |
| Dentro de card / botão pequeno | `h-4 w-4` |
| Navegação / botão médio | `h-4 w-4` ou `h-5 w-5` |
| Ícone de destaque (tela cheia) | `h-6 w-6` máximo |

**Regra:** Nunca usar `h-6 w-6` ou maior dentro de cards ou banners secundários.

---

## Cards e Containers

**Regras:**
- Máximo 1 nível de aninhamento de cards (card dentro de card é proibido)
- Botões de ação ficam sempre DENTRO do card ao qual pertencem — nunca flutuam fora
- Nunca usar `position: fixed` em elementos de conteúdo (apenas em overlays e modais)
- Cards laterais (sidebar) nunca ultrapassam a largura do container pai

**Estrutura padrão de card:**
```
[ícone + título]     [badge/status]    ← header: flex justify-between
[barra de progresso ou métrica]        ← conteúdo
[texto secundário / data]              ← rodapé: text-xs text-muted-foreground
```

---

## Banners e Alertas

| Tipo | Estilo |
|------|--------|
| Info / trial | `border-amber-500/25 bg-amber-500/8` — barra horizontal compacta |
| Sucesso | `border-green-500/25 bg-green-500/8` |
| Erro / crítico | `border-red-500/25 bg-red-500/8` |
| Upgrade / destaque | `border-purple-500/25 bg-purple-500/8` |

**Regras:**
- Banners são **sempre barras horizontais compactas** (`py-2.5` máximo) — nunca cards grandes
- Todo o conteúdo do banner (texto + botões) fica em uma única linha (`flex items-center justify-between`)
- Banners secundários (trial, upgrade) nunca usam `font-size` maior que `text-sm`

---

## Cores de Status

| Status | Background | Texto | Borda |
|--------|-----------|-------|-------|
| Ativo / aprovado | `bg-green-500/10` | `text-green-400` | `border-green-500/20` |
| Em produção / progresso | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/20` |
| Em revisão / pendente | `bg-amber-500/10` | `text-amber-400` | `border-amber-500/20` |
| Cancelado / erro | `bg-red-500/10` | `text-red-400` | `border-red-500/20` |
| Fila | `bg-muted` | `text-muted-foreground` | `border-border` |

**Regra:** Nunca usar cores de status sólidas como background (`bg-green-500` sem opacidade).
Sempre usar a versão com `/10` ou `/15`.

---

## Badges e Tags

```
Estrutura: rounded-full border px-2.5 py-0.5 text-xs font-semibold
```

Nunca usar `px-4` ou `py-2` em badges — são sempre pequenos e compactos.

---

## Botões

| Tipo | Uso |
|------|-----|
| Primary | Ação principal da tela — máximo 1 por contexto visível |
| Secondary / outline | Ações secundárias |
| Ghost | Links e ações terciárias |
| Destructive | Apenas para deletar/cancelar — sempre com confirmação |

**Tamanhos:**
- `size="sm"` → dentro de cards, banners, tabelas
- `size="default"` → formulários e CTAs de página
- Nunca usar `size="lg"` em componentes secundários

---

## O que NUNCA fazer

- ❌ Texto `text-lg`+ dentro de cards ou banners
- ❌ Ícones `h-6`+ dentro de cards
- ❌ Card aninhado dentro de card
- ❌ Botão flutuando fora do seu container pai
- ❌ `p-6`+ dentro de cards (reservado para páginas)
- ❌ Background de status sólido (sempre com opacidade `/10` ou `/15`)
- ❌ Banner com múltiplas linhas de texto quando cabe em uma
- ❌ Campos ou labels de features descontinuadas (Roteiros, Studio, script_credits)
