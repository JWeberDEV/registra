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

rl.question('Deseja continuar com as migrações neste banco? (s/N): ', answer => {
  rl.close();
  if (answer.trim().toLowerCase() !== 's') {
    console.log('Operação cancelada.');
    process.exit(0);
  }
  // Executa o drizzle-kit push
  const child = spawn('npx', ['drizzle-kit', 'push'], { stdio: 'inherit', shell: true });
  child.on('exit', code => process.exit(code));
}); 