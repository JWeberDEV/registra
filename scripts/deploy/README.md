# scripts/deploy/

Scripts auxiliares para build e deploy em diferentes plataformas.

## Conteúdo

### Build
- `build-production.js` — build customizado de produção
- `increment-version.js` — incrementa a versão no `package.json`
- `setup-production.js` — setup pós-deploy (criação de admin, etc.)

### Deploy
- `deploy-heroku.sh` — deploy no Heroku
- `deploy-railway.sh` — deploy no Railway
- `deploy-production-sync.js` — sincronização de produção
- `sync-deploy.js` — outro fluxo de sync
- `restart.sh` — reinício do processo

## Uso

Estes scripts não são chamados automaticamente pelo `npm run build` ou `npm run start`. Execute manualmente quando necessário:

```bash
# Exemplo: deploy no Railway
bash scripts/deploy/deploy-railway.sh
```

Consulte cada arquivo para entender o que ele faz antes de executar.
