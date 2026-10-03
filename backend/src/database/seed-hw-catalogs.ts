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

export async function seedHotWheelsYear(year: number) {
  console.log(`🏎️  Iniciando carga do catálogo Hot Wheels ${year}...`);

  const possibleCsvPaths = [
    path.resolve(process.cwd(), `../catalogos/hw/${year}/hw_${year}.csv`),
    path.resolve(process.cwd(), `catalogos/hw/${year}/hw_${year}.csv`),
    `D:/Projetos/minihubcar/catalogos/hw/${year}/hw_${year}.csv`,
    `C:/Projetos/minihubcar/catalogos/hw/${year}/hw_${year}.csv`,
  ];

  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error(`❌ Arquivo CSV para Hot Wheels ${year} não encontrado em nenhum dos locais esperados.`);
  }
  console.log(`📂 Usando arquivo CSV: ${csvPath}`);

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
        description: 'Código de brinquedo / miniatura da Mattel (Hot Wheels / Matchbox)',
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

  // 6. Parse do CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]!).map((h) => h.replace(/^\ufeff/, '').trim());

  console.log(`📋 Encontrados ${lines.length - 1} registros para o ano ${year}.`);

  let insertedVariations = 0;
  let updatedVariations = 0;
  let insertedCastings = 0;
  let insertedSeries = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const values = parseCSVLine(rawLine);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || '';
    });

    let code = row['codigo_hotwheels']?.toUpperCase();
    if (!code) {
      if (row['numero_colecao']) {
        code = `HW${String(year).slice(-2)}-COL${row['numero_colecao']}`;
      } else {
        code = `HW${String(year).slice(-2)}-ROW${i}`;
      }
    }

    let descricao = row['descricao'];
    if (!descricao) {
      descricao = deriveNameFromUrl(row['url_imagem'] || '', code, row['serie'] || '', row['cor'] || '');
    }

    const { seriesName, edition } = cleanSeriesAndEdition(
      row['serie'] || '',
      descricao,
      row['url_fonte'] || '',
      year
    );

    const castingName = extractCastingName(descricao);
    const normalizedCasting = castingName.toLowerCase();
    const rarity = extractRarity(row['linha'] || '', row['serie'] || '');
    const releaseYear = row['ano_lancamento'] ? parseInt(row['ano_lancamento'], 10) : year;
    const collectorNumber = row['numero_colecao'] || null;
    const seriesNumber = row['serie_numero'] || null;
    const lineType = seriesName === '5-Packs' ? '5-Packs' : (row['linha'] || 'Mainline');
    const photoFile = row['arquivo_imagem'] || `${code}.jpg`;
    const photoUrl = `/catalog-media/HW/${year}/${photoFile}`;
    const description = row['url_fonte']
      ? `Fonte: ${row['fonte'] || 'fandom'} (${row['url_fonte']})`
      : null;

    // Resolve or insert series
    let seriesId: string | null = null;
    if (seriesName) {
      const normalizedSeries = seriesName.toLowerCase();
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
      console.warn(`⚠️ Não foi possível resolver casting para "${descricao}"`);
      continue;
    }

    // Check if product_identifier already exists for this MATTEL_CODE
    const [existingId] = await db
      .select({
        variationId: productIdentifier.variationId,
      })
      .from(productIdentifier)
      .where(
        and(
          eq(productIdentifier.identifierTypeId, mattelIdType!.id),
          eq(productIdentifier.normalizedCode, code.toLowerCase())
        )
      )
      .limit(1);

    if (existingId) {
      // Update existing variation
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
        .where(eq(variation.id, existingId.variationId));

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

        insertedVariations++;
      }
    }
  }

  console.log(`🏁 Resumo da carga de Hot Wheels ${year}:`);
  console.log(`   - Novas séries: ${insertedSeries}`);
  console.log(`   - Novos castings: ${insertedCastings}`);
  console.log(`   - Variações inseridas: ${insertedVariations}`);
  console.log(`   - Variações atualizadas: ${updatedVariations}`);
  console.log(`   - Total processado: ${insertedVariations + updatedVariations} itens.`);

  return {
    year,
    insertedVariations,
    updatedVariations,
    insertedCastings,
    insertedSeries,
  };
}

export async function seedAllHotWheelsCatalogs(years = [2023, 2024, 2025, 2026]) {
  console.log(`🚀 Iniciando carga dos catálogos Hot Wheels para os anos: ${years.join(', ')}...`);
  const results = [];
  for (const y of years) {
    const res = await seedHotWheelsYear(y);
    results.push(res);
  }
  console.log(`\n🎉 Carga de todos os catálogos Hot Wheels concluída!`);
  return results;
}

// Run if called as a script
if (process.argv[1] && process.argv[1].endsWith('seed-hw-catalogs.ts')) {
  // If argument passed e.g. tsx seed-hw-catalogs.ts 2023,2024,2025
  const arg = process.argv[2];
  const targetYears = arg
    ? arg.split(',').map((s) => parseInt(s.trim(), 10))
    : [2023, 2024, 2025, 2026];

  seedAllHotWheelsCatalogs(targetYears)
    .then(async () => {
      console.log('✅ Seed HW concluído com sucesso!');
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Erro no seed HW:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
