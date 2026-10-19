/**
 * Script Completo de Migração e Enriquecimento do Catálogo Legado
 * 
 * Origem: SQL Server (Miniaturas164 -> Catalogo [8.954 itens] + Miniaturas [455 itens] + MiniaturaFotos [505 fotos])
 * Destino: PostgreSQL (minihub_car -> miniature_brand, scale, series, casting, variation, product_identifier)
 * 
 * Executa:
 * 1. Cópia física de todas as fotos de Miniaturas para backend/uploads e catalogos/Miniaturas.
 * 2. Criação / sincronização de todas as Marcas (Marcas -> miniature_brand).
 * 3. Criação / sincronização de todas as Escalas (Escalas -> scale).
 * 4. Processamento dos 8.954 itens do Catálogo Hot Wheels.
 * 5. Processamento das 455 Miniaturas cadastradas no Miniatures-App em suas respectivas marcas.
 */

import fs from 'fs';
import path from 'path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import mssql from 'file:///C:/Projetos/miniatures-app/backend/node_modules/mssql/index.js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });
dotenv.config({ path: path.resolve(ROOT_DIR, 'backend/.env') });

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

const pgUrl = process.env.DATABASE_URL || 'postgresql://postgres:cmbp034349@localhost:5432/minihub_car';
const pg = postgres(pgUrl);

const LEGACY_UPLOADS_DIR = 'C:\\Projetos\\miniatures-app\\backend\\uploads';
const LOCAL_UPLOADS_DIR = path.resolve(ROOT_DIR, 'backend/uploads');
const CATALOGOS_MINIATURAS_DIR = path.resolve(ROOT_DIR, 'catalogos/Miniaturas');
const CATALOGOS_HW_DIR = path.resolve(ROOT_DIR, 'catalogos/HW');

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Mapa de normalização de marcas legadas para padronização
const BRAND_ALIASES = {
  'jada toy': 'Jada Toys',
  'minigt - kaido house': 'Kaido House',
  'candide': 'Candide',
  'livre': 'Genérica / Livre',
  'cks': 'CKS',
  'miniauto': 'MiniAuto',
  'sunnyside': 'SunnySide',
  'alloy hot car': 'Alloy Hot Car',
  'castela brasil': 'Castela Brasil',
  'crazy cars': 'Crazy Cars',
  'zuru': 'Zuru',
  'polistill': 'Polistil',
  'tomica': 'Tomica',
  'majorette': 'Majorette',
  'maisto': 'Maisto',
  'hasbro': 'Hasbro',
  'multikids': 'Multikids',
  'johnny lightning': 'Johnny Lightning',
  'auto world': 'Auto World',
  'inno64': 'INNO64',
};

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO SINCRONIZAÇÃO COMPLETA DE CATÁLOGOS E MINIATURAS');
  console.log('================================================================');

  // 1. Sincronização física das fotos de Miniaturas
  console.log('\n--- ETAPA 1: COPIANDO FOTOS FÍSICAS DE MINIATURAS ---');
  ensureDir(LOCAL_UPLOADS_DIR);
  ensureDir(CATALOGOS_MINIATURAS_DIR);

  let copiedUploads = 0;
  if (fs.existsSync(LEGACY_UPLOADS_DIR)) {
    const uploadFiles = fs.readdirSync(LEGACY_UPLOADS_DIR);
    for (const f of uploadFiles) {
      const src = path.join(LEGACY_UPLOADS_DIR, f);
      const destUpload = path.join(LOCAL_UPLOADS_DIR, f);
      const destCat = path.join(CATALOGOS_MINIATURAS_DIR, f);

      if (!fs.existsSync(destUpload)) {
        fs.copyFileSync(src, destUpload);
        copiedUploads++;
      }
      if (!fs.existsSync(destCat)) {
        fs.copyFileSync(src, destCat);
      }
    }
  }
  console.log(`✅ Arquivos de fotos de miniaturas sincronizados: ${copiedUploads} copiados (total na pasta: ${fs.readdirSync(LOCAL_UPLOADS_DIR).length})`);

  // Mapear arquivos físicos existentes mantendo o casing EXATO do disco
  const hwPhysicalFiles = new Map();
  if (fs.existsSync(CATALOGOS_HW_DIR)) {
    for (const f of fs.readdirSync(CATALOGOS_HW_DIR)) {
      hwPhysicalFiles.set(f.toLowerCase(), f);
    }
  }

  const uploadPhysicalFiles = new Map();
  if (fs.existsSync(LOCAL_UPLOADS_DIR)) {
    for (const f of fs.readdirSync(LOCAL_UPLOADS_DIR)) {
      uploadPhysicalFiles.set(f.toLowerCase(), f);
    }
  }

  // Carregar URLs de imagens online do CSV
  const hwCsvMap = new Map();
  const csvFile = path.resolve(CATALOGOS_HW_DIR, 'hw_catalogo.csv');
  if (fs.existsSync(csvFile)) {
    const rl = readline.createInterface({
      input: fs.createReadStream(csvFile),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      const parts = line.split(';');
      if (parts.length > 8) {
        const c = parts[0].trim().toUpperCase();
        const url = parts[8].trim();
        if (url.startsWith('http') && !url.includes('INA.jpg')) {
          hwCsvMap.set(c, url);
        }
      }
    }
    console.log(`- URLs de imagens online mapeadas do CSV: ${hwCsvMap.size}`);
  }

  const pool = await mssql.connect(sqlConfig);

  // 2. Garantir Tipos de Identificador
  console.log('\n--- ETAPA 2: SINCRONIZANDO TIPOS DE IDENTIFICADOR ---');
  await pg.unsafe(`
    INSERT INTO identifier_type (code, name, status)
    SELECT 'MATTEL_CODE', 'Código Mattel', 'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM identifier_type WHERE code = 'MATTEL_CODE');

    INSERT INTO identifier_type (code, name, status)
    SELECT 'PRODUCT_CODE', 'Código de Produto / SKU', 'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM identifier_type WHERE code = 'PRODUCT_CODE');
  `);
  const [mattelType] = await pg.unsafe(`SELECT id FROM identifier_type WHERE code = 'MATTEL_CODE'`);
  const [productType] = await pg.unsafe(`SELECT id FROM identifier_type WHERE code = 'PRODUCT_CODE'`);
  const MATTEL_TYPE_ID = mattelType.id;
  const PRODUCT_TYPE_ID = productType.id;
  console.log(`✅ Identificadores prontos: Mattel (${MATTEL_TYPE_ID}), Product (${PRODUCT_TYPE_ID})`);

  // 3. Garantir Escalas
  console.log('\n--- ETAPA 3: SINCRONIZANDO ESCALAS ---');
  const requiredScales = [
    { name: '1:64', num: 1, den: 64 },
    { name: '1:43', num: 1, den: 43 },
    { name: '1:32', num: 1, den: 32 },
    { name: '1:24', num: 1, den: 24 },
    { name: '1:18', num: 1, den: 18 },
    { name: '1:12', num: 1, den: 12 },
    { name: '1:36', num: 1, den: 36 },
    { name: '1:39', num: 1, den: 39 },
    { name: '1:41', num: 1, den: 41 },
    { name: '1:100', num: 1, den: 100 },
    { name: '1:76', num: 1, den: 76 },
    { name: '1:87', num: 1, den: 87 },
    { name: '1:1', num: 1, den: 1 },
  ];

  for (const s of requiredScales) {
    await pg.unsafe(`
      INSERT INTO scale (name, numerator, denominator, normalized_value, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      ON CONFLICT (numerator, denominator) DO UPDATE SET name = EXCLUDED.name
    `, [s.name, s.num, s.den, s.num / s.den]);
  }

  const allScales = await pg.unsafe(`SELECT id, name, numerator, denominator FROM scale`);
  const scaleMap = new Map();
  for (const s of allScales) {
    scaleMap.set(s.name.toLowerCase().trim(), s.id);
    scaleMap.set(`${s.numerator}:${s.denominator}`, s.id);
  }
  const defaultScale64Id = scaleMap.get('1:64');
  console.log(`✅ Escalas sincronizadas (${allScales.length} escalas ativas). Padrão 1:64 ID: ${defaultScale64Id}`);

  // 4. Garantir Marcas
  console.log('\n--- ETAPA 4: SINCRONIZANDO MARCAS ---');
  const marcasRes = await pool.request().query('SELECT id, nome FROM Marcas');
  for (const row of marcasRes.recordset) {
    const rawName = row.nome.trim();
    const finalName = BRAND_ALIASES[rawName.toLowerCase()] || rawName;
    const norm = normalize(finalName);

    await pg.unsafe(`
      INSERT INTO miniature_brand (name, normalized_name, status)
      VALUES ($1, $2, 'ACTIVE')
      ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
    `, [finalName, norm]);
  }

  const allBrands = await pg.unsafe(`SELECT id, name, normalized_name FROM miniature_brand`);
  const brandMap = new Map();
  for (const b of allBrands) {
    brandMap.set(b.normalized_name, b.id);
  }

  // Hot wheels brand id
  const hwBrandId = brandMap.get('hot wheels') || brandMap.get('hot-wheels');
  console.log(`✅ Marcas sincronizadas (${allBrands.length} marcas no catálogo). HW ID: ${hwBrandId}`);

  // 6. Carrega índices do PostgreSQL para match rápido
  console.log('\n--- ETAPA 5: CARREGANDO ÍNDICES EXISTENTES DO BANCO ---');
  const [existingSeries, existingCastings, existingIdentifiers] = await Promise.all([
    pg.unsafe('SELECT id, miniature_brand_id, normalized_name FROM series'),
    pg.unsafe('SELECT id, miniature_brand_id, normalized_name FROM casting'),
    pg.unsafe('SELECT code, normalized_code, variation_id FROM product_identifier'),
  ]);

  // Map: `${brandId}_${normSerie}` -> seriesId
  const seriesMap = new Map();
  for (const s of existingSeries) {
    seriesMap.set(`${s.miniature_brand_id}_${s.normalized_name}`, s.id);
  }

  // Map: `${brandId}_${normCasting}` -> castingId
  const castingMap = new Map();
  for (const c of existingCastings) {
    castingMap.set(`${c.miniature_brand_id}_${c.normalized_name}`, c.id);
  }

  // Map: code -> variationId
  const identifierMap = new Map();
  for (const pi of existingIdentifiers) {
    if (pi.code) identifierMap.set(pi.code.toUpperCase().trim(), pi.variation_id);
    if (pi.normalized_code) identifierMap.set(pi.normalized_code.toUpperCase().trim(), pi.variation_id);
  }

  console.log(`Índices carregados: Séries=${seriesMap.size}, Castings=${castingMap.size}, Identificadores=${identifierMap.size}`);

  // Helper para obter ou criar série
  async function getOrCreateSeries(brandId, serieName) {
    if (!serieName || !serieName.trim()) return null;
    const clean = serieName.trim();
    const norm = normalize(clean);
    const key = `${brandId}_${norm}`;
    if (seriesMap.has(key)) return seriesMap.get(key);

    const [inserted] = await pg.unsafe(`
      INSERT INTO series (miniature_brand_id, name, normalized_name, status)
      VALUES ($1, $2, $3, 'ACTIVE')
      ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [brandId, clean, norm]);
    seriesMap.set(key, inserted.id);
    return inserted.id;
  }

  // Helper para obter ou criar casting
  async function getOrCreateCasting(brandId, castingName) {
    const clean = castingName.trim();
    const norm = normalize(clean);
    const key = `${brandId}_${norm}`;
    if (castingMap.has(key)) return castingMap.get(key);

    const [inserted] = await pg.unsafe(`
      INSERT INTO casting (miniature_brand_id, name, normalized_name, fantasy_flag, status)
      VALUES ($1, $2, $3, false, 'ACTIVE')
      ON CONFLICT (miniature_brand_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [brandId, clean, norm]);
    castingMap.set(key, inserted.id);
    return inserted.id;
  }

  // Helper para resolver escala
  function resolveScaleId(scaleStr) {
    if (!scaleStr) return defaultScale64Id;
    const norm = scaleStr.toLowerCase().trim();
    return scaleMap.get(norm) || defaultScale64Id;
  }

  // ================================================================
  // 7. CARGA DO Catalogo (8.954 itens Hot Wheels)
  // ================================================================
  console.log('\n--- ETAPA 6: PROCESSANDO CADASTRO DE CATÁLOGOS (8.954 ITENS) ---');
  const catRes = await pool.request().query('SELECT * FROM Catalogo ORDER BY id ASC');
  const catalogoItems = catRes.recordset;

  let catUpdated = 0;
  let catInserted = 0;

  for (let i = 0; i < catalogoItems.length; i++) {
    const item = catalogoItems[i];
    const code = item.codigo ? item.codigo.toUpperCase().trim() : '';
    if (!code) continue;

    // Foto
    let photoUrl = null;
    const possibleFilenames = [];
    if (item.foto_local) {
      const base = path.parse(item.foto_local).name.toLowerCase();
      possibleFilenames.push(`${base}.jpg`, `${base}.webp`, `${base}.png`, `${base}.jpeg`);
    }
    const cLow = code.toLowerCase();
    possibleFilenames.push(`${cLow}.jpg`, `${cLow}.webp`, `${cLow}.png`, `${cLow}.jpeg`);

    // Prioridade 1: Arquivo físico no disco (com casing exato)
    for (const testName of possibleFilenames) {
      if (hwPhysicalFiles.has(testName)) {
        photoUrl = `/catalog-media/HW/${hwPhysicalFiles.get(testName)}`;
        break;
      }
    }
    // Prioridade 2: URL que já estava no item (se válida e não dummy)
    if (!photoUrl && item.foto_url && item.foto_url.startsWith('http')) {
      photoUrl = item.foto_url;
    }
    // Prioridade 3: URL oficial do CSV
    if (!photoUrl && hwCsvMap.has(code)) {
      photoUrl = hwCsvMap.get(code);
    }

    // Série
    const seriesId = await getOrCreateSeries(hwBrandId, item.serie);
    const lineType = item.categoria ? item.categoria.toUpperCase().trim() : 'MAINLINE';

    if (identifierMap.has(code)) {
      const varId = identifierMap.get(code);
      await pg.unsafe(`
        UPDATE variation 
        SET 
          photo_url = COALESCE($1, photo_url),
          line_type = COALESCE(line_type, $2),
          series_id = COALESCE(series_id, $3),
          release_year = COALESCE(release_year, $4)
        WHERE id = $5
      `, [photoUrl, lineType, seriesId, item.ano_fabricacao, varId]);
      catUpdated++;
    } else {
      const castingId = await getOrCreateCasting(hwBrandId, item.descricao);
      const [newVar] = await pg.unsafe(`
        INSERT INTO variation (casting_id, series_id, scale_id, name, release_year, line_type, photo_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING id
      `, [castingId, seriesId, defaultScale64Id, item.descricao.trim(), item.ano_fabricacao, lineType, photoUrl]);

      await pg.unsafe(`
        INSERT INTO product_identifier (variation_id, identifier_type_id, code, normalized_code, is_primary)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (identifier_type_id, normalized_code) DO NOTHING
      `, [newVar.id, MATTEL_TYPE_ID, code, code]);

      identifierMap.set(code, newVar.id);
      catInserted++;
    }

    if ((i + 1) % 2000 === 0 || i === catalogoItems.length - 1) {
      console.log(`Catálogo: processados ${i + 1}/${catalogoItems.length} itens...`);
    }
  }

  console.log(`✅ Concluído Catálogo Hot Wheels: ${catUpdated} atualizados, ${catInserted} inseridos.`);

  // ================================================================
  // 8. CARGA DE Miniaturas (455 itens do Cadastro de Miniaturas)
  // ================================================================
  console.log('\n--- ETAPA 7: PROCESSANDO CADASTRO DE MINIATURAS (455 ITENS) ---');
  
  // Mapear fotos por miniatura_id
  const fotosRes = await pool.request().query(`
    SELECT miniatura_id, caminho, nome_arquivo, principal 
    FROM MiniaturaFotos 
    ORDER BY principal DESC, id ASC
  `);
  const fotoByMiniatura = new Map();
  for (const f of fotosRes.recordset) {
    if (!fotoByMiniatura.has(f.miniatura_id)) {
      const filename = path.basename(f.caminho || f.nome_arquivo || '');
      fotoByMiniatura.set(f.miniatura_id, filename);
    }
  }

  const miniRes = await pool.request().query(`
    SELECT m.*, marc.nome as marca_nome, cat.nome as categoria_nome
    FROM Miniaturas m
    LEFT JOIN Marcas marc ON m.marca_id = marc.id
    LEFT JOIN Categorias cat ON m.categoria_id = cat.id
    ORDER BY m.id ASC
  `);
  const miniItems = miniRes.recordset;

  let miniUpdated = 0;
  let miniInserted = 0;

  for (let i = 0; i < miniItems.length; i++) {
    const mini = miniItems[i];
    const code = mini.codigo ? mini.codigo.toUpperCase().trim() : `MINI-LEGADO-${mini.id}`;
    
    // Resolve Marca
    const rawBrandName = (mini.marca_nome || 'Hot Wheels').trim();
    const finalBrandName = BRAND_ALIASES[rawBrandName.toLowerCase()] || rawBrandName;
    const brandNorm = normalize(finalBrandName);
    const brandId = brandMap.get(brandNorm) || hwBrandId;

    // Resolve Foto
    let photoUrl = null;
    if (fotoByMiniatura.has(mini.id)) {
      const rawFile = fotoByMiniatura.get(mini.id);
      const exactUpload = uploadPhysicalFiles.get(rawFile.toLowerCase()) || rawFile;
      photoUrl = `/uploads/${exactUpload}`;
    }

    // Fallback se não tinha foto em uploads ou o arquivo não existia fisicamente
    const baseUpload = photoUrl ? path.basename(photoUrl).toLowerCase() : null;
    if ((!photoUrl || (baseUpload && !uploadPhysicalFiles.has(baseUpload))) && code) {
      for (const ext of ['.jpg', '.webp', '.png', '.jpeg']) {
        const hwTest = `${code.toLowerCase()}${ext}`;
        if (hwPhysicalFiles.has(hwTest)) {
          photoUrl = `/catalog-media/HW/${hwPhysicalFiles.get(hwTest)}`;
          break;
        }
      }
      if (!photoUrl && hwCsvMap.has(code)) {
        photoUrl = hwCsvMap.get(code);
      }
    }

    // Resolve Escala
    const scaleId = resolveScaleId(mini.escala);

    // Resolve Série
    const seriesId = await getOrCreateSeries(brandId, mini.serie);

    // Resolve Categoria / Line Type
    const lineType = mini.categoria_nome ? mini.categoria_nome.toUpperCase().trim() : 'MAINLINE';

    const desc = (mini.descricao || `Miniatura ${code}`).trim();

    if (identifierMap.has(code)) {
      const varId = identifierMap.get(code);
      // Enriquece com a foto real da miniatura se tivermos
      await pg.unsafe(`
        UPDATE variation 
        SET 
          photo_url = COALESCE($1, photo_url),
          line_type = COALESCE(line_type, $2),
          series_id = COALESCE(series_id, $3),
          scale_id = COALESCE(scale_id, $4),
          release_year = COALESCE(release_year, $5)
        WHERE id = $6
      `, [photoUrl, lineType, seriesId, scaleId, mini.ano_fabricacao, varId]);
      miniUpdated++;
    } else {
      // Cria casting sob a marca da miniatura
      const castingId = await getOrCreateCasting(brandId, desc);

      // Cria variation
      const [newVar] = await pg.unsafe(`
        INSERT INTO variation (
          casting_id, series_id, scale_id, name, release_year, line_type, photo_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING id
      `, [
        castingId,
        seriesId,
        scaleId,
        desc,
        mini.ano_fabricacao,
        lineType,
        photoUrl
      ]);

      // Cria identificador
      const typeId = (finalBrandName === 'Hot Wheels' || finalBrandName === 'Matchbox') ? MATTEL_TYPE_ID : PRODUCT_TYPE_ID;
      await pg.unsafe(`
        INSERT INTO product_identifier (
          variation_id, identifier_type_id, code, normalized_code, is_primary
        )
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (identifier_type_id, normalized_code) DO NOTHING
      `, [newVar.id, typeId, code, code]);

      identifierMap.set(code, newVar.id);
      miniInserted++;
    }
  }

  console.log(`✅ Concluído Cadastro de Miniaturas: ${miniUpdated} enriquecidos, ${miniInserted} inseridos como novos modelos no catálogo.`);

  console.log('\n================================================================');
  console.log('🎉 RESUMO FINAL DA CARGA NO POSTGRESQL LOCAL:');
  console.log(`- Total de itens do Catálogo processados: ${catalogoItems.length} (${catUpdated} atualizados, ${catInserted} novos)`);
  console.log(`- Total de Miniaturas processadas: ${miniItems.length} (${miniUpdated} enriquecidas, ${miniInserted} novas)`);
  console.log(`- Total de fotos de miniaturas copiadas: ${copiedUploads}`);
  console.log('================================================================');

  await pool.close();
  await pg.end();
}

main().catch(err => {
  console.error('❌ ERRO NA SINCRONIZAÇÃO:', err);
  process.exit(1);
});
