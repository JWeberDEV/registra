import { Request, Response } from "express";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { 
  users, 
  categories, 
  paymentMethods, 
  wallets,
  apiTokens
} from "../../shared/schema.js";
import bcrypt from "bcryptjs";

interface SetupData {
  databaseUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export async function getSetupStatus(req: Request, res: Response) {
  try {
    console.log('🔍 Setup Controller Debug:', {
      setupEnv: process.env.SETUP,
      isSetupMode: process.env.SETUP === 'true'
    });

    const isSetupMode = process.env.SETUP === 'true';
    
    if (!isSetupMode) {
      console.log('❌ Setup mode desabilitado');
      return res.json({
        setupMode: false,
        message: "Setup mode is not enabled"
      });
    }

    // Verificar se já existe um usuário no banco
    let hasExistingData = false;
    try {
      const client = postgres(process.env.DATABASE_URL || '');
      const result = await client`SELECT COUNT(*) as count FROM usuarios`;
      hasExistingData = parseInt(result[0]?.count || '0') > 0;
      await client.end();
    } catch (error) {
      // Se não conseguir conectar, assume que não há dados
      hasExistingData = false;
    }

    res.json({
      setupMode: true,
      hasExistingData,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not_configured'
    });

  } catch (error) {
    console.error('Erro ao verificar status do setup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function testDatabaseConnection(req: Request, res: Response) {
  try {
    const { databaseUrl } = req.body;

    if (!databaseUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL do banco de dados é obrigatória'
      });
    }

    // Testar conexão
    const client = postgres(databaseUrl, { prepare: false });
    
    try {
      await client`SELECT 1`;
      await client.end();
      
      res.json({
        success: true,
        message: 'Conexão com banco de dados estabelecida com sucesso!'
      });
    } catch (error) {
      await client.end();
      throw error;
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: 'Falha na conexão com banco de dados',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function saveDbUrl(req: Request, res: Response) {
  try {
    const { databaseUrl } = req.body;

    if (!databaseUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL do banco de dados é obrigatória'
      });
    }

    // Testar conexão
    const client = postgres(databaseUrl, { prepare: false });
    try {
      await client`SELECT 1`;
      await client.end();
      // Salvar temporariamente em process.env (ou arquivo, se preferir)
      process.env.DATABASE_URL = databaseUrl;
      res.json({
        success: true,
        message: 'Conexão testada e URL salva temporariamente com sucesso!'
      });
    } catch (error) {
      await client.end();
      return res.status(500).json({
        success: false,
        message: 'Falha ao conectar com o banco de dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  } catch (error) {
    console.error('Erro ao salvar URL do banco:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao salvar URL do banco',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function runSetup(req: Request, res: Response) {
  try {
    const { databaseUrl, adminEmail, adminPassword, adminName }: SetupData = req.body;

    if (!databaseUrl || !adminEmail || !adminPassword || !adminName) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    console.log('🚀 Iniciando setup do sistema...');

    // 1. Conectar ao banco
    const client = postgres(databaseUrl, { prepare: false });
    const db = drizzle(client);
    
    // Atualizar a variável de ambiente para uso futuro
    process.env.DATABASE_URL = databaseUrl;

    try {
      // 2. Executar migrações
      console.log('📋 Executando migrações...');
      await migrate(db, { migrationsFolder: './drizzle' });

      // 3. Criar usuário superadmin
      console.log('👤 Criando usuário superadmin...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const [adminUser] = await db.insert(users).values({
        nome: adminName,
        email: adminEmail,
        senha: hashedPassword,
        tipo_usuario: 'superadmin',
        ativo: true,
        remoteJid: ''
      }).returning();

      // 4. Criar carteira padrão para o admin
      console.log('💰 Criando carteira padrão...');
      await db.insert(wallets).values({
        usuario_id: adminUser.id,
        nome: 'Carteira Principal',
        descricao: 'Carteira padrão criada automaticamente',
        saldo_atual: '0.00'
      });

      // 5. Criar categorias globais
      console.log('📂 Criando categorias globais...');
      const defaultCategories = [
        // Despesas
        { nome: 'Alimentação', tipo: 'Despesa', cor: '#FF6B6B', icone: '🍽️', descricao: 'Gastos com alimentação e refeições' },
        { nome: 'Transporte', tipo: 'Despesa', cor: '#4ECDC4', icone: '🚗', descricao: 'Gastos com transporte e locomoção' },
        { nome: 'Moradia', tipo: 'Despesa', cor: '#45B7D1', icone: '🏠', descricao: 'Gastos com moradia e aluguel' },
        { nome: 'Saúde', tipo: 'Despesa', cor: '#96CEB4', icone: '🏥', descricao: 'Gastos com saúde e medicamentos' },
        { nome: 'Educação', tipo: 'Despesa', cor: '#FFEAA7', icone: '📚', descricao: 'Gastos com educação e cursos' },
        { nome: 'Lazer', tipo: 'Despesa', cor: '#DDA0DD', icone: '🎮', descricao: 'Gastos com lazer e entretenimento' },
        { nome: 'Vestuário', tipo: 'Despesa', cor: '#F8BBD9', icone: '👕', descricao: 'Gastos com roupas e acessórios' },
        { nome: 'Serviços', tipo: 'Despesa', cor: '#FFB74D', icone: '🔧', descricao: 'Gastos com serviços diversos' },
        { nome: 'Impostos', tipo: 'Despesa', cor: '#A1887F', icone: '💰', descricao: 'Pagamento de impostos e taxas' },
        { nome: 'Outros', tipo: 'Despesa', cor: '#90A4AE', icone: '📦', descricao: 'Outros gastos diversos' },
        
        // Receitas
        { nome: 'Salário', tipo: 'Receita', cor: '#4CAF50', icone: '💼', descricao: 'Receita de salário e trabalho' },
        { nome: 'Freelance', tipo: 'Receita', cor: '#8BC34A', icone: '💻', descricao: 'Receita de trabalhos freelancer' },
        { nome: 'Investimentos', tipo: 'Receita', cor: '#FFC107', icone: '📈', descricao: 'Receita de investimentos' },
        { nome: 'Presentes', tipo: 'Receita', cor: '#E91E63', icone: '🎁', descricao: 'Receita de presentes e doações' },
        { nome: 'Reembolso', tipo: 'Receita', cor: '#9C27B0', icone: '💸', descricao: 'Reembolsos e devoluções' },
        { nome: 'Outros', tipo: 'Receita', cor: '#607D8B', icone: '📦', descricao: 'Outras receitas diversas' }
      ];

      for (const category of defaultCategories) {
        await db.insert(categories).values({
          ...category,
          global: true,
          usuario_id: null
        });
      }

      // 6. Criar formas de pagamento globais
      console.log('💳 Criando formas de pagamento globais...');
      const defaultPaymentMethods = [
        { nome: 'PIX', descricao: 'Pagamento via PIX', icone: '📱', cor: '#32CD32', global: true },
        { nome: 'Cartão de Crédito', descricao: 'Pagamento com cartão de crédito', icone: '💳', cor: '#FF6B35', global: true },
        { nome: 'Dinheiro', descricao: 'Pagamento em dinheiro', icone: '💵', cor: '#4CAF50', global: true },
        { nome: 'Cartão de Débito', descricao: 'Pagamento com cartão de débito', icone: '🏦', cor: '#2196F3', global: true },
        { nome: 'Transferência', descricao: 'Transferência bancária', icone: '🏛️', cor: '#9C27B0', global: true },
        { nome: 'Boleto', descricao: 'Pagamento via boleto', icone: '📄', cor: '#FF9800', global: true }
      ];

      for (const paymentMethod of defaultPaymentMethods) {
        await db.insert(paymentMethods).values({
          ...paymentMethod,
          usuario_id: null,
          ativo: true
        });
      }

      // 7. Criar token API para o admin
      console.log('🔑 Criando token API...');
      const apiToken = generateApiToken();
      await db.insert(apiTokens).values({
        usuario_id: adminUser.id,
        token: apiToken,
        nome: 'Token Principal',
        descricao: 'Token API principal criado automaticamente',
        ativo: true
      });

      await client.end();

      console.log('✅ Setup concluído com sucesso!');

      res.json({
        success: true,
        message: 'Setup concluído com sucesso!',
        data: {
          adminEmail,
          adminName,
          apiToken
        }
      });

    } catch (error) {
      await client.end();
      throw error;
    }

  } catch (error) {
    console.error('Erro durante setup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro durante o setup',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function createAdmin(req: Request, res: Response) {
  try {
    const { adminName, adminEmail, adminPassword } = req.body;
    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha do admin são obrigatórios'
      });
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL do banco de dados não configurada. Salve a URL primeiro.'
      });
    }
    const client = postgres(databaseUrl, { prepare: false });
    try {
      // Verificar se já existe admin
      const existing = await client`SELECT * FROM usuarios WHERE email = ${adminEmail}`;
      if (existing.length > 0) {
        await client.end();
        return res.status(400).json({
          success: false,
          message: 'Já existe um usuário com este email.'
        });
      }
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const inserted = await client`INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo, remoteJid) VALUES (${adminName}, ${adminEmail}, ${hashedPassword}, 'superadmin', true, '') RETURNING id`;
      await client.end();
      res.json({
        success: true,
        message: 'Usuário admin criado com sucesso!',
        adminId: inserted[0]?.id
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário admin',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function finishSetup(req: Request, res: Response) {
  try {
    const { adminEmail } = req.body;
    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email do admin é obrigatório'
      });
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL do banco de dados não configurada.'
      });
    }
    const client = postgres(databaseUrl, { prepare: false });
    const db = drizzle(client);
    try {
      // Executar migrações antes de criar dados
      await migrate(db, { migrationsFolder: './drizzle' });
      // Buscar admin
      const adminRows = await client`SELECT * FROM usuarios WHERE email = ${adminEmail}`;
      const adminUser = adminRows[0];
      if (!adminUser) {
        await client.end();
        return res.status(400).json({
          success: false,
          message: 'Usuário admin não encontrado.'
        });
      }
      // Criar carteira padrão
      await client`INSERT INTO carteiras (usuario_id, nome, descricao, saldo_atual) VALUES (${adminUser.id}, 'Carteira Principal', 'Carteira padrão criada automaticamente', '0.00')`;
      // Criar categorias globais
      const defaultCategories = [
        { nome: 'Alimentação', tipo: 'Despesa', cor: '#FF6B6B', icone: '🍽️', descricao: 'Gastos com alimentação e refeições' },
        { nome: 'Transporte', tipo: 'Despesa', cor: '#4ECDC4', icone: '🚗', descricao: 'Gastos com transporte e locomoção' },
        { nome: 'Moradia', tipo: 'Despesa', cor: '#45B7D1', icone: '🏠', descricao: 'Gastos com moradia e aluguel' },
        { nome: 'Saúde', tipo: 'Despesa', cor: '#96CEB4', icone: '🏥', descricao: 'Gastos com saúde e medicamentos' },
        { nome: 'Educação', tipo: 'Despesa', cor: '#FFEAA7', icone: '📚', descricao: 'Gastos com educação e cursos' },
        { nome: 'Lazer', tipo: 'Despesa', cor: '#DDA0DD', icone: '🎮', descricao: 'Gastos com lazer e entretenimento' },
        { nome: 'Vestuário', tipo: 'Despesa', cor: '#F8BBD9', icone: '👕', descricao: 'Gastos com roupas e acessórios' },
        { nome: 'Serviços', tipo: 'Despesa', cor: '#FFB74D', icone: '🔧', descricao: 'Gastos com serviços diversos' },
        { nome: 'Impostos', tipo: 'Despesa', cor: '#A1887F', icone: '💰', descricao: 'Pagamento de impostos e taxas' },
        { nome: 'Outros', tipo: 'Despesa', cor: '#90A4AE', icone: '📦', descricao: 'Outros gastos diversos' },
        { nome: 'Salário', tipo: 'Receita', cor: '#4CAF50', icone: '💼', descricao: 'Receita de salário e trabalho' },
        { nome: 'Freelance', tipo: 'Receita', cor: '#8BC34A', icone: '💻', descricao: 'Receita de trabalhos freelancer' },
        { nome: 'Investimentos', tipo: 'Receita', cor: '#FFC107', icone: '📈', descricao: 'Receita de investimentos' },
        { nome: 'Presentes', tipo: 'Receita', cor: '#E91E63', icone: '🎁', descricao: 'Receita de presentes e doações' },
        { nome: 'Reembolso', tipo: 'Receita', cor: '#9C27B0', icone: '💸', descricao: 'Reembolsos e devoluções' },
        { nome: 'Outros', tipo: 'Receita', cor: '#607D8B', icone: '📦', descricao: 'Outras receitas diversas' }
      ];
      for (const category of defaultCategories) {
        await client`INSERT INTO categorias (nome, tipo, cor, icone, descricao, global, usuario_id) VALUES (${category.nome}, ${category.tipo}, ${category.cor}, ${category.icone}, ${category.descricao}, true, NULL)`;
      }
      // Criar formas de pagamento globais
      const defaultPaymentMethods = [
        { nome: 'PIX', descricao: 'Pagamento via PIX', icone: '📱', cor: '#32CD32', global: true },
        { nome: 'Cartão de Crédito', descricao: 'Pagamento com cartão de crédito', icone: '💳', cor: '#FF6B35', global: true },
        { nome: 'Dinheiro', descricao: 'Pagamento em dinheiro', icone: '💵', cor: '#4CAF50', global: true },
        { nome: 'Cartão de Débito', descricao: 'Pagamento com cartão de débito', icone: '🏦', cor: '#2196F3', global: true },
        { nome: 'Transferência', descricao: 'Transferência bancária', icone: '🏛️', cor: '#9C27B0', global: true },
        { nome: 'Boleto', descricao: 'Pagamento via boleto', icone: '📄', cor: '#FF9800', global: true }
      ];
      for (const paymentMethod of defaultPaymentMethods) {
        await client`INSERT INTO formas_pagamento (nome, descricao, icone, cor, global, usuario_id, ativo) VALUES (${paymentMethod.nome}, ${paymentMethod.descricao}, ${paymentMethod.icone}, ${paymentMethod.cor}, true, NULL, true)`;
      }
      // Criar token API para o admin
      const apiToken = generateApiToken();
      await client`INSERT INTO tokens_api (usuario_id, token, nome, descricao, ativo) VALUES (${adminUser.id}, ${apiToken}, 'Token Principal', 'Token API principal criado automaticamente', true)`;
      await client.end();
      res.json({
        success: true,
        message: 'Setup finalizado com sucesso!',
        apiToken
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao finalizar setup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao finalizar setup',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

function generateApiToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 