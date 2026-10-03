import fs from 'node:fs';
import path from 'node:path';
import { eq, and } from 'drizzle-orm';
import { db, sqlClient } from './client';
import {
  miniatureBrand,
  automaker,
  scale,
  identifierType,
  series,
  casting,
  variation,
  productIdentifier,
} from './schema';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const AUTOMAKERS_DATA = [
  { name: 'Land Rover', country: 'Reino Unido' },
  { name: 'Brabus', country: 'Alemanha' },
  { name: 'Bentley', country: 'Reino Unido' },
  { name: 'RUF', country: 'Alemanha' },
  { name: 'Jaguar', country: 'Reino Unido' },
  { name: 'Mercedes-Benz', country: 'Alemanha' },
  { name: 'Pagani', country: 'Itália' },
  { name: 'Porsche', country: 'Alemanha' },
  { name: 'Audi', country: 'Alemanha' },
];

function detectAutomaker(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('land rover') || lower.includes('range rover') || lower.includes('defender') || lower.includes('discovery')) {
    return 'Land Rover';
  }
  if (lower.includes('brabus')) {
    return 'Brabus';
  }
  if (lower.includes('bentley')) {
    return 'Bentley';
  }
  if (lower.includes('ruf')) {
    return 'RUF';
  }
  if (lower.includes('jaguar')) {
    return 'Jaguar';
  }
  if (lower.includes('mercedes') || lower.includes('maybach') || lower.includes('amg')) {
    return 'Mercedes-Benz';
  }
  if (lower.includes('pagani') || lower.includes('huayra') || lower.includes('zonda')) {
    return 'Pagani';
  }
  if (lower.includes('porsche')) {
    return 'Porsche';
  }
  if (lower.includes('audi')) {
    return 'Audi';
  }
  return null;
}

function cleanCastingName(fullName: string): string {
  let cleaned = fullName
    // Remove trailing scale like 1/64, 1/43, 1/18
    .replace(/\s*1\s*\/\s*(?:64|43|18)\s*$/i, '')
    // Remove "model" keyword e.g. 2020model -> 2020
    .replace(/(\d{4})\s*model\b/gi, '$1')
    .replace(/(\d{4})\s*year\b/gi, '$1')
    // Remove trailing colors if apparent
    .replace(/\s*-\s*(?:Yellow|Silver|Black|White|Blue|Green|Red|Orange|Gold|Purple|Grey|Gray)\b.*$/i, '')
    .trim();

  // If there are leading/trailing quotes
  cleaned = cleaned.replace(/^"|"$/g, '').trim();
  return cleaned || fullName;
}

function extractYear(name: string): number | null {
  const match = name.match(/\b(19\d\d|20\d\d)\b/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

function extractColor(rawColor: string | undefined, name: string): string | null {
  if (rawColor && rawColor !== 'None' && rawColor.trim() !== '') {
    return rawColor.trim();
  }

  // Common colors in English names
  const colors = [
    'Yellow', 'Matte Silver', 'Satin Indus Silver', 'Diamond White', 'Obsidian Black',
    'Black', 'White', 'Blue', 'Green', 'Red', 'Orange', 'Silver', 'Gold',
    'Matte Black', 'Candy Purple', 'Metallic Copper', 'Metallic Blue',
    'Metallic Green', 'Metallic Gray', 'Matte Gray', 'Matte Olive Green',
    'Ruby Black', 'Iridium Silver', 'Fuji White', 'Santorini Black',
    'Pangea Green', 'Tasman Blue', 'Gondwana Stone', 'Irish Green', 'British Racing Green',
  ];

  for (const c of colors) {
    const regex = new RegExp(`\\b${c}\\b`, 'i');
    if (regex.test(name)) {
      return c;
    }
  }

  return null;
}

export async function seedAlmostRealCatalog() {
  console.log('🏎️  Iniciando carga do catálogo Almost Real (AR)...');

  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/AR/ar_catalogo_english.csv'),
    path.resolve(process.cwd(), 'catalogos/AR/ar_catalogo_english.csv'),
    'C:/Projetos/minihubcar/catalogos/AR/ar_catalogo_english.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo CSV ar_catalogo_english.csv não encontrado.');
  }
  console.log(`📂 Usando arquivo CSV: ${csvPath}`);

  // 1. Marca Almost Real
  let [arBrand] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'almost real'))
    .limit(1);

  if (!arBrand) {
    [arBrand] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Almost Real',
        normalizedName: 'almost real',
        description: 'Fabricante de modelos diecast premium em escalas 1:64 (ARbox), 1:43 e 1:18 com alto nível de detalhamento e acabamento autêntico.',
      })
      .returning();
    console.log('✨ Marca Almost Real criada com sucesso.');
  } else {
    console.log(`ℹ️  Marca Almost Real já existe (ID: ${arBrand.id})`);
  }
  const arBrandId = arBrand!.id;

  // 2. Tipo Identificador AR_CODE
  let [arIdType] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'AR_CODE'))
    .limit(1);

  if (!arIdType) {
    [arIdType] = await db
      .insert(identifierType)
      .values({
        miniatureBrandId: arBrandId,
        code: 'AR_CODE',
        name: 'Código Almost Real',
        description: 'Número de produção / código oficial Almost Real (item number)',
      })
      .returning();
    console.log('✨ Tipo de identificador AR_CODE criado.');
  }

  // 3. Garantir escalas 1:64, 1:43, 1:18
  const scaleDefs = [
    { name: '1:64', numerator: 1, denominator: 64, normalizedValue: '0.015625' },
    { name: '1:43', numerator: 1, denominator: 43, normalizedValue: '0.023256' },
    { name: '1:18', numerator: 1, denominator: 18, normalizedValue: '0.055556' },
  ];

  const scaleMap = new Map<string, string>();
  for (const s of scaleDefs) {
    let [found] = await db.select().from(scale).where(eq(scale.name, s.name)).limit(1);
    if (!found) {
      [found] = await db.insert(scale).values(s).returning();
    }
    scaleMap.set(s.name, found!.id);
  }

  // 4. Garantir montadoras
  const automakerMap = new Map<string, string>();
  for (const m of AUTOMAKERS_DATA) {
    const normalized = m.name.toLowerCase();
    let [found] = await db.select().from(automaker).where(eq(automaker.normalizedName, normalized)).limit(1);
    if (!found) {
      [found] = await db.insert(automaker).values({
        name: m.name,
        normalizedName: normalized,
        country: m.country,
      }).returning();
      console.log(`✨ Montadora criada: ${m.name}`);
    }
    automakerMap.set(m.name, found!.id);
  }

  // 5. Cache de séries da Almost Real
  const existingSeries = await db
    .select()
    .from(series)
    .where(eq(series.miniatureBrandId, arBrandId));
  const seriesMap = new Map<string, string>();
  for (const s of existingSeries) {
    seriesMap.set(s.normalizedName, s.id);
  }

  // 6. Cache de castings da Almost Real
  const existingCastings = await db
    .select()
    .from(casting)
    .where(eq(casting.miniatureBrandId, arBrandId));
  const castingMap = new Map<string, string>();
  for (const c of existingCastings) {
    castingMap.set(c.normalizedName, c.id);
  }

  // 7. Parse CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]!).map((h) => h.replace(/^\ufeff/, '').trim());

  console.log(`📋 Encontradas ${lines.length - 1} miniaturas no catálogo Almost Real.`);

  let insertedVariations = 0;
  let updatedVariations = 0;
  let insertedCastings = 0;
  let insertedSeries = 0;

  // Track codes seen in this import to handle duplicate item numbers gracefully
  const seenCodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const values = parseCSVLine(rawLine);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });

    const armodelId = row['id'] || String(i);
    let code = row['numero_producao'] || `AR-${armodelId}`;

    // Disambiguate if code was already encountered
    if (seenCodes.has(code.toLowerCase())) {
      code = `${code}-${armodelId}`;
    }
    seenCodes.add(code.toLowerCase());

    const fullName = (row['nome_ingles'] && row['nome_ingles'] !== 'None')
      ? row['nome_ingles']
      : row['nome_chines'] || `Almost Real ${code}`;

    const seriesName = row['marca_modelo'] || 'Almost Real';
    const normalizedSeries = seriesName.toLowerCase();

    // Scale
    const scaleRatio = row['especificacoes_proporcionais'] || '1:43';
    const scaleId = scaleMap.get(scaleRatio) || scaleMap.get('1:43')!;

    // Resolve or insert series
    let seriesId = seriesMap.get(normalizedSeries) || null;
    if (!seriesId) {
      const [newSeries] = await db
        .insert(series)
        .values({
          miniatureBrandId: arBrandId,
          name: seriesName,
          normalizedName: normalizedSeries,
          description: `Série Almost Real: ${seriesName}`,
        })
        .onConflictDoNothing()
        .returning();

      if (newSeries) {
        seriesId = newSeries.id;
        seriesMap.set(normalizedSeries, seriesId);
        insertedSeries++;
      } else {
        const [found] = await db
          .select()
          .from(series)
          .where(and(eq(series.miniatureBrandId, arBrandId), eq(series.normalizedName, normalizedSeries)))
          .limit(1);
        if (found) {
          seriesId = found.id;
          seriesMap.set(normalizedSeries, seriesId);
        }
      }
    }

    // Automaker & Casting
    const automakerName = detectAutomaker(fullName);
    const automakerId = automakerName ? automakerMap.get(automakerName) || null : null;
    const castingName = cleanCastingName(fullName);
    const normalizedCasting = castingName.toLowerCase();

    let castingId = castingMap.get(normalizedCasting) || null;
    if (!castingId) {
      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: arBrandId,
          automakerId,
          name: castingName,
          normalizedName: normalizedCasting,
          fantasyFlag: false,
        })
        .onConflictDoNothing()
        .returning();

      if (newCasting) {
        castingId = newCasting.id;
        castingMap.set(normalizedCasting, castingId);
        insertedCastings++;
      } else {
        const [found] = await db
          .select()
          .from(casting)
          .where(and(eq(casting.miniatureBrandId, arBrandId), eq(casting.normalizedName, normalizedCasting)))
          .limit(1);
        if (found) {
          castingId = found.id;
          castingMap.set(normalizedCasting, castingId);
        }
      }
    }

    if (!castingId) {
      console.warn(`⚠️ Não foi possível resolver casting para "${fullName}"`);
      continue;
    }

    // Attributes
    const releaseYear = extractYear(fullName);
    const color = extractColor(row['cor_produto'], fullName);
    const finish = /matte/i.test(fullName) ? 'Matte' : (/satin/i.test(fullName) ? 'Satin' : null);

    // Limited edition & Rarity
    const limitedRaw = row['lancamento_limitado'];
    const isLimited = limitedRaw && limitedRaw !== 'None' && limitedRaw !== 'No' && limitedRaw !== '0';
    const rarity = isLimited ? 'LIMITED' : 'REGULAR';
    const edition = isLimited ? `Edição Limitada ${limitedRaw} pcs` : null;

    // Photos
    const rawPhoto = row['foto_arquivo'] || `${row['numero_producao']}.jpg`;
    const localPhotoFile = rawPhoto.split(/[\\/]/).pop() || '';
    const photoUrl = `/catalog-media/AR/fotos/${localPhotoFile}`;

    // Description details
    const price = row['preco_sugerido'] ? `Preço sugerido: ${row['preco_sugerido']}` : '';
    const sourceUrl = row['url_produto'] ? `Site oficial: ${row['url_produto']}` : '';
    const description = [price, sourceUrl].filter(Boolean).join(' • ') || null;

    // Check existing product_identifier
    const [existingId] = await db
      .select({
        variationId: productIdentifier.variationId,
      })
      .from(productIdentifier)
      .where(
        and(
          eq(productIdentifier.identifierTypeId, arIdType!.id),
          eq(productIdentifier.normalizedCode, code.toLowerCase())
        )
      )
      .limit(1);

    if (existingId) {
      await db
        .update(variation)
        .set({
          castingId,
          seriesId,
          scaleId,
          name: fullName,
          releaseYear,
          color,
          finish,
          edition,
          collectorNumber: row['numero_producao'] || null,
          lineType: seriesName,
          rarity,
          photoUrl,
          description,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingId.variationId));

      updatedVariations++;
    } else {
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          seriesId,
          scaleId,
          name: fullName,
          releaseYear,
          color,
          finish,
          edition,
          collectorNumber: row['numero_producao'] || null,
          lineType: seriesName,
          rarity,
          photoUrl,
          description,
        })
        .returning();

      if (newVar) {
        await db
          .insert(productIdentifier)
          .values({
            variationId: newVar.id,
            identifierTypeId: arIdType!.id,
            code,
            normalizedCode: code.toLowerCase(),
            isPrimary: true,
          })
          .onConflictDoNothing();

        insertedVariations++;
      }
    }
  }

  console.log(`\n🏁 Resumo da carga do catálogo Almost Real:`);
  console.log(`   - Séries cadastradas/verificadas: ${insertedSeries}`);
  console.log(`   - Castings cadastrados: ${insertedCastings}`);
  console.log(`   - Variações inseridas: ${insertedVariations}`);
  console.log(`   - Variações atualizadas: ${updatedVariations}`);
  console.log(`   - Total processado: ${insertedVariations + updatedVariations} miniaturas.`);

  return {
    insertedVariations,
    updatedVariations,
    insertedCastings,
    insertedSeries,
  };
}

// Run directly if invoked as script
if (process.argv[1] && process.argv[1].endsWith('seed-ar-catalog.ts')) {
  seedAlmostRealCatalog()
    .then(async () => {
      console.log('✅ Seed Almost Real concluído com sucesso!');
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Erro no seed Almost Real:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
