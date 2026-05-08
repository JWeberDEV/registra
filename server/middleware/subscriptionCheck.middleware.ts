import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware que valida se a assinatura do usuário está ativa e não expirada.
 * Deve rodar APÓS o middleware de autenticação (espera `req.user` populado).
 *
 * - super_admin: bypass total (admins não dependem de assinatura).
 * - data_expiracao_assinatura no passado: bloqueia 401, desativa o usuário.
 * - data_expiracao_assinatura nula: permite (compatibilidade com usuários
 *   antigos sem subscription Stripe). A regra de negócio pode endurecer
 *   isso depois, mas evita bloquear usuários legados.
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;

    if (!user) {
      // Sem usuário autenticado, deixa para o middleware de auth tratar
      return next();
    }

    // super_admin nunca é bloqueado por expiração de plano
    if (user.tipo_usuario === "super_admin") {
      return next();
    }

    // Sem data de expiração: permite (usuário legado / pré-Stripe).
    // Quando a migração para Stripe estiver completa, trocar para bloquear.
    if (!user.data_expiracao_assinatura) {
      return next();
    }

    const now = new Date();
    const expirationDate = new Date(user.data_expiracao_assinatura);

    if (now <= expirationDate) {
      return next();
    }

    // Plano expirado: desativar usuário se ainda estiver ativo, e bloquear
    if (user.ativo) {
      try {
        await storage.updateUser(user.id, {
          ativo: false,
          status_assinatura: "expirada",
        });
      } catch (err) {
        console.error(
          `Failed to deactivate expired user ${user.id}:`,
          err
        );
      }
    }

    console.log(
      `🚫 BLOCKED REQUEST: user ${user.id} (${user.email}) — plan expired at ${expirationDate.toISOString()}`
    );

    return res.status(401).json({
      error: "Sua assinatura expirou. Renove para continuar usando o sistema.",
      subscriptionExpired: true,
      expirationDate: expirationDate.toISOString(),
    });
  } catch (error) {
    console.error("Error in requireActiveSubscription middleware:", error);
    return res.status(500).json({ error: "Erro ao validar assinatura" });
  }
}
