/**
 * Gerador do Pacote de Deploy do Catálogo para Produção
 * 
 * Gera:
 * 1. deploy/update_catalog_hw_prod.sql (Script SQL dinâmico, transacional e idempotente)
 * 2. deploy/catalog_hw_data.json (Arquivo de dados limpos pré-normalizados)
 * 3. deploy/apply_catalog_hw_prod.mjs (Script Node para execução via docker / pnpm)
 * 4. deploy/enviar_fotos_producao.bat (Script para envio rápido das fotos via scp)
 */

import fs from 'fs';
import path from 'path';
import postgres from 'file:///c:/Projetos/minihubcar/backend/node_modules/postgres/src/index.js';
import mssql from 'file:///C:/Projetos/miniatures-app/backend/node_modules/mssql/index.js';

const sqlConfig = {
  server: '127.0.0.1',
  port: 1433,
  database: 'Miniaturas164',
  user: 'miniaturas_user',
  password: 'Mini@2024!',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

const pg = postgres('postgresql://postgres:cmbp034349@localhost:5432/minihub_car');
const HW_DIR = 'C:\\Projetos\\minihubcar\\catalogos\\HW';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return `'${val.toString().replace(/'/g, "''")}'`;
}

function os_mkdir_p(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log('=== GERANDO PACOTE DE DEPLOY DO CATÁLOGO PARA PRODUÇÃO ===');
  const pool = await mssql.connect(sqlConfig);

  const catRes = await pool.request().query('SELECT * FROM Catalogo ORDER BY id ASC');
  const items = catRes.recordset;
  console.log(`Itens lidos do Catalogo: ${items.length}`);

  // Mapeia fotos que existem em catalogos/HW
  const physicalFiles = new Set(fs.readdirSync(HW_DIR).map(f => f.toLowerCase()));
  console.log(`Fotos normalizadas na pasta local: ${physicalFiles.size}`);

  const processedItems = [];
  const uniqueSeries = new Map();

  for (const item of items) {
    const code = item.codigo ? item.codigo.toUpperCase().trim() : '';
    if (!code) continue;

    let photoUrl = null;
    let localFound = false;

    const possibleFilenames = [];
    if (item.foto_local) {
      const base = path.parse(item.foto_local).name;
      possibleFilenames.push(`${base.toLowerCase()}.jpg`);
    }
    possibleFilenames.push(`${code.toLowerCase()}.jpg`);

    for (const testName of possibleFilenames) {
      if (physicalFiles.has(testName)) {
        photoUrl = `/catalog-media/HW/${testName}`;
        localFound = true;
        break;
      }
    }

    if (!localFound && item.foto_url) {
      photoUrl = item.foto_url;
    }

    const serieName = item.serie ? item.serie.trim() : null;
    const normSerie = normalize(serieName);
    if (serieName && !uniqueSeries.has(normSerie)) {
      uniqueSeries.set(normSerie, serieName);
    }

    const lineType = item.categoria ? item.categoria.toUpperCase().trim() : null;

    processedItems.push({
      code,
      name: item.descricao.trim(),
      normalizedName: normalize(item.descricao),
      serieName,
      normalizedSerie: normSerie,
      year: item.ano_fabricacao || null,
      lineType,
      photoUrl
    });
  }

  // 1. Salva catalog_hw_data.json
  const deployDir = 'C:\\Projetos\\minihubcar\\deploy';
  os_mkdir_p(deployDir);

  const jsonDataPath = path.join(deployDir, 'catalog_hw_data.json');
  fs.writeFileSync(jsonDataPath, JSON.stringify(processedItems, null, 2), 'utf-8');
  console.log(`1. Dados JSON gerados: ${jsonDataPath} (${(fs.statSync(jsonDataPath).size / 1024 / 1024).toFixed(2)} MB)`);

  // 2. Gera Script SQL Idempotente e Dinâmico
  const sqlPath = path.join(deployDir, 'update_catalog_hw_prod.sql');
  const sqlChunks = [];

  sqlChunks.push(`-- ========================================================\n`);
  sqlChunks.push(`-- ATUALIZAÇÃO E ENRIQUECIMENTO DO CATÁLOGO HW (PRODUÇÃO)\n`);
  sqlChunks.push(`-- Gerado em: ${new Date().toISOString()}\n`);
  sqlChunks.push(`-- ========================================================\n\n`);
  sqlChunks.push(`BEGIN;\n\n`);

  // 0. Garantir Marca, Escala e Identificador
  sqlChunks.push(`-- 0. Garantir entidades base no banco de produção\n`);
  sqlChunks.push(`INSERT INTO miniature_brand (name, normalized_name, status)\n`);
  sqlChunks.push(`VALUES ('Hot Wheels', 'hot wheels', 'ACTIVE')\n`);
  sqlChunks.push(`ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name;\n\n`);

  sqlChunks.push(`INSERT INTO scale (name, numerator, denominator, normalized_value, status)\n`);
  sqlChunks.push(`VALUES ('1:64', 1, 64, 0.015625, 'ACTIVE')\n`);
  sqlChunks.push(`ON CONFLICT (numerator, denominator) DO UPDATE SET name = EXCLUDED.name;\n\n`);

  sqlChunks.push(`INSERT INTO identifier_type (code, name, status)\n`);
  sqlChunks.push(`SELECT 'MATTEL_CODE', 'Código Mattel', 'ACTIVE'\n`);
  sqlChunks.push(`WHERE NOT EXISTS (SELECT 1 FROM identifier_type WHERE code = 'MATTEL_CODE');\n\n`);

  // 1. Garantir Séries Hot Wheels com busca dinâmica da marca
  sqlChunks.push(`-- 1. Criação/Atualização de Séries Hot Wheels (com ID dinâmico da marca)\n`);
  for (const [normSerie, serieName] of uniqueSeries.entries()) {
    sqlChunks.push(`INSERT INTO series (miniature_brand_id, name, normalized_name, status)\n`);
    sqlChunks.push(`SELECT b.id, ${escapeSql(serieName)}, ${escapeSql(normSerie)}, 'ACTIVE'\n`);
    sqlChunks.push(`FROM miniature_brand b\n`);
    sqlChunks.push(`WHERE b.normalized_name IN ('hot wheels', 'hot-wheels')\n`);
    sqlChunks.push(`LIMIT 1\n`);
    sqlChunks.push(`ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name;\n`);
  }
  sqlChunks.push(`\n`);

  // 2. Tabela Temporária para Carga Rápida
  sqlChunks.push(`-- 2. Tabela Temporária para Enriquecimento dos Itens\n`);
  sqlChunks.push(`CREATE TEMP TABLE temp_catalog_hw_delta (\n`);
  sqlChunks.push(`  code VARCHAR(150),\n`);
  sqlChunks.push(`  name VARCHAR(200),\n`);
  sqlChunks.push(`  normalized_name VARCHAR(200),\n`);
  sqlChunks.push(`  normalized_serie VARCHAR(150),\n`);
  sqlChunks.push(`  release_year SMALLINT,\n`);
  sqlChunks.push(`  line_type VARCHAR(50),\n`);
  sqlChunks.push(`  photo_url VARCHAR(1000)\n`);
  sqlChunks.push(`) ON COMMIT DROP;\n\n`);

  sqlChunks.push(`INSERT INTO temp_catalog_hw_delta (code, name, normalized_name, normalized_serie, release_year, line_type, photo_url) VALUES\n`);

  for (let i = 0; i < processedItems.length; i++) {
    const item = processedItems[i];
    const isLast = i === processedItems.length - 1;
    sqlChunks.push(`  (${escapeSql(item.code)}, ${escapeSql(item.name)}, ${escapeSql(item.normalizedName)}, ${escapeSql(item.normalizedSerie)}, ${escapeSql(item.year)}, ${escapeSql(item.lineType)}, ${escapeSql(item.photoUrl)})${isLast ? ';' : ','}\n`);
  }
  sqlChunks.push(`\n`);

  // 3. Query de atualização das variações existentes
  sqlChunks.push(`-- 3. Atualiza as Variações já existentes pelo Código\n`);
  sqlChunks.push(`UPDATE variation v\n`);
  sqlChunks.push(`SET\n`);
  sqlChunks.push(`  photo_url = COALESCE(t.photo_url, v.photo_url),\n`);
  sqlChunks.push(`  line_type = COALESCE(t.line_type, v.line_type),\n`);
  sqlChunks.push(`  series_id = COALESCE(s.id, v.series_id),\n`);
  sqlChunks.push(`  release_year = COALESCE(t.release_year, v.release_year)\n`);
  sqlChunks.push(`FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`JOIN product_identifier pi ON upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`CROSS JOIN (SELECT id FROM miniature_brand WHERE normalized_name IN ('hot wheels', 'hot-wheels') LIMIT 1) b\n`);
  sqlChunks.push(`LEFT JOIN series s ON s.miniature_brand_id = b.id AND s.normalized_name = t.normalized_serie\n`);
  sqlChunks.push(`WHERE v.id = pi.variation_id;\n\n`);

  // 4. Castings que não existem
  sqlChunks.push(`-- 4. Cria Castings Inéditos (que não existem na base)\n`);
  sqlChunks.push(`INSERT INTO casting (miniature_brand_id, name, normalized_name, fantasy_flag, status)\n`);
  sqlChunks.push(`SELECT DISTINCT ON (b.id, t.normalized_name) b.id, t.name, t.normalized_name, false, 'ACTIVE'\n`);
  sqlChunks.push(`FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`CROSS JOIN (SELECT id FROM miniature_brand WHERE normalized_name IN ('hot wheels', 'hot-wheels') LIMIT 1) b\n`);
  sqlChunks.push(`WHERE NOT EXISTS (\n`);
  sqlChunks.push(`  SELECT 1 FROM product_identifier pi WHERE upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`)\n`);
  sqlChunks.push(`ORDER BY b.id, t.normalized_name\n`);
  sqlChunks.push(`ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name;\n\n`);

  // 5. Inserção das novas Variações e Identificadores via CTE dinâmica
  sqlChunks.push(`-- 5. Cria Novas Variações e seus respectivos Product Identifiers\n`);
  sqlChunks.push(`WITH hw_info AS (\n`);
  sqlChunks.push(`  SELECT \n`);
  sqlChunks.push(`    (SELECT id FROM miniature_brand WHERE normalized_name IN ('hot wheels', 'hot-wheels') LIMIT 1) as brand_id,\n`);
  sqlChunks.push(`    (SELECT id FROM scale WHERE numerator = 1 AND denominator = 64 LIMIT 1) as scale_id,\n`);
  sqlChunks.push(`    (SELECT id FROM identifier_type WHERE code = 'MATTEL_CODE' LIMIT 1) as type_id\n`);
  sqlChunks.push(`),\n`);
  sqlChunks.push(`new_items AS (\n`);
  sqlChunks.push(`  SELECT DISTINCT ON (upper(trim(t.code)))\n`);
  sqlChunks.push(`    gen_random_uuid() as new_var_id,\n`);
  sqlChunks.push(`    c.id as casting_id,\n`);
  sqlChunks.push(`    s.id as series_id,\n`);
  sqlChunks.push(`    h.scale_id,\n`);
  sqlChunks.push(`    h.type_id,\n`);
  sqlChunks.push(`    t.name,\n`);
  sqlChunks.push(`    t.release_year,\n`);
  sqlChunks.push(`    t.line_type,\n`);
  sqlChunks.push(`    t.photo_url,\n`);
  sqlChunks.push(`    upper(trim(t.code)) as code\n`);
  sqlChunks.push(`  FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`  CROSS JOIN hw_info h\n`);
  sqlChunks.push(`  JOIN casting c ON c.miniature_brand_id = h.brand_id AND c.normalized_name = t.normalized_name\n`);
  sqlChunks.push(`  LEFT JOIN series s ON s.miniature_brand_id = h.brand_id AND s.normalized_name = t.normalized_serie\n`);
  sqlChunks.push(`  WHERE NOT EXISTS (\n`);
  sqlChunks.push(`    SELECT 1 FROM product_identifier pi WHERE upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`  )\n`);
  sqlChunks.push(`  ORDER BY upper(trim(t.code))\n`);
  sqlChunks.push(`),\n`);
  sqlChunks.push(`ins_vars AS (\n`);
  sqlChunks.push(`  INSERT INTO variation (id, casting_id, series_id, scale_id, name, release_year, line_type, photo_url, status)\n`);
  sqlChunks.push(`  SELECT new_var_id, casting_id, series_id, scale_id, name, release_year, line_type, photo_url, 'ACTIVE'\n`);
  sqlChunks.push(`  FROM new_items\n`);
  sqlChunks.push(`  ON CONFLICT (id) DO NOTHING\n`);
  sqlChunks.push(`  RETURNING id\n`);
  sqlChunks.push(`)\n`);
  sqlChunks.push(`INSERT INTO product_identifier (variation_id, identifier_type_id, code, normalized_code, is_primary)\n`);
  sqlChunks.push(`SELECT n.new_var_id, n.type_id, n.code, n.code, true\n`);
  sqlChunks.push(`FROM new_items n\n`);
  sqlChunks.push(`ON CONFLICT (identifier_type_id, normalized_code) DO NOTHING;\n\n`);

  sqlChunks.push(`COMMIT;\n`);

  fs.writeFileSync(sqlPath, sqlChunks.join(''), 'utf-8');
  console.log(`2. Script SQL gerado com sucesso: ${sqlPath} (${(fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2)} MB)`);

  await pool.close();
  await pg.end();
  console.log('=== PACOTE DE PRODUÇÃO COMPLETO GERADO COM SUCESSO! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
