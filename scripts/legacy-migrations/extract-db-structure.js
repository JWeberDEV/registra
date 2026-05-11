import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const DATABASE_URL = 'postgres://postgres:90d6b1d7c819709ca1c8@painel-main.pulsofinanceiro.net.br:5432/pulsofinanceiro?sslmode=disable';

async function extractDatabaseStructure() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados PostgreSQL');

    // Extrair informações das tabelas
    const tablesQuery = `
      SELECT 
        t.table_name,
        t.table_type,
        obj_description(c.oid) as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    console.log(`Encontradas ${tablesResult.rows.length} tabelas`);

    let markdown = '# Estrutura do Banco de Dados - Produção\n\n';
    markdown += `Gerado em: ${new Date().toISOString()}\n\n`;

    // Para cada tabela, extrair colunas e índices
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`Processando tabela: ${tableName}`);

      markdown += `## Tabela: ${tableName}\n\n`;
      if (table.table_comment) {
        markdown += `**Descrição:** ${table.table_comment}\n\n`;
      }

      // Gerar DDL da tabela
      const ddlQuery = `
        SELECT 
          'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
          array_to_string(
            array_agg(
              '    ' || column_name || ' ' || 
              CASE 
                WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                WHEN data_type = 'integer' THEN 'INTEGER'
                WHEN data_type = 'bigint' THEN 'BIGINT'
                WHEN data_type = 'smallint' THEN 'SMALLINT'
                WHEN data_type = 'boolean' THEN 'BOOLEAN'
                WHEN data_type = 'text' THEN 'TEXT'
                WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                WHEN data_type = 'date' THEN 'DATE'
                WHEN data_type = 'time' THEN 'TIME'
                WHEN data_type = 'uuid' THEN 'UUID'
                ELSE UPPER(data_type)
              END ||
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
              ORDER BY ordinal_position
            ), 
            ',\n'
          ) || 
          '\n);' as create_table_sql
        FROM information_schema.columns c
        LEFT JOIN information_schema.tables t ON c.table_name = t.table_name
        WHERE c.table_name = $1 AND c.table_schema = 'public'
        GROUP BY schemaname, tablename;
      `;

      try {
        const ddlResult = await client.query(`
          SELECT 
            'CREATE TABLE public.' || $1 || ' (' ||
            array_to_string(
              array_agg(
                '    ' || column_name || ' ' || 
                CASE 
                  WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                  WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                  WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                  WHEN data_type = 'integer' THEN 'INTEGER'
                  WHEN data_type = 'bigint' THEN 'BIGINT'
                  WHEN data_type = 'smallint' THEN 'SMALLINT'
                  WHEN data_type = 'boolean' THEN 'BOOLEAN'
                  WHEN data_type = 'text' THEN 'TEXT'
                  WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                  WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                  WHEN data_type = 'date' THEN 'DATE'
                  WHEN data_type = 'time' THEN 'TIME'
                  WHEN data_type = 'uuid' THEN 'UUID'
                  ELSE UPPER(data_type)
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
                ORDER BY ordinal_position
              ), 
              ',\n'
            ) || 
            '\n);' as create_table_sql
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);

        if (ddlResult.rows.length > 0) {
          markdown += '### SQL DDL\n\n';
          markdown += '```sql\n';
          markdown += ddlResult.rows[0].create_table_sql;
          markdown += '\n```\n\n';
        }
      } catch (ddlError) {
        console.log(`Erro ao gerar DDL para ${tableName}:`, ddlError.message);
      }

      // Extrair colunas
      const columnsQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          col_description(pgc.oid, c.ordinal_position) as column_comment
        FROM information_schema.columns c
        LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
        WHERE c.table_name = $1
        AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [tableName]);

      markdown += '### Colunas\n\n';
      markdown += '| Campo | Tipo | Tamanho | Nullable | Default | Comentário |\n';
      markdown += '|-------|------|---------|----------|---------|------------|\n';

      columnsResult.rows.forEach(col => {
        const typeInfo = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.numeric_precision 
            ? `${col.data_type}(${col.numeric_precision},${col.numeric_scale || 0})`
            : col.data_type;
        
        markdown += `| ${col.column_name} | ${typeInfo} | ${col.character_maximum_length || '-'} | ${col.is_nullable} | ${col.column_default || '-'} | ${col.column_comment || '-'} |\n`;
      });

      // Extrair chaves primárias
      const pkQuery = `
        SELECT 
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public';
      `;

      const pkResult = await client.query(pkQuery, [tableName]);
      if (pkResult.rows.length > 0) {
        markdown += '\n### Chave Primária\n\n';
        markdown += `- ${pkResult.rows.map(row => row.column_name).join(', ')}\n`;
      }

      // Extrair chaves estrangeiras
      const fkQuery = `
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
        AND tc.table_schema = 'public';
      `;

      const fkResult = await client.query(fkQuery, [tableName]);
      if (fkResult.rows.length > 0) {
        markdown += '\n### Chaves Estrangeiras\n\n';
        fkResult.rows.forEach(fk => {
          markdown += `- **${fk.column_name}** → ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})\n`;
        });
      }

      // Extrair índices
      const indexQuery = `
        SELECT 
          i.relname AS index_name,
          am.amname AS index_type,
          idx.indisunique AS is_unique,
          array_agg(a.attname ORDER BY c.ordinality) AS columns
        FROM pg_index idx
        JOIN pg_class i ON i.oid = idx.indexrelid
        JOIN pg_class t ON t.oid = idx.indrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN unnest(idx.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = c.attnum
        WHERE t.relname = $1
        AND i.relname NOT LIKE '%_pkey'
        GROUP BY i.relname, am.amname, idx.indisunique
        ORDER BY i.relname;
      `;

      const indexResult = await client.query(indexQuery, [tableName]);
      if (indexResult.rows.length > 0) {
        markdown += '\n### Índices\n\n';
        indexResult.rows.forEach(idx => {
          const uniqueText = idx.is_unique ? ' (UNIQUE)' : '';
          const columns = Array.isArray(idx.columns) ? idx.columns.join(', ') : idx.columns;
          markdown += `- **${idx.index_name}** ${uniqueText}: ${columns} (${idx.index_type})\n`;
        });
      }

      // Gerar DDL das constraints
      const constraintsQuery = `
        SELECT 
          'ALTER TABLE public.' || tc.table_name || 
          CASE 
            WHEN tc.constraint_type = 'PRIMARY KEY' THEN 
              ' ADD CONSTRAINT ' || tc.constraint_name || ' PRIMARY KEY (' || 
              string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
            WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
              ' ADD CONSTRAINT ' || tc.constraint_name || ' FOREIGN KEY (' || 
              string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || 
              ') REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ');'
            WHEN tc.constraint_type = 'UNIQUE' THEN 
              ' ADD CONSTRAINT ' || tc.constraint_name || ' UNIQUE (' || 
              string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');'
          END as constraint_sql,
          tc.constraint_type
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 
        AND tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
        GROUP BY tc.constraint_name, tc.constraint_type, tc.table_name, ccu.table_name, ccu.column_name
        ORDER BY 
          CASE tc.constraint_type 
            WHEN 'PRIMARY KEY' THEN 1 
            WHEN 'UNIQUE' THEN 2 
            WHEN 'FOREIGN KEY' THEN 3 
          END;
      `;

      const constraintsResult = await client.query(constraintsQuery, [tableName]);
      if (constraintsResult.rows.length > 0) {
        markdown += '### Constraints DDL\n\n';
        markdown += '```sql\n';
        constraintsResult.rows.forEach(constraint => {
          markdown += constraint.constraint_sql + '\n';
        });
        markdown += '```\n\n';
      }

      // Gerar DDL dos índices (não únicos)
      const indexDDLQuery = `
        SELECT 
          'CREATE INDEX ' || i.relname || ' ON public.' || t.relname || 
          ' USING ' || am.amname || ' (' || 
          array_to_string(array_agg(a.attname ORDER BY c.ordinality), ', ') || ');' as index_sql
        FROM pg_index idx
        JOIN pg_class i ON i.oid = idx.indexrelid
        JOIN pg_class t ON t.oid = idx.indrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN unnest(idx.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = c.attnum
        WHERE t.relname = $1
        AND i.relname NOT LIKE '%_pkey'
        AND NOT idx.indisunique
        GROUP BY i.relname, am.amname, t.relname
        ORDER BY i.relname;
      `;

      const indexDDLResult = await client.query(indexDDLQuery, [tableName]);
      if (indexDDLResult.rows.length > 0) {
        markdown += '### Índices DDL\n\n';
        markdown += '```sql\n';
        indexDDLResult.rows.forEach(index => {
          markdown += index.index_sql + '\n';
        });
        markdown += '```\n\n';
      }

      markdown += '\n---\n\n';
    }

    // Extrair relacionamentos gerais
    markdown += '## Relacionamentos entre Tabelas\n\n';
    
    const relationshipsQuery = `
      SELECT DISTINCT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const relationshipsResult = await client.query(relationshipsQuery);
    
    relationshipsResult.rows.forEach(rel => {
      markdown += `- **${rel.source_table}.${rel.source_column}** → **${rel.target_table}.${rel.target_column}**\n`;
    });

    // Extrair views se existirem
    const viewsQuery = `
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const viewsResult = await client.query(viewsQuery);
    if (viewsResult.rows.length > 0) {
      markdown += '\n## Views\n\n';
      viewsResult.rows.forEach(view => {
        markdown += `### View: ${view.table_name}\n\n`;
        markdown += '```sql\n';
        markdown += view.view_definition;
        markdown += '\n```\n\n';
      });
    }

    // Extrair funções e procedures
    const functionsQuery = `
      SELECT 
        p.proname AS function_name,
        pg_get_function_result(p.oid) AS return_type,
        pg_get_function_arguments(p.oid) AS arguments,
        p.prosrc AS source_code
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      ORDER BY p.proname;
    `;

    const functionsResult = await client.query(functionsQuery);
    if (functionsResult.rows.length > 0) {
      markdown += '\n## Funções e Procedures\n\n';
      functionsResult.rows.forEach(func => {
        markdown += `### ${func.function_name}\n\n`;
        markdown += `**Argumentos:** ${func.arguments || 'Nenhum'}\n`;
        markdown += `**Retorno:** ${func.return_type}\n\n`;
        if (func.source_code && func.source_code.trim() !== '') {
          markdown += '```sql\n';
          markdown += func.source_code;
          markdown += '\n```\n\n';
        }
      });
    }

    // Seção completa de Migration DDL
    markdown += '\n## Script de Migration Completo\n\n';
    markdown += 'Script SQL completo para recriar toda a estrutura do banco:\n\n';
    markdown += '```sql\n';
    markdown += '-- Script de Migration - Banco de Dados Financeiro\n';
    markdown += '-- Gerado automaticamente em: ' + new Date().toISOString() + '\n\n';

    // Gerar DDL para todas as tabelas
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // CREATE TABLE
      const ddlResult = await client.query(`
        SELECT 
          'CREATE TABLE public.' || $1 || ' (' ||
          array_to_string(
            array_agg(
              '    ' || column_name || ' ' || 
              CASE 
                WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                WHEN data_type = 'integer' THEN 'INTEGER'
                WHEN data_type = 'bigint' THEN 'BIGINT'
                WHEN data_type = 'smallint' THEN 'SMALLINT'
                WHEN data_type = 'boolean' THEN 'BOOLEAN'
                WHEN data_type = 'text' THEN 'TEXT'
                WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                WHEN data_type = 'date' THEN 'DATE'
                WHEN data_type = 'time' THEN 'TIME'
                WHEN data_type = 'uuid' THEN 'UUID'
                ELSE UPPER(data_type)
              END ||
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
              ORDER BY ordinal_position
            ), 
            ',\n'
          ) || 
          '\n);\n' as create_table_sql
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName]);

      if (ddlResult.rows.length > 0) {
        markdown += '\n-- Tabela: ' + tableName + '\n';
        markdown += ddlResult.rows[0].create_table_sql + '\n';
      }
    }

    // Adicionar constraints (PKs primeiro, depois FKs)
    markdown += '\n-- CONSTRAINTS\n';
    
    // Primary Keys
    const allPKs = await client.query(`
      SELECT 
        'ALTER TABLE public.' || tc.table_name || 
        ' ADD CONSTRAINT ' || tc.constraint_name || ' PRIMARY KEY (' || 
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as constraint_sql
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.constraint_name, tc.table_name
      ORDER BY tc.table_name;
    `);

    allPKs.rows.forEach(pk => {
      markdown += pk.constraint_sql + '\n';
    });

    // Unique Constraints
    const allUniques = await client.query(`
      SELECT 
        'ALTER TABLE public.' || tc.table_name || 
        ' ADD CONSTRAINT ' || tc.constraint_name || ' UNIQUE (' || 
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as constraint_sql
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name, tc.table_name
      ORDER BY tc.table_name;
    `);

    allUniques.rows.forEach(unique => {
      markdown += unique.constraint_sql + '\n';
    });

    // Foreign Keys
    const allFKs = await client.query(`
      SELECT 
        'ALTER TABLE public.' || tc.table_name || 
        ' ADD CONSTRAINT ' || tc.constraint_name || ' FOREIGN KEY (' || 
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || 
        ') REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ');' as constraint_sql
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
      GROUP BY tc.constraint_name, tc.table_name, ccu.table_name, ccu.column_name
      ORDER BY tc.table_name;
    `);

    allFKs.rows.forEach(fk => {
      markdown += fk.constraint_sql + '\n';
    });

    // Índices
    const allIndexes = await client.query(`
      SELECT 
        'CREATE INDEX ' || i.relname || ' ON public.' || t.relname || 
        ' USING ' || am.amname || ' (' || 
        array_to_string(array_agg(a.attname ORDER BY c.ordinality), ', ') || ');' as index_sql
      FROM pg_index idx
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN unnest(idx.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = c.attnum
      WHERE i.relname NOT LIKE '%_pkey'
      AND NOT idx.indisunique
      GROUP BY i.relname, am.amname, t.relname
      ORDER BY i.relname;
    `);

    if (allIndexes.rows.length > 0) {
      markdown += '\n-- ÍNDICES\n';
      allIndexes.rows.forEach(index => {
        markdown += index.index_sql + '\n';
      });
    }

    markdown += '```\n\n';

    // Salvar arquivo
    fs.writeFileSync('/Users/brunoafonso/comunidade/financeiro/DATABASE.md', markdown);
    console.log('Arquivo DATABASE.md criado com sucesso!');

  } catch (error) {
    console.error('Erro ao extrair estrutura do banco:', error);
  } finally {
    await client.end();
  }
}

extractDatabaseStructure().catch(console.error);