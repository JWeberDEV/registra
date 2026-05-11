#!/usr/bin/env node

// Script de build customizado que exclui Vite do bundle de produção
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Iniciando build de produção...');

try {
  // 1. Build do frontend com Vite
  console.log('📦 Building frontend...');
  execSync('npx vite build', { stdio: 'inherit' });

  // 2. Build do backend com esbuild, excluindo Vite
  console.log('⚙️ Building backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:vite --external:@vitejs/plugin-react --external:@replit/vite-plugin-cartographer --external:@replit/vite-plugin-runtime-error-modal', { stdio: 'inherit' });

  // 3. Verificar se os arquivos foram gerados
  const distDir = path.resolve('dist');
  if (fs.existsSync(path.join(distDir, 'index.js'))) {
    console.log('✅ Build concluído com sucesso!');
    console.log('📁 Arquivos gerados:');
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      const stats = fs.statSync(path.join(distDir, file));
      console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
  } else {
    throw new Error('Arquivo index.js não foi gerado');
  }

} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}