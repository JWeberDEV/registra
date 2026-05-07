import { Request, Response } from "express";
import postgres from "postgres";

interface WahaSessionWebhook {
  id?: number;
  session_name: string;
  webhook_hash: string;
  webhook_url: string;
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Configuração da conexão
const getClient = () => postgres(process.env.DATABASE_URL || '', { prepare: false });

// Função para gerar hash único para webhook de sessão
const generateSessionWebhookHash = async (sessionName: string): Promise<string> => {
  const crypto = await import('crypto');
  
  // Gerar hash SHA-256 da sessão + timestamp + random
  const data = `${sessionName}_${Date.now()}_${Math.random()}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  // Pegar os primeiros 5 caracteres do hash
  // Incluir maiúsculas, minúsculas e números
  const base = hash.substring(0, 8);
  
  // Converter para mix de maiúsculas/minúsculas/números
  let result = '';
  for (let i = 0; i < 5; i++) {
    const char = base[i];
    if (i % 3 === 0) {
      result += char.toUpperCase();
    } else if (i % 3 === 1) {
      result += char.toLowerCase();
    } else {
      // Converter para número se possível, senão manter letra
      const num = parseInt(char, 16) % 10;
      result += num.toString();
    }
  }
  
  return result;
};

// Função para gerar URL completa do webhook da sessão
const generateSessionWebhookUrl = (hash: string): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/waha/webhook/${hash}`;
};

// Função para garantir que a tabela de webhooks de sessão existe
const ensureSessionWebhookTable = async (client: any): Promise<void> => {
  try {
    // Verificar se a tabela existe
    const tableExists = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'waha_session_webhooks'
    `;
    
    if (tableExists.length === 0) {
      console.log('[WAHA Session Webhooks] Criando tabela waha_session_webhooks...');
      
      // Criar a tabela
      await client`
        CREATE TABLE waha_session_webhooks (
          id SERIAL PRIMARY KEY,
          session_name VARCHAR(255) NOT NULL UNIQUE,
          webhook_hash VARCHAR(10) NOT NULL UNIQUE,
          webhook_url TEXT NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      
      console.log('[WAHA Session Webhooks] ✅ Tabela waha_session_webhooks criada com sucesso');
    }
  } catch (error) {
    console.error('[WAHA Session Webhooks] Erro ao verificar/criar tabela:', error);
    // Não relançar o erro para não quebrar a aplicação
  }
};

export class WahaSessionWebhooksController {
  /**
   * Obter webhook para uma sessão específica
   */
  static async getSessionWebhook(req: Request, res: Response) {
    const client = getClient();
    try {
      const { sessionName } = req.params;
      
      if (!sessionName) {
        return res.status(400).json({
          success: false,
          message: 'Nome da sessão é obrigatório'
        });
      }

      // Garantir que a tabela existe
      await ensureSessionWebhookTable(client);
      
      // Buscar webhook da sessão
      let webhook = await client`
        SELECT * FROM waha_session_webhooks 
        WHERE session_name = ${sessionName}
        LIMIT 1
      `;
      
      // Se não existe, criar um automaticamente
      if (webhook.length === 0) {
        const webhookHash = await generateSessionWebhookHash(sessionName);
        const webhookUrl = generateSessionWebhookUrl(webhookHash);
        
        webhook = await client`
          INSERT INTO waha_session_webhooks (
            session_name, webhook_hash, webhook_url, enabled
          ) VALUES (
            ${sessionName}, ${webhookHash}, ${webhookUrl}, true
          )
          RETURNING *
        `;
      }

      res.json({
        success: true,
        data: webhook[0]
      });
    } catch (error) {
      console.error('Erro ao obter webhook da sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      await client.end();
    }
  }

  /**
   * Regenerar hash do webhook para uma sessão
   */
  static async regenerateSessionWebhook(req: Request, res: Response) {
    const client = getClient();
    try {
      const { sessionName } = req.params;
      
      if (!sessionName) {
        return res.status(400).json({
          success: false,
          message: 'Nome da sessão é obrigatório'
        });
      }

      // Garantir que a tabela existe
      await ensureSessionWebhookTable(client);
      
      // Gerar novo hash e URL
      const webhookHash = await generateSessionWebhookHash(sessionName);
      const webhookUrl = generateSessionWebhookUrl(webhookHash);
      
      // Verificar se já existe entrada para a sessão
      const existing = await client`
        SELECT id FROM waha_session_webhooks 
        WHERE session_name = ${sessionName}
        LIMIT 1
      `;
      
      let result;
      
      if (existing.length > 0) {
        // Atualizar existente
        result = await client`
          UPDATE waha_session_webhooks 
          SET 
            webhook_hash = ${webhookHash},
            webhook_url = ${webhookUrl},
            updated_at = NOW()
          WHERE session_name = ${sessionName}
          RETURNING *
        `;
      } else {
        // Criar novo
        result = await client`
          INSERT INTO waha_session_webhooks (
            session_name, webhook_hash, webhook_url, enabled
          ) VALUES (
            ${sessionName}, ${webhookHash}, ${webhookUrl}, true
          )
          RETURNING *
        `;
      }

      res.json({
        success: true,
        message: 'Webhook regenerado com sucesso',
        data: result[0]
      });
    } catch (error) {
      console.error('Erro ao regenerar webhook da sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      await client.end();
    }
  }

  /**
   * Listar todos os webhooks de sessões
   */
  static async listSessionWebhooks(req: Request, res: Response) {
    const client = getClient();
    try {
      // Garantir que a tabela existe
      await ensureSessionWebhookTable(client);
      
      const webhooks = await client`
        SELECT * FROM waha_session_webhooks 
        ORDER BY session_name ASC
      `;

      res.json({
        success: true,
        data: webhooks
      });
    } catch (error) {
      console.error('Erro ao listar webhooks das sessões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      await client.end();
    }
  }

  /**
   * Ativar/desativar webhook de uma sessão
   */
  static async toggleSessionWebhook(req: Request, res: Response) {
    const client = getClient();
    try {
      const { sessionName } = req.params;
      const { enabled } = req.body;
      
      if (!sessionName) {
        return res.status(400).json({
          success: false,
          message: 'Nome da sessão é obrigatório'
        });
      }

      // Garantir que a tabela existe
      await ensureSessionWebhookTable(client);
      
      const result = await client`
        UPDATE waha_session_webhooks 
        SET 
          enabled = ${enabled ?? true},
          updated_at = NOW()
        WHERE session_name = ${sessionName}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Webhook da sessão não encontrado'
        });
      }

      res.json({
        success: true,
        message: `Webhook ${enabled ? 'ativado' : 'desativado'} com sucesso`,
        data: result[0]
      });
    } catch (error) {
      console.error('Erro ao ativar/desativar webhook da sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      await client.end();
    }
  }

  /**
   * Validar hash do webhook de sessão (usado internamente)
   */
  static async validateSessionWebhookHash(hash: string): Promise<{isValid: boolean, sessionName?: string}> {
    const client = getClient();
    try {
      await ensureSessionWebhookTable(client);
      
      const result = await client`
        SELECT session_name FROM waha_session_webhooks 
        WHERE webhook_hash = ${hash} 
        AND enabled = true
        LIMIT 1
      `;
      
      await client.end();
      
      if (result.length > 0) {
        return { isValid: true, sessionName: result[0].session_name };
      }
      
      return { isValid: false };
    } catch (error) {
      console.error('[WAHA Session Webhooks] Erro ao validar hash:', error);
      return { isValid: false };
    }
  }
}