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
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\brwb\b/i, /\bruf\b/i, /\b911\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\btaycan\b/i, /\bmacan\b/i, /\bcayman\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bchevy\b/i, /\bcorvette\b/i, /\bcamaro\b/i, /\bel camino\b/i, /\bsilverado\b/i, /\bbel air\b/i, /\bchevelle\b/i, /\bc10\b/i, /\bc1500\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bmustang\b/i, /\bshelby\b/i, /\bbronco\b/i, /\bf-150\b/i, /\bgt40\b/i, /\bcrown victoria\b/i, /\banglia\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bdatsun\b/i, /\bskyline\b/i, /\bgt-r\b/i, /\bgtr\b/i, /\bnismo\b/i, /\bsentra\b/i, /\bhardbody\b/i, /\btownstar\b/i, /\bxterra\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\blexus\b/i, /\bsupra\b/i, /\bland cruiser\b/i, /\b4runner\b/i, /\btacoma\b/i, /\bprius\b/i, /\bfj40\b/i] },
  { name: 'Honda', country: 'Japão', patterns: [/\bhonda\b/i, /\bacura\b/i, /\bcivic\b/i, /\bnsx\b/i, /\bintegra\b/i, /\bs2000\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm5\b/i, /\bz4\b/i, /\bi8\b/i, /\bcsl\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bamg\b/i, /\bmaybach\b/i, /\bunimog\b/i, /\bsprinter\b/i, /\bg-class\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\be-tron\b/i, /\br8\b/i, /\brs6\b/i, /\bquattro\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bbeetle\b/i, /\bgolf\b/i, /\bfusca\b/i, /\bkombi\b/i, /\b1600 tl\b/i] },
  { name: 'Dodge', country: 'Estados Unidos', patterns: [/\bdodge\b/i, /\bviper\b/i, /\bcharger\b/i, /\bchallenger\b/i, /\bram\b/i, /\bdurango\b/i, /\bcoronet\b/i] },
  { name: 'Plymouth', country: 'Estados Unidos', patterns: [/\bplymouth\b/i, /\bfury\b/i, /\bcuda\b/i, /\bbarracuda\b/i] },
  { name: 'Jeep', country: 'Estados Unidos', patterns: [/\bjeep\b/i, /\bwrangler\b/i, /\bgladiator\b/i, /\bcherokee\b/i, /\brenegade\b/i, /\bwagoneer\b/i, /\bjeepster\b/i] },
  { name: 'Land Rover', country: 'Reino Unido', patterns: [/\bland rover\b/i, /\brange rover\b/i, /\bdefender\b/i, /\bdiscovery\b/i, /\bevoque\b/i] },
  { name: 'Jaguar', country: 'Reino Unido', patterns: [/\bjaguar\b/i, /\be-type\b/i, /\bf-type\b/i, /\bi-pace\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\bvantage\b/i, /\bdbs\b/i, /\bdb5\b/i] },
  { name: 'Tesla', country: 'Estados Unidos', patterns: [/\btesla\b/i, /\bcybertruck\b/i, /\bmodel s\b/i, /\bmodel 3\b/i, /\bmodel x\b/i, /\bmodel y\b/i, /\broadster\b/i] },
  { name: 'Subaru', country: 'Japão', patterns: [/\bsubaru\b/i, /\bimpreza\b/i, /\bwrx\b/i, /\bforester\b/i, /\bsambar\b/i, /\bbrz\b/i] },
  { name: 'Mazda', country: 'Japão', patterns: [/\bmazda\b/i, /\bmiata\b/i, /\bmx-5\b/i, /\brx-7\b/i, /\brx7\b/i, /\bautozam\b/i] },
  { name: 'Mitsubishi', country: 'Japão', patterns: [/\bmitsubishi\b/i, /\blancer\b/i, /\bevo\b/i, /\bpajero\b/i] },
  { name: 'Koenigsegg', country: 'Suécia', patterns: [/\bkoenigsegg\b/i, /\bgemera\b/i, /\bagera\b/i, /\bregera\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\bcountach\b/i, /\bdiablo\b/i, /\bmurci[eé]lago\b/i, /\bgallardo\b/i, /\baventador\b/i, /\bhurac[aá]n\b/i] },
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\bf40\b/i, /\btestarossa\b/i] },
  { name: 'Fiat', country: 'Itália', patterns: [/\bfiat\b/i, /\b500\b/i, /\babarth\b/i] },
  { name: 'Volvo', country: 'Suécia', patterns: [/\bvolvo\b/i, /\b240\b/i, /\bv60\b/i, /\bxc40\b/i, /\bp1800\b/i] },
  { name: 'Cadillac', country: 'Estados Unidos', patterns: [/\bcadillac\b/i, /\bescalade\b/i, /\bct5\b/i, /\beldorado\b/i] },
  { name: 'Lincoln', country: 'Estados Unidos', patterns: [/\blincoln\b/i, /\bcontinental\b/i, /\bnavigator\b/i] },
  { name: 'GMC', country: 'Estados Unidos', patterns: [/\bgmc\b/i, /\bsierra\b/i, /\bhummer\b/i] },
  { name: 'Hummer', country: 'Estados Unidos', patterns: [/\bhummer\b/i, /\bh1\b/i, /\bh2\b/i, /\bh3\b/i] },
  { name: 'Renault', country: 'França', patterns: [/\brenault\b/i, /\bclio\b/i, /\bmegane\b/i, /\b5 turbo\b/i] },
  { name: 'Peugeot', country: 'França', patterns: [/\bpeugeot\b/i, /\b205\b/i, /\b206\b/i] },
  { name: 'Citroën', country: 'França', patterns: [/\bcitro[eë]n\b/i, /\bds\b/i, /\b2cv\b/i] },
  { name: 'Alfa Romeo', country: 'Itália', patterns: [/\balfa romeo\b/i, /\balfa\b/i, /\bgiulia\b/i, /\b4c\b/i, /\btonale\b/i] },
  { name: 'Rivian', country: 'Estados Unidos', patterns: [/\brivian\b/i, /\br1t\b/i, /\br1s\b/i] },
  { name: 'Polaris', country: 'Estados Unidos', patterns: [/\bpolaris\b/i, /\branger\b/i, /\brzr\b/i, /\bslingshot\b/i] },
  { name: 'Triumph', country: 'Reino Unido', patterns: [/\btriumph\b/i, /\bspitfire\b/i, /\btr6\b/i] },
  { name: 'Morris', country: 'Reino Unido', patterns: [/\bmorris\b/i, /\bminor\b/i] },
  { name: 'Austin', country: 'Reino Unido', patterns: [/\baustin\b/i, /\bhealey\b/i] },
  { name: 'Mack', country: 'Estados Unidos', patterns: [/\bmack\b/i] },
  { name: 'Kenworth', country: 'Estados Unidos', patterns: [/\bkenworth\b/i] },
  { name: 'Peterbilt', country: 'Estados Unidos', patterns: [/\bpeterbilt\b/i] },
];

function detectAutomaker(rawMake: string, fullName: string): string | null {
  const cleanRaw = rawMake.trim();
  if (cleanRaw) {
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

export async function seedMatchboxCatalog() {
  console.log('🏁 ========================================================');
  console.log('🚗  Iniciando carga do catálogo Matchbox...');
  console.log('🏁 ========================================================');

  // Localiza o arquivo CSV
  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/Matchbox/matchbox_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/Matchbox/matchbox_catalogo.csv'),
    'C:/Projetos/minihubcar/catalogos/Matchbox/matchbox_catalogo.csv',
    '/var/www/minihubcar/catalogos/Matchbox/matchbox_catalogo.csv',
    '/app/catalogos/Matchbox/matchbox_catalogo.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo matchbox_catalogo.csv não encontrado.');
  }
  console.log(`📂 Arquivo CSV localizado: ${csvPath}`);

  // 1. Marca Matchbox
  let [brandRow] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'matchbox'))
    .limit(1);

  if (!brandRow) {
    [brandRow] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Matchbox',
        normalizedName: 'matchbox',
        description: 'Matchbox diecast miniature vehicles (Mattel / Lesney)',
        status: 'ACTIVE',
      })
      .returning();
  }
  const brandId = brandRow!.id;

  // 2. Tipos de Identificadores (MAN, Model # e SKU/Toy)
  let [idTypeMan] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MATCHBOX_MAN'))
    .limit(1);

  if (!idTypeMan) {
    [idTypeMan] = await db
      .insert(identifierType)
      .values({
        code: 'MATCHBOX_MAN',
        name: 'MAN Number Matchbox',
        description: 'Código oficial de casting / fabricação Matchbox (MAN #)',
      })
      .returning();
  }
  const idTypeManId = idTypeMan!.id;

  let [idTypeCode] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MATCHBOX_CODE'))
    .limit(1);

  if (!idTypeCode) {
    [idTypeCode] = await db
      .insert(identifierType)
      .values({
        code: 'MATCHBOX_CODE',
        name: 'Número do Modelo Matchbox',
        description: 'Número de catálogo/série na linha Matchbox (Model #)',
      })
      .returning();
  }
  const idTypeCodeId = idTypeCode!.id;

  // 3. Escala 1:64
  let [scale64] = await db.select().from(scale).where(eq(scale.name, '1:64')).limit(1);
  if (!scale64) {
    [scale64] = await db.insert(scale).values({
      name: '1:64',
      numerator: 1,
      denominator: 64,
      normalizedValue: '0.015625',
    }).returning();
  }
  const scaleId = scale64!.id;

  // 4. Carrega Automakers
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const am of allAutomakers) {
    automakerMap.set(am.name.toLowerCase(), am.id);
  }

  // 5. Carrega Castings existentes de Matchbox
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
  const idxMan = headers.indexOf('man_number');
  const idxToy = headers.indexOf('toy_number');
  const idxName = headers.indexOf('model_name');
  const idxMake = headers.indexOf('automaker');
  const idxLine = headers.indexOf('line');
  const idxSub = headers.indexOf('sub_series');
  const idxNum = headers.indexOf('series_number');
  const idxYear = headers.indexOf('release_year');
  const idxColor = headers.indexOf('color');
  const idxNotes = headers.indexOf('notes');
  const idxPhoto = headers.indexOf('photo_file');
  const idxPhotoUrl = headers.indexOf('photo_url');

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
    const manNumber = (idxMan !== -1 ? cols[idxMan]?.trim() : '') || '';
    const toyNumber = (idxToy !== -1 ? cols[idxToy]?.trim() : '') || '';
    const modelName = cols[idxName]?.trim();
    if (!modelName) continue;

    const rawMake = (idxMake !== -1 ? cols[idxMake]?.trim() : '') || '';
    const lineType = (idxLine !== -1 ? cols[idxLine]?.trim() : '') || 'Mainline';
    const subSeries = (idxSub !== -1 ? cols[idxSub]?.trim() : '') || '';
    const seriesNum = (idxNum !== -1 ? cols[idxNum]?.trim() : '') || '';
    const yearStr = (idxYear !== -1 ? cols[idxYear]?.trim() : '') || '';
    const color = (idxColor !== -1 ? cols[idxColor]?.trim() : '') || '';
    const notes = (idxNotes !== -1 ? cols[idxNotes]?.trim() : '') || '';
    const photoFile = (idxPhoto !== -1 ? cols[idxPhoto]?.trim() : '') || '';
    const photoUrlWeb = (idxPhotoUrl !== -1 ? cols[idxPhotoUrl]?.trim() : '') || '';

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

    // Casting: se possui MAN # utiliza como identificador estável, senão nome base
    const castingName = manNumber
      ? `${modelName.replace(/\s*\(new\).*$/i, '').trim()}`
      : modelName.replace(/\s*\(new\).*$/i, '').trim();
    const normCasting = (manNumber || castingName).toLowerCase().replace(/[^a-z0-9]/g, '');

    let castingId = castingMap.get(normCasting);
    if (!castingId) {
      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: brandId,
          automakerId,
          name: castingName,
          normalizedName: normCasting,
          description: manNumber ? `Matchbox MAN ${manNumber}` : null,
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
    const photoUrl = photoFile
      ? `/catalog-media/Matchbox/fotos/${photoFile}`
      : (photoUrlWeb || null);

    const descParts: string[] = [];
    if (lineType) descParts.push(`Linha: ${lineType}`);
    if (subSeries) descParts.push(`Sub-série: ${subSeries}`);
    if (seriesNum) descParts.push(`Nº: ${seriesNum}`);
    if (manNumber) descParts.push(`MAN: ${manNumber}`);
    if (toyNumber) descParts.push(`SKU: ${toyNumber}`);
    if (notes) descParts.push(notes);
    const fullDesc = descParts.join(' • ');

    const uniqueLookupKey = `${rawCode || manNumber || modelName}_${releaseYear || ''}_${subSeries}`.toLowerCase();
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
        // Vincula identificador de modelo
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

        // Vincula MAN number se disponível
        if (manNumber) {
          await db
            .insert(productIdentifier)
            .values({
              variationId: newVar.id,
              identifierTypeId: idTypeManId,
              code: manNumber,
              normalizedCode: manNumber.toLowerCase(),
              isPrimary: !rawCode,
            })
            .onConflictDoNothing();
        }

        identifierVariationMap.set(uniqueLookupKey, newVar.id);
        insertedCount++;
      }
    }
  }

  console.log('✅ ========================================================');
  console.log(`🎉 Carga do catálogo Matchbox concluída com sucesso!`);
  console.log(`   - Miniaturas inseridas: ${insertedCount}`);
  console.log(`   - Miniaturas atualizadas: ${updatedCount}`);
  console.log(`   - Novos Castings criados: ${castingsInserted}`);
  console.log('========================================================');
}

// Execução direta via CLI
if (process.argv[1] && process.argv[1].includes('seed-matchbox-catalog')) {
  seedMatchboxCatalog()
    .then(() => {
      console.log('👋 Processo finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Falha na execução da carga Matchbox:', err);
      process.exit(1);
    })
    .finally(async () => {
      await sqlClient.end();
    });
}
