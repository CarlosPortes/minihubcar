import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, and } from 'drizzle-orm';
import { db, sqlClient } from './client';
import {
  miniatureBrand,
  automaker,
  scale,
  identifierType,
  casting,
  variation,
  productIdentifier,
} from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automakers normalization & detection
const KNOWN_AUTOMAKERS: Array<{ name: string; country: string; patterns: RegExp[] }> = [
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\b911\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\bboxster\b/i, /\bcayman\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bchevy\b/i, /\bcorvette\b/i, /\bcamaro\b/i, /\bel camino\b/i, /\bbel air\b/i, /\bchevelle\b/i, /\bc10\b/i, /\bcaprice\b/i, /\bimpala\b/i, /\bnova\b/i, /\bbiscayne\b/i, /\bnomad\b/i, /\bvega\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bmustang\b/i, /\bshelby\b/i, /\bbronco\b/i, /\bf-150\b/i, /\bgt40\b/i, /\bcrown victoria\b/i, /\beconoline\b/i, /\bgalaxie\b/i, /\bthunderbird\b/i, /\btorino\b/i, /\btaurus\b/i] },
  { name: 'Pontiac', country: 'Estados Unidos', patterns: [/\bpontiac\b/i, /\bfirebird\b/i, /\btrans am\b/i, /\bgto\b/i, /\bhotbird\b/i, /\bpiranha\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\ba8\b/i, /\ba6\b/i, /\ba4\b/i, /\br8\b/i, /\bquattro\b/i, /\btt\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm5\b/i, /\bz3\b/i, /\bz4\b/i, /\bi8\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\bmiura\b/i, /\bdiablo\b/i, /\bmurci[eé]lago\b/i, /\bgallardo\b/i, /\baventador\b/i, /\bhurac[aá]n\b/i, /\bcountach\b/i, /\brevuelto\b/i, /\btemerario\b/i, /\burus\b/i] },
  { name: 'Dodge', country: 'Estados Unidos', patterns: [/\bdodge\b/i, /\bviper\b/i, /\bcharger\b/i, /\bchallenger\b/i, /\bram\b/i, /\bdurango\b/i, /\bcoronet\b/i] },
  { name: 'Plymouth', country: 'Estados Unidos', patterns: [/\bplymouth\b/i, /\bfury\b/i, /\bcuda\b/i, /\bbarracuda\b/i, /\bgtx\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bbeetle\b/i, /\bgolf\b/i, /\bfusca\b/i, /\bkombi\b/i, /\bkarmann ghia\b/i, /\bnotchback\b/i, /\bsquareback\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bamg\b/i, /\bslk\b/i, /\bclk\b/i, /\bslr\b/i, /\bg-class\b/i, /\b300sl\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bdatsun\b/i, /\bskyline\b/i, /\bgt-r\b/i, /\bgtr\b/i, /\b350z\b/i, /\b370z\b/i, /\b240z\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\bsupra\b/i, /\bcelica\b/i, /\bland cruiser\b/i, /\bcorolla\b/i, /\bmr2\b/i] },
  { name: 'Honda', country: 'Japão', patterns: [/\bhonda\b/i, /\bacura\b/i, /\bcivic\b/i, /\bnsx\b/i, /\bintegra\b/i, /\bs2000\b/i] },
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\bf40\b/i, /\bf50\b/i, /\benzo\b/i, /\btestarossa\b/i, /\b458\b/i] },
  { name: 'Bugatti', country: 'França', patterns: [/\bbugatti\b/i, /\bchiron\b/i, /\bveyron\b/i, /\beb110\b/i] },
  { name: 'Jeep', country: 'Estados Unidos', patterns: [/\bjeep\b/i, /\bwrangler\b/i, /\bgladiator\b/i, /\bcherokee\b/i] },
  { name: 'Cadillac', country: 'Estados Unidos', patterns: [/\bcadillac\b/i, /\bescalade\b/i, /\bdeville\b/i, /\beldorado\b/i] },
  { name: 'Buick', country: 'Estados Unidos', patterns: [/\bbuick\b/i, /\bcentury\b/i, /\briviera\b/i, /\bgrand national\b/i] },
  { name: 'Chrysler', country: 'Estados Unidos', patterns: [/\bchrysler\b/i, /\b300\b/i, /\bpt cruiser\b/i] },
  { name: 'Studebaker', country: 'Estados Unidos', patterns: [/\bstudebaker\b/i, /\bstarliner\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\bvantage\b/i, /\bdb7\b/i, /\bdb9\b/i] },
  { name: 'Jaguar', country: 'Reino Unido', patterns: [/\bjaguar\b/i, /\be-type\b/i, /\bxk8\b/i, /\bxj220\b/i] },
  { name: 'McLaren', country: 'Reino Unido', patterns: [/\bmclaren\b/i, /\bf1\b/i, /\bp1\b/i, /\b720s\b/i] },
  { name: 'Subaru', country: 'Japão', patterns: [/\bsubaru\b/i, /\bimpreza\b/i, /\bwrx\b/i] },
  { name: 'Mazda', country: 'Japão', patterns: [/\bmazda\b/i, /\bmiata\b/i, /\bmx-5\b/i, /\brx-7\b/i, /\brx-8\b/i] },
  { name: 'Mitsubishi', country: 'Japão', patterns: [/\bmitsubishi\b/i, /\blancer\b/i, /\bevo\b/i, /\beclipse\b/i] },
  { name: 'Peugeot', country: 'França', patterns: [/\bpeugeot\b/i, /\b205\b/i, /\b206\b/i, /\b405\b/i] },
  { name: 'Renault', country: 'França', patterns: [/\brenault\b/i, /\bclio\b/i, /\bmegane\b/i, /\b5 turbo\b/i] },
  { name: 'Fiat', country: 'Itália', patterns: [/\bfiat\b/i, /\b500\b/i, /\bpunto\b/i] },
  { name: 'Alfa Romeo', country: 'Itália', patterns: [/\balfa romeo\b/i, /\bgiulia\b/i, /\b4c\b/i] },
  { name: 'Hummer', country: 'Estados Unidos', patterns: [/\bhummer\b/i, /\bh1\b/i, /\bh2\b/i, /\bh3\b/i] },
  { name: 'Land Rover', country: 'Reino Unido', patterns: [/\bland rover\b/i, /\brange rover\b/i, /\bdefender\b/i] },
];

function detectAutomaker(rawMake: string, fullName: string): string | null {
  const cleanRaw = rawMake.trim();
  if (cleanRaw && cleanRaw !== 'Maisto Original') {
    const rawLower = cleanRaw.toLowerCase();
    for (const am of KNOWN_AUTOMAKERS) {
      if (rawLower === am.name.toLowerCase() || rawLower.includes(am.name.toLowerCase())) {
        return am.name;
      }
    }
  }

  for (const am of KNOWN_AUTOMAKERS) {
    for (const pattern of am.patterns) {
      if (pattern.test(fullName) || pattern.test(cleanRaw)) {
        return am.name;
      }
    }
  }
  return null;
}

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
    } else if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function extractYear(yearStr?: string, name?: string): number | null {
  const match = (yearStr || '').match(/\b(19\d{2}|20\d{2})\b/);
  if (match && match[1]) return parseInt(match[1], 10);
  const nameMatch = (name || '').match(/\b(19\d{2}|20\d{2})\b/);
  if (nameMatch && nameMatch[1]) return parseInt(nameMatch[1], 10);
  return null;
}

export async function seedMaistoCatalog() {
  console.log('🏁 ========================================================');
  console.log('🚗  Iniciando carga do catálogo Maisto (Fresh Metal / 1:64)...');
  console.log('🏁 ========================================================');

  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/Maisto/maisto_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/Maisto/maisto_catalogo.csv'),
    'C:/Projetos/minihubcar/catalogos/Maisto/maisto_catalogo.csv',
    '/var/www/minihubcar/catalogos/Maisto/maisto_catalogo.csv',
    '/app/catalogos/Maisto/maisto_catalogo.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo maisto_catalogo.csv não encontrado.');
  }
  console.log(`📂 Arquivo CSV localizado: ${csvPath}`);

  // 1. Marca Maisto
  let [brandRow] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'maisto'))
    .limit(1);

  if (!brandRow) {
    [brandRow] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Maisto',
        normalizedName: 'maisto',
        description: 'Maisto die-cast miniature vehicles (Fresh Metal, All Stars, Motor Works)',
        status: 'ACTIVE',
      })
      .returning();
  }
  const brandId = brandRow!.id;

  // 2. Tipos de Identificadores (Código / SKU / Card #)
  let [idTypeCode] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MAISTO_CODE'))
    .limit(1);

  if (!idTypeCode) {
    [idTypeCode] = await db
      .insert(identifierType)
      .values({
        code: 'MAISTO_CODE',
        name: 'Código de Modelo Maisto',
        description: 'Número de catálogo/card/série Maisto (Card # ou SKU)',
      })
      .returning();
  }
  const idTypeCodeId = idTypeCode!.id;

  // 3. Escala 1:64
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
  const scaleId = scale64!.id;

  // 4. Carrega Automakers
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const am of allAutomakers) {
    automakerMap.set(am.name.toLowerCase(), am.id);
  }

  // 5. Carrega Castings existentes da Maisto
  const existingCastings = await db
    .select()
    .from(casting)
    .where(eq(casting.miniatureBrandId, brandId));
  const castingMap = new Map<string, string>();
  for (const c of existingCastings) {
    castingMap.set(c.normalizedName, c.id);
  }

  // 6. Carrega Identifiers existentes
  const existingIdentifiers = await db
    .select()
    .from(productIdentifier)
    .where(eq(productIdentifier.identifierTypeId, idTypeCodeId));
  const identifierVariationMap = new Map<string, string>();
  for (const pi of existingIdentifiers) {
    identifierVariationMap.set(pi.code.toLowerCase(), pi.variationId);
  }

  // 7. Processa o CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const firstLine = lines[0];
  if (!firstLine) {
    console.log('⚠️ Arquivo CSV vazio ou apenas cabeçalho.');
    return;
  }
  const headerLine = firstLine.replace(/^\uFEFF/, '');
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  const idxCode = headers.indexOf('model_code');
  const idxToy = headers.indexOf('toy_number');
  const idxName = headers.indexOf('model_name');
  const idxMake = headers.indexOf('automaker');
  const idxLine = headers.indexOf('line');
  const idxSub = headers.indexOf('sub_series');
  const idxNum = headers.indexOf('series_number');
  const idxYear = headers.indexOf('release_year');
  const idxColor = headers.indexOf('color');
  const idxTampo = headers.indexOf('tampo');
  const idxWheel = headers.indexOf('wheel_type');
  const idxNotes = headers.indexOf('notes');
  const idxPhotoUrl = headers.indexOf('photo_url');
  const idxSourceUrl = headers.indexOf('source_url');

  if (idxName === -1) {
    throw new Error('❌ CSV inválido: coluna model_name não encontrada.');
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let castingsInserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCSVLine(line);
    const rawCode = (idxCode !== -1 ? cols[idxCode]?.trim() : '') || '';
    const toyNumber = (idxToy !== -1 ? cols[idxToy]?.trim() : '') || '';
    const modelName = cols[idxName]?.trim();
    if (!modelName) continue;

    const rawMake = (idxMake !== -1 ? cols[idxMake]?.trim() : '') || '';
    const lineType = (idxLine !== -1 ? cols[idxLine]?.trim() : '') || 'Fresh Metal';
    const subSeries = (idxSub !== -1 ? cols[idxSub]?.trim() : '') || '';
    const seriesNum = (idxNum !== -1 ? cols[idxNum]?.trim() : '') || '';
    const yearStr = (idxYear !== -1 ? cols[idxYear]?.trim() : '') || '';
    const color = (idxColor !== -1 ? cols[idxColor]?.trim() : '') || '';
    const tampo = (idxTampo !== -1 ? cols[idxTampo]?.trim() : '') || '';
    const wheel = (idxWheel !== -1 ? cols[idxWheel]?.trim() : '') || '';
    const notes = (idxNotes !== -1 ? cols[idxNotes]?.trim() : '') || '';
    const photoUrlWeb = (idxPhotoUrl !== -1 ? cols[idxPhotoUrl]?.trim() : '') || '';
    const sourceUrl = (idxSourceUrl !== -1 ? cols[idxSourceUrl]?.trim() : '') || '';

    // Detect automaker
    const detectedName = detectAutomaker(rawMake, modelName);
    let automakerId: string | null = null;
    if (detectedName) {
      automakerId = automakerMap.get(detectedName.toLowerCase()) || null;
      if (!automakerId) {
        const foundMeta = KNOWN_AUTOMAKERS.find((a) => a.name.toLowerCase() === detectedName.toLowerCase());
        const [newAm] = await db
          .insert(automaker)
          .values({
            name: detectedName,
            normalizedName: detectedName.toLowerCase(),
            country: foundMeta?.country || 'Internacional',
          })
          .onConflictDoNothing()
          .returning();
        if (newAm) {
          automakerId = newAm.id;
          automakerMap.set(detectedName.toLowerCase(), automakerId);
        }
      }
    }

    // Casting normalizado
    const castingName = modelName.replace(/\s*\(new\).*$/i, '').trim();
    const normCasting = castingName.toLowerCase().replace(/[^a-z0-9]/g, '');

    let castingId = castingMap.get(normCasting);
    if (!castingId) {
      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: brandId,
          automakerId,
          name: castingName,
          normalizedName: normCasting,
          description: toyNumber ? `Maisto Toy #${toyNumber}` : null,
          fantasyFlag: !automakerId,
        })
        .onConflictDoNothing()
        .returning();

      if (newCasting) {
        castingId = newCasting.id;
        castingMap.set(normCasting, castingId);
        castingsInserted++;
      } else {
        const [found] = await db
          .select()
          .from(casting)
          .where(and(eq(casting.miniatureBrandId, brandId), eq(casting.normalizedName, normCasting)))
          .limit(1);
        if (found) {
          castingId = found.id;
          castingMap.set(normCasting, castingId);
        }
      }
    }

    if (!castingId) continue;

    const releaseYear = extractYear(yearStr, modelName);
    const photoUrl = photoUrlWeb || null;

    const descParts: string[] = [];
    if (lineType) descParts.push(`Linha: ${lineType}`);
    if (subSeries && subSeries !== lineType) descParts.push(`Série: ${subSeries}`);
    if (tampo) descParts.push(`Tampo: ${tampo}`);
    if (wheel) descParts.push(`Rodas: ${wheel}`);
    if (notes) descParts.push(notes);
    const fullDesc = descParts.join(' • ');

    const uniqueLookupKey = `${rawCode || modelName}_${releaseYear || ''}_${color || ''}`.toLowerCase();
    const existingVarId = identifierVariationMap.get(uniqueLookupKey);

    if (existingVarId) {
      await db
        .update(variation)
        .set({
          color: color || undefined,
          photoUrl: photoUrl || undefined,
          description: fullDesc,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingVarId));
      updatedCount++;
    } else {
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          scaleId,
          name: modelName,
          releaseYear,
          color: color || null,
          photoUrl,
          seriesNumber: seriesNum || null,
          description: fullDesc,
        })
        .returning();

      if (newVar) {
        if (rawCode) {
          await db
            .insert(productIdentifier)
            .values({
              variationId: newVar.id,
              identifierTypeId: idTypeCodeId,
              code: rawCode,
              normalizedCode: rawCode.toLowerCase(),
              isPrimary: true,
            })
            .onConflictDoNothing();
        }

        identifierVariationMap.set(uniqueLookupKey, newVar.id);
        insertedCount++;
      }
    }
  }

  console.log('✅ ========================================================');
  console.log(`🎉 Carga do catálogo Maisto concluída com sucesso!`);
  console.log(`   - Castings novos cadastrados: ${castingsInserted}`);
  console.log(`   - Variações inseridas: ${insertedCount}`);
  console.log(`   - Variações atualizadas: ${updatedCount}`);
  console.log('🏁 ========================================================');
}

if (process.argv[1] && process.argv[1].endsWith('seed-maisto-catalog.ts')) {
  seedMaistoCatalog()
    .then(async () => {
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Erro durante seed do catálogo Maisto:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
