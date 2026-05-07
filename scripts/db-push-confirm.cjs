#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

// Função para mascarar senha na URL
function maskDbUrl(url) {
  if (!url) return '';
  return url.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/, '$1*****$2');
}

// Lê o .env
function getDatabaseUrl() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return process.env.DATABASE_URL || '';
  const env = fs.readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      return line.trim().replace('DATABASE_URL=', '').replace(/['"]/g, '');
    }
  }
  return process.env.DATABASE_URL || '';
}

const dbUrl = getDatabaseUrl();

console.log('\n==============================');
console.log('Banco de dados alvo das migrações:');
console.log(maskDbUrl(dbUrl) || '(não encontrado)');
console.log('==============================\n');

if (!dbUrl) {
  console.error('❌ DATABASE_URL não encontrada. Abortando.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function resetSchemaWithNode(dbUrl) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    // Busca todas as tabelas do schema public
    const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    const tables = res.rows.map(r => r.tablename);
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada para remover.');
      await client.end();
      return;
    }
    // Desabilita restrições temporariamente
    await client.query('SET session_replication_role = replica;');
    for (const table of tables) {
      console.log(`DROP TABLE IF EXISTS \"${table}\" CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
    }
    await client.query('SET session_replication_role = DEFAULT;');
    console.log('\n✅ Schema zerado com sucesso!\n');
  } catch (err) {
    console.error('Erro ao zerar o schema:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

(async () => {
  const answer = await ask('Deseja continuar com as migrações neste banco? (s/N): ');
  if (answer.trim().toLowerCase() !== 's') {
    console.log('Operação cancelada.');
    rl.close();
    process.exit(0);
  }

  const reset = await ask('\nATENÇÃO: Deseja ZERAR o schema (apagar TODAS as tabelas e dados) antes das migrações?\nDigite "ZERAR" para confirmar ou pressione Enter para pular: ');
  if (reset.trim() === 'ZERAR') {
    console.log('\n⚠️  Zerando o schema...\n');
    await resetSchemaWithNode(dbUrl);
  }

  rl.close();
  // Executa o drizzle-kit push
  const child = spawn('npx', ['drizzle-kit', 'push'], { stdio: 'inherit', shell: true });
  child.on('exit', code => process.exit(code));
})(); 