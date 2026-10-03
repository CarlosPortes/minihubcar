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
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\brwb\b/i, /\bruf\b/i, /\b911\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\btaycan\b/i, /\bstinger\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bdatsun\b/i, /\bskyline\b/i, /\bgt-r\b/i, /\bgtr\b/i, /\bnismo\b/i, /\bsilvia\b/i, /\b35gt\b/i, /\bfairlady\b/i, /\b280zx\b/i, /\bhakosuka\b/i, /\bkenmeri\b/i, /\blaurel\b/i, /\bc210\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\blexus\b/i, /\bsupra\b/i, /\btrueno\b/i, /\bae86\b/i, /\byaris\b/i, /\bland cruiser\b/i, /\bchaser\b/i, /\baltezza\b/i, /\bgr86\b/i, /\bgr 86\b/i, /\bcorolla\b/i] },
  { name: 'Honda', country: 'Japão', patterns: [/\bhonda\b/i, /\bacura\b/i, /\bcivic\b/i, /\bnsx\b/i, /\bintegra\b/i, /\bs2000\b/i, /\beg6\b/i, /\bfl5\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm5\b/i, /\bz3\b/i, /\bz4\b/i, /\be30\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bmaybach\b/i, /\bamg\b/i, /\b190e\b/i, /\bg-class\b/i, /\bg-wagon\b/i, /\bactros\b/i] },
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\bf40\b/i, /\bf50\b/i, /\benzo\b/i, /\btestarossa\b/i, /\b488\b/i, /\broma\b/i, /\b296\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\bhurac[aá]n\b/i, /\baventador\b/i, /\burus\b/i, /\bcountach\b/i, /\bdiablo\b/i, /\brevuelto\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bmustang\b/i, /\bshelby\b/i, /\bgt40\b/i, /\bf-150\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\baston martim\b/i, /\bvanquish\b/i, /\bvantage\b/i, /\bvalkyrie\b/i, /\bdb\d+\b/i] },
  { name: 'McLaren', country: 'Reino Unido', patterns: [/\bmclaren\b/i, /\bsenna\b/i, /\b720s\b/i, /\b765lt\b/i, /\bp1\b/i, /\bartura\b/i] },
  { name: 'Land Rover', country: 'Reino Unido', patterns: [/\bland rover\b/i, /\brange rover\b/i, /\bdefender\b/i, /\bdiscovery\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bchevy\b/i, /\bcorvette\b/i, /\bcamaro\b/i, /\bsilverado\b/i, /\bgm\b/i, /\bcruze\b/i] },
  { name: 'Mazda', country: 'Japão', patterns: [/\bmazda\b/i, /\bmiata\b/i, /\bmx-5\b/i, /\brx-7\b/i, /\brx7\b/i, /\brx-8\b/i, /\brx8\b/i, /\brx-3\b/i, /\b787b\b/i, /\bamemiya\b/i, /\bfd3s\b/i, /\bfc3s\b/i] },
  { name: 'Subaru', country: 'Japão', patterns: [/\bsubaru\b/i, /\bimpreza\b/i, /\bwrx\b/i, /\bbrz\b/i] },
  { name: 'Mitsubishi', country: 'Japão', patterns: [/\bmitsubishi\b/i, /\blancer\b/i, /\bevo\b/i, /\bpajero\b/i, /\bstarion\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bgolf\b/i, /\bbeetle\b/i, /\bfusca\b/i, /\bkombi\b/i, /\bgti\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\br8\b/i, /\brs6\b/i, /\bquattro\b/i] },
  { name: 'Suzuki', country: 'Japão', patterns: [/\bsuzuki\b/i, /\bjimny\b/i, /\bsierra\b/i, /\bjb74\b/i] },
  { name: 'Volvo', country: 'Suécia', patterns: [/\bvolvo\b/i, /\b850\b/i] },
  { name: 'Pagani', country: 'Itália', patterns: [/\bpagani\b/i, /\bzonda\b/i, /\bhuayra\b/i] },
  { name: 'Singer', country: 'Estados Unidos', patterns: [/\bsinger\b/i] },
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

export async function seedPopRaceCatalog() {
  console.log('🏁 ========================================================');
  console.log('🏎️  Iniciando carga do catálogo Pop Race...');
  console.log('🏁 ========================================================');

  // Locate CSV file
  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/PopRace/poprace_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/PopRace/poprace_catalogo.csv'),
    'C:/Projetos/minihubcar/catalogos/PopRace/poprace_catalogo.csv',
    '/var/www/minihubcar/catalogos/PopRace/poprace_catalogo.csv',
    '/app/catalogos/PopRace/poprace_catalogo.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo poprace_catalogo.csv não encontrado.');
  }
  console.log(`📂 Arquivo CSV localizado: ${csvPath}`);

  // 1. Marca Pop Race
  let [brandRow] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'pop race'))
    .limit(1);

  if (!brandRow) {
    [brandRow] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Pop Race',
        normalizedName: 'pop race',
        description: 'Pop Race models 1:64 scale premium brand',
        status: 'ACTIVE',
      })
      .returning();
  }
  const brandId = brandRow!.id;

  // 2. Tipo Identificador POPRACE_CODE
  let [idTypeRow] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'POPRACE_CODE'))
    .limit(1);

  if (!idTypeRow) {
    [idTypeRow] = await db
      .insert(identifierType)
      .values({
        code: 'POPRACE_CODE',
        name: 'Código Pop Race',
        description: 'Código de modelo oficial Pop Race (Model #)',
      })
      .returning();
  }
  const idTypeId = idTypeRow!.id;

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

  // 4. Carrega Automakers conhecidas
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const am of allAutomakers) {
    automakerMap.set(am.name.toLowerCase(), am.id);
  }

  // 5. Carrega Castings existentes de Pop Race
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
    .where(eq(productIdentifier.identifierTypeId, idTypeId));
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
  const idxName = headers.indexOf('model_name');
  const idxDesc = headers.indexOf('description');
  const idxMake = headers.indexOf('make');
  const idxRelease = headers.indexOf('release_date');
  const idxYear = headers.indexOf('release_year');
  const idxMfg = headers.indexOf('manufacturer');
  const idxColl = headers.indexOf('collection');
  const idxPhoto = headers.indexOf('photo_file');
  const idxPhotoUrl = headers.indexOf('photo_url');

  if (idxCode === -1 || idxName === -1) {
    throw new Error('❌ CSV inválido: colunas model_code ou model_name não encontradas.');
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let castingsInserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCSVLine(line);
    const rawCode = cols[idxCode]?.trim();
    const modelName = cols[idxName]?.trim();
    if (!rawCode || !modelName) continue;

    const desc = (idxDesc !== -1 ? cols[idxDesc]?.trim() : '') || '';
    const rawMake = (idxMake !== -1 ? cols[idxMake]?.trim() : '') || '';
    const releaseDate = (idxRelease !== -1 ? cols[idxRelease]?.trim() : '') || '';
    const yearStr = (idxYear !== -1 ? cols[idxYear]?.trim() : '') || '';
    const manufacturer = (idxMfg !== -1 ? cols[idxMfg]?.trim() : '') || 'Pop Race';
    const collection = (idxColl !== -1 ? cols[idxColl]?.trim() : '') || '';
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

    // Casting: agrupa variações pelo modelo base
    const castingName = modelName.replace(/\s*-\s*#?\d+.*$/i, '').trim() || modelName;
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
          fantasyFlag: false,
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

    const releaseYear = extractYear(yearStr || releaseDate, modelName);
    const photoUrl = photoFile
      ? `/catalog-media/PopRace/fotos/${photoFile}`
      : (photoUrlWeb || null);

    const fullDescParts = [];
    if (desc) fullDescParts.push(desc);
    if (collection) fullDescParts.push(`Coleção: ${collection}`);
    if (manufacturer && manufacturer !== 'Pop Race') fullDescParts.push(`Fabricante: ${manufacturer}`);
    if (releaseDate) fullDescParts.push(`Lançamento: ${releaseDate}`);
    const fullDesc = fullDescParts.join(' • ');

    const existingVarId = identifierVariationMap.get(rawCode.toLowerCase());

    if (existingVarId) {
      await db
        .update(variation)
        .set({
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
          photoUrl,
          description: fullDesc,
        })
        .returning();

      if (newVar) {
        await db
          .insert(productIdentifier)
          .values({
            variationId: newVar.id,
            identifierTypeId: idTypeId,
            code: rawCode,
            normalizedCode: rawCode.toLowerCase(),
            isPrimary: true,
          })
          .onConflictDoNothing();

        identifierVariationMap.set(rawCode.toLowerCase(), newVar.id);
        insertedCount++;
      }
    }
  }

  console.log('✅ ========================================================');
  console.log(`🎉 Carga do catálogo Pop Race concluída com sucesso!`);
  console.log(`   - Miniaturas inseridas: ${insertedCount}`);
  console.log(`   - Miniaturas atualizadas: ${updatedCount}`);
  console.log(`   - Novos Castings criados: ${castingsInserted}`);
  console.log('========================================================');
}

// Execução direta via CLI
if (process.argv[1] && process.argv[1].includes('seed-poprace-catalog')) {
  seedPopRaceCatalog()
    .then(() => {
      console.log('👋 Processo finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Falha na execução da carga Pop Race:', err);
      process.exit(1);
    })
    .finally(async () => {
      await sqlClient.end();
    });
}
