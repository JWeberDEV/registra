#!/usr/bin/env node
/**
 * Seed dos planos de assinatura para mercado paraguaio (USD).
 *
 * IMPORTANTE: antes de rodar este script, você precisa criar os Products e
 * Prices no Stripe Dashboard (https://dashboard.stripe.com/products).
 * Para cada plano abaixo, crie um Product com um Price recorrente:
 *
 *   - Mensal:    $5.99 USD / mês
 *   - Semestral: $29.99 USD a cada 6 meses
 *   - Anual:     $49.99 USD a cada 12 meses
 *
 * Depois, copie os IDs (price_xxx e prod_xxx) e cole nas variáveis de
 * ambiente abaixo OU edite diretamente o array `planos` neste arquivo.
 */
const { Client } = require('pg');
const fs = require('fs');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const env = fs.readFileSync('.env', 'utf8');
  const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
  if (!line) {
    console.error('❌ DATABASE_URL não encontrada no .env');
    process.exit(1);
  }
  dbUrl = line.split('=').slice(1).join('=').replace(/['"]/g, '').trim();
}

// Permite override via env vars (recomendado para CI/CD).
// Caso contrário usa placeholders que devem ser substituídos manualmente.
const planos = [
  {
    nome: 'Mensal',
    descricao: 'Acesso completo por 1 mês. Ideal para experimentar.',
    intervalo_meses: 1,
    valor_usd: 5.99,
    stripe_price_id: process.env.STRIPE_PRICE_MENSAL || 'price_REPLACE_MENSAL',
    stripe_product_id: process.env.STRIPE_PRODUCT_MENSAL || null,
    ordem: 1,
  },
  {
    nome: 'Semestral',
    descricao: 'Acesso completo por 6 meses. Economize ~17%.',
    intervalo_meses: 6,
    valor_usd: 29.99,
    stripe_price_id: process.env.STRIPE_PRICE_SEMESTRAL || 'price_REPLACE_SEMESTRAL',
    stripe_product_id: process.env.STRIPE_PRODUCT_SEMESTRAL || null,
    ordem: 2,
  },
  {
    nome: 'Anual',
    descricao: 'Acesso completo por 12 meses. Economize ~30% — melhor custo-benefício.',
    intervalo_meses: 12,
    valor_usd: 49.99,
    stripe_price_id: process.env.STRIPE_PRICE_ANUAL || 'price_REPLACE_ANUAL',
    stripe_product_id: process.env.STRIPE_PRODUCT_ANUAL || null,
    ordem: 3,
  },
];

(async () => {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('\n📦 Inserindo planos de assinatura...\n');

  let inseridos = 0;
  let atualizados = 0;
  let pulados = 0;

  for (const p of planos) {
    if (p.stripe_price_id.startsWith('price_REPLACE_')) {
      console.warn(
        `⚠️  Plano "${p.nome}" tem stripe_price_id placeholder (${p.stripe_price_id}). ` +
        `Crie o Price no Stripe Dashboard e exporte STRIPE_PRICE_${p.nome.toUpperCase()} antes de rodar de novo.`
      );
      pulados++;
      continue;
    }

    const result = await client.query(
      `INSERT INTO planos (nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       ON CONFLICT (stripe_price_id) DO UPDATE
         SET nome = EXCLUDED.nome,
             descricao = EXCLUDED.descricao,
             intervalo_meses = EXCLUDED.intervalo_meses,
             valor_usd = EXCLUDED.valor_usd,
             stripe_product_id = EXCLUDED.stripe_product_id,
             ordem = EXCLUDED.ordem,
             ativo = true
       RETURNING (xmax = 0) AS inserted`,
      [p.nome, p.descricao, p.intervalo_meses, p.valor_usd, p.stripe_price_id, p.stripe_product_id, p.ordem]
    );

    if (result.rows[0]?.inserted) {
      inseridos++;
      console.log(`  ✅ Inserido: ${p.nome} ($${p.valor_usd} / ${p.intervalo_meses}m) → ${p.stripe_price_id}`);
    } else {
      atualizados++;
      console.log(`  🔄 Atualizado: ${p.nome} ($${p.valor_usd} / ${p.intervalo_meses}m) → ${p.stripe_price_id}`);
    }
  }

  await client.end();

  console.log(`\n📊 Resumo: ${inseridos} inserido(s), ${atualizados} atualizado(s), ${pulados} pulado(s).\n`);

  if (pulados > 0) {
    console.log(
      '💡 Para inserir os planos pulados, crie os Prices no Stripe Dashboard e exporte\n' +
      '   as variáveis STRIPE_PRICE_MENSAL, STRIPE_PRICE_SEMESTRAL, STRIPE_PRICE_ANUAL\n' +
      '   (e opcionalmente os STRIPE_PRODUCT_*) antes de rodar `npm run db:seed-planos` de novo.\n'
    );
    process.exit(1);
  }
})().catch(err => {
  console.error('❌ Erro ao executar seed de planos:', err);
  process.exit(1);
});
