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

// Normalização de montadoras conhecidas para o automobilismo (Spark Model)
const KNOWN_AUTOMAKERS: Array<{ name: string; country: string; patterns: RegExp[] }> = [
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\b911\b/i, /\b963\b/i, /\b956\b/i, /\b962\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\brsr\b/i] },
  { name: 'Williams', country: 'Reino Unido', patterns: [/\bwilliams\b/i, /\bfw\d+\b/i] },
  { name: 'McLaren', country: 'Reino Unido', patterns: [/\bmclaren\b/i, /\bmcl\d+\b/i, /\bmp4\b/i, /\b720s\b/i, /\bf1 gtr\b/i] },
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\b499p\b/i, /\b296\b/i, /\b488\b/i, /\bsf\d+\b/i, /\bf1-75\b/i] },
  { name: 'Red Bull Racing', country: 'Áustria', patterns: [/\bred bull\b/i, /\brb\d+\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bamg\b/i, /\bw13\b/i, /\bw14\b/i, /\bw15\b/i, /\bw16\b/i, /\bw17\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\br8\b/i, /\br18\b/i, /\br10\b/i, /\brs\b/i, /\bquattro\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\bgr010\b/i, /\bts050\b/i, /\bsupra\b/i, /\byaris\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\bamr\d+\b/i, /\bvantage\b/i, /\bvalkyrie\b/i] },
  { name: 'Alpine', country: 'França', patterns: [/\balpine\b/i, /\ba526\b/i, /\ba525\b/i, /\ba524\b/i, /\ba523\b/i, /\ba480\b/i, /\ba110\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm hybrid\b/i, /\bm4\b/i, /\bm3\b/i, /\bv12 lmr\b/i] },
  { name: 'Peugeot', country: 'França', patterns: [/\bpeugeot\b/i, /\b9x8\b/i, /\b908\b/i, /\b205\b/i] },
  { name: 'Cadillac', country: 'Estados Unidos', patterns: [/\bcadillac\b/i, /\bv-series\b/i, /\bv.r\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bgt40\b/i, /\bmustang\b/i, /\bpuma\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bcorvette\b/i, /\bc8\.r\b/i, /\bcamaro\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\bsc63\b/i, /\bhurac[aá]n\b/i] },
  { name: 'Alfa Romeo', country: 'Itália', patterns: [/\balfa romeo\b/i, /\bc42\b/i, /\bc43\b/i] },
  { name: 'Sauber', country: 'Suíça', patterns: [/\bsauber\b/i, /\bc44\b/i, /\bc45\b/i] },
  { name: 'Haas', country: 'Estados Unidos', patterns: [/\bhaas\b/i, /\bvf-\d+\b/i] },
  { name: 'Racing Bulls', country: 'Itália', patterns: [/\bracing bulls\b/i, /\bvcarb\b/i, /\bvisa cash\b/i, /\btoro rosso\b/i, /\balphatauri\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bgt-r\b/i, /\br390\b/i, /\bnismo\b/i] },
  { name: 'Mazda', country: 'Japão', patterns: [/\bmazda\b/i, /\b787b\b/i, /\brx-7\b/i] },
  { name: 'Subaru', country: 'Japão', patterns: [/\bsubaru\b/i, /\bimpreza\b/i, /\bwrx\b/i, /\bbrz\b/i] },
  { name: 'Oreca', country: 'França', patterns: [/\boreca\b/i] },
  { name: 'Ligier', country: 'França', patterns: [/\bligier\b/i] },
  { name: 'Ginetta', country: 'Reino Unido', patterns: [/\bginetta\b/i] },
  { name: 'Dallara', country: 'Itália', patterns: [/\bdallara\b/i] },
  { name: 'Lotus', country: 'Reino Unido', patterns: [/\blotus\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bgolf\b/i, /\bk[aä]fer\b/i, /\bt1\b/i, /\bt2\b/i, /\bt3\b/i] },
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
      if (pattern.test(fullName) || (cleanRaw && pattern.test(cleanRaw))) {
        return am.name;
      }
    }
  }
  return cleanRaw || null;
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

export async function seedSparkCatalog() {
  console.log('🏁 ========================================================');
  console.log('🏎️  Iniciando carga do catálogo Spark Model no banco...');
  console.log('========================================================\n');

  // Procura o arquivo CSV no host ou dentro do container Docker
  const possiblePaths = [
    path.resolve(__dirname, '../../../catalogos/Spark/spark_catalogo.csv'),
    '/app/catalogos/Spark/spark_catalogo.csv',
    './catalogos/Spark/spark_catalogo.csv',
  ];
  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error(`❌ Arquivo spark_catalogo.csv não encontrado nos caminhos verificados:`);
    possiblePaths.forEach((p) => console.error(`   - ${p}`));
    return;
  }
  console.log(`📁 Utilizando CSV: ${csvPath}`);

  // 1. Marca Spark Model
  let [brandRow] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'spark'))
    .limit(1);

  if (!brandRow) {
    console.log('✨ Cadastrando marca "Spark"...');
    [brandRow] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Spark',
        normalizedName: 'spark',
        description: 'Fabricante de alta precisão em modelos de automobilismo, Le Mans, F1 e Endurance.',
        status: 'ACTIVE',
      })
      .returning();
  }
  const brandId = brandRow!.id;

  // 2. Tipos de identificadores (SKU e EAN)
  let [idTypeSku] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'SPARK_SKU'))
    .limit(1);

  if (!idTypeSku) {
    [idTypeSku] = await db
      .insert(identifierType)
      .values({
        code: 'SPARK_SKU',
        name: 'Código de Referência Spark',
        description: 'Código de modelo Spark (ex: 64S282, S8542)',
        status: 'ACTIVE',
      })
      .returning();
  }
  const idTypeSkuId = idTypeSku!.id;

  let [idTypeEan] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'EAN_13'))
    .limit(1);

  if (!idTypeEan) {
    [idTypeEan] = await db
      .insert(identifierType)
      .values({
        code: 'EAN_13',
        name: 'Código de Barras EAN-13',
        description: 'Código de barras internacional EAN-13',
        status: 'ACTIVE',
      })
      .returning();
  }
  const idTypeEanId = idTypeEan!.id;

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
        status: 'ACTIVE',
      })
      .returning();
  }
  const scale64Id = scale64!.id;

  // 4. Carrega Automakers
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const am of allAutomakers) {
    automakerMap.set(am.name.toLowerCase().trim(), am.id);
  }

  // 5. Carrega Castings existentes da Spark
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
    .where(eq(productIdentifier.identifierTypeId, idTypeSkuId));
  const identifierVariationMap = new Map<string, string>();
  for (const pi of existingIdentifiers) {
    identifierVariationMap.set(pi.code.toLowerCase(), pi.variationId);
  }

  // 7. Lê e processa o CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const firstLine = lines[0];
  if (!firstLine || lines.length <= 1) {
    console.log('⚠️ Arquivo CSV vazio ou apenas com cabeçalho.');
    return;
  }

  const headerLine = firstLine.replace(/^\uFEFF/, '');
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  const idxCode = headers.indexOf('item_number');
  const idxEan = headers.indexOf('barcode');
  const idxName = headers.indexOf('name');
  const idxModel = headers.indexOf('model_name');
  const idxMake = headers.indexOf('automaker');
  const idxScale = headers.indexOf('scale');
  const idxYear = headers.indexOf('year');
  const idxCategory = headers.indexOf('category');
  const idxEvent = headers.indexOf('event');
  const idxCarNum = headers.indexOf('car_number');
  const idxDriver = headers.indexOf('driver');
  const idxStatus = headers.indexOf('status');
  const idxMaterial = headers.indexOf('material');
  const idxPhoto = headers.indexOf('photo_file');
  const idxPhotoUrl = headers.indexOf('photo_url');

  console.log(`📊 Total de linhas a processar: ${lines.length - 1}`);

  let insertedCount = 0;
  let updatedCount = 0;
  let castingsInserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCSVLine(line);

    const rawCode = (idxCode !== -1 ? cols[idxCode]?.trim() : '') || '';
    const barcode = (idxEan !== -1 ? cols[idxEan]?.trim() : '') || '';
    const fullName = (idxName !== -1 ? cols[idxName]?.trim() : '') || '';
    const modelName = (idxModel !== -1 ? cols[idxModel]?.trim() : '') || fullName;
    if (!fullName && !rawCode) continue;

    const rawMake = (idxMake !== -1 ? cols[idxMake]?.trim() : '') || '';
    const scaleStr = (idxScale !== -1 ? cols[idxScale]?.trim() : '') || '1:64';
    const yearStr = (idxYear !== -1 ? cols[idxYear]?.trim() : '') || '';
    const category = (idxCategory !== -1 ? cols[idxCategory]?.trim() : '') || '';
    const event = (idxEvent !== -1 ? cols[idxEvent]?.trim() : '') || '';
    const carNumber = (idxCarNum !== -1 ? cols[idxCarNum]?.trim() : '') || '';
    const driver = (idxDriver !== -1 ? cols[idxDriver]?.trim() : '') || '';
    const status = (idxStatus !== -1 ? cols[idxStatus]?.trim() : '') || '';
    const material = (idxMaterial !== -1 ? cols[idxMaterial]?.trim() : '') || '';
    const photoFile = (idxPhoto !== -1 ? cols[idxPhoto]?.trim() : '') || '';
    const photoUrlWeb = (idxPhotoUrl !== -1 ? cols[idxPhotoUrl]?.trim() : '') || '';

    // Montadora
    const detectedName = detectAutomaker(rawMake, fullName);
    let automakerId: string | null = null;
    if (detectedName) {
      const amKey = detectedName.toLowerCase().trim();
      automakerId = automakerMap.get(amKey) || null;
      if (!automakerId) {
        const foundMeta = KNOWN_AUTOMAKERS.find((a) => a.name.toLowerCase() === amKey);
        const [newAm] = await db
          .insert(automaker)
          .values({
            name: detectedName,
            normalizedName: amKey,
            country: foundMeta?.country || 'Internacional',
          })
          .onConflictDoNothing()
          .returning();
        if (newAm) {
          automakerId = newAm.id;
          automakerMap.set(amKey, automakerId);
        }
      }
    }

    // Casting: agrupa pelo modelo do carro (ex: FW48, M4 GT3, 911 GT3 R)
    const castingName = modelName || fullName;
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
          description: `Modelo oficial Spark Model - ${castingName}`,
          fantasyFlag: false,
          status: 'ACTIVE',
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

    const releaseYear = extractYear(yearStr, fullName);

    // Constrói URL da foto servida pelo backend/Nginx
    const photoUrl = photoFile
      ? `/catalog-media/Spark/${photoFile}`
      : (photoUrlWeb || null);

    // Monta descrição rica
    const descParts: string[] = [];
    if (event) descParts.push(`Evento: ${event}`);
    if (carNumber) descParts.push(`Carro: #${carNumber}`);
    if (driver) descParts.push(`Piloto(s): ${driver}`);
    if (category) descParts.push(`Categoria: ${category}`);
    if (status) descParts.push(`Status: ${status}`);
    if (material) descParts.push(`Material: ${material}`);
    if (rawCode) descParts.push(`Ref: ${rawCode}`);
    const fullDesc = descParts.join(' • ') || fullName;

    const lookupKey = rawCode.toLowerCase();
    const existingVarId = lookupKey ? identifierVariationMap.get(lookupKey) : null;

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
          scaleId: scale64Id,
          name: fullName,
          releaseYear,
          color: null,
          photoUrl,
          description: fullDesc,
          status: 'ACTIVE',
        })
        .returning();

      if (newVar) {
        // Vincula código de referência Spark (SKU)
        if (rawCode) {
          await db
            .insert(productIdentifier)
            .values({
              variationId: newVar.id,
              identifierTypeId: idTypeSkuId,
              code: rawCode,
              normalizedCode: rawCode.toLowerCase(),
              isPrimary: true,
            })
            .onConflictDoNothing();

          identifierVariationMap.set(lookupKey, newVar.id);
        }

        // Vincula código de barras EAN-13 se existir
        if (barcode && barcode.length >= 8) {
          await db
            .insert(productIdentifier)
            .values({
              variationId: newVar.id,
              identifierTypeId: idTypeEanId,
              code: barcode,
              normalizedCode: barcode.toLowerCase(),
              isPrimary: false,
            })
            .onConflictDoNothing();
        }

        insertedCount++;
      }
    }
  }

  console.log('\n🏁 ========================================================');
  console.log(`🎉 Carga do Catálogo Spark Model concluída com sucesso!`);
  console.log(`   - Castings criados: ${castingsInserted}`);
  console.log(`   - Miniaturas inseridas: ${insertedCount}`);
  console.log(`   - Miniaturas atualizadas: ${updatedCount}`);
  console.log('========================================================\n');
}

// Executa se chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('seed-spark-catalog.ts')) {
  seedSparkCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erro durante o seed do catálogo Spark:', err);
      process.exit(1);
    });
}
