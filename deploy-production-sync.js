#!/usr/bin/env node

/**
 * Script de Sincronização para Deploy em Produção
 * Garante que o banco de dados de produção tenha a mesma estrutura e dados essenciais
 * que o ambiente de desenvolvimento.
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

async function deployProductionSync() {
  console.log('🚀 Iniciando sincronização para deploy em produção...');
  console.log('📍 DATABASE_URL:', DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
  
  const client = postgres(DATABASE_URL, { prepare: false });

  try {
    // 1. Verificar conexão
    console.log('🔍 Testando conexão com banco de dados...');
    await client`SELECT NOW()`;
    console.log('✅ Conexão estabelecida com sucesso!');

    // 2. Criar todas as tabelas (se não existirem)
    console.log('🏗️ Criando estrutura de tabelas...');
    await createAllTables(client);

    // 3. Inserir dados padrão
    console.log('📊 Inserindo dados padrão...');
    await insertDefaultData(client);

    // 4. Garantir usuário admin
    console.log('👤 Garantindo usuário administrador...');
    await ensureAdminUser(client);

    // 5. Verificar integridade
    console.log('🔍 Verificando integridade do banco...');
    await verifyDatabaseIntegrity(client);

    console.log('✅ Deploy sincronizado com sucesso!');
    console.log('🎯 Sistema pronto para uso em produção');
    console.log('📧 Login: teste@teste.com');
    console.log('🔑 Senha: admin123');

  } catch (error) {
    console.error('❌ Erro durante sincronização:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function createAllTables(client) {
  const tables = [
    {
      name: 'usuarios',
      sql: `
        CREATE TABLE IF NOT EXISTS usuarios (
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
        )
      `
    },
    {
      name: 'carteiras',
      sql: `
        CREATE TABLE IF NOT EXISTS carteiras (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          descricao TEXT,
          saldo_atual DECIMAL(15,2) DEFAULT 0.00,
          data_criacao TIMESTAMP DEFAULT NOW()
        )
      `
    },
    {
      name: 'categorias',
      sql: `
        CREATE TABLE IF NOT EXISTS categorias (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT,
          cor VARCHAR(7) DEFAULT '#6B7280',
          icone VARCHAR(50) DEFAULT 'circle',
          tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
          global BOOLEAN DEFAULT false,
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `
    },
    {
      name: 'formas_pagamento',
      sql: `
        CREATE TABLE IF NOT EXISTS formas_pagamento (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT,
          cor VARCHAR(7) DEFAULT '#6B7280',
          icone VARCHAR(50) DEFAULT 'credit-card',
          global BOOLEAN DEFAULT false,
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `
    },
    {
      name: 'transacoes',
      sql: `
        CREATE TABLE IF NOT EXISTS transacoes (
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
        )
      `
    },
    {
      name: 'lembretes',
      sql: `
        CREATE TABLE IF NOT EXISTS lembretes (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          titulo VARCHAR(255) NOT NULL,
          descricao TEXT,
          data_lembrete TIMESTAMP NOT NULL,
          tipo_recorrencia VARCHAR(20),
          ativo BOOLEAN DEFAULT true,
          data_criacao TIMESTAMP DEFAULT NOW()
        )
      `
    },
    {
      name: 'api_tokens',
      sql: `
        CREATE TABLE IF NOT EXISTS api_tokens (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          nome VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          ativo BOOLEAN DEFAULT true,
          data_criacao TIMESTAMP DEFAULT NOW(),
          ultimo_uso TIMESTAMP
        )
      `
    },
    {
      name: 'cancelamentos',
      sql: `
        CREATE TABLE IF NOT EXISTS cancelamentos (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          motivo TEXT NOT NULL,
          data_cancelamento TIMESTAMP DEFAULT NOW(),
          dados_usuario JSONB
        )
      `
    },
    {
      name: 'user_sessions_admin',
      sql: `
        CREATE TABLE IF NOT EXISTS user_sessions_admin (
          id SERIAL PRIMARY KEY,
          super_admin_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          target_user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          session_start TIMESTAMP DEFAULT NOW(),
          session_end TIMESTAMP,
          ativo BOOLEAN DEFAULT true
        )
      `
    }
  ];

  for (const table of tables) {
    try {
      await client.unsafe(table.sql);
      console.log(`✅ Tabela ${table.name} criada/verificada`);
    } catch (error) {
      console.error(`❌ Erro ao criar tabela ${table.name}:`, error.message);
      throw error;
    }
  }
}

async function insertDefaultData(client) {
  // Categorias de despesa (13)
  const expenseCategories = [
    'Alimentação', 'Moradia', 'Doações', 'Educação', 'Imposto', 
    'Investimento', 'Lazer', 'Pets', 'Saude', 'Transporte', 
    'Vestuário', 'Viagem', 'Outros'
  ];

  for (const categoria of expenseCategories) {
    await client`
      INSERT INTO categorias (nome, tipo, global, cor, icone)
      VALUES (${categoria}, 'Despesa', true, '#EF4444', 'minus-circle')
      ON CONFLICT DO NOTHING
    `;
  }

  // Categorias de receita (4)
  const incomeCategories = ['Investimentos', 'Salário', 'Freelance', 'Outros'];
  
  for (const categoria of incomeCategories) {
    await client`
      INSERT INTO categorias (nome, tipo, global, cor, icone)
      VALUES (${categoria}, 'Receita', true, '#10B981', 'plus-circle')
      ON CONFLICT DO NOTHING
    `;
  }

  // Formas de pagamento globais (6)
  const paymentMethods = [
    { nome: 'PIX', icone: 'smartphone', cor: '#10B981' },
    { nome: 'Cartão de Crédito', icone: 'credit-card', cor: '#3B82F6' },
    { nome: 'Cartão de Débito', icone: 'credit-card', cor: '#8B5CF6' },
    { nome: 'Dinheiro', icone: 'banknote', cor: '#F59E0B' },
    { nome: 'TED/DOC', icone: 'building-bank', cor: '#EF4444' },
    { nome: 'Cheque', icone: 'file-text', cor: '#6B7280' }
  ];

  for (const method of paymentMethods) {
    await client`
      INSERT INTO formas_pagamento (nome, global, cor, icone)
      VALUES (${method.nome}, true, ${method.cor}, ${method.icone})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('✅ Dados padrão inseridos (17 categorias + 6 formas pagamento)');
}

async function ensureAdminUser(client) {
  // Verificar se admin já existe
  const existingAdmin = await client`
    SELECT id FROM usuarios WHERE email = 'teste@teste.com' LIMIT 1
  `;

  if (existingAdmin.length > 0) {
    console.log('✅ Usuário admin já existe');
    return existingAdmin[0].id;
  }

  // Criar admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const result = await client`
    INSERT INTO usuarios (email, senha, nome, telefone, ativo, tipo_usuario, status_assinatura, data_expiracao_assinatura)
    VALUES ('teste@teste.com', ${hashedPassword}, 'Administrador', '(00) 00000-0000', true, 'super_admin', 'ativa', ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)})
    RETURNING id
  `;
  
  const adminId = result[0].id;
  
  // Criar wallet para admin
  await client`
    INSERT INTO carteiras (nome, usuario_id, descricao)
    VALUES ('Carteira Principal', ${adminId}, 'Carteira principal do administrador')
  `;

  console.log('✅ Usuário administrador criado com sucesso');
  return adminId;
}

async function verifyDatabaseIntegrity(client) {
  const checks = [
    { name: 'Usuários', query: 'SELECT COUNT(*) as count FROM usuarios' },
    { name: 'Carteiras', query: 'SELECT COUNT(*) as count FROM carteiras' },
    { name: 'Categorias', query: 'SELECT COUNT(*) as count FROM categorias WHERE global = true' },
    { name: 'Formas Pagamento', query: 'SELECT COUNT(*) as count FROM formas_pagamento WHERE global = true' },
    { name: 'Admin', query: "SELECT COUNT(*) as count FROM usuarios WHERE tipo_usuario = 'super_admin'" }
  ];

  console.log('📊 Resumo do banco de dados:');
  for (const check of checks) {
    const result = await client.unsafe(check.query);
    console.log(`   ${check.name}: ${result[0].count}`);
  }

  // Verificar se admin pode fazer login
  const adminCheck = await client`
    SELECT email, tipo_usuario FROM usuarios WHERE email = 'teste@teste.com' AND ativo = true
  `;

  if (adminCheck.length === 0) {
    throw new Error('Usuário admin não encontrado ou inativo');
  }

  console.log('✅ Integridade do banco verificada');
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  deployProductionSync().catch(console.error);
}

export { deployProductionSync };