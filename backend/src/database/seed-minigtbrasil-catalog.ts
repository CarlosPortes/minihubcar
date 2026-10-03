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

/**
 * Stateful RFC 4180 CSV Parser
 * Correctly handles multiline text inside double quotes, escaped quotes (""), and commas.
 */
export function parseRFC4180CSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Brand mapping definition
const BRAND_DEFINITIONS: Record<string, { name: string; description: string }> = {
  'mini gt': { name: 'Mini GT', description: 'TSM Model 1:64 scale premium brand' },
  'tarmac works': { name: 'Tarmac Works', description: 'Premium diecast model cars brand' },
  'kaido house': { name: 'Kaido House', description: 'Jun Imai x Mini GT diecast series' },
  'bbr models': { name: 'BBR Models', description: 'High-end Italian diecast and resin models' },
  'kyosho': { name: 'Kyosho', description: 'Japanese precision model car manufacturer' },
  'ignition model': { name: 'Ignition Model', description: 'High quality Japanese tuning and race car replicas' },
  'american diorama': { name: 'American Diorama', description: 'Figures and diorama accessories in 1:64' },
  'gcd': { name: 'GCD', description: 'Gaincorp Products diecast scale models' },
  'mg minis': { name: 'MG Minis', description: 'Collector scale models' },
  'ar kaizo': { name: 'AR Kaizo', description: 'Custom tuned models by Almost Real' },
  'shoom64 models': { name: 'Shoom64 Models', description: 'Boutique 1:64 scale resin/diecast models' },
  'greenlight': { name: 'Greenlight', description: 'Greenlight Collectibles diecast models' },
  'schuco': { name: 'Schuco', description: 'Classic German diecast model manufacturer' },
  'minichamps': { name: 'Minichamps', description: 'Paul\'s Model Art / Minichamps premium diecast' },
};

// Automakers normalization & detection
const KNOWN_AUTOMAKERS: Array<{ name: string; country: string; patterns: RegExp[] }> = [
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\brwb\b/i, /\bruf\b/i, /\b911\b/i, /\bgt3\b/i, /\bcarrera\b/i, /\btaycan\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bdatsun\b/i, /\bskyline\b/i, /\bgt-r\b/i, /\bgtr\b/i, /\bnismo\b/i, /\bsilvia\b/i, /\b35gt\b/i, /\bfairlady\b/i] },
  { name: 'Toyota', country: 'Japão', patterns: [/\btoyota\b/i, /\blexus\b/i, /\bsupra\b/i, /\btrueno\b/i, /\bae86\b/i, /\byaris\b/i, /\bland cruiser\b/i, /\bchaser\b/i] },
  { name: 'Honda', country: 'Japão', patterns: [/\bhonda\b/i, /\bacura\b/i, /\bcivic\b/i, /\bnsx\b/i, /\bintegra\b/i, /\bs2000\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm5\b/i, /\bz3\b/i, /\bz4\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bmaybach\b/i, /\bamg\b/i, /\b190e\b/i, /\bg-class\b/i, /\bg-wagon\b/i] },
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
  { name: 'Lancia', country: 'Itália', patterns: [/\blancia\b/i, /\bstratos\b/i, /\bdelta\b/i] },
  { name: 'Lotus', country: 'Reino Unido', patterns: [/\blotus\b/i, /\bevira\b/i, /\bexige\b/i, /\belise\b/i] },
  { name: 'Hyundai', country: 'Coreia do Sul', patterns: [/\bhyundai\b/i, /\bioniq\b/i, /\bi20\b/i, /\bi30\b/i] },
  { name: 'Dodge', country: 'Estados Unidos', patterns: [/\bdodge\b/i, /\bviper\b/i, /\bchallenger\b/i, /\bcharger\b/i] },
  { name: 'Pagani', country: 'Itália', patterns: [/\bpagani\b/i, /\bhuayra\b/i, /\bzonda\b/i, /\butopia\b/i] },
  { name: 'Scania', country: 'Suécia', patterns: [/\bscania\b/i] },
];

function detectAutomaker(rawMaker: string, fullName: string): string | null {
  const cleanRaw = rawMaker.trim();

  // 1. Direct match on clean raw maker
  if (cleanRaw) {
    const rawLower = cleanRaw.toLowerCase();
    if (rawLower.includes('aston marti')) return 'Aston Martin';
    if (rawLower === 'ford') return 'Ford';
    if (rawLower === 'gm') return 'Chevrolet';
    if (rawLower.includes('mitsubishi')) return 'Mitsubishi';
    if (rawLower.includes('nissan')) return 'Nissan';
    if (rawLower.includes('porsche')) return 'Porsche';

    for (const am of KNOWN_AUTOMAKERS) {
      if (rawLower === am.name.toLowerCase() || rawLower.includes(am.name.toLowerCase())) {
        return am.name;
      }
    }
  }

  // 2. Pattern match against full product name
  for (const am of KNOWN_AUTOMAKERS) {
    for (const pattern of am.patterns) {
      if (pattern.test(fullName)) {
        return am.name;
      }
    }
  }

  return null;
}

function cleanCastingName(rawModel: string, fullName: string): string {
  // If model is provided and meaningful (not just automaker)
  const trimmedModel = rawModel.trim();
  if (
    trimmedModel &&
    trimmedModel.length > 2 &&
    !['ford', 'toyota', 'nissan', 'honda', 'mitsubishi', 'porsche', 'ferrari', 'bmw'].includes(trimmedModel.toLowerCase())
  ) {
    return trimmedModel.slice(0, 180);
  }

  // Otherwise clean the full name
  let name = fullName.trim();
  // Remove line breaks and excessive whitespace
  name = name.replace(/\r?\n.*/s, '').replace(/\s{2,}/g, ' ');

  // Split on packaging / edition delimiters
  const parts = name.split(/\s*[/“"\(\]]\s*/);
  let candidate = parts[0]?.trim() || name;

  // Clean trailing punctuation or details
  candidate = candidate
    .replace(/\s*-\s*(?:White|Black|Red|Blue|Yellow|Silver|Grey|Gray|Green|Orange|Gold|Purple)\b.*/i, '')
    .replace(/\b(packing|unidades|blister|exclusive)\b.*/i, '')
    .trim();

  return (candidate || fullName).slice(0, 180);
}

function extractYear(previsaoChegada: string, preVendaInicio: string, fullName: string): number | null {
  // Check date fields first
  for (const dateStr of [previsaoChegada, preVendaInicio]) {
    if (dateStr) {
      const match = dateStr.match(/\b(202\d)\b/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
  }

  // Check 4-digit year in model name (e.g. 1964, 1998, 2024)
  const match = fullName.match(/\b(19\d\d|20\d\d)\b/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return 2025; // Default reference year for modern catalog
}

export async function seedMiniGtBrasilCatalog() {
  console.log('🏁 ========================================================');
  console.log('🏎️  Iniciando carga do catálogo MINI GT BRASIL...');
  console.log('🏁 ========================================================');

  // Locate CSV file
  const possibleCsvPaths = [
    path.resolve(process.cwd(), '../catalogos/MINIGTBRASIL/minigtbrasil_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/MINIGTBRASIL/minigtbrasil_catalogo.csv'),
    'C:/Projetos/minihubcar/catalogos/MINIGTBRASIL/minigtbrasil_catalogo.csv',
  ];
  const csvPath = possibleCsvPaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error('❌ Arquivo minigtbrasil_catalogo.csv não encontrado.');
  }
  console.log(`📂 Arquivo CSV localizado: ${csvPath}`);

  // 1. Garantir existência de Marcas
  const brandMap = new Map<string, string>(); // normalizedName -> id
  for (const [normKey, def] of Object.entries(BRAND_DEFINITIONS)) {
    let [brandRow] = await db
      .select()
      .from(miniatureBrand)
      .where(eq(miniatureBrand.normalizedName, normKey))
      .limit(1);

    if (!brandRow) {
      [brandRow] = await db
        .insert(miniatureBrand)
        .values({
          name: def.name,
          normalizedName: normKey,
          description: def.description,
          status: 'ACTIVE',
        })
        .returning();
      console.log(`✨ Marca cadastrada: ${def.name}`);
    }
    if (brandRow) {
      brandMap.set(normKey, brandRow.id);
    }
  }

  // 2. Garantir Tipos de Identificadores
  const idTypeMap = new Map<string, string>(); // code -> id
  const idTypes = [
    { code: 'MINIGT_CODE', name: 'Código Mini GT', desc: 'Código oficial de produto Mini GT / Kaido House' },
    { code: 'PRODUCT_CODE', name: 'Código de Produto / SKU', desc: 'Código geral de produto diecast' },
    { code: 'TARMAC_CODE', name: 'Código Tarmac Works', desc: 'Código oficial de modelo Tarmac Works' },
  ];

  for (const it of idTypes) {
    let [found] = await db
      .select()
      .from(identifierType)
      .where(eq(identifierType.code, it.code))
      .limit(1);

    if (!found) {
      [found] = await db
        .insert(identifierType)
        .values({
          code: it.code,
          name: it.name,
          description: it.desc,
        })
        .returning();
      console.log(`✨ Tipo de Identificador cadastrado: ${it.code}`);
    }
    if (found) {
      idTypeMap.set(it.code, found.id);
    }
  }

  // 3. Garantir Escalas (1:64, 1:43, 1:18, 1:12, 1:1)
  const scaleDefs = [
    { name: '1:64', numerator: 1, denominator: 64, normalizedValue: '0.015625' },
    { name: '1:43', numerator: 1, denominator: 43, normalizedValue: '0.023256' },
    { name: '1:18', numerator: 1, denominator: 18, normalizedValue: '0.055556' },
    { name: '1:12', numerator: 1, denominator: 12, normalizedValue: '0.083333' },
    { name: '1:1', numerator: 1, denominator: 1, normalizedValue: '1.000000' },
  ];

  const scaleMap = new Map<string, string>();
  for (const s of scaleDefs) {
    let [found] = await db.select().from(scale).where(eq(scale.name, s.name)).limit(1);
    if (!found) {
      [found] = await db.insert(scale).values(s).returning();
    }
    if (found) {
      scaleMap.set(s.name, found.id);
    }
  }

  // 4. Garantir Montadoras
  const automakerMap = new Map<string, string>(); // lowercase name -> id
  const existingAutomakers = await db.select().from(automaker);
  for (const am of existingAutomakers) {
    automakerMap.set(am.normalizedName.toLowerCase(), am.id);
  }

  for (const am of KNOWN_AUTOMAKERS) {
    const norm = am.name.toLowerCase();
    if (!automakerMap.has(norm)) {
      const [inserted] = await db
        .insert(automaker)
        .values({
          name: am.name,
          normalizedName: norm,
          country: am.country,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        automakerMap.set(norm, inserted.id);
      }
    }
  }

  // 5. Cache de Castings existentes
  const existingCastings = await db.select().from(casting);
  const castingMap = new Map<string, string>(); // `${miniatureBrandId}:${normalizedName}` -> id
  for (const c of existingCastings) {
    castingMap.set(`${c.miniatureBrandId}:${c.normalizedName}`, c.id);
  }

  // 6. Cache de Identificadores existentes
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
  const rows = parseRFC4180CSV(content);
  if (rows.length < 2) {
    throw new Error('❌ O arquivo CSV não contém dados válidos.');
  }

  const rawHeaders = rows[0]!.map((h) => h.replace(/^\ufeff/, '').trim());
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (row: string[], colName: string): string => {
    const idx = headerMap[colName];
    if (idx === undefined || idx >= row.length) return '';
    return row[idx]?.trim() || '';
  };

  const dataRows = rows.slice(1);
  console.log(`📋 Registros para processamento: ${dataRows.length} miniaturas.`);

  let insertedCount = 0;
  let updatedCount = 0;
  let castingsInserted = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;

    const codigoNormalizado = getCol(row, 'codigo_normalizado');
    const codigoOriginal = getCol(row, 'codigo_original');
    const rawNome = getCol(row, 'nome');
    const rawMarca = getCol(row, 'marca');
    const categoria = getCol(row, 'categoria') || 'MINIATURA';
    const rawEscala = getCol(row, 'escala') || '1:64';
    const fabricanteVeiculo = getCol(row, 'fabricante_veiculo');
    const modeloVeiculo = getCol(row, 'modelo_veiculo');
    const licencas = getCol(row, 'licencas');
    const cor = getCol(row, 'cor');
    const embalagem = getCol(row, 'embalagem');
    const rawDescricao = getCol(row, 'descricao');
    const estoqueLimitado = getCol(row, 'estoque_limitado');
    const preVendaInicio = getCol(row, 'pre_venda_inicio');
    const previsaoChegada = getCol(row, 'previsao_chegada');
    const idProduto = getCol(row, 'id_produto');
    const urlProduto = getCol(row, 'url_produto');
    const rawFotos = getCol(row, 'fotos_jpg');

    if (!codigoNormalizado || !rawNome) continue;

    // A. Resolve Miniature Brand
    const normMarca = rawMarca.toLowerCase().trim();
    let brandId = brandMap.get(normMarca);
    if (!brandId) {
      // Fallback or dynamic insertion
      const [newBrand] = await db
        .insert(miniatureBrand)
        .values({
          name: rawMarca || 'Outros',
          normalizedName: normMarca || 'outros',
          description: `Fabricante de miniaturas ${rawMarca}`,
        })
        .onConflictDoNothing()
        .returning();

      if (newBrand) {
        brandId = newBrand.id;
        brandMap.set(normMarca, brandId);
      } else {
        const [found] = await db.select().from(miniatureBrand).where(eq(miniatureBrand.normalizedName, normMarca)).limit(1);
        if (found) {
          brandId = found.id;
          brandMap.set(normMarca, brandId);
        }
      }
    }
    if (!brandId) brandId = brandMap.get('mini gt')!;

    // B. Resolve Scale
    const scaleId = scaleMap.get(rawEscala) || scaleMap.get('1:64')!;

    // C. Resolve Automaker & Casting
    const detectedMakerName = detectAutomaker(fabricanteVeiculo, rawNome);
    const automakerId = detectedMakerName ? automakerMap.get(detectedMakerName.toLowerCase()) || null : null;

    const castingName = cleanCastingName(modeloVeiculo, rawNome);
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

    if (!castingId) {
      console.warn(`⚠️ Não foi possível vincular casting para "${rawNome}"`);
      continue;
    }

    // D. Photo URL
    let photoUrl: string | null = null;
    if (rawFotos) {
      const firstPhotoPart = rawFotos.split('|')[0]?.trim();
      if (firstPhotoPart) {
        const photoFileName = firstPhotoPart.split(/[\\/]/).pop() || '';
        photoUrl = `/catalog-media/MINIGTBRASIL/fotos/${photoFileName}`;
      }
    }

    // E. Variation attributes
    const cleanName = rawNome
      .replace(/\r?\n.*/s, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 200);

    const releaseYear = extractYear(previsaoChegada, preVendaInicio, rawNome);
    const rarity = estoqueLimitado.toLowerCase() === 'true' ? 'LIMITED' : 'REGULAR';
    const edition = (licencas || embalagem || null)?.slice(0, 100);
    const color = (cor || null)?.slice(0, 100);
    const packaging = (embalagem || null)?.slice(0, 100);
    const collectorNumber = (codigoNormalizado || null)?.slice(0, 50);
    const lineType = (categoria || 'MINIATURA').slice(0, 50);

    // Build rich description
    const descParts: string[] = [];
    if (codigoNormalizado) descParts.push(`Código: ${codigoNormalizado}`);
    if (embalagem) descParts.push(`Embalagem: ${embalagem}`);
    if (cor) descParts.push(`Cor: ${cor}`);
    if (urlProduto) descParts.push(`Catálogo oficial: ${urlProduto}`);
    if (previsaoChegada) {
      const dt = previsaoChegada.split('T')[0];
      descParts.push(`Previsão de chegada: ${dt}`);
    }
    const description = descParts.join(' • ') || null;

    // F. Identifier Type
    let targetIdTypeCode = 'PRODUCT_CODE';
    if (normMarca === 'mini gt' || normMarca === 'kaido house') {
      targetIdTypeCode = 'MINIGT_CODE';
    } else if (normMarca === 'tarmac works') {
      targetIdTypeCode = 'TARMAC_CODE';
    }
    const idTypeId = idTypeMap.get(targetIdTypeCode) || idTypeMap.get('PRODUCT_CODE')!;

    // Check if variation already exists via product_identifier
    const lookupKey = `${idTypeId}:${codigoNormalizado.toLowerCase()}`;
    const existingVarId = identifierVariationMap.get(lookupKey);

    let variationId = existingVarId;

    if (existingVarId) {
      // Update existing variation
      await db
        .update(variation)
        .set({
          castingId,
          scaleId,
          name: cleanName,
          releaseYear,
          color,
          packaging,
          edition,
          collectorNumber,
          lineType,
          rarity,
          photoUrl: photoUrl || undefined,
          description,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingVarId));

      updatedCount++;
    } else {
      // Insert new variation
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          scaleId,
          name: cleanName,
          releaseYear,
          color,
          packaging,
          edition,
          collectorNumber,
          lineType,
          rarity,
          photoUrl,
          description,
        })
        .returning();

      if (newVar) {
        variationId = newVar.id;
        insertedCount++;

        // Insert primary identifier
        await db
          .insert(productIdentifier)
          .values({
            variationId: newVar.id,
            identifierTypeId: idTypeId,
            code: codigoNormalizado,
            normalizedCode: codigoNormalizado.toLowerCase(),
            isPrimary: true,
          })
          .onConflictDoNothing();

        identifierVariationMap.set(lookupKey, newVar.id);
      }
    }

    // G. Secondary Identifiers (variantes como MGT00928-007EA)
    if (variationId && codigoOriginal) {
      const subCodes = codigoOriginal
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c && c.toLowerCase() !== codigoNormalizado.toLowerCase());

      for (const sc of subCodes) {
        await db
          .insert(productIdentifier)
          .values({
            variationId,
            identifierTypeId: idTypeId,
            code: sc,
            normalizedCode: sc.toLowerCase(),
            isPrimary: false,
          })
          .onConflictDoNothing();
      }
    }

    // Progress logging
    if ((i + 1) % 250 === 0 || i === dataRows.length - 1) {
      console.log(`⏳ Progresso: ${i + 1}/${dataRows.length} miniaturas processadas...`);
    }
  }

  console.log('\n🏁 ========================================================');
  console.log('✅ Carga do catálogo MINI GT BRASIL concluída com sucesso!');
  console.log(`   - Castings novos criados: ${castingsInserted}`);
  console.log(`   - Variações novas inseridas: ${insertedCount}`);
  console.log(`   - Variações existentes atualizadas/enriquecidas: ${updatedCount}`);
  console.log(`   - Total de itens processados: ${insertedCount + updatedCount}`);
  console.log('🏁 ========================================================');

  return {
    insertedCount,
    updatedCount,
    castingsInserted,
    total: insertedCount + updatedCount,
  };
}

// Execução direta via CLI
if (process.argv[1] && (process.argv[1].endsWith('seed-minigtbrasil-catalog.ts') || process.argv[1].includes('seed-minigtbrasil-catalog'))) {
  seedMiniGtBrasilCatalog()
    .then(async () => {
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Falha na importação do catálogo MINI GT BRASIL:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
