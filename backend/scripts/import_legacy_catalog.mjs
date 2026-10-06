/**
 * Script de Importação e Enriquecimento do Catálogo Legado no Minihubcar
 * 
 * Origem: SQL Server (Miniaturas164 -> Catalogo)
 * Destino: PostgreSQL (minihub_car -> casting, variation, series, product_identifier)
 * 
 * O que faz:
 * 1. Mapeia as fotos físicas normalizadas em catalogos/HW.
 * 2. Atualiza e enriquece 8.298 variações existentes com links de fotos locais, séries e categoria (MAINLINE/PREMIUM).
 * 3. Cria séries ausentes.
 * 4. Insere 656 novos modelos/variações (foco lançamentos 2026) que ainda não existiam no minihubcar.
 * 5. Registra os códigos de produto em product_identifier.
 */

import fs from 'fs';
import path from 'path';
import mssql from 'file:///C:/Projetos/miniatures-app/backend/node_modules/mssql/index.js';
import postgres from 'file:///c:/Projetos/minihubcar/backend/node_modules/postgres/src/index.js';

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
const CATALOGOS_HW_DIR = 'C:\\Projetos\\minihubcar\\catalogos\\HW';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function main() {
  console.log('=== INICIANDO ENRIQUECIMENTO E IMPORTAÇÃO DO CATÁLOGO ===');
  const pool = await mssql.connect(sqlConfig);

  // 1. Carrega dados do SQL Server
  console.log('1. Lendo Catalogo do SQL Server...');
  const catRes = await pool.request().query('SELECT * FROM Catalogo ORDER BY id ASC');
  const catalogoItems = catRes.recordset;
  console.log(`Total de itens lidos: ${catalogoItems.length}`);

  // 2. Mapeia arquivos existentes em catalogos/HW
  console.log('2. Mapeando arquivos físicos em catalogos/HW...');
  const physicalFiles = new Set();
  if (fs.existsSync(CATALOGOS_HW_DIR)) {
    for (const f of fs.readdirSync(CATALOGOS_HW_DIR)) {
      physicalFiles.add(f.toLowerCase());
    }
  }
  console.log(`Arquivos físicos encontrados na pasta: ${physicalFiles.size}`);

  // 3. Carrega índices do PostgreSQL
  console.log('3. Carregando dados existentes no PostgreSQL...');
  const [existingSeries, existingCastings, existingIdentifiers] = await Promise.all([
    pg.unsafe('SELECT id, name, normalized_name FROM series WHERE miniature_brand_id = $1', [HW_BRAND_ID]),
    pg.unsafe('SELECT id, name, normalized_name FROM casting WHERE miniature_brand_id = $1', [HW_BRAND_ID]),
    pg.unsafe('SELECT pi.code, pi.normalized_code, pi.variation_id FROM product_identifier pi'),
  ]);

  const seriesMap = new Map(existingSeries.map(s => [s.normalized_name, s.id]));
  const castingMap = new Map(existingCastings.map(c => [c.normalized_name, c.id]));
  const identifierMap = new Map();
  for (const pi of existingIdentifiers) {
    if (pi.code) identifierMap.set(pi.code.toUpperCase().trim(), pi.variation_id);
    if (pi.normalized_code) identifierMap.set(pi.normalized_code.toUpperCase().trim(), pi.variation_id);
  }

  console.log(`Séries HW existentes: ${seriesMap.size}`);
  console.log(`Castings HW existentes: ${castingMap.size}`);
  console.log(`Identificadores existentes: ${identifierMap.size}`);

  let updatedVariations = 0;
  let newSeriesCount = 0;
  let newCastingsCount = 0;
  let newVariationsCount = 0;
  let newIdentifiersCount = 0;

  console.log('4. Processando itens do catálogo...');
  let processed = 0;

  for (const item of catalogoItems) {
    processed++;
    const code = item.codigo ? item.codigo.toUpperCase().trim() : '';
    if (!code) continue;

    // Resolve Foto
    let photoUrl = null;
    let localFound = false;

    // Testa nome do arquivo local ou código.jpg
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

    // Resolve Série
    let seriesId = null;
    if (item.serie) {
      const normSerie = normalize(item.serie);
      if (seriesMap.has(normSerie)) {
        seriesId = seriesMap.get(normSerie);
      } else {
        // Cria nova série no Postgres
        const [insertedSerie] = await pg.unsafe(`
          INSERT INTO series (miniature_brand_id, name, normalized_name, status)
          VALUES ($1, $2, $3, 'ACTIVE')
          ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [HW_BRAND_ID, item.serie.trim(), normSerie]);
        seriesId = insertedSerie.id;
        seriesMap.set(normSerie, seriesId);
        newSeriesCount++;
      }
    }

    // Resolve Categoria
    const lineType = item.categoria ? item.categoria.toUpperCase().trim() : null;

    // CASO 1: Variação já existe pelo código de produto
    if (identifierMap.has(code)) {
      const variationId = identifierMap.get(code);

      // Atualiza variação com dados enriquecidos se tivermos novidades
      await pg.unsafe(`
        UPDATE variation 
        SET 
          photo_url = COALESCE($1, photo_url),
          line_type = COALESCE(line_type, $2),
          series_id = COALESCE(series_id, $3),
          release_year = COALESCE(release_year, $4)
        WHERE id = $5
      `, [photoUrl, lineType, seriesId, item.ano_fabricacao, variationId]);

      updatedVariations++;
    } 
    // CASO 2: Nova variação (inédita no minihubcar)
    else {
      // Resolve Casting
      const normDesc = normalize(item.descricao);
      let castingId = null;

      if (castingMap.has(normDesc)) {
        castingId = castingMap.get(normDesc);
      } else {
        // Cria novo casting
        const [newCasting] = await pg.unsafe(`
          INSERT INTO casting (miniature_brand_id, name, normalized_name, fantasy_flag, status)
          VALUES ($1, $2, $3, false, 'ACTIVE')
          ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [HW_BRAND_ID, item.descricao.trim(), normDesc]);
        castingId = newCasting.id;
        castingMap.set(normDesc, castingId);
        newCastingsCount++;
      }

      // Cria a nova Variação
      const [newVar] = await pg.unsafe(`
        INSERT INTO variation (
          casting_id, series_id, scale_id, name, release_year, line_type, photo_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING id
      `, [
        castingId,
        seriesId,
        SCALE_64_ID,
        item.descricao.trim(),
        item.ano_fabricacao,
        lineType,
        photoUrl
      ]);
      newVariationsCount++;

      // Cria o identificador de produto
      await pg.unsafe(`
        INSERT INTO product_identifier (
          variation_id, identifier_type_id, code, normalized_code, is_primary
        )
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (identifier_type_id, normalized_code) DO NOTHING
      `, [
        newVar.id,
        MATTEL_IDENTIFIER_TYPE_ID,
        code,
        code
      ]);
      newIdentifiersCount++;

      identifierMap.set(code, newVar.id);
    }

    if (processed % 1000 === 0 || processed === catalogoItems.length) {
      console.log(`Processados: ${processed}/${catalogoItems.length} itens...`);
    }
  }

  console.log('\n=== IMPORTAÇÃO E ENRIQUECIMENTO CONCLUÍDOS COM SUCESSO ===');
  console.log(`Variações existentes enriquecidas: ${updatedVariations}`);
  console.log(`Novas Séries criadas: ${newSeriesCount}`);
  console.log(`Novos Castings criados: ${newCastingsCount}`);
  console.log(`Novas Variações adicionadas: ${newVariationsCount}`);
  console.log(`Novos Identificadores registrados: ${newIdentifiersCount}`);

  await pool.close();
  await pg.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
