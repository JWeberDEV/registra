#!/usr/bin/env node

/**
 * Script Rápido de Sincronização para Deploy
 * Versão otimizada para resolver problemas de "relation usuarios does not exist"
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

async function quickSync() {
  console.log('🚀 Deploy Sync - Iniciando...');
  
  const client = postgres(DATABASE_URL, { prepare: false });

  try {
    // Testar conexão
    await client`SELECT NOW()`;
    console.log('✅ Conexão OK');

    // Criar tabelas essenciais uma por vez
    const tables = [
      `CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        remoteJid VARCHAR(255) UNIQUE,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        foto_perfil TEXT,
        ultimo_acesso TIMESTAMP DEFAULT NOW(),
        data_cadastro TIMESTAMP DEFAULT NOW(),
        tipo_usuario VARCHAR(50) DEFAULT 'user',
        ativo BOOLEAN DEFAULT true,
        data_cancelamento TIMESTAMP,
        motivo_cancelamento TEXT,
        status_assinatura VARCHAR(50) DEFAULT 'ativa',
        data_expiracao_assinatura TIMESTAMPTZ,
        telefone VARCHAR(20)
      )`,
      `CREATE TABLE IF NOT EXISTS carteiras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        descricao TEXT,
        saldo_atual DECIMAL(15,2) DEFAULT 0.00,
        data_criacao TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6B7280',
        icone VARCHAR(50) DEFAULT 'circle',
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
        global BOOLEAN DEFAULT false,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS formas_pagamento (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6B7280',
        icone VARCHAR(50) DEFAULT 'credit-card',
        global BOOLEAN DEFAULT false,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS transacoes (
        id SERIAL PRIMARY KEY,
        carteira_id INTEGER NOT NULL REFERENCES carteiras(id) ON DELETE CASCADE,
        categoria_id INTEGER REFERENCES categorias(id),
        forma_pagamento_id INTEGER REFERENCES formas_pagamento(id),
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
        valor DECIMAL(15,2) NOT NULL,
        descricao TEXT NOT NULL,
        data_transacao TIMESTAMP NOT NULL,
        data_criacao TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'Confirmada'
      )`,
      `CREATE TABLE IF NOT EXISTS lembretes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        data_lembrete TIMESTAMP NOT NULL,
        tipo_recorrencia VARCHAR(20),
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS api_tokens (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT NOW(),
        ultimo_uso TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS cancelamentos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        motivo TEXT NOT NULL,
        data_cancelamento TIMESTAMP DEFAULT NOW(),
        dados_usuario JSONB
      )`,
      `CREATE TABLE IF NOT EXISTS user_sessions_admin (
        id SERIAL PRIMARY KEY,
        super_admin_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        session_start TIMESTAMP DEFAULT NOW(),
        session_end TIMESTAMP,
        ativo BOOLEAN DEFAULT true
      )`
    ];

    for (const table of tables) {
      await client.unsafe(table);
    }
    console.log('✅ Tabelas criadas');

    // Inserir dados essenciais
    const expenses = ['Alimentação', 'Moradia', 'Doações', 'Educação', 'Imposto', 'Investimento', 'Lazer', 'Pets', 'Saude', 'Transporte', 'Vestuário', 'Viagem', 'Outros'];
    const incomes = ['Investimentos', 'Salário', 'Freelance', 'Outros'];
    const payments = [
      { nome: 'PIX', icone: 'smartphone', cor: '#10B981' },
      { nome: 'Cartão de Crédito', icone: 'credit-card', cor: '#3B82F6' },
      { nome: 'Cartão de Débito', icone: 'credit-card', cor: '#8B5CF6' },
      { nome: 'Dinheiro', icone: 'banknote', cor: '#F59E0B' },
      { nome: 'TED/DOC', icone: 'building-bank', cor: '#EF4444' },
      { nome: 'Cheque', icone: 'file-text', cor: '#6B7280' }
    ];

    for (const cat of expenses) {
      await client`INSERT INTO categorias (nome, tipo, global, cor, icone) VALUES (${cat}, 'Despesa', true, '#EF4444', 'minus-circle') ON CONFLICT DO NOTHING`;
    }
    for (const cat of incomes) {
      await client`INSERT INTO categorias (nome, tipo, global, cor, icone) VALUES (${cat}, 'Receita', true, '#10B981', 'plus-circle') ON CONFLICT DO NOTHING`;
    }
    for (const pay of payments) {
      await client`INSERT INTO formas_pagamento (nome, global, cor, icone) VALUES (${pay.nome}, true, ${pay.cor}, ${pay.icone}) ON CONFLICT DO NOTHING`;
    }
    console.log('✅ Dados padrão inseridos');

    // Verificar/criar admin
    const admin = await client`SELECT id FROM usuarios WHERE email = 'teste@teste.com' LIMIT 1`;
    
    if (admin.length === 0) {
      const hash = await bcrypt.hash('admin123', 12);
      const result = await client`
        INSERT INTO usuarios (email, senha, nome, telefone, ativo, tipo_usuario, status_assinatura, data_expiracao_assinatura)
        VALUES ('teste@teste.com', ${hash}, 'Administrador', '(00) 00000-0000', true, 'super_admin', 'ativa', ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)})
        RETURNING id
      `;
      
      await client`INSERT INTO carteiras (nome, usuario_id, descricao) VALUES ('Carteira Principal', ${result[0].id}, 'Carteira principal')`;
      console.log('✅ Admin criado: teste@teste.com / admin123');
    } else {
      console.log('✅ Admin já existe');
    }

    // Verificação final
    const counts = await client`SELECT 
      (SELECT COUNT(*) FROM usuarios) as users,
      (SELECT COUNT(*) FROM categorias WHERE global = true) as categories,
      (SELECT COUNT(*) FROM formas_pagamento WHERE global = true) as payments
    `;
    
    console.log(`📊 Users: ${counts[0].users} | Categories: ${counts[0].categories} | Payments: ${counts[0].payments}`);
    console.log('🎯 Deploy sincronizado! Login: teste@teste.com / admin123');

  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

quickSync();