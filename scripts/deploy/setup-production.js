import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  usuarios, 
  carteiras, 
  categorias, 
  formas_pagamento, 
  transacoes, 
  lembretes, 
  api_tokens, 
  cancelamentos, 
  user_sessions_admin 
} from './shared/schema.js';
import bcrypt from 'bcryptjs';

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client);

console.log('🚀 Iniciando configuração de produção...');

async function createTables() {
  console.log('📋 Criando tabelas...');
  
  try {
    // Criar tabela usuarios
    await client`
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
    `;

    // Criar tabela carteiras
    await client`
      CREATE TABLE IF NOT EXISTS carteiras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        descricao TEXT,
        saldo_atual DECIMAL(15,2) DEFAULT 0.00,
        data_criacao TIMESTAMP DEFAULT NOW()
      )
    `;

    // Criar tabela categorias
    await client`
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
    `;

    // Criar tabela formas_pagamento  
    await client`
      CREATE TABLE IF NOT EXISTS formas_pagamento (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6B7280',
        icone VARCHAR(50) DEFAULT 'credit-card',
        global BOOLEAN DEFAULT false,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `;

    // Criar tabela transacoes
    await client`
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
    `;

    // Criar tabela lembretes
    await client`
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
    `;

    // Criar tabela api_tokens
    await client`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT NOW(),
        ultimo_uso TIMESTAMP
      )
    `;

    // Criar tabela cancelamentos
    await client`
      CREATE TABLE IF NOT EXISTS cancelamentos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        motivo TEXT NOT NULL,
        data_cancelamento TIMESTAMP DEFAULT NOW(),
        dados_usuario JSONB
      )
    `;

    // Criar tabela user_sessions_admin
    await client`
      CREATE TABLE IF NOT EXISTS user_sessions_admin (
        id SERIAL PRIMARY KEY,
        super_admin_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        session_start TIMESTAMP DEFAULT NOW(),
        session_end TIMESTAMP,
        ativo BOOLEAN DEFAULT true
      )
    `;

    console.log('✅ Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

async function insertDefaultData() {
  console.log('📊 Inserindo dados padrão...');

  try {
    // Verificar se já existem categorias globais
    const existingCategories = await client`SELECT COUNT(*) FROM categorias WHERE global = true`;
    if (existingCategories[0].count > 0) {
      console.log('ℹ️ Categorias globais já existem, pulando...');
    } else {
      // Inserir categorias globais de despesa
      const expenseCategories = [
        'Alimentação', 'Moradia', 'Doações', 'Educação', 'Imposto', 
        'Investimento', 'Lazer', 'Pets', 'Saude', 'Transporte', 
        'Vestuário', 'Viagem', 'Outros'
      ];

      for (const categoria of expenseCategories) {
        await client`
          INSERT INTO categorias (nome, tipo, global, cor, icone)
          VALUES (${categoria}, 'Despesa', true, '#EF4444', 'minus-circle')
        `;
      }

      // Inserir categorias globais de receita
      const incomeCategories = ['Investimentos', 'Salário', 'Freelance', 'Outros'];
      
      for (const categoria of incomeCategories) {
        await client`
          INSERT INTO categorias (nome, tipo, global, cor, icone)
          VALUES (${categoria}, 'Receita', true, '#10B981', 'plus-circle')
        `;
      }

      console.log('✅ Categorias globais inseridas!');
    }

    // Verificar se já existem formas de pagamento globais
    const existingPaymentMethods = await client`SELECT COUNT(*) FROM formas_pagamento WHERE global = true`;
    if (existingPaymentMethods[0].count > 0) {
      console.log('ℹ️ Formas de pagamento globais já existem, pulando...');
    } else {
      // Inserir formas de pagamento globais
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
        `;
      }

      console.log('✅ Formas de pagamento globais inseridas!');
    }

    // Verificar se usuário admin já existe
    const existingAdmin = await client`SELECT COUNT(*) FROM usuarios WHERE email = 'teste@teste.com'`;
    if (existingAdmin[0].count > 0) {
      console.log('ℹ️ Usuário admin já existe, pulando...');
    } else {
      // Criar usuário admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const [adminUser] = await client`
        INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
        VALUES ('Admin', 'teste@teste.com', ${hashedPassword}, 'super_admin', true)
        RETURNING id
      `;

      // Criar carteira para o admin
      await client`
        INSERT INTO carteiras (nome, usuario_id)
        VALUES ('Principal', ${adminUser.id})
      `;

      console.log('✅ Usuário admin criado com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro ao inserir dados padrão:', error);
    throw error;
  }
}

async function main() {
  try {
    await createTables();
    await insertDefaultData();
    console.log('🎉 Configuração de produção concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();