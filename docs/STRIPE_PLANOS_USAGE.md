# Stripe + Planos — Guia de Uso

Este documento descreve como configurar e usar o sistema de planos pagos com Stripe no FinanceHub.

## Sumário

- [1. Variáveis de ambiente](#1-variáveis-de-ambiente)
- [2. Setup no Stripe Dashboard](#2-setup-no-stripe-dashboard)
- [3. Setup do banco de dados](#3-setup-do-banco-de-dados)
- [4. Endpoints de planos (CRUD)](#4-endpoints-de-planos-crud)
- [5. Webhook do Stripe](#5-webhook-do-stripe)
- [6. Bloqueio por expiração](#6-bloqueio-por-expiração)
- [7. Edição manual da expiração no admin](#7-edição-manual-da-expiração-no-admin)
- [8. Teste local com Stripe CLI](#8-teste-local-com-stripe-cli)
- [9. Fluxo end-to-end](#9-fluxo-end-to-end)
- [10. Troubleshooting](#10-troubleshooting)
- [11. Gaps conhecidos](#11-gaps-conhecidos)

---

## 1. Variáveis de ambiente

Adicione no `.env` do projeto:

```env
# Chaves do Stripe (test mode no início)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Price IDs criados no Stripe (preenchidos depois — ver seção 2)
STRIPE_PRICE_MENSAL=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_SEMESTRAL=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ANUAL=price_xxxxxxxxxxxxxxxxxxxxx

# Opcionais — ID dos Products
STRIPE_PRODUCT_MENSAL=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_SEMESTRAL=prod_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRODUCT_ANUAL=prod_xxxxxxxxxxxxxxxxxxxxx
```

> **Onde encontrar:** https://dashboard.stripe.com/test/apikeys (chaves) e https://dashboard.stripe.com/test/webhooks (webhook secret).

---

## 2. Setup no Stripe Dashboard

### 2.1. Criar os 3 Products + Prices

Vá em https://dashboard.stripe.com/test/products → **Add product**. Crie 3 produtos:

| Plano | Nome do Product | Preço (USD) | Billing | Configuração |
|-------|----------------|-------------|---------|--------------|
| Mensal | FinanceHub Mensal | 5.99 | Recurring | `Monthly` |
| Semestral | FinanceHub Semestral | 29.99 | Recurring | `Custom` → Every 6 months |
| Anual | FinanceHub Anual | 49.99 | Recurring | `Yearly` |

Para cada um:

1. **Name**: como na tabela acima
2. **Pricing model**: Standard pricing
3. **Price**: valor em USD
4. **Billing period**: conforme a coluna "Billing"
5. Clique **Save product**
6. Copie o **Price ID** (começa com `price_`) e o **Product ID** (começa com `prod_`) que aparecem na página do produto

### 2.2. Anotar os IDs

Cole os Price IDs no `.env` nas variáveis `STRIPE_PRICE_MENSAL/SEMESTRAL/ANUAL`. Os Product IDs são opcionais mas ajudam o catálogo local.

### 2.3. Configurar webhook

Vá em https://dashboard.stripe.com/test/webhooks → **Add endpoint**:

- **Endpoint URL**: `https://seu-dominio.com/api/webhooks/stripe`
  (em dev local, use `stripe listen` — ver seção 8)
- **Events to send**:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated` ⚠️ **OBRIGATÓRIO** (renovações)
  - `customer.subscription.deleted`
  - `charge.refunded`

Após criar, clique no endpoint e copie o **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET` no `.env`.

---

## 3. Setup do banco de dados

### 3.1. Aplicar schema

```powershell
npm run db:push
```

Isso cria/atualiza:

- Tabela `planos` (catálogo local)
- Constraint `(nome, tipo, global)` em `categorias`
- Demais tabelas Stripe (se ainda não existirem)

### 3.2. Popular planos

Com as variáveis `STRIPE_PRICE_*` no `.env`:

```powershell
npm run db:seed-planos
```

O script é **idempotente** — pode rodar várias vezes. Faz `INSERT ... ON CONFLICT (stripe_price_id) DO UPDATE`.

Saída esperada:

```
📦 Inserindo planos de assinatura...

  ✅ Inserido: Mensal ($5.99 / 1m) → price_xxx
  ✅ Inserido: Semestral ($29.99 / 6m) → price_yyy
  ✅ Inserido: Anual ($49.99 / 12m) → price_zzz

📊 Resumo: 3 inserido(s), 0 atualizado(s), 0 pulado(s).
```

---

## 4. Endpoints de planos (CRUD)

Todos os endpoints exigem autenticação (sessão ou API Key). Endpoints de escrita exigem `tipo_usuario = 'super_admin'`.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/planos` | sessão/api-key | Lista planos **ativos**, ordenados por `ordem`. Ideal para frontend de checkout. |
| GET | `/api/planos/all` | super_admin | Lista TODOS os planos (inclui inativos). |
| GET | `/api/planos/:id` | sessão/api-key | Detalhe de um plano. |
| POST | `/api/planos` | super_admin | Criar plano. |
| PUT | `/api/planos/:id` | super_admin | Atualizar (parcial). |
| DELETE | `/api/planos/:id` | super_admin | Remover. **Use `ativo: false` se já houver assinaturas vinculadas.** |

### 4.1. Schema do payload

```ts
{
  nome: string,                // obrigatório
  descricao?: string,
  intervalo_meses: number,     // obrigatório, inteiro positivo
  valor_usd: number,           // obrigatório, >= 0
  stripe_price_id: string,     // obrigatório, único
  stripe_product_id?: string,
  ativo?: boolean,             // default true
  ordem?: number               // default 0
}
```

### 4.2. Exemplo: criar plano via cURL

```bash
curl -X POST https://seu-dominio.com/api/planos \
  -H "Content-Type: application/json" \
  -H "apikey: SEU_TOKEN_SUPERADMIN" \
  -d '{
    "nome": "Trimestral",
    "descricao": "Acesso completo por 3 meses.",
    "intervalo_meses": 3,
    "valor_usd": 16.99,
    "stripe_price_id": "price_aaa",
    "ordem": 4
  }'
```

### 4.3. Exemplo: desativar plano (sem deletar)

```bash
curl -X PUT https://seu-dominio.com/api/planos/2 \
  -H "Content-Type: application/json" \
  -H "apikey: SEU_TOKEN_SUPERADMIN" \
  -d '{ "ativo": false }'
```

### 4.4. Códigos de erro

- `400` — payload inválido (campos obrigatórios faltando ou tipos incorretos)
- `401` — não autenticado ou plano expirado
- `403` — não é super_admin
- `404` — plano não encontrado
- `409` — `stripe_price_id` duplicado
- `500` — erro interno

---

## 5. Webhook do Stripe

### 5.1. Eventos tratados

| Evento | Efeito |
|--------|--------|
| `payment_intent.succeeded` | Marca a transação como `Efetivada` em `transacoes` |
| `payment_intent.payment_failed` | Marca como `Cancelada` + registra erro |
| `customer.subscription.created` | Insere em `stripe_subscriptions` + **ativa** o plano do usuário (`data_expiracao_assinatura = current_period_end`, `status_assinatura = 'ativa'`, `ativo = true`) |
| `customer.subscription.updated` | Sincroniza renovações: avança `data_expiracao_assinatura`. Para status `canceled/unpaid/incomplete_expired` marca como cancelada. |
| `customer.subscription.deleted` | Marca como cancelada e ajusta expiração para fim do período corrente. |
| `charge.refunded` | Cria transação oposta (reembolso). |

### 5.2. Validação de assinatura

O endpoint usa `express.raw({ type: 'application/json' })` para preservar o body bruto e valida a assinatura via `stripe.webhooks.constructEvent()`. Se o `STRIPE_WEBHOOK_SECRET` estiver errado, todos os webhooks são rejeitados com `401`.

### 5.3. Idempotência

O `INSERT` em `stripe_subscriptions` usa `ON CONFLICT (stripe_subscription_id) DO UPDATE` — o mesmo evento pode ser reentregue pelo Stripe sem corromper dados.

---

## 6. Bloqueio por expiração

### 6.1. Como funciona

O middleware [`requireActiveSubscription`](server/middleware/subscriptionCheck.middleware.ts) é encadeado dentro de `combinedAuth`, ou seja, **toda rota `/api/*` autenticada** valida `data_expiracao_assinatura`.

Comportamento:

- **`tipo_usuario = 'super_admin'`** → bypass total, nunca é bloqueado
- **`data_expiracao_assinatura = NULL`** → permite acesso (compatibilidade com usuários legados sem assinatura Stripe)
- **`data_expiracao_assinatura > now`** → permite acesso
- **`data_expiracao_assinatura <= now`** → retorna `401 { error, subscriptionExpired: true, expirationDate }` e marca `ativo = false` no banco

### 6.2. Quando endurecer

Quando todos os usuários estiverem migrados para Stripe, troque a regra de "NULL = permite" por "NULL = bloqueia" em `server/middleware/subscriptionCheck.middleware.ts:36-39`.

---

## 7. Edição manual da expiração no admin

Acesse `/admin/users` (login como super_admin) e:

- **Criar usuário**: o formulário tem o campo "Data de Expiração da Assinatura" (deixe em branco para ilimitado).
- **Editar usuário**: idem, no modal de edição.
- **Listagem**: cada usuário mostra um badge:
  - 🟢 **Verde** — expira em mais de 7 dias
  - 🟠 **Laranja** — expira em até 7 dias
  - 🔴 **Vermelho** — já expirado
  - ⚪ **Cinza** — sem expiração definida

Endpoints subjacentes:
- `POST /api/admin/users` aceita `data_expiracao_assinatura` (ISO date string)
- `PUT /api/admin/users/:id` aceita o mesmo campo. String vazia (`""`) limpa para `NULL`.

---

## 8. Teste local com Stripe CLI

### 8.1. Instalar

https://stripe.com/docs/stripe-cli#install — ou `winget install Stripe.StripeCLI` no Windows.

### 8.2. Login

```powershell
stripe login
```

### 8.3. Forwarding de webhooks para localhost

Em um terminal:

```powershell
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

A saída exibe um `whsec_...` — copie para `STRIPE_WEBHOOK_SECRET` no `.env` (sobrescrevendo o do Dashboard, só para dev).

### 8.4. Disparar eventos manualmente

Em outro terminal:

```powershell
# Criar uma subscription fake e disparar o evento
stripe trigger customer.subscription.created

# Renovação
stripe trigger customer.subscription.updated

# Cancelamento
stripe trigger customer.subscription.deleted

# Pagamento
stripe trigger payment_intent.succeeded
```

### 8.5. Cartões de teste

```
Visa OK:                4242 4242 4242 4242
Mastercard OK:          5555 5555 5555 4444
Requer 3D Secure:       4000 0025 0000 3155
Falha (insufficient):   4000 0000 0000 9995
```
Qualquer CVV/data futura.

---

## 9. Fluxo end-to-end

### 9.1. Compra do plano

1. Frontend chama `GET /api/planos` para listar opções
2. Usuário escolhe plano e frontend chama `POST /api/subscriptions/create` com `stripePriceId`
3. Backend cria customer no Stripe (se ainda não tiver), cria subscription e retorna `clientSecret`
4. Frontend usa Stripe Elements para coletar cartão e confirma o pagamento
5. Stripe processa, dispara `customer.subscription.created` → webhook ativa o usuário
6. Frontend recebe sucesso → redireciona para dashboard

### 9.2. Renovação automática

1. Stripe cobra automaticamente no fim do período
2. Dispara `customer.subscription.updated` → webhook avança `data_expiracao_assinatura`
3. Usuário continua acessando sem interrupção

### 9.3. Expiração / cancelamento

1. Usuário cancela no Dashboard do Stripe (ou via `DELETE /api/subscriptions/:id`)
2. Stripe dispara `customer.subscription.deleted` → webhook ajusta expiração para fim do período pago
3. Usuário acessa até a data; depois disso o middleware retorna 401

---

## 10. Troubleshooting

### "STRIPE_SECRET_KEY environment variable is not set"

Mesmo com a chave no `.env`, o Node não carrega `.env` automaticamente. Em produção use `node --env-file=.env dist/index.js` (já configurado em `start:windows`).

### "Webhook signature validation failed"

- O `STRIPE_WEBHOOK_SECRET` no `.env` não bate com o webhook configurado.
- Em dev: use o `whsec_...` retornado pelo `stripe listen`, não o do Dashboard.
- Em prod: use o secret do endpoint específico no Dashboard.

### "Could not resolve '../config/stripe'"

Bug preexistente em `server/stripe-startup.ts` corrigido. Se reaparecer, use paths relativos `./config/stripe` (o arquivo já está em `server/`).

### "User not found for stripe customer" no webhook

A relação `stripe_customer_id` em `usuarios` não foi vinculada antes do webhook chegar. Isso ocorre quando:
- O fluxo de checkout cria o customer no Stripe mas não atualiza `usuarios.stripe_customer_id`
- Solução: garantir que `StripePaymentService.createOrUpdateCustomer()` rode antes da subscription ser criada

### Erro 42P10 "no unique or exclusion constraint matching ON CONFLICT"

Aplicar `npm run db:push` para atualizar a constraint de `categorias` (corrigida no schema para incluir `tipo`).

---

## 11. Gaps conhecidos

Ainda **não** estão implementados (precisam de novo trabalho):

1. **Página de checkout no frontend** — não há tela que liste os planos via `/api/planos` e abra Stripe Elements. Phase 9 do `STRIPE_IMPLEMENTATION.md` original cobre isso.

2. **Vínculo automático customer↔usuário** na primeira compra. Hoje depende de `StripePaymentService.createOrUpdateCustomer` ser chamado antes do webhook.

3. **Job de reconciliação diária** que compara Stripe API com banco local e detecta dessincronizações. Recomendado para produção.

4. **Notificações de expiração próxima** (`invoice.upcoming`, `customer.subscription.trial_will_end`) — eventos chegam ao webhook mas vão direto para o log, sem ação.

5. **Tela admin de gerenciamento de planos no frontend** — a API CRUD está pronta, falta a UI.

6. **Localização de moeda** — o sistema fixa USD. Se quiser PYG/BRL, precisa converter na exibição (Stripe pode cobrar em múltiplas moedas no mesmo Price).
