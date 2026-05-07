import { Request, Response, NextFunction } from 'express';
import postgres from 'postgres';

export async function setupRedirect(req: Request, res: Response, next: NextFunction) {
  // Debug logs
  console.log('🔍 Setup Middleware Debug:', {
    path: req.path,
    setupEnv: process.env.SETUP,
    isSetupMode: process.env.SETUP === 'true'
  });

  // Não aplicar em rotas da API, setup, ou arquivos estáticos
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/setup') || 
      req.path.includes('.') || 
      req.path.startsWith('/src/') ||
      req.path.startsWith('/@vite/')) {
    console.log('✅ Permitindo acesso direto para:', req.path);
    return next();
  }

  const isSetupMode = process.env.SETUP === 'true';
  
  if (!isSetupMode) {
    console.log('✅ Setup mode desabilitado, continuando...');
    return next();
  }

  // Se estamos em setup mode, redirecionar para setup
  console.log('🔄 Redirecionando para setup...');
  return res.redirect('/setup');
} 