/**
 * Gerador do Pacote de Deploy do Catálogo para Produção
 * 
 * Gera:
 * 1. deploy/update_catalog_hw_prod.sql (Script SQL direto e transacional)
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

const HW_BRAND_ID = 'ca8ae498-f0d5-4443-a682-af519bb2c760';
const SCALE_64_ID = '8c2a0edc-1f1b-4f5b-82b9-0efea84f7c56';
const MATTEL_IDENTIFIER_TYPE_ID = '7b27cc89-168b-449f-86e6-f66a531dcc4f';
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

  // 2. Gera Script SQL Idempotente usando strings bufferizadas
  const sqlPath = path.join(deployDir, 'update_catalog_hw_prod.sql');
  const sqlChunks = [];

  sqlChunks.push(`-- ========================================================\n`);
  sqlChunks.push(`-- ATUALIZAÇÃO E ENRIQUECIMENTO DO CATÁLOGO HW (PRODUÇÃO)\n`);
  sqlChunks.push(`-- Gerado em: ${new Date().toISOString()}\n`);
  sqlChunks.push(`-- ========================================================\n\n`);
  sqlChunks.push(`BEGIN;\n\n`);

  // Garantir Séries
  sqlChunks.push(`-- 1. Criação/Atualização de Séries Hot Wheels\n`);
  for (const [normSerie, serieName] of uniqueSeries.entries()) {
    sqlChunks.push(`INSERT INTO series (miniature_brand_id, name, normalized_name, status)\n`);
    sqlChunks.push(`VALUES ('${HW_BRAND_ID}'::uuid, ${escapeSql(serieName)}, ${escapeSql(normSerie)}, 'ACTIVE')\n`);
    sqlChunks.push(`ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name;\n`);
  }
  sqlChunks.push(`\n`);

  // Tabela Temporária para Carga Rápida
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

  // Query de atualização das variações existentes
  sqlChunks.push(`-- 3. Atualiza as Variações já existentes pelo Código\n`);
  sqlChunks.push(`UPDATE variation v\n`);
  sqlChunks.push(`SET\n`);
  sqlChunks.push(`  photo_url = COALESCE(t.photo_url, v.photo_url),\n`);
  sqlChunks.push(`  line_type = COALESCE(t.line_type, v.line_type),\n`);
  sqlChunks.push(`  series_id = COALESCE(s.id, v.series_id),\n`);
  sqlChunks.push(`  release_year = COALESCE(t.release_year, v.release_year)\n`);
  sqlChunks.push(`FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`JOIN product_identifier pi ON upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`LEFT JOIN series s ON s.miniature_brand_id = '${HW_BRAND_ID}'::uuid AND s.normalized_name = t.normalized_serie\n`);
  sqlChunks.push(`WHERE v.id = pi.variation_id;\n\n`);

  // Castings que não existem
  sqlChunks.push(`-- 4. Cria Castings Inéditos (que não existem na base)\n`);
  sqlChunks.push(`INSERT INTO casting (miniature_brand_id, name, normalized_name, fantasy_flag, status)\n`);
  sqlChunks.push(`SELECT DISTINCT '${HW_BRAND_ID}'::uuid, t.name, t.normalized_name, false, 'ACTIVE'\n`);
  sqlChunks.push(`FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`WHERE NOT EXISTS (\n`);
  sqlChunks.push(`  SELECT 1 FROM product_identifier pi WHERE upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`)\n`);
  sqlChunks.push(`ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name;\n\n`);

  // Inserção das novas Variações e Identificadores via CTE
  sqlChunks.push(`-- 5. Cria Novas Variações e seus respectivos Product Identifiers\n`);
  sqlChunks.push(`WITH new_items AS (\n`);
  sqlChunks.push(`  SELECT DISTINCT ON (t.code)\n`);
  sqlChunks.push(`    gen_random_uuid() as new_var_id,\n`);
  sqlChunks.push(`    c.id as casting_id,\n`);
  sqlChunks.push(`    s.id as series_id,\n`);
  sqlChunks.push(`    '${SCALE_64_ID}'::uuid as scale_id,\n`);
  sqlChunks.push(`    t.name,\n`);
  sqlChunks.push(`    t.release_year,\n`);
  sqlChunks.push(`    t.line_type,\n`);
  sqlChunks.push(`    t.photo_url,\n`);
  sqlChunks.push(`    t.code\n`);
  sqlChunks.push(`  FROM temp_catalog_hw_delta t\n`);
  sqlChunks.push(`  JOIN casting c ON c.miniature_brand_id = '${HW_BRAND_ID}'::uuid AND c.normalized_name = t.normalized_name\n`);
  sqlChunks.push(`  LEFT JOIN series s ON s.miniature_brand_id = '${HW_BRAND_ID}'::uuid AND s.normalized_name = t.normalized_serie\n`);
  sqlChunks.push(`  WHERE NOT EXISTS (\n`);
  sqlChunks.push(`    SELECT 1 FROM product_identifier pi WHERE upper(trim(pi.code)) = upper(trim(t.code))\n`);
  sqlChunks.push(`  )\n`);
  sqlChunks.push(`),\n`);
  sqlChunks.push(`ins_vars AS (\n`);
  sqlChunks.push(`  INSERT INTO variation (id, casting_id, series_id, scale_id, name, release_year, line_type, photo_url, status)\n`);
  sqlChunks.push(`  SELECT new_var_id, casting_id, series_id, scale_id, name, release_year, line_type, photo_url, 'ACTIVE'\n`);
  sqlChunks.push(`  FROM new_items\n`);
  sqlChunks.push(`  ON CONFLICT (id) DO NOTHING\n`);
  sqlChunks.push(`  RETURNING id\n`);
  sqlChunks.push(`)\n`);
  sqlChunks.push(`INSERT INTO product_identifier (variation_id, identifier_type_id, code, normalized_code, is_primary)\n`);
  sqlChunks.push(`SELECT n.new_var_id, '${MATTEL_IDENTIFIER_TYPE_ID}'::uuid, n.code, n.code, true\n`);
  sqlChunks.push(`FROM new_items n\n`);
  sqlChunks.push(`ON CONFLICT (identifier_type_id, normalized_code) DO NOTHING;\n\n`);

  sqlChunks.push(`COMMIT;\n`);

  fs.writeFileSync(sqlPath, sqlChunks.join(''), 'utf-8');
  console.log(`2. Script SQL gerado com sucesso: ${sqlPath} (${(fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2)} MB)`);

  // 3. Gera script Node runner para a VPS
  const runnerPath = path.join(deployDir, 'apply_catalog_hw_prod.mjs');
  fs.writeFileSync(runnerPath, `
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://minihub_admin:MiniHubCar_SuperSenhaPostgres_2026@127.0.0.1:5434/minihub_car';
console.log('Conectando ao banco de dados...');
const sql = postgres(databaseUrl);

async function run() {
  const sqlFile = path.resolve(process.cwd(), 'deploy/update_catalog_hw_prod.sql');
  console.log('Lendo script SQL:', sqlFile);
  const content = fs.readFileSync(sqlFile, 'utf-8');
  console.log('Executando atualizacoes no banco de producao...');
  await sql.unsafe(content);
  console.log('✅ Catalogo atualizado com sucesso em producao!');
  await sql.end();
}

run().catch(err => {
  console.error('Erro ao atualizar catalogo:', err);
  process.exit(1);
});
`.trim(), 'utf-8');
  console.log(`3. Script de execução Node gerado: ${runnerPath}`);

  // 4. Gera arquivo bat para envio das fotos
  const batPath = path.join(deployDir, 'enviar_fotos_producao.bat');
  fs.writeFileSync(batPath, `@echo off
chcp 65001 > nul
echo ========================================================
echo   ENVIAR FOTOS DO CATALOGO PARA A VPS (HOSTINGER)
echo ========================================================
set /p IP_VPS="Digite o IP da VPS Hostinger: "
if "%IP_VPS%"=="" (
    echo IP nao informado. Abortando.
    pause
    exit /b 1
)

echo.
echo Criando diretorio de destino na VPS se necessario...
ssh root@%IP_VPS% "mkdir -p /var/www/minihubcar/catalogos/HW"

echo.
echo Sincronizando 4.066 fotos via SCP para a VPS...
scp -r C:\\Projetos\\minihubcar\\catalogos\\HW\\* root@%IP_VPS%:/var/www/minihubcar/catalogos/HW/

echo.
echo ========================================================
echo Fotos enviadas com sucesso!
echo ========================================================
pause
`, 'utf-8');
  console.log(`4. Script BAT para envio de fotos gerado: ${batPath}`);

  await pool.close();
  await pg.end();
  console.log('=== PACOTE DE PRODUÇÃO COMPLETO GERADO COM SUCESSO! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
