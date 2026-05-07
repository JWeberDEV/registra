import { Request, Response } from "express";
import { storage } from "../storage";
import { insertTransactionSchema, updateTransactionSchema, type TransactionWithDetails } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { broadcastNotification } from "../websocket";
import { formatCurrency } from "../utils";

// Get all transactions for current user
export async function getTransactions(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const userId = req.user.id;
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ message: "Carteira não encontrada" });
    }
    
    // Get all transactions
    const transactions = await storage.getTransactionsByWalletId(wallet.id);
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error in getTransactions:", error);
    res.status(500).json({ message: "Erro ao obter transações" });
  }
}

// Get recent transactions for current user
export async function getRecentTransactions(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const userId = req.user.id;
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ message: "Carteira não encontrada" });
    }
    
    // Get limit parameter from query string
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    
    // Get recent transactions
    const transactions = await storage.getRecentTransactionsByWalletId(wallet.id, limit);
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error in getRecentTransactions:", error);
    res.status(500).json({ message: "Erro ao obter transações recentes" });
  }
}

// Get a specific transaction
export async function getTransaction(req: Request, res: Response) {
  try {
    console.log('\n=== TRANSACTION GET - REQUEST ===');
    console.log(`ID: ${req.params.id}`);
    console.log(`URL: ${req.originalUrl}`);
    console.log('=================================\n');

    if (!req.user) {
      console.log('\n=== TRANSACTION GET - UNAUTHORIZED ===');
      console.log('======================================\n');
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) {
      console.log('\n=== TRANSACTION GET - INVALID ID ===');
      console.log(`Valor do parâmetro id: ${req.params.id}`);
      console.log('===================================\n');
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(req.user.id);
    if (!wallet) {
      console.log('\n=== TRANSACTION GET - WALLET NOT FOUND ===');
      console.log(`User ID: ${req.user.id}`);
      console.log('========================================\n');
      return res.status(404).json({ error: "Carteira não encontrada" });
    }
    
    // Get transaction
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) {
      console.log('\n=== TRANSACTION GET - NOT FOUND ===');
      console.log(`Transaction ID: ${transactionId}`);
      console.log('==================================\n');
      return res.status(404).json({ error: "Transação não encontrada" });
    }
    
    // Check if the transaction belongs to the user's wallet
    if (transaction.carteira_id !== wallet.id) {
      console.log('\n=== TRANSACTION GET - FORBIDDEN ===');
      console.log(`Transaction wallet ID: ${transaction.carteira_id}, User wallet ID: ${wallet.id}`);
      console.log('==================================\n');
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    console.log('\n=== TRANSACTION GET - SUCCESS ===');
    console.log(`Transaction ID: ${transactionId} encontrada com sucesso`);
    console.log('================================\n');
    
    return res.status(200).json(transaction);
  } catch (error) {
    console.error('\n=== TRANSACTION GET - ERROR ===');
    console.error("Error in getTransaction:", error);
    console.error('==============================\n');
    return res.status(500).json({ error: "Erro ao obter transação" });
  }
}

// Create a new transaction
export async function createTransaction(req: Request, res: Response) {
  // Log de entrada detalhado
  console.log('\n=== TRANSACTION CREATE - REQUEST PAYLOAD ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('==========================================\n');
  
  try {
    if (!req.user) {
      const errorResponse = { error: "Não autenticado" };
      console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (401) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(401).json(errorResponse);
    }
    
    console.log('\n=== USER AUTHENTICATED ===');
    console.log(`User ID: ${req.user.id}`);
    console.log(`User Email: ${req.user.email}`);
    console.log(`User Type: ${req.user.tipo_usuario}`);
    console.log('==========================\n');
    
    const userId = req.user.id;
    
    // Get user's wallet first
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      const errorResponse = { message: "Carteira não encontrada" };
      console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (404) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(404).json(errorResponse);
    }
    
    // Validate request body
    const transactionData = insertTransactionSchema.parse(req.body);
    
    // Automatically assign the user's wallet ID if not provided or is 0 (from empty string)
    if (!transactionData.carteira_id || transactionData.carteira_id === 0) {
      transactionData.carteira_id = wallet.id;
      console.log(`\n=== AUTO-ASSIGNED WALLET ID ===`);
      console.log(`Wallet ID automaticamente atribuído: ${wallet.id}`);
      console.log(`=============================\n`);
    }
    
    // Automatically assign PIX as payment method if not provided
    if (!transactionData.forma_pagamento_id || transactionData.forma_pagamento_id === 0) {
      // Get PIX payment method ID dynamically
      const pixPaymentMethod = await storage.getPaymentMethodByName('PIX');
      if (pixPaymentMethod) {
        transactionData.forma_pagamento_id = pixPaymentMethod.id;
        console.log(`\n=== AUTO-ASSIGNED PAYMENT METHOD ===`);
        console.log(`Forma de pagamento automaticamente atribuída: PIX (ID: ${pixPaymentMethod.id})`);
        console.log(`====================================\n`);
      } else {
        // Fallback: try global payment methods first, then user methods
        let availablePaymentMethods = await storage.getGlobalPaymentMethods();
        if (availablePaymentMethods.length === 0) {
          availablePaymentMethods = await storage.getPaymentMethodsByUserId(userId);
        }
        
        if (availablePaymentMethods.length > 0) {
          transactionData.forma_pagamento_id = availablePaymentMethods[0].id;
          console.log(`\n=== AUTO-ASSIGNED PAYMENT METHOD (FALLBACK) ===`);
          console.log(`PIX não encontrado, usando: ${availablePaymentMethods[0].nome} (ID: ${availablePaymentMethods[0].id})`);
          console.log(`===============================================\n`);
        } else {
          const errorResponse = { message: "Nenhum método de pagamento disponível" };
          console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (400) ===');
          console.log(JSON.stringify(errorResponse, null, 2));
          console.log('============================================\n');
          return res.status(400).json(errorResponse);
        }
      }
    }
    
    // Check if carteira_id in the request matches the user's wallet (security check)
    if (transactionData.carteira_id !== wallet.id) {
      const errorResponse = { message: "Acesso negado - você só pode criar transações na sua própria carteira" };
      console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (403) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(403).json(errorResponse);
    }
    
    // Get the category to make sure it exists
    const category = await storage.getCategoryById(transactionData.categoria_id);
    if (!category) {
      const errorResponse = { message: "Categoria não encontrada" };
      console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (404) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(404).json(errorResponse);
    }
    
    // Ensure transaction tipo matches category tipo
    if (transactionData.tipo !== category.tipo) {
      const errorResponse = { 
        message: `Tipo de transação incompatível com a categoria. A categoria é do tipo ${category.tipo}`
      };
      console.log('\n=== TRANSACTION CREATE - ERROR RESPONSE (400) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(400).json(errorResponse);
    }
    
    // Create transaction
    const newTransaction = await storage.createTransaction(transactionData);
    
    // Enviar notificação em tempo real via WebSocket
    const notification = {
      id: `transaction_created_${newTransaction.id}`,
      type: 'success' as const,
      title: 'Nova Transação Criada',
      message: `${newTransaction.tipo === 'receita' ? 'Receita' : 'Despesa'} de ${formatCurrency(newTransaction.valor)} - ${newTransaction.descricao}`,
      timestamp: new Date().toISOString(),
      from: {
        id: req.user.id.toString(),
        name: req.user.nome,
        role: req.user.tipo_usuario
      },
      data: {
        event: 'transaction.created',
        transaction: newTransaction,
        userId: req.user.id,
        isImpersonated: req.isImpersonating || false
      }
    };

    console.log('\n=== ENVIANDO NOTIFICAÇÃO WEBSOCKET ===');
    console.log('Notificação:', JSON.stringify(notification, null, 2));
    console.log('Usuário ID:', req.user.id);
    console.log('Transação ID:', newTransaction.id);
    console.log('=====================================\n');

    // Enviar para o usuário que criou a transação (considerando personificação)
    const broadcastResult = broadcastNotification(notification, [req.user.id.toString()]);
    console.log('Resultado do broadcast:', broadcastResult);
    console.log('Broadcast enviado para usuário:', req.user.id);
    
    // Log de saída detalhado para sucesso
    console.log('\n=== TRANSACTION CREATE - SUCCESS RESPONSE (201) ===');
    console.log(JSON.stringify(newTransaction, null, 2));
    console.log('===============================================\n');
    
    res.status(201).json(newTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = { message: "Dados inválidos", errors: error.errors };
      console.log('\n=== TRANSACTION CREATE - VALIDATION ERROR (400) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('=================================================\n');
      return res.status(400).json(errorResponse);
    }
    console.error("Error in createTransaction:", error);
    const errorResponse = { message: "Erro ao criar transação" };
    console.log('\n=== TRANSACTION CREATE - SERVER ERROR (500) ===');
    console.log(JSON.stringify(errorResponse, null, 2));
    console.log('===========================================\n');
    res.status(500).json(errorResponse);
  }
}

// Update a transaction
export async function updateTransaction(req: Request, res: Response) {
  // Log de entrada detalhado
  console.log('\n=== TRANSACTION UPDATE - REQUEST PAYLOAD ===');
  console.log(`Transaction ID: ${req.params.id}`);
  console.log(`Método HTTP: ${req.method}`); // Registrar se é PUT ou PATCH
  console.log(`URL: ${req.originalUrl}`);
  console.log(JSON.stringify(req.body, null, 2));
  console.log('==========================================\n');
  
  try {
    if (!req.user) {
      const errorResponse = { error: "Não autenticado" };
      console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (401) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(401).json(errorResponse);
    }
    
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    if (isNaN(transactionId)) {
      const errorResponse = { error: "ID inválido" };
      console.log('\n=== TRANSACTION UPDATE - INVALID ID ===');
      console.log(`Valor do parâmetro id: ${req.params.id}`);
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('===================================\n');
      return res.status(400).json(errorResponse);
    }
    
    // Validate request body
    const validationResult = updateTransactionSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorResponse = { error: "Dados inválidos", details: validationResult.error.errors };
      console.log('\n=== TRANSACTION UPDATE - VALIDATION ERROR ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('========================================\n');
      return res.status(400).json(errorResponse);
    }
    
    const transactionData = validationResult.data;
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      const errorResponse = { error: "Carteira não encontrada" };
      console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (404) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(404).json(errorResponse);
    }
    
    // Get transaction to check ownership
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) {
      const errorResponse = { error: "Transação não encontrada" };
      console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (404) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(404).json(errorResponse);
    }
    
    // Check if the transaction belongs to the user's wallet
    if (transaction.carteira_id !== wallet.id) {
      const errorResponse = { error: "Acesso negado" };
      console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (403) ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('============================================\n');
      return res.status(403).json(errorResponse);
    }
    
    // If changing category, check if it exists and matches transaction type
    if (transactionData.categoria_id) {
      const category = await storage.getCategoryById(transactionData.categoria_id);
      if (!category) {
        const errorResponse = { message: "Categoria não encontrada" };
        console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (404) ===');
        console.log(JSON.stringify(errorResponse, null, 2));
        console.log('============================================\n');
        return res.status(404).json(errorResponse);
      }
      
      // If changing category but not type, ensure they match
      if (!transactionData.tipo && category.tipo !== transaction.tipo) {
        const errorResponse = { 
          message: `Categoria incompatível com o tipo da transação. A categoria é do tipo ${category.tipo}`
        };
        console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (400) ===');
        console.log(JSON.stringify(errorResponse, null, 2));
        console.log('============================================\n');
        return res.status(400).json(errorResponse);
      }
      
      // If changing both category and type, ensure they match
      if (transactionData.tipo && category.tipo !== transactionData.tipo) {
        const errorResponse = { 
          message: `Categoria incompatível com o tipo da transação. A categoria é do tipo ${category.tipo}`
        };
        console.log('\n=== TRANSACTION UPDATE - ERROR RESPONSE (400) ===');
        console.log(JSON.stringify(errorResponse, null, 2));
        console.log('============================================\n');
        return res.status(400).json(errorResponse);
      }
    }
    
    // Update transaction
    try {
      const updatedTransaction = await storage.updateTransaction(transactionId, transactionData);
      if (!updatedTransaction) {
        const errorResponse = { error: "Transação não encontrada ou não foi possível atualizar" };
        console.log('\n=== TRANSACTION UPDATE - UPDATE FAILED ===');
        console.log(`Transaction ID: ${transactionId}`);
        console.log(JSON.stringify(errorResponse, null, 2));
        console.log('=====================================\n');
        return res.status(404).json(errorResponse);
      }
      
      // Enviar notificação em tempo real via WebSocket
      const notification = {
        id: `transaction_updated_${updatedTransaction.id}`,
        type: 'info' as const,
        title: 'Transação Atualizada',
        message: `${updatedTransaction.tipo === 'receita' ? 'Receita' : 'Despesa'} de ${formatCurrency(updatedTransaction.valor)} - ${updatedTransaction.descricao}`,
        timestamp: new Date().toISOString(),
        from: {
          id: req.user.id.toString(),
          name: req.user.nome,
          role: req.user.tipo_usuario
        },
        data: {
          event: 'transaction.updated',
          transaction: updatedTransaction,
          userId: req.user.id,
          isImpersonated: req.isImpersonating || false
        }
      };

      // Enviar para o usuário que atualizou a transação (considerando personificação)
      broadcastNotification(notification, [req.user.id.toString()]);
      
      // Log de saída detalhado para sucesso
      console.log('\n=== TRANSACTION UPDATE - SUCCESS ===');
      console.log(`ID: ${transactionId}, Método: ${req.method}`);
      console.log(JSON.stringify(updatedTransaction, null, 2));
      console.log('==================================\n');
      
      return res.status(200).json(updatedTransaction);
    } catch (dbError) {
      console.error('\n=== TRANSACTION UPDATE - DATABASE ERROR ===');
      console.error(`Transaction ID: ${transactionId}`);
      console.error(dbError);
      console.error('=======================================\n');
      
      return res.status(500).json({
        error: "Erro ao atualizar transação no banco de dados",
        message: dbError.message || "Erro interno do servidor"
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = { error: "Dados inválidos", details: error.errors };
      console.log('\n=== TRANSACTION UPDATE - VALIDATION ERROR ===');
      console.log(JSON.stringify(errorResponse, null, 2));
      console.log('========================================\n');
      return res.status(400).json(errorResponse);
    }
    
    console.error('\n=== TRANSACTION UPDATE - UNHANDLED ERROR ===');
    console.error("Error in updateTransaction:", error);
    console.error('=========================================\n');
    
    return res.status(500).json({
      error: "Erro ao atualizar transação",
      message: error.message || "Erro interno do servidor"
    });
  }
}

// Delete a transaction
export async function deleteTransaction(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      return res.status(404).json({ message: "Carteira não encontrada" });
    }
    
    // Get transaction to check ownership
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    
    // Check if the transaction belongs to the user's wallet
    if (transaction.carteira_id !== wallet.id) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    // Delete transaction
    const success = await storage.deleteTransaction(transactionId);
    if (!success) {
      return res.status(500).json({ message: "Erro ao excluir transação" });
    }
    
    // Enviar notificação em tempo real via WebSocket
    const notification = {
      id: `transaction_deleted_${transactionId}`,
      type: 'warning' as const,
      title: 'Transação Excluída',
      message: `${transaction.tipo === 'receita' ? 'Receita' : 'Despesa'} de ${formatCurrency(transaction.valor)} - ${transaction.descricao}`,
      timestamp: new Date().toISOString(),
      from: {
        id: req.user.id.toString(),
        name: req.user.nome,
        role: req.user.tipo_usuario
      },
      data: {
        event: 'transaction.deleted',
        transactionId: transactionId,
        transaction: transaction,
        userId: req.user.id,
        isImpersonated: req.isImpersonating || false
      }
    };

    // Enviar para o usuário que excluiu a transação (considerando personificação)
    broadcastNotification(notification, [req.user.id.toString()]);
    
    res.status(200).json({ message: "Transação excluída com sucesso" });
  } catch (error) {
    console.error("Error in deleteTransaction:", error);
    res.status(500).json({ message: "Erro ao excluir transação" });
  }
}


// Get dashboard summary data
export async function getDashboardSummary(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const userId = req.user.id;
    console.log("🔍 Dashboard Summary - UserId:", userId);
    
    // Get user's wallet
    const wallet = await storage.getWalletByUserId(userId);
    if (!wallet) {
      console.log("❌ Carteira não encontrada para userId:", userId);
      return res.status(404).json({ message: "Carteira não encontrada" });
    }
    
    console.log("💼 Carteira encontrada - ID:", wallet.id, "Saldo:", wallet.saldo_atual);
    
    // Get monthly transaction summary
    const monthlyData = await storage.getMonthlyTransactionSummary(wallet.id);
    console.log("📊 Monthly Data:", JSON.stringify(monthlyData, null, 2));
    
    // Get expenses by category
    const expensesData = await storage.getExpensesByCategory(wallet.id);
    console.log("📈 Expenses Data:", JSON.stringify(expensesData, null, 2));
    
    // Calculate total expenses for percentage calculation
    const totalExpensesAmount = expensesData.reduce(
      (total: number, item: any) => total + Number(item.total), 
      0
    );
    
    // Add percentage to each category
    const expensesByCategory = expensesData.map((item: any) => ({
      categoryId: Number(item.category_id),
      name: item.name,
      total: Number(item.total),
      color: item.color,
      icon: item.icon,
      percentage: totalExpensesAmount > 0 
        ? Math.round((Number(item.total) / totalExpensesAmount) * 100) 
        : 0
    }));
    
    // Get income and expense totals
    const { totalIncome, totalExpenses } = await storage.getIncomeExpenseTotals(wallet.id);
    
    console.log("💰 Dashboard totals:", { totalIncome, totalExpenses });
    console.log("📝 ExpensesByCategory processed:", JSON.stringify(expensesByCategory, null, 2));
    
    const responseData = {
      monthlyData,
      expensesByCategory,
      totalIncome,
      totalExpenses
    };
    
    console.log("📤 Final Response:", JSON.stringify(responseData, null, 2));
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Error in getDashboardSummary:", error);
    res.status(500).json({ message: "Erro ao obter resumo do dashboard" });
  }
}
