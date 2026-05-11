# scripts/legacy-migrations/

Scripts de migração **pontuais e antigos** que foram usados em momentos específicos da evolução do banco de dados. Mantidos aqui como referência histórica, mas **não fazem parte do fluxo de migração atual**.

## Fluxo de migração atual

Use sempre o Drizzle Kit via npm:

```powershell
npm run db:push     # aplica o schema de shared/schema.ts ao banco
npm run db:seed     # popula categorias/formas de pagamento globais
npm run db:seed-planos  # popula planos de assinatura
```

## Quando usar os scripts daqui

Praticamente nunca. Estão aqui apenas porque rodaram em algum momento histórico para corrigir dados, adicionar colunas pontuais, criar usuários de teste, etc.

Se precisar consultar a lógica de algum desses para entender como o banco evoluiu, fique à vontade. Mas evite executar — eles assumem estados específicos do banco que podem não existir mais.

## Conteúdo

### Migrações de schema
- `migrate.js`, `migrate_admin_system.js`, `migrate_cancelamentos.js`
- `migrate_categories_description.js`, `migrate_default_categories.js`
- `migrate_payment_methods.js`, `migrate_phone_field.js`, `migrate_reminders.js`
- `migrate_subscription_expiration.js`, `migrate_tokens.js`, `migrate_waha_config.js`
- `migrate_wallet_descricao.js`, `migrate_welcome_messages.js`

### Adição/correção pontual
- `add_activation_message.js`, `add_dashboard_endpoint.js`, `add_pdf_endpoints.js`
- `add_unique_constraints.cjs`, `add_unique_constraints.js`
- `fix_pdf_endpoints.js`

### Setup / testes
- `create_test_cancelamentos.js`, `create_test_users.js`
- `temp_users_update.js`, `reset_bruno_user.sql`

### Inspeção
- `extract-db-structure.js`, `check-themes-table.ts`
