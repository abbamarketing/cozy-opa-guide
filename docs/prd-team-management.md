# PRD — Gestão de Equipe e Permissões

**Data:** 2026-03-20
**Status:** Proposta
**Autor:** Claude + Lucas

---

## Problema

Atualmente o sistema tem 4 roles fixas (god, admin, editor, client) sem granularidade. O fundador precisa:

1. Dar acesso ao admin pra funcionários sem que apareçam como "funcionários" pro cliente
2. Configurar exatamente o que cada pessoa pode ver e fazer
3. Ter diferentes níveis de acesso ao admin (ex: financeiro só vê comissões/métricas)
4. Permitir que alguém acesse o dashboard de cliente sem ter projeto próprio (ex: gerente de contas)

---

## Solução

### Nova tab "Equipe" no Admin

Visível apenas para `god`. Permite gerenciar todos os membros da equipe interna.

### Modelo de dados

**Tabela: `team_members`**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Auto |
| `user_id` | uuid FK → auth.users | Usuário |
| `display_role` | text | Role que aparece internamente: `admin`, `editor`, `viewer`, `manager` |
| `permissions` | jsonb | Permissões granulares |
| `invited_by` | uuid FK → auth.users | Quem convidou |
| `notes` | text | Notas internas sobre o membro |
| `is_active` | boolean | Ativo/inativo |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**Tabela: `user_roles`** (já existe — mantém como está)
- Continua controlando o acesso básico (admin/editor/client/god)
- A tabela `team_members` adiciona granularidade sobre o que cada admin/editor pode fazer

### Estrutura de permissões (JSONB)

```json
{
  "admin_tabs": ["overview", "clientes", "entregas", "editores", "metricas", "projetos", "calendario", "comissoes", "suporte", "logs"],
  "can_create_delivery": true,
  "can_edit_delivery": true,
  "can_delete_delivery": false,
  "can_manage_clients": true,
  "can_manage_editors": false,
  "can_view_financials": true,
  "can_manage_projects": false,
  "can_access_preview": true,
  "can_export_data": false,
  "dashboard_access": "none"
}
```

### Tipos de membro

#### 1. Admin Restrito
- **Role no `user_roles`:** `admin`
- **`display_role`:** `admin`
- **Permissões:** Subconjunto de tabs do admin + ações limitadas
- **Visibilidade:** Não aparece em nenhuma lista de clientes/editores
- **Exemplo:** Gerente financeiro que só vê Comissões + Métricas

#### 2. Editor
- **Role no `user_roles`:** `editor`
- **`display_role`:** `editor`
- **Permissões:** Acesso ao painel do editor (já funciona)
- **Configurações extras:** Capacidade máxima, especialidades, comissão
- **Visibilidade:** Aparece na lista de editores (já funciona)

#### 3. Colaborador / Viewer
- **Role no `user_roles`:** `admin` (com permissões mínimas)
- **`display_role`:** `viewer`
- **Permissões:** `admin_tabs: ["overview"]`, tudo `false` exceto visualização
- **Visibilidade:** Não aparece em nenhuma lista
- **Exemplo:** Sócio que quer acompanhar KPIs sem mexer em nada

#### 4. Manager (Gerente de Contas)
- **Role no `user_roles`:** `admin`
- **`display_role`:** `manager`
- **Permissões:** `admin_tabs: ["overview", "clientes", "entregas"]`, `can_manage_clients: true`
- **Dashboard access:** Pode acessar o dashboard simulando qualquer cliente (via preview)
- **Visibilidade:** Não aparece em nenhuma lista de clientes
- **Exemplo:** Pessoa que gerencia a relação com o cliente

---

## UI — Tab "Equipe"

### Tela principal
```
┌─────────────────────────────────────────────────┐
│  Equipe                          [+ Novo Membro]│
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Nome           Email         Tipo    Ativo│  │
│  │ João Silva     joao@...     Admin ✓  ●    │  │
│  │ Maria Santos   maria@...    Viewer   ●    │  │
│  │ Carlos Lima    carlos@...   Editor   ●    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Total: 3 membros                               │
└─────────────────────────────────────────────────┘
```

### Modal "Novo Membro"
```
┌─────────────────────────────────────┐
│  Adicionar Membro                   │
│                                     │
│  Email: [________________________]  │
│                                     │
│  Tipo:  ○ Admin Restrito            │
│         ○ Editor                    │
│         ○ Viewer (só visualiza)     │
│         ○ Manager                   │
│                                     │
│  ─── Permissões ───                 │
│                                     │
│  Tabs do Admin:                     │
│  ☑ Visão Geral    ☑ Entregas       │
│  ☐ Clientes       ☐ Editores       │
│  ☑ Métricas       ☐ Projetos       │
│  ☐ Calendário     ☐ Comissões      │
│  ☐ Suporte        ☐ Logs           │
│                                     │
│  Ações:                             │
│  ☐ Criar entregas                   │
│  ☐ Editar entregas                  │
│  ☐ Deletar entregas                 │
│  ☐ Gerenciar clientes              │
│  ☐ Gerenciar editores              │
│  ☐ Ver financeiro                   │
│  ☐ Exportar dados                   │
│                                     │
│  Notas: [________________________]  │
│                                     │
│  [Cancelar]           [Adicionar]   │
└─────────────────────────────────────┘
```

### Modal "Editar Membro"
- Mesmo layout do "Novo Membro" mas com dados preenchidos
- Botão extra "Desativar" (não deleta, só desativa)
- Botão "Remover" (com confirmação)

---

## Fluxo de adição

1. God clica "Novo Membro"
2. Digita o email
3. Sistema busca em `auth.users` → se existe, mostra nome
4. Se não existe, mostra opção "Enviar convite" (envia email com link de cadastro)
5. God seleciona tipo e configura permissões
6. Sistema cria registro em `team_members` + `user_roles`
7. Na próxima vez que o usuário fizer login, ele vê o painel de acordo com suas permissões

---

## Implementação — Checklist

### Migration Supabase
- [ ] Criar tabela `team_members`
- [ ] RLS policies: apenas `god` pode CRUD
- [ ] Index em `user_id`

### Hook `useTeamPermissions`
- [ ] Busca `team_members` por `user_id`
- [ ] Retorna `{ permissions, displayRole, isTeamMember }`
- [ ] Cache com React Query key `['team-member', user.id]`

### Admin.tsx
- [ ] Adicionar tab "Equipe" (visível só pra god)
- [ ] Filtrar tabs baseado em `permissions.admin_tabs` pra admins restritos
- [ ] Esconder ações (create/edit/delete) baseado em permissões

### Componente `AdminTeam.tsx`
- [ ] Listagem de membros com busca
- [ ] Modal de criação (email + tipo + permissões)
- [ ] Modal de edição
- [ ] Toggle ativar/desativar
- [ ] Remoção com confirmação

### Ajustes em componentes existentes
- [ ] `AdminClients.tsx` — não mostrar team_members na lista de clientes
- [ ] `AdminEditors.tsx` — editores que são team_members mostram badge discreto
- [ ] `AdminOverview.tsx` — excluir team_members dos KPIs de "clientes ativos"
- [ ] `AdminMetrics.tsx` — excluir team_members da receita

### Edge function (opcional)
- [ ] `invite-team-member` — envia email de convite pra quem não tem conta

---

## Segurança

- Apenas `god` pode acessar a tab Equipe
- RLS: `team_members` só acessível por `god`
- Permissões são verificadas no frontend (não no backend/RLS)
- Um admin restrito que tentar acessar uma tab não permitida vê mensagem de acesso negado
- Team members nunca aparecem em listas de clientes, métricas de receita, ou contagem de usuários

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Admin restrito tenta acessar tab via URL | Frontend filtra tabs, mostra "Sem permissão" |
| Permissões no frontend podem ser burladas | Aceitar como MVP — adicionar RLS granular depois |
| Convite pra email que não existe | Criar fluxo de convite com link de cadastro |
| Membro desativado continua logado | Check `is_active` no hook, redirect se false |

---

## Prioridade de implementação

1. **Fase 1 (MVP):** Tabela + tab Equipe + adicionar/remover membros + roles básicas
2. **Fase 2:** Permissões granulares por tab
3. **Fase 3:** Permissões por ação (create/edit/delete)
4. **Fase 4:** Convite por email + onboarding de membro

---

## Fora de escopo (por enquanto)

- Logs de atividade por membro
- Notificações pra membros
- Dashboard personalizado por membro
- Permissões por cliente (ex: "João só gerencia o cliente X")
