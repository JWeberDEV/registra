import { Request, Response, NextFunction } from "express";
import { auth } from "./auth.middleware";
import { apiKeyAuth } from "./apiKey.middleware";
import { requireActiveSubscription } from "./subscriptionCheck.middleware";

/**
 * Middleware que tenta autenticar primeiro via sessão e depois via API Key.
 * Após autenticar, valida que o plano do usuário não está expirado.
 *
 * Permite que endpoints sejam acessados tanto pela interface web quanto
 * por sistemas externos, sempre respeitando a expiração de assinatura.
 */
export async function combinedAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Escolhe o autenticador baseado no header
  const baseAuth = req.headers.apikey ? apiKeyAuth : auth;

  // Encadeia: auth → requireActiveSubscription → next
  baseAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    // Se baseAuth já enviou resposta (401), não prossegue
    if (res.headersSent) return;
    // Se não populou req.user, prossegue (resposta de erro deve estar a caminho)
    if (!req.user) return;
    return requireActiveSubscription(req, res, next);
  });
}
