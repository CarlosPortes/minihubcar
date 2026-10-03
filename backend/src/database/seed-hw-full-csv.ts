import fs from 'node:fs';
import path from 'node:path';
import { eq, and } from 'drizzle-orm';
import { db, sqlClient } from './client';
import {
  miniatureBrand,
  scale,
  identifierType,
  series,
  casting,
  variation,
  productIdentifier,
} from './schema';

const KNOWN_HOLIDAYS_AND_TAGS = [
  'Walmart Exclusive',
  'Target Exclusive',
  'Kroger Exclusive',
  'Dollar General Exclusive',
  'Dollar Tree/Family Dollar Exclusive',
  'Family Dollar/Dollar Tree Exclusive',
  '"From the Vault" Exclusive',
  'Red EditionTarget Exclusive',
  'Easterseals',
  'International Day of Play',
  'World Autism Awareness Day',
  'World Braille Day',
  'World Mental Health Day',
  'Day of the Dead/Halloween',
  'Earth Day',
  'Happy Birthday!',
  'International Friendship Day',
  "International Women's Day",
  "Valentine's Day",
  'Leap Year',
  'New for 2023!',
  'New for 2024!',
  'New for 2025!',
  'New for 2026!',
  'New in Mainline',
  'Super Treasure Hunt',
  'Treasure Hunt',
];

function parseCSVLine(line: string, delimiter: string = ','): string[] {
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
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanSeriesAndEdition(rawSerie: string, rawDesc: string, rawFonte: string, year: number) {
  let seriesName = (rawSerie || '').trim();
  const editions: string[] = [];

  if (!seriesName && (rawFonte.includes('5-Packs') || rawDesc.includes('5-Pack'))) {
    seriesName = '5-Packs';
  } else if (!seriesName) {
    seriesName = 'Mainline';
  } else {
    for (const tag of KNOWN_HOLIDAYS_AND_TAGS) {
      if (seriesName.includes(tag)) {
        if (!tag.includes('Treasure Hunt')) {
          editions.push(tag);
        }
        seriesName = seriesName.replace(tag, '').trim();
      }
    }
  }

  const parenMatch = rawDesc.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1]) {
    editions.push(parenMatch[1]);
  }

  return {
    seriesName: seriesName || 'Mainline',
    edition: editions.length > 0 ? Array.from(new Set(editions)).join(' • ') : undefined,
  };
}

function deriveNameFromUrl(url: string, code: string, serie: string, cor: string): string {
  if (!url) return serie ? `${serie} - ${code}` : code;

  const match = url.match(/\/([^\/?#]+)\.(?:jpg|jpeg|png|webp)/i);
  if (!match || !match[1]) return serie ? `${serie} - ${code}` : code;

  let rawName = decodeURIComponent(match[1]);
  rawName = rawName.replace(/_\d+px$/, '').replace(/_o\d+$/, '');

  if (/^\d+$/.test(rawName) || rawName.toUpperCase() === code.toUpperCase() || rawName.length < 3) {
    if (serie) return `${serie} #${code}`;
    return `Hot Wheels ${code}${cor ? ` (${cor})` : ''}`;
  }

  rawName = rawName
    .replace(/_TheHotOnes_2025/gi, '')
    .replace(/_HO_/gi, ' ')
    .replace(/_o\d+/gi, '')
    .replace(/_r\d+/gi, '')
    .replace(/_\d{2}_\w+$/gi, '')
    .replace(/_pink$/gi, '')
    .replace(/_gold$/gi, '')
    .replace(/_/g, ' ')
    .trim();

  let formatted = rawName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  formatted = formatted.replace(/' /g, "'");
  return formatted || (serie ? `${serie} - ${code}` : code);
}

function extractCastingName(descricao: string): string {
  return descricao.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function extractRarity(linha: string, rawSerie: string): string {
  if (linha === 'STH' || rawSerie.includes('Super Treasure Hunt')) return 'STH';
  if (linha === 'TH' || rawSerie.includes('Treasure Hunt')) return 'TH';
  return 'REGULAR';
}

export async function seedHotWheelsFullCatalog(
  customPath?: string,
  options: { dryRun?: boolean } = {}
) {
  const isDryRun = options.dryRun ?? false;
  console.log(`🏎️  Iniciando importação completa do catálogo Hot Wheels (hw_catalogo.csv)...`);
  if (isDryRun) {
    console.log(`🧪 [MODO SIMULAÇÃO --dry-run ATIVADO]: Nenhuma alteração será gravada no banco de dados.`);
  }

  const possibleCsvPaths = [
    customPath,
    '/app/catalogos/HW/hw_catalogo.csv',
    '/app/catalogos/hw/hw_catalogo.csv',
    '/app/catalogos/hw_catalogo.csv',
    path.resolve(process.cwd(), '../catalogos/HW/hw_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/HW/hw_catalogo.csv'),
    path.resolve(process.cwd(), '../catalogos/hw/hw_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/hw/hw_catalogo.csv'),
    '/var/www/minihubcar/catalogos/HW/hw_catalogo.csv',
    'D:/Projetos/minihubcar/hw/hw_catalogo.csv',
    'D:/Projetos/minihubcar/hw/HW/HW/hw_catalogo.csv',
    'C:/Projetos/minihubcar/catalogos/HW/hw_catalogo.csv',
  ].filter(Boolean) as string[];

  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error(
      `❌ Arquivo hw_catalogo.csv não encontrado. Locais verificados:\n${possibleCsvPaths.join('\n')}`
    );
  }

  console.log(`📂 Arquivo CSV encontrado: ${csvPath}`);

  // Base directory for photos
  const basePhotosDir = path.dirname(csvPath);

  // 1. Marca Hot Wheels
  let [hwBrand] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'hot wheels'))
    .limit(1);

  if (!hwBrand) {
    [hwBrand] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Hot Wheels',
        normalizedName: 'hot wheels',
        description: 'Mattel diecast 1:64',
      })
      .returning();
  }
  const hwBrandId = hwBrand!.id;

  // 2. Escala 1:64
  let [scale64] = await db.select().from(scale).where(eq(scale.name, '1:64')).limit(1);
  if (!scale64) {
    [scale64] = await db
      .insert(scale)
      .values({
        name: '1:64',
        numerator: 1,
        denominator: 64,
        normalizedValue: '0.015625',
      })
      .returning();
  }

  // 3. Tipo identificador MATTEL_CODE
  let [mattelIdType] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MATTEL_CODE'))
    .limit(1);

  if (!mattelIdType) {
    [mattelIdType] = await db
      .insert(identifierType)
      .values({
        code: 'MATTEL_CODE',
        name: 'Código Mattel',
        description: 'Código de miniatura da Mattel (Hot Wheels / Matchbox)',
      })
      .returning();
  }

  // 4. Cache de séries da Hot Wheels
  const existingSeries = await db
    .select()
    .from(series)
    .where(eq(series.miniatureBrandId, hwBrandId));
  const seriesMap = new Map<string, string>();
  for (const s of existingSeries) {
    seriesMap.set(s.normalizedName, s.id);
  }

  // 5. Cache de castings da Hot Wheels
  const existingCastings = await db
    .select()
    .from(casting)
    .where(eq(casting.miniatureBrandId, hwBrandId));
  const castingMap = new Map<string, string>();
  for (const c of existingCastings) {
    castingMap.set(c.normalizedName, c.id);
  }

  // 6. Cache de identificadores existentes (para O(1) deduplication check em memória)
  console.log(`🔍 Carregando identificadores Mattel existentes no banco para deduplicação instantânea...`);
  const existingProductIds = await db
    .select({
      normalizedCode: productIdentifier.normalizedCode,
      variationId: productIdentifier.variationId,
    })
    .from(productIdentifier)
    .where(eq(productIdentifier.identifierTypeId, mattelIdType!.id));

  const identifierMap = new Map<string, string>();
  for (const item of existingProductIds) {
    identifierMap.set(item.normalizedCode, item.variationId);
  }
  console.log(`   - Identificadores existentes no banco: ${identifierMap.size}`);

  const seenCodesInCsv = new Set<string>();

  // 7. Leitura do CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const firstLine = lines[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = parseCSVLine(firstLine, delimiter).map((h) => h.replace(/^\ufeff/, '').trim());

  const totalLines = lines.length - 1;
  console.log(`📋 Total de registros a processar: ${totalLines} miniaturas (delimitador: "${delimiter}").`);

  let insertedVariations = 0;
  let updatedVariations = 0;
  let insertedCastings = 0;
  let insertedSeries = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const values = parseCSVLine(rawLine, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });

    const year = row['ano_lancamento'] ? parseInt(row['ano_lancamento'], 10) : 2026;

    let descricao = row['descricao'];
    const castingName = extractCastingName(descricao || 'Hot Wheels');
    const normalizedCasting = castingName.toLowerCase();

    let code = row['codigo_hotwheels']?.toUpperCase();
    if (!code) {
      const cleanSlug = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
      const cSlug = cleanSlug(castingName);
      const colSlug = cleanSlug(row['cor'] || '');
      const serSlug = cleanSlug(row['serie'] || '');
      if (row['numero_colecao']) {
        code = `HW-${year}-C${row['numero_colecao']}-${cSlug}`;
      } else {
        code = `HW-${year}-${cSlug}${colSlug ? `-${colSlug}` : ''}${serSlug ? `-${serSlug}` : ''}`;
      }
      let baseCode = code;
      let counter = 2;
      while (seenCodesInCsv.has(code)) {
        code = `${baseCode}-V${counter}`;
        counter++;
      }
    }
    seenCodesInCsv.add(code);

    if (!descricao) {
      descricao = deriveNameFromUrl(row['url_imagem'] || '', code, row['serie'] || '', row['cor'] || '');
    }

    const { seriesName, edition } = cleanSeriesAndEdition(
      row['serie'] || '',
      descricao,
      row['url_fonte'] || '',
      year
    );

    const rarity = extractRarity(row['linha'] || '', row['serie'] || '');
    const releaseYear = year;
    const collectorNumber = row['numero_colecao'] || null;
    const seriesNumber = row['serie_numero'] || null;
    const lineType = seriesName === '5-Packs' ? '5-Packs' : (row['linha'] || 'Mainline');

    const photoFile = row['arquivo_imagem'] || `${code}.jpg`;

    // Detect if photo exists locally in HW root or year folder or fotos folder
    let photoUrl = `/catalog-media/HW/${photoFile}`;
    const checkDirect = path.join(basePhotosDir, photoFile);
    const checkYear = path.join(basePhotosDir, String(year), photoFile);
    const checkFotos = path.join(basePhotosDir, 'fotos', photoFile);

    if (fs.existsSync(checkYear)) {
      photoUrl = `/catalog-media/HW/${year}/${photoFile}`;
    } else if (fs.existsSync(checkFotos)) {
      photoUrl = `/catalog-media/HW/fotos/${photoFile}`;
    } else if (fs.existsSync(checkDirect)) {
      photoUrl = `/catalog-media/HW/${photoFile}`;
    } else if (row['url_imagem']) {
      // If photo file not yet downloaded or extracted, point to online image fallback
      photoUrl = `/catalog-media/HW/${photoFile}`;
    }

    const description = row['url_fonte']
      ? `Fonte: ${row['fonte'] || 'fandom'} (${row['url_fonte']})`
      : null;

    const normalizedSeries = (seriesName || 'Mainline').toLowerCase();

    // Check if variation already exists via in-memory O(1) cache
    const existingVariationId = identifierMap.get(code.toLowerCase());

    // Se estiver em modo DRY-RUN, apenas contabiliza sem tocar no banco
    if (isDryRun) {
      if (!seriesMap.has(normalizedSeries)) {
        seriesMap.set(normalizedSeries, 'dry-run-series-id');
        insertedSeries++;
      }
      if (!castingMap.has(normalizedCasting)) {
        castingMap.set(normalizedCasting, 'dry-run-casting-id');
        insertedCastings++;
      }
      if (existingVariationId) {
        updatedVariations++;
      } else {
        identifierMap.set(code.toLowerCase(), 'dry-run-variation-id');
        insertedVariations++;
      }

      if (i % 2000 === 0 || i === lines.length - 1) {
        const pct = ((i / totalLines) * 100).toFixed(1);
        console.log(
          `🧪 [SIMULAÇÃO ${i}/${totalLines} (${pct}%)] - Novos: ${insertedVariations} | Existentes (Atualização): ${updatedVariations} | Novos Castings: ${insertedCastings}`
        );
      }
      continue;
    }

    // Resolve or insert series
    let seriesId: string | null = null;
    if (seriesName) {
      seriesId = seriesMap.get(normalizedSeries) || null;
      if (!seriesId) {
        const [newSeries] = await db
          .insert(series)
          .values({
            miniatureBrandId: hwBrandId,
            name: seriesName,
            normalizedName: normalizedSeries,
            description: `Série Hot Wheels: ${seriesName}`,
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
            .where(
              and(
                eq(series.miniatureBrandId, hwBrandId),
                eq(series.normalizedName, normalizedSeries)
              )
            )
            .limit(1);
          if (found) {
            seriesId = found.id;
            seriesMap.set(normalizedSeries, seriesId);
          }
        }
      }
    }

    // Resolve or insert casting
    let castingId = castingMap.get(normalizedCasting) || null;
    if (!castingId) {
      const isFantasy =
        seriesName.includes('X-Raycers') ||
        seriesName.includes('Experimotors') ||
        seriesName.includes('HW Mods') ||
        descricao.includes('Batmobile') ||
        descricao.includes('Tooned');

      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: hwBrandId,
          name: castingName,
          normalizedName: normalizedCasting,
          fantasyFlag: isFantasy,
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
          .where(
            and(
              eq(casting.miniatureBrandId, hwBrandId),
              eq(casting.normalizedName, normalizedCasting)
            )
          )
          .limit(1);
        if (found) {
          castingId = found.id;
          castingMap.set(normalizedCasting, castingId);
        }
      }
    }

    if (!castingId) {
      continue;
    }

    if (existingVariationId) {
      // Update existing variation (NÃO DUPLICA!)
      await db
        .update(variation)
        .set({
          castingId,
          seriesId,
          scaleId: scale64!.id,
          name: descricao,
          releaseYear,
          color: row['cor'] || null,
          edition: edition || null,
          collectorNumber,
          seriesNumber,
          lineType,
          rarity,
          photoUrl,
          description,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingVariationId));

      updatedVariations++;
    } else {
      // Insert new variation
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          seriesId,
          scaleId: scale64!.id,
          name: descricao,
          releaseYear,
          color: row['cor'] || null,
          edition: edition || null,
          collectorNumber,
          seriesNumber,
          lineType,
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
            identifierTypeId: mattelIdType!.id,
            code,
            normalizedCode: code.toLowerCase(),
            isPrimary: true,
          })
          .onConflictDoNothing();

        identifierMap.set(code.toLowerCase(), newVar.id);
        insertedVariations++;
      }
    }

    // Feedback progress every 1000 rows
    if (i % 1000 === 0 || i === lines.length - 1) {
      const pct = ((i / totalLines) * 100).toFixed(1);
      console.log(
        `⏱️  [${i}/${totalLines} (${pct}%)] - Inseridos: ${insertedVariations} | Atualizados: ${updatedVariations} | Castings: ${insertedCastings}`
      );
    }
  }

  console.log(`\n🎉 Carga de Hot Wheels finalizada!`);
  if (isDryRun) {
    console.log(`   [RELATÓRIO DE SIMULAÇÃO - NENHUMA ALTERAÇÃO FEITA NO BANCO]:`);
  }
  console.log(`   - Novas séries criadas: ${insertedSeries}`);
  console.log(`   - Novos castings criados: ${insertedCastings}`);
  console.log(`   - Novas variações a inserir: ${insertedVariations}`);
  console.log(`   - Variações existentes a atualizar (sem duplicação): ${updatedVariations}`);
  console.log(`   - Total final no catálogo: ${insertedVariations + updatedVariations}`);
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed-hw-full-csv.ts')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const customPath = args.find((a) => !a.startsWith('-'));

  seedHotWheelsFullCatalog(customPath, { dryRun })
    .then(async () => {
      console.log('✅ Execução concluída!');
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Erro na importação:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
