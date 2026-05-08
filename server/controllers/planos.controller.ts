import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Controller CRUD para a tabela `planos`.
 *
 * - GET /api/planos        → lista pública dos planos ativos (frontend de checkout)
 * - GET /api/planos/all    → lista TODOS os planos, inclusive inativos (admin)
 * - GET /api/planos/:id    → detalhe de um plano
 * - POST /api/planos       → criar plano (admin)
 * - PUT /api/planos/:id    → atualizar plano (admin)
 * - DELETE /api/planos/:id → remover plano (admin)
 *
 * O catálogo é a fonte de verdade local. O Stripe permanece como fonte de
 * verdade do preço e do produto — `stripe_price_id` é o vínculo.
 */

/**
 * Listar planos ATIVOS, ordenados por `ordem`. Usado pelo frontend de
 * checkout para renderizar os cards de planos disponíveis.
 */
export async function listPlanosAtivos(_req: Request, res: Response) {
  try {
    const result = await (storage as any).query(
      `SELECT id, nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem, data_criacao
       FROM planos
       WHERE ativo = true
       ORDER BY ordem ASC, intervalo_meses ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Error in listPlanosAtivos:", error);
    return res.status(500).json({ error: "Erro ao listar planos" });
  }
}

/**
 * Listar TODOS os planos, inclusive inativos. Restrito ao admin.
 */
export async function listAllPlanos(_req: Request, res: Response) {
  try {
    const result = await (storage as any).query(
      `SELECT id, nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem, data_criacao
       FROM planos
       ORDER BY ordem ASC, intervalo_meses ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Error in listAllPlanos:", error);
    return res.status(500).json({ error: "Erro ao listar planos" });
  }
}

/**
 * Buscar um plano específico por id.
 */
export async function getPlano(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await (storage as any).query(
      `SELECT id, nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem, data_criacao
       FROM planos WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plano não encontrado" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error in getPlano:", error);
    return res.status(500).json({ error: "Erro ao buscar plano" });
  }
}

/**
 * Criar plano.
 *
 * Body: { nome, descricao?, intervalo_meses, valor_usd, stripe_price_id,
 *         stripe_product_id?, ativo?, ordem? }
 *
 * Validações:
 * - nome: obrigatório, string não vazia
 * - intervalo_meses: inteiro positivo
 * - valor_usd: número >= 0
 * - stripe_price_id: obrigatório, string única
 */
export async function createPlano(req: Request, res: Response) {
  try {
    const {
      nome,
      descricao,
      intervalo_meses,
      valor_usd,
      stripe_price_id,
      stripe_product_id,
      ativo,
      ordem,
    } = req.body ?? {};

    const validationError = validatePlano({
      nome,
      intervalo_meses,
      valor_usd,
      stripe_price_id,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await (storage as any).query(
      `INSERT INTO planos (nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem, data_criacao`,
      [
        nome.trim(),
        descricao ?? null,
        Number(intervalo_meses),
        Number(valor_usd),
        stripe_price_id.trim(),
        stripe_product_id ?? null,
        ativo === undefined ? true : Boolean(ativo),
        ordem === undefined ? 0 : Number(ordem),
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "Já existe um plano com esse stripe_price_id",
      });
    }
    console.error("Error in createPlano:", error);
    return res.status(500).json({ error: "Erro ao criar plano" });
  }
}

/**
 * Atualizar plano. Aceita atualização parcial — campos não enviados
 * permanecem inalterados.
 */
export async function updatePlano(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const existing = await (storage as any).query(
      `SELECT id FROM planos WHERE id = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Plano não encontrado" });
    }

    const allowedFields = [
      "nome",
      "descricao",
      "intervalo_meses",
      "valor_usd",
      "stripe_price_id",
      "stripe_product_id",
      "ativo",
      "ordem",
    ];

    const sets: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    params.push(id);
    const result = await (storage as any).query(
      `UPDATE planos SET ${sets.join(", ")} WHERE id = $${params.length}
       RETURNING id, nome, descricao, intervalo_meses, valor_usd, stripe_price_id, stripe_product_id, ativo, ordem, data_criacao`,
      params
    );

    return res.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "Já existe outro plano com esse stripe_price_id",
      });
    }
    console.error("Error in updatePlano:", error);
    return res.status(500).json({ error: "Erro ao atualizar plano" });
  }
}

/**
 * Remover plano. Recomenda-se usar `ativo=false` em vez de deletar quando
 * já houver assinaturas vinculadas a este plano (preserva histórico).
 */
export async function deletePlano(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await (storage as any).query(
      `DELETE FROM planos WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plano não encontrado" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error in deletePlano:", error);
    return res
      .status(500)
      .json({ error: "Erro ao remover plano (verifique vínculos)" });
  }
}

// --------- helpers ---------

function validatePlano(data: {
  nome: unknown;
  intervalo_meses: unknown;
  valor_usd: unknown;
  stripe_price_id: unknown;
}): string | null {
  if (!data.nome || typeof data.nome !== "string" || !data.nome.trim()) {
    return "Campo `nome` é obrigatório";
  }
  const intervalo = Number(data.intervalo_meses);
  if (!Number.isInteger(intervalo) || intervalo <= 0) {
    return "Campo `intervalo_meses` deve ser inteiro positivo";
  }
  const valor = Number(data.valor_usd);
  if (!Number.isFinite(valor) || valor < 0) {
    return "Campo `valor_usd` deve ser número >= 0";
  }
  if (
    !data.stripe_price_id ||
    typeof data.stripe_price_id !== "string" ||
    !data.stripe_price_id.trim()
  ) {
    return "Campo `stripe_price_id` é obrigatório";
  }
  return null;
}
