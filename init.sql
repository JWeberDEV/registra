-- Inicialização do banco PostgreSQL para FinanceHub SaaS
-- Este arquivo é executado automaticamente na criação do container

-- Configurar timezone
SET timezone = 'America/Sao_Paulo';

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configurar encoding
SET client_encoding = 'UTF8';

-- Comentário informativo
COMMENT ON DATABASE financehub IS 'FinanceHub SaaS - Sistema de Gestão Financeira Personal';

-- Configurações de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Aplicar configurações
SELECT pg_reload_conf();

CREATE TABLE IF NOT EXISTS logos_customizados (
  id SERIAL PRIMARY KEY,
  theme VARCHAR(10) UNIQUE NOT NULL,
  filename VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);