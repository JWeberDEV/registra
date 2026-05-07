import { Request, Response, NextFunction } from "express";
import { auth } from "./auth.middleware";
import { apiKeyAuth } from "./apiKey.middleware";

/**
 * Middleware que tenta autenticar primeiro via sessão e depois via API Key
 * Permite que endpoints sejam acessados tanto pela interface web quanto por sistemas externos
 */
export async function combinedAuth(req: Request, res: Response, next: NextFunction) {
  // Verificar se há API Key
  if (req.headers.apikey) {
    return apiKeyAuth(req, res, next);
  }
  
  // Se não houver API Key, verificar autenticação por sessão
  return auth(req, res, next);
}