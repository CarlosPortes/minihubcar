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

export async function seedMajoretteCatalog(customPath?: string) {
  console.log('🏎️  Iniciando Carga do Catálogo Oficial Majorette...');

  const possiblePaths = [
    customPath,
    path.resolve(process.cwd(), '../catalogos/Majorette/majorette_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/Majorette/majorette_catalogo.csv'),
    path.resolve(process.cwd(), '../catalogos/majorette/majorette_catalogo.csv'),
    path.resolve(process.cwd(), 'catalogos/majorette/majorette_catalogo.csv'),
    '/app/catalogos/Majorette/majorette_catalogo.csv',
    '/var/www/minihubcar/catalogos/Majorette/majorette_catalogo.csv',
  ].filter(Boolean) as string[];

  const csvPath = possiblePaths.find((p) => fs.existsSync(p));
  if (!csvPath) {
    throw new Error(
      `❌ Arquivo majorette_catalogo.csv não encontrado. Locais verificados:\n${possiblePaths.join('\n')}`
    );
  }

  console.log(`📂 Arquivo CSV encontrado: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);
  console.log(`📊 Total de registros no CSV: ${rows.length} miniaturas.`);

  // 1. Marca Majorette
  let [brand] = await db
    .select()
    .from(miniatureBrand)
    .where(eq(miniatureBrand.normalizedName, 'majorette'))
    .limit(1);

  if (!brand) {
    [brand] = await db
      .insert(miniatureBrand)
      .values({
        name: 'Majorette',
        normalizedName: 'majorette',
        description: 'Icônica fabricante francesa de miniaturas diecast fundada em 1961, famosa pelas Séries 200, 300, Street Cars e Deluxe.',
      })
      .returning();
    console.log('✅ Marca Majorette cadastrada no sistema.');
  }
  const brandId = brand!.id;

  // 2. Escalas da Majorette (1:64 e 1:87)
  const requiredScales: Array<{ name: string; num: number; den: number; norm: string }> = [
    { name: '1:64', num: 1, den: 64, norm: '0.015625' },
    { name: '1:87', num: 1, den: 87, norm: '0.011494' },
    { name: '1:43', num: 1, den: 43, norm: '0.023256' },
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
  const defaultScaleId = scaleMap.get('1:64')!;

  // 3. Tipo Identificador MAJORETTE_CODE
  let [codeType] = await db
    .select()
    .from(identifierType)
    .where(eq(identifierType.code, 'MAJORETTE_CODE'))
    .limit(1);

  if (!codeType) {
    [codeType] = await db
      .insert(identifierType)
      .values({
        code: 'MAJORETTE_CODE',
        name: 'Código Oficial Majorette',
        description: 'Número de série / código de referência de casting da Majorette',
      })
      .returning();
    console.log('✅ Tipo identificador MAJORETTE_CODE cadastrado.');
  }
  const identifierTypeId = codeType!.id;

  // 4. Cache de Montadoras
  const allAutomakers = await db.select().from(automaker);
  const automakerMap = new Map<string, string>();
  for (const a of allAutomakers) {
    automakerMap.set(a.normalizedName, a.id);
  }

  // 5. Cache de Séries e Castings da Majorette
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
      code: productIdentifier.code,
      variationId: productIdentifier.variationId,
    })
    .from(productIdentifier)
    .where(eq(productIdentifier.identifierTypeId, identifierTypeId));

  const identifierSet = new Set<string>();
  for (const id of existingIdentifiers) {
    identifierSet.add(id.code.trim().toUpperCase());
  }

  let totalCastingsCriados = 0;
  let totalSeriesCriadas = 0;
  let totalVariacoesCriadas = 0;
  let totalVariacoesAtualizadas = 0;

  console.log('⚙️  Processando e inserindo modelos no banco de dados...');

  for (const row of rows) {
    const rawCode = (row.codigo || '').trim();
    const rawModel = (row.modelo || '').trim();
    if (!rawCode && !rawModel) continue;

    const code = rawCode || `MAJ-${rawModel.substring(0, 15).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    const codeKey = code.toUpperCase();

    const rawMontadora = (row.montadora || 'Majorette').trim();
    const rawSerie = (row.serie || 'Majorette Mainline').trim();
    const rawCor = (row.cor || '').trim();
    const rawAno = parseInt(row.ano_lancamento || row.ano_catalogo || '0', 10);
    const releaseYear = rawAno > 1950 && rawAno < 2050 ? rawAno : null;

    // Normaliza nome do casting
    const castingName = rawModel;
    const normalizedCastingName = castingName.toLowerCase().trim();

    // 1. Montadora
    const normMontadora = rawMontadora.toLowerCase().trim();
    let automakerId = automakerMap.get(normMontadora);
    if (!automakerId) {
      const [newAutomaker] = await db
        .insert(automaker)
        .values({
          name: rawMontadora,
          normalizedName: normMontadora,
          country: 'Desconhecido',
        })
        .returning();
      automakerId = newAutomaker!.id;
      automakerMap.set(normMontadora, automakerId);
    }

    // 2. Série
    const normSerie = rawSerie.toLowerCase().trim();
    let serieId = seriesMap.get(normSerie);
    if (!serieId) {
      const [newSerie] = await db
        .insert(series)
        .values({
          miniatureBrandId: brandId,
          name: rawSerie,
          normalizedName: normSerie,
        })
        .returning();
      serieId = newSerie!.id;
      seriesMap.set(normSerie, serieId);
      totalSeriesCriadas++;
    }

    // 3. Casting
    let castingId = castingMap.get(normalizedCastingName);
    if (!castingId) {
      const [newCasting] = await db
        .insert(casting)
        .values({
          miniatureBrandId: brandId,
          name: castingName,
          normalizedName: normalizedCastingName,
          automakerId: automakerId,
          fantasyFlag: rawMontadora.toLowerCase() === 'majorette' || /fantasy|fictitious/i.test(castingName),
          status: 'ACTIVE',
        })
        .returning();
      castingId = newCasting!.id;
      castingMap.set(normalizedCastingName, castingId);
      totalCastingsCriados++;
    }

    // 4. Foto
    let photoUrl: string | null = null;
    if (row.arquivo_foto) {
      photoUrl = `/catalog-media/Majorette/fotos/${row.arquivo_foto.trim()}`;
    } else if (row.url_foto_original) {
      photoUrl = row.url_foto_original.trim();
    }

    // Escala
    const scaleKey = row.escala?.includes('1:87') ? '1:87' : '1:64';
    const scaleId = scaleMap.get(scaleKey) || defaultScaleId;

    // 5. Verificar se já existe a variação com este código
    if (!identifierSet.has(codeKey)) {
      const [newVar] = await db
        .insert(variation)
        .values({
          castingId: castingId,
          seriesId: serieId,
          scaleId: scaleId,
          name: castingName,
          releaseYear: releaseYear,
          lineType: row.secao_origem || 'Majorette Collection',
          photoUrl: photoUrl,
          color: rawCor || null,
        })
        .returning();

      await db.insert(productIdentifier).values({
        variationId: newVar!.id,
        identifierTypeId: identifierTypeId,
        code: code,
        normalizedCode: codeKey,
        isPrimary: true,
      });

      identifierSet.add(codeKey);
      totalVariacoesCriadas++;
    } else {
      // Se já existe, atualiza fotos e metadados se a foto foi preenchida agora
      if (photoUrl) {
        const [existingId] = await db
          .select({ variationId: productIdentifier.variationId })
          .from(productIdentifier)
          .where(
            and(
              eq(productIdentifier.identifierTypeId, identifierTypeId),
              eq(productIdentifier.normalizedCode, codeKey)
            )
          )
          .limit(1);

        if (existingId) {
          await db
            .update(variation)
            .set({
              photoUrl: photoUrl,
              color: rawCor || undefined,
              releaseYear: releaseYear || undefined,
            })
            .where(eq(variation.id, existingId.variationId));
          totalVariacoesAtualizadas++;
        }
      }
    }
  }

  console.log('----------------------------------------------------');
  console.log('🎉 Carga do Catálogo Majorette concluída com sucesso!');
  console.log(`   • Castings novos criados:       ${totalCastingsCriados}`);
  console.log(`   • Séries novas criadas:         ${totalSeriesCriadas}`);
  console.log(`   • Variações novas inseridas:    ${totalVariacoesCriadas}`);
  console.log(`   • Variações atualizadas (fotos): ${totalVariacoesAtualizadas}`);
  console.log('----------------------------------------------------');
}

// Execução direta via CLI (ex: tsx src/database/seed-majorette-catalog.ts)
if (process.argv[1] && process.argv[1].endsWith('seed-majorette-catalog.ts')) {
  seedMajoretteCatalog()
    .then(async () => {
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Erro fatal durante seed do catálogo Majorette:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
