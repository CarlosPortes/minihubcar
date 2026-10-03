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
  series,
  casting,
  variation,
  productIdentifier,
} from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Montadoras conhecidas da Bburago
const KNOWN_AUTOMAKERS: Array<{ name: string; country: string; patterns: RegExp[] }> = [
  { name: 'Ferrari', country: 'Itália', patterns: [/\bferrari\b/i, /\bsf90\b/i, /\b499p\b/i, /\bf1-75\b/i, /\b296\b/i, /\broma\b/i, /\bdaytona\b/i, /\bf40\b/i, /\bmonza\b/i] },
  { name: 'Red Bull Racing', country: 'Áustria', patterns: [/\bred bull\b/i, /\brb19\b/i, /\brb18\b/i, /\brb16\b/i, /\bverstappen\b/i, /\bperez\b/i] },
  { name: 'Lamborghini', country: 'Itália', patterns: [/\blamborghini\b/i, /\brevuelto\b/i, /\bsian\b/i, /\bhurac[aá]n\b/i, /\baventador\b/i, /\burus\b/i, /\bcountach\b/i, /\bterzo\b/i] },
  { name: 'Porsche', country: 'Alemanha', patterns: [/\bporsche\b/i, /\b911\b/i, /\bgt3\b/i, /\btaycan\b/i, /\b918\b/i] },
  { name: 'Bugatti', country: 'França', patterns: [/\bbugatti\b/i, /\bchiron\b/i, /\bdivo\b/i, /\bbolide\b/i] },
  { name: 'Mercedes-Benz', country: 'Alemanha', patterns: [/\bmercedes\b/i, /\bamg\b/i, /\bw14\b/i, /\bw13\b/i, /\bhamilton\b/i, /\brussell\b/i] },
  { name: 'McLaren', country: 'Reino Unido', patterns: [/\bmclaren\b/i, /\bmcl60\b/i, /\bmcl36\b/i, /\bnorris\b/i, /\bpiastri\b/i, /\bsenana\b/i, /\b720s\b/i] },
  { name: 'Alpine', country: 'França', patterns: [/\balpine\b/i, /\ba523\b/i, /\ba522\b/i, /\bgasly\b/i, /\bocon\b/i, /\ba110\b/i] },
  { name: 'Alfa Romeo', country: 'Itália', patterns: [/\balfa romeo\b/i, /\bc43\b/i, /\bc42\b/i, /\bgiulia\b/i, /\btonale\b/i, /\bvalse\b/i] },
  { name: 'Aston Martin', country: 'Reino Unido', patterns: [/\baston martin\b/i, /\bvalkyrie\b/i, /\bvantage\b/i, /\bdbx\b/i] },
  { name: 'BMW', country: 'Alemanha', patterns: [/\bbmw\b/i, /\bm3\b/i, /\bm4\b/i, /\bm8\b/i, /\bz4\b/i] },
  { name: 'Jeep', country: 'Estados Unidos', patterns: [/\bjeep\b/i, /\bwrangler\b/i, /\bgladiator\b/i, /\bcherokee\b/i] },
  { name: 'Land Rover', country: 'Reino Unido', patterns: [/\bland rover\b/i, /\brange rover\b/i, /\bdefender\b/i] },
  { name: 'Maserati', country: 'Itália', patterns: [/\bmaserati\b/i, /\bmc20\b/i, /\bgrecale\b/i, /\blevante\b/i] },
  { name: 'Audi', country: 'Alemanha', patterns: [/\baudi\b/i, /\br8\b/i, /\brs\b/i, /\be-tron\b/i] },
  { name: 'Ford', country: 'Estados Unidos', patterns: [/\bford\b/i, /\bmustang\b/i, /\bgt\b/i] },
  { name: 'Chevrolet', country: 'Estados Unidos', patterns: [/\bchevrolet\b/i, /\bcorvette\b/i, /\bcamaro\b/i] },
  { name: 'Nissan', country: 'Japão', patterns: [/\bnissan\b/i, /\bgt-r\b/i, /\bgtr\b/i] },
  { name: 'Volkswagen', country: 'Alemanha', patterns: [/\bvolkswagen\b/i, /\bvw\b/i, /\bgolf\b/i, /\bbeetle\b/i] },
  { name: 'Fiat', country: 'Itália', patterns: [/\bfiat\b/i, /\b500\b/i, /\babarth\b/i] },
  { name: 'Ducati', country: 'Itália', patterns: [/\bducati\b/i, /\bpanigale\b/i] },
];

function detectAutomaker(title: string, rawMontadora: string): string {
  if (rawMontadora && rawMontadora !== 'Outro') {
    return rawMontadora;
  }
  for (const am of KNOWN_AUTOMAKERS) {
    for (const pat of am.patterns) {
      if (pat.test(title)) {
        return am.name;
      }
    }
  }
  return 'Outro';
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0]!.replace(/^\uFEFF/, '');
  const headers = headerLine.split(';').map((h) => h.trim());

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const values = line.split(';').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

export async function seedBburagoCatalog(customPath?: string) {
  console.log('🏎️  Iniciando Carga do Catálogo Oficial Bburago...');

  const possiblePaths = [
    customPath,
    path.resolve(process.cwd(), '../catalogos/Bburago/bburago_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/Bburago/bburago_catalogo.csv'),
    path.resolve(process.cwd(), '../catalogos/bburago/bburago_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/bburago/bburago_catalogo.csv'),
    '/app/catalogos/Bburago/bburago_catalogo.csv',
    '/var/www/minihubcar/catalogos/Bburago/bburago_catalogo.csv',
  ].filter(Boolean) as string[];

  const csvPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error(
      `❌ Arquivo bburago_catalogo.csv não encontrado. Locais verificados:\n${possiblePaths.join('\n')}`
    );
  }

  console.log(`📂 Arquivo CSV encontrado: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);
  console.log(`📊 Total de registros no CSV: ${rows.length} miniaturas.`);

  // 1. Marca Bburago
  let [brand] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'bburago'))
    .limit(1);

  if (!brand) {
    [brand] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Bburago',
        normalizedName: 'bburago',
        description: 'Tradicional fabricante italiana de modelos diecast em metal nas escalas 1:18, 1:24, 1:43 e 1:64.',
      })
      .returning();
    console.log('✅ Marca Bburago cadastrada no sistema.');
  }
  const brandId = brand!.id;

  // 2. Escalas da Bburago
  const requiredScales: Array<{ name: string; num: number; den: number; norm: string }> = [
    { name: '1:18', num: 1, den: 18, norm: '0.055556' },
    { name: '1:24', num: 1, den: 24, norm: '0.041667' },
    { name: '1:43', num: 1, den: 43, norm: '0.023256' },
    { name: '1:64', num: 1, den: 64, norm: '0.015625' },
    { name: '1:32', num: 1, den: 32, norm: '0.031250' },
  ];

  const scaleMap = new Map<string, string>();
  for (const sc of requiredScales) {
    let [found] = await db.select().from(scale).where(eq(scale.name, sc.name)).limit(1);
    if (!found) {
      [found] = await db
        .insert(scale)
        .values({
          name: sc.name,
          numerator: sc.num,
          denominator: sc.den,
          normalizedValue: sc.norm,
        })
        .returning();
    }
    scaleMap.set(sc.name, found!.id);
  }

  // 3. Tipo Identificador BBURAGO_SKU
  let [skuType] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'BBURAGO_SKU'))
    .limit(1);

  if (!skuType) {
    [skuType] = await db
      .insert(identifierType)
      .values({
        code: 'BBURAGO_SKU',
        name: 'SKU Oficial Bburago',
        description: 'Código de barras e referência oficial de catálogo Bburago',
      })
      .returning();
    console.log('✅ Tipo identificador BBURAGO_SKU cadastrado.');
  }

  // 4. Cache de Montadoras
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const a of allAutomakers) {
    automakerMap.set(a.normalizedName, a.id);
  }

  // 5. Cache de Séries e Castings da Bburago
  const allSeries = await db
    .select()
    .from(series)
    .where(eq(series.miniatureBrandId, brandId));
  const seriesMap = new Map<string, string>();
  for (const s of allSeries) {
    seriesMap.set(s.normalizedName, s.id);
  }

  const allCastings = await db
    .select()
    .from(casting)
    .where(eq(casting.miniatureBrandId, brandId));
  const castingMap = new Map<string, string>();
  for (const c of allCastings) {
    castingMap.set(c.normalizedName, c.id);
  }

  // 6. Cache de Identificadores existentes para não duplicar
  const existingIdentifiers = await db
    .select({
      normalizedCode: productIdentifier.normalizedCode,
      variationId: productIdentifier.variationId,
    })
    .from(productIdentifier)
    .where(eq(productIdentifier.identifierTypeId, skuType!.id));

  const identifierMap = new Map<string, string>();
  for (const row of existingIdentifiers) {
    identifierMap.set(row.normalizedCode, row.variationId);
  }

  let insertedCastings = 0;
  let insertedSeries = 0;
  let insertedVariations = 0;
  let updatedVariations = 0;

  for (const row of rows) {
    const sku = (row['sku'] || '').trim();
    if (!sku) continue;

    const title = (row['titulo'] || '').trim();
    const rawMontadora = (row['montadora'] || '').trim();
    const automakerName = detectAutomaker(title, rawMontadora);
    const normalizedAutomaker = automakerName.toLowerCase();

    // Resolver montadora
    let automakerId: string | null = null;
    if (automakerName !== 'Outro') {
      automakerId = automakerMap.get(normalizedAutomaker) || null;
      if (!automakerId) {
        const foundData = KNOWN_AUTOMAKERS.find((k) => k.name.toLowerCase() === normalizedAutomaker);
        const [newAuto] = await db
          .insert(automaker)
          .values({
            name: automakerName,
            normalizedName: normalizedAutomaker,
            country: foundData?.country || 'Internacional',
          })
          .onConflictDoNothing()
          .returning();
        if (newAuto) {
          automakerId = newAuto.id;
          automakerMap.set(normalizedAutomaker, automakerId);
        }
      }
    }

    // Resolver série
    const seriesName = row['serie'] || 'Bburago Diecast';
    const normalizedSeries = seriesName.toLowerCase();
    let seriesId = seriesMap.get(normalizedSeries) || null;
    if (!seriesId) {
      const [newSer] = await db
        .insert(series)
        .values({
          miniatureBrandId: brandId,
          name: seriesName,
          normalizedName: normalizedSeries,
          description: `Série Bburago: ${seriesName}`,
        })
        .onConflictDoNothing()
        .returning();
      if (newSer) {
        seriesId = newSer.id;
        seriesMap.set(normalizedSeries, seriesId);
        insertedSeries++;
      }
    }

    // Resolver casting
    const modelName = row['modelo'] || title;
    const normalizedCasting = modelName.toLowerCase();
    let castingId = castingMap.get(normalizedCasting) || null;
    if (!castingId) {
      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: brandId,
          automakerId,
          name: modelName,
          normalizedName: normalizedCasting,
          fantasyFlag: false,
          description: `Modelo Bburago oficial ${modelName}`,
        })
        .onConflictDoNothing()
        .returning();
      if (newCasting) {
        castingId = newCasting.id;
        castingMap.set(normalizedCasting, castingId);
        insertedCastings++;
      } else {
        const [foundCasting] = await db
          .select()
          .from(casting)
          .where(
            and(
              eq(casting.miniatureBrandId, brandId),
              eq(casting.normalizedName, normalizedCasting)
            )
          )
          .limit(1);
        if (foundCasting) {
          castingId = foundCasting.id;
          castingMap.set(normalizedCasting, castingId);
        }
      }
    }

    if (!castingId) continue;

    // Escala
    const scaleStr = row['escala'] || '1:43';
    const scaleId = scaleMap.get(scaleStr) || scaleMap.get('1:43');

    // Imagem
    const photoUrl = row['url_imagem_principal'] || null;

    // Cor
    const color = (row['cor'] || 'Padrão Oficial').slice(0, 100);

    // Preço e Descrição
    const priceEur = row['preco_eur'] ? `€ ${row['preco_eur']}` : '';
    const desc = [
      row['descricao'],
      priceEur ? `Preço de tabela original: ${priceEur}` : '',
      row['url_produto'] ? `Página oficial: ${row['url_produto']}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Verificar se variação já existe
    const normSku = sku.toLowerCase();
    const existingVarId = identifierMap.get(normSku);

    if (existingVarId) {
      await db
        .update(variation)
        .set({
          castingId,
          seriesId,
          scaleId,
          name: title.slice(0, 200),
          color,
          photoUrl,
          description: desc,
          updatedAt: new Date(),
        })
        .where(eq(variation.id, existingVarId));
      updatedVariations++;
    } else {
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId,
          seriesId,
          scaleId,
          name: title.slice(0, 200),
          color,
          photoUrl,
          description: desc,
        })
        .returning();

      if (newVar) {
        await db
          .insert(productIdentifier)
          .values({
            variationId: newVar.id,
            identifierTypeId: skuType!.id,
            code: sku.slice(0, 140),
            normalizedCode: normSku.slice(0, 140),
            isPrimary: true,
          })
          .onConflictDoNothing();

        identifierMap.set(normSku, newVar.id);
        insertedVariations++;
      }
    }
  }

  console.log('\n🎉 Carga do Catálogo Bburago Finalizada com Sucesso!');
  console.log(`   • Novos Castings: ${insertedCastings}`);
  console.log(`   • Novas Séries: ${insertedSeries}`);
  console.log(`   • Novas Variações inseridas: ${insertedVariations}`);
  console.log(`   • Variações existentes atualizadas: ${updatedVariations}`);
  console.log(`   • Total de modelos Bburago ativos: ${rows.length}`);
}

if (process.argv[1] && process.argv[1].includes('seed-bburago-catalog')) {
  seedBburagoCatalog()
    .then(() => {
      console.log('✅ Execução concluída!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erro na carga Bburago:', err);
      process.exit(1);
    });
}
