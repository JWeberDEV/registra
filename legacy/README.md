# legacy/

Arquivos órfãos que foram preservados em vez de deletados. **Nenhum deles é necessário para o funcionamento atual da aplicação** — todos foram verificados quanto a referências em `Dockerfile`, `package.json`, `.replit`, código-fonte e configurações.

## Conteúdo

| Arquivo | Origem |
|---------|--------|
| `_vite.config.ts` | Backup antigo de `vite.config.ts`. O arquivo ativo continua em `vite.config.ts` no root. |
| `cookies.txt` | Artefato de teste (provavelmente saída do `curl --cookie-jar`). |
| `dashboard_endpoint.json` | Arquivo temporário gerado durante o desenvolvimento de algum endpoint de dashboard. |
| `generated-icon.png` | Ícone gerado pelo Replit. Não é referenciado no código nem no `index.html`. A entrada no `.replit` foi atualizada para apontar para `legacy/` (apenas marca o diretório como oculto na interface do Replit). |

## Posso deletar?

Sim, a qualquer momento. Foram mantidos aqui apenas porque o pedido foi "mover, não deletar".

Se decidir limpar:

```powershell
git rm -r legacy/
git commit -m "chore: remove arquivos órfãos legados"
```
