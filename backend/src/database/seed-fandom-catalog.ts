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
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\brwb\b/i, /\bruf\b/i, /\b911\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\btaycan\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bdatsun\b/i, /\bskyline\b/i, /\bgt-r\b/i, /\bgtr\b/i, /\bnismo\b/i, /\bsilvia\b/i, /\b35gt\b/i, /\bfairlady\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\blexus\b/i, /\bsupra\b/i, /\btrueno\b/i, /\bae86\b/i, /\byaris\b/i, /\bland cruiser\b/i, /\bchaser\b/i] },
  { name: 'Honda', country: 'Japão', patterns: [/\bhonda\b/i, /\bacura\b/i, /\bcivic\b/i, /\bnsx\b/i, /\bintegra\b/i, /\bs2000\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm5\b/i, /\bz3\b/i, /\bz4\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bmaybach\b/i, /\bamg\b/i, /\b190e\b/i, /\bg-class\b/i, /\bg-wagon\b/i, /\bactros\b/i] },
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\bf40\b/i, /\bf50\b/i, /\benzo\b/i, /\btestarossa\b/i, /\b488\b/i, /\broma\b/i, /\b296\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\bhurac[aá]n\b/i, /\baventador\b/i, /\burus\b/i, /\bcountach\b/i, /\bdiablo\b/i, /\brevuelto\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bmustang\b/i, /\bshelby\b/i, /\bgt40\b/i, /\bf-150\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\baston martim\b/i, /\bvanquish\b/i, /\bvantage\b/i, /\bvalkyrie\b/i, /\bdb\d+\b/i] },
  { name: 'McLaren', country: 'Reino Unido', patterns: [/\bmclaren\b/i, /\bsenna\b/i, /\b720s\b/i, /\b765lt\b/i, /\bp1\b/i, /\bartura\b/i] },
  { name: 'Land Rover', country: 'Reino Unido', patterns: [/\bland rover\b/i, /\brange rover\b/i, /\bdefender\b/i, /\bdiscovery\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bchevy\b/i, /\bcorvette\b/i, /\bcamaro\b/i, /\bsilverado\b/i, /\bgm\b/i] },
  { name: 'Mazda', country: 'Japão', patterns: [/\bmazda\b/i, /\bmiata\b/i, /\bmx-5\b/i, /\brx-7\b/i, /\brx7\b/i, /\brx-3\b/i, /\b787b\b/i] },
  { name: 'Subaru', country: 'Japão', patterns: [/\bsubaru\b/i, /\bimpreza\b/i, /\bwrx\b/i, /\bbrz\b/i] },
  { name: 'Mitsubishi', country: 'Japão', patterns: [/\bmitsubishi\b/i, /\blancer\b/i, /\bevo\b/i, /\bpajero\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bgolf\b/i, /\bbeetle\b/i, /\bfusca\b/i, /\bkombi\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\br8\b/i, /\brs6\b/i, /\bquattro\b/i] },
  { name: 'Bentley', country: 'Reino Unido', patterns: [/\bbentley\b/i, /\bcontinental\b/i] },
  { name: 'Bugatti', country: 'França', patterns: [/\bbugatti\b/i, /\bchiron\b/i, /\bveyron\b/i, /\bbolide\b/i] },
  { name: 'Cadillac', country: 'Estados Unidos', patterns: [/\bcadillac\b/i, /\beldorado\b/i, /\bescalade\b/i] },
  { name: 'Alfa Romeo', country: 'Itália', patterns: [/\balfa romeo\b/i, /\bgiulia\b/i, /\bstelvio\b/i] },
  { name: 'Hyundai', country: 'Coreia do Sul', patterns: [/\bhyundai\b/i, /\bioniq\b/i, /\bi20\b/i, /\bi30\b/i] },
  { name: 'Dodge', country: 'Estados Unidos', patterns: [/\bdodge\b/i, /\bviper\b/i, /\bchallenger\b/i, /\bcharger\b/i] },
  { name: 'Pagani', country: 'Itália', patterns: [/\bpagani\b/i, /\bhuayra\b/i, /\bzonda\b/i, /\butopia\b/i] },
];

function detectAutomaker(rawBrand: string, fullName: string): string | null {
  const cleanRaw = rawBrand.trim();
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
      if (pattern.test(fullName)) {
        return am.name;
      }
    }
  }
  return null;
}

function cleanCastingName(fullName: string): string {
  let name = fullName.trim();
  name = name.replace(/\r?\n.*/s, '').replace(/\s{2,}/g, ' ');
  const parts = name.split(/\s*[-/“"\(\]]\s*/);
  const candidate = parts[0]?.trim() || name;
  return (candidate || fullName).slice(0, 180);
}

function extractYear(yearStr: string, fullName: string): number | null {
  if (yearStr) {
    const match = yearStr.match(/\b(19\d\d|20\d\d)\b/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  const match = fullName.match(/\b(19\d\d|20\d\d)\b/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 2024;
}

export async function seedFandomCatalog() {
  console.log('🏁 ========================================================');
  console.log('🏎️  Iniciando carga do catálogo Fandom Mini GT...');
  console.log('🏁 ========================================================');

  // Locate CSV file
  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/Fandom/fandom_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/Fandom/fandom_catalogo.csv'),
    'C:/Projetos/minihubcar/catalogos/Fandom/fandom_catalogo.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo fandom_catalogo.csv não encontrado.');
  }
  console.log(`📂 Arquivo CSV localizado: ${csvPath}`);

  // 1. Marca Mini GT
  let [brandRow] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'mini gt'))
    .limit(1);

  if (!brandRow) {
    [brandRow] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Mini GT',
        normalizedName: 'mini gt',
        description: 'TSM Model 1:64 scale premium brand',
        status: 'ACTIVE',
      })
      .returning();
  }
  const brandId = brandRow!.id;

  // 2. Tipo Identificador MINIGT_CODE
  let [idTypeRow] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MINIGT_CODE'))
    .limit(1);

  if (!idTypeRow) {
    [idTypeRow] = await db
      .insert(identifierType)
      .values({
        code: 'MINIGT_CODE',
        name: 'Código Mini GT',
        description: 'Código oficial de produto Mini GT / Kaido House',
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

  // 4. Montadoras
  const automakerMap = new Map<string, string>();
  for (const am of KNOWN_AUTOMAKERS) {
    const norm = am.name.toLowerCase();
    let [found] = await db.select().from(automaker).where(eq(automaker.normalizedName, norm)).limit(1);
    if (!found) {
      [found] = await db.insert(automaker).values({
        name: am.name,
        normalizedName: norm,
        country: am.country,
      }).returning();
    }
    if (found) {
      automakerMap.set(norm, found.id);
    }
  }

  // 5. Cache de Castings existentes
  const existingCastings = await db.select().from(casting);
  const castingMap = new Map<string, string>(); // `${miniatureBrandId}:${normalizedName}` -> id
  for (const c of existingCastings) {
    castingMap.set(`${c.miniatureBrandId}:${c.normalizedName}`, c.id);
  }

  // 6. Cache de Identificadores existentes (SEM REPETIÇÃO)
  const existingIdentifiers = await db
    .select({
      variationId: productIdentifier.variationId,
      identifierTypeId: productIdentifier.identifierTypeId,
      normalizedCode: productIdentifier.normalizedCode,
    })
    .from(productIdentifier);

  const identifierVariationMap = new Map<string, string>(); // `${identifierTypeId}:${normalizedCode}` -> variationId
  for (const pi of existingIdentifiers) {
    identifierVariationMap.set(`${pi.identifierTypeId}:${pi.normalizedCode.toLowerCase()}`, pi.variationId);
  }

  // 7. Parse CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('❌ O arquivo CSV não contém dados válidos.');
  }

  console.log(`📋 Registros encontrados no Fandom: ${lines.length - 1} miniaturas.`);

  let insertedCount = 0;
  let updatedCount = 0;
  let castingsInserted = 0;

  // Skip header: code;name;lhd_rhd;brand;year;photo_url;photo_file
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(';');
    if (parts.length < 2) continue;

    const rawCode = parts[0]?.trim() || '';
    const rawName = parts[1]?.trim() || '';
    const lhdRhd = parts[2]?.trim() || '';
    const rawMaker = parts[3]?.trim() || '';
    const yearStr = parts[4]?.trim() || '';
    const photoUrlWeb = parts[5]?.trim() || '';
    const photoFile = parts[6]?.trim() || '';

    if (!rawCode || !rawName) continue;

    const cleanName = rawName
      .replace(/\r?\n.*/s, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 200);

    const detectedMakerName = detectAutomaker(rawMaker, cleanName);
    const automakerId = detectedMakerName ? automakerMap.get(detectedMakerName.toLowerCase()) || null : null;

    const castingName = cleanCastingName(cleanName);
    const normCasting = castingName.toLowerCase().trim();
    const castingKey = `${brandId}:${normCasting}`;

    let castingId = castingMap.get(castingKey);
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
        castingMap.set(castingKey, castingId);
        castingsInserted++;
      } else {
        const [found] = await db
          .select()
          .from(casting)
          .where(and(eq(casting.miniatureBrandId, brandId), eq(casting.normalizedName, normCasting)))
          .limit(1);
        if (found) {
          castingId = found.id;
          castingMap.set(castingKey, castingId);
        }
      }
    }

    if (!castingId) continue;

    const releaseYear = extractYear(yearStr, cleanName);
    const photoUrl = photoFile
      ? `/catalog-media/Fandom/${photoFile}`
      : (photoUrlWeb || null);

    const lookupKey = `${idTypeId}:${rawCode.toLowerCase()}`;
    const existingVarId = identifierVariationMap.get(lookupKey);

    if (existingVarId) {
      // Já existe no banco (ex: inserido por MINIGTBRASIL ou carga anterior)
      // Atualiza enriquecendo se necessário sem duplicar
      await db
        .update(variation)
        .set({
          photoUrl: photoUrl || undefined,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingVarId));

      updatedCount++;
    } else {
      // Inserção nova
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          scaleId,
          name: cleanName,
          releaseYear,
          color: lhdRhd ? `Volante: ${lhdRhd}` : undefined,
          photoUrl,
          description: `Código Mini GT: ${rawCode} • Fonte: Fandom Wiki`,
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

        identifierVariationMap.set(lookupKey, newVar.id);
        insertedCount++;
      }
    }
  }

  console.log('✅ ========================================================');
  console.log(`🎉 Carga do catálogo Fandom concluída com sucesso!`);
  console.log(`   - Miniaturas inseridas: ${insertedCount}`);
  console.log(`   - Miniaturas atualizadas (sem repetição): ${updatedCount}`);
  console.log(`   - Novos Castings criados: ${castingsInserted}`);
  console.log('========================================================');
}

// Direct execution
if (process.argv[1] && process.argv[1].includes('seed-fandom-catalog')) {
  seedFandomCatalog()
    .then(() => {
      console.log('👋 Processo finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Falha na carga do Fandom:', err);
      process.exit(1);
    });
}
