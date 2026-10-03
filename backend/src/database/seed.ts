import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, sqlClient } from './client';
import { seedAllHotWheelsCatalogs } from './seed-hw-catalogs';
import { seedMiniGtBrasilCatalog } from './seed-minigtbrasil-catalog';
import {
  appUser,
  role,
  userRole,
  conditionType,
  scale,
  identifierType,
  miniatureBrand,
  automaker,
  vehicleModel,
  casting,
  variation,
  productIdentifier,
} from './schema';

async function seed() {
  console.log('🌱 Starting MiniHub Car database seed...');

  // 1. Roles
  const rolesList = [
    { code: 'COLLECTOR', name: 'Colecionador' },
    { code: 'CATALOG_ADMIN', name: 'Administrador do Catálogo' },
    { code: 'SYSTEM_ADMIN', name: 'Administrador do Sistema' },
  ];

  for (const r of rolesList) {
    const existing = await db.select().from(role).where(eq(role.code, r.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(role).values(r);
    }
  }
  console.log('✅ Roles seeded.');

  // 2. Condition Types
  const conditions = [
    { code: 'MINT', name: 'Mint (Perfeito)' },
    { code: 'NEAR_MINT', name: 'Near Mint (Excelente estado)' },
    { code: 'GOOD', name: 'Good (Bom estado)' },
    { code: 'LOOSE', name: 'Loose (Fora da embalagem)' },
    { code: 'DAMAGED', name: 'Damaged (Com detalhes)' },
    { code: 'CARDED', name: 'Carded (Lacrado na cartela original)' },
  ];

  for (const c of conditions) {
    const existing = await db.select().from(conditionType).where(eq(conditionType.code, c.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(conditionType).values(c);
    }
  }
  console.log('✅ Conditions seeded.');

  // 3. Scales
  const scales = [
    { name: '1:64', numerator: 1, denominator: 64, normalizedValue: '0.015625' },
    { name: '1:43', numerator: 1, denominator: 43, normalizedValue: '0.023256' },
    { name: '1:24', numerator: 1, denominator: 24, normalizedValue: '0.041667' },
    { name: '1:18', numerator: 1, denominator: 18, normalizedValue: '0.055556' },
  ];

  for (const s of scales) {
    const existing = await db.select().from(scale).where(eq(scale.name, s.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(scale).values(s);
    }
  }
  console.log('✅ Scales seeded.');

  // 4. Identifier Types
  const idTypes = [
    { code: 'MINIGT_CODE', name: 'Código Mini GT' },
    { code: 'MATTEL_CODE', name: 'Código Mattel' },
    { code: 'AR_CODE', name: 'Código Almost Real' },
    { code: 'UPC', name: 'Código UPC' },
    { code: 'EAN', name: 'Código EAN' },
  ];

  for (const it of idTypes) {
    const existing = await db.select().from(identifierType).where(eq(identifierType.code, it.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(identifierType).values(it);
    }
  }
  console.log('✅ Identifier types seeded.');

  // 5. Miniature Brands
  const brands = [
    { name: 'Mini GT', normalizedName: 'mini gt', description: 'TSM Model 1:64 scale brand' },
    { name: 'Hot Wheels', normalizedName: 'hot wheels', description: 'Mattel diecast' },
    { name: 'Almost Real', normalizedName: 'almost real', description: 'Almost Real / ARbox premium diecast' },
    { name: 'Kaido House', normalizedName: 'kaido house', description: 'Jun Imai x Mini GT' },
    { name: 'Matchbox', normalizedName: 'matchbox', description: 'Mattel classic' },
    { name: 'Tarmac Works', normalizedName: 'tarmac works', description: 'Premium collector models' },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brands) {
    let [brandRow] = await db.select().from(miniatureBrand).where(eq(miniatureBrand.normalizedName, b.normalizedName)).limit(1);
    if (!brandRow) {
      [brandRow] = await db.insert(miniatureBrand).values(b).returning();
    }
    if (brandRow) {
      brandMap.set(b.normalizedName, brandRow.id);
    }
  }
  console.log('✅ Miniature brands seeded.');

  // 6. Automakers
  const automakersList = [
    { name: 'Honda', normalizedName: 'honda', country: 'Japan' },
    { name: 'McLaren', normalizedName: 'mclaren', country: 'United Kingdom' },
    { name: 'Ferrari', normalizedName: 'ferrari', country: 'Italy' },
    { name: 'Porsche', normalizedName: 'porsche', country: 'Germany' },
    { name: 'Aston Martin', normalizedName: 'aston martin', country: 'United Kingdom' },
    { name: 'Nissan', normalizedName: 'nissan', country: 'Japan' },
    { name: 'Ford', normalizedName: 'ford', country: 'United States' },
    { name: 'Toyota', normalizedName: 'toyota', country: 'Japan' },
    { name: 'BMW', normalizedName: 'bmw', country: 'Germany' },
    { name: 'Lamborghini', normalizedName: 'lamborghini', country: 'Italy' },
  ];

  const automakerMap = new Map<string, string>();
  for (const am of automakersList) {
    let [amRow] = await db.select().from(automaker).where(eq(automaker.normalizedName, am.normalizedName)).limit(1);
    if (!amRow) {
      [amRow] = await db.insert(automaker).values(am).returning();
    }
    if (amRow) {
      automakerMap.set(am.normalizedName, amRow.id);
    }
  }
  console.log('✅ Automakers seeded.');

  // Get primary scale 1:64
  const [scale64] = await db.select().from(scale).where(eq(scale.name, '1:64')).limit(1);
  const [miniGtIdType] = await db.select().from(identifierType).where(eq(identifierType.code, 'MINIGT_CODE')).limit(1);
  const miniGtBrandId = brandMap.get('mini gt')!;

  // 7. Parse and ingest catalog CSVs
  const projectRoot = path.resolve(process.cwd(), '..');
  const fandomCsvPath = path.join(projectRoot, 'catalogos', 'Fandom', 'fandom_catalogo.csv');
  const minigtCsvPath = path.join(projectRoot, 'catalogos', 'Minigt', 'minigt_catalogo.csv');

  let importedCount = 0;

  // Process Fandom CSV
  if (fs.existsSync(fandomCsvPath)) {
    console.log('📦 Ingesting Fandom catalog data...');
    const content = fs.readFileSync(fandomCsvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Skip header: code;name;lhd_rhd;brand;year;photo_url;photo_file
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = line.split(';');
      if (parts.length < 2) continue;

      const code = parts[0]?.trim() || '';
      const name = parts[1]?.trim() || '';
      const lhdRhd = parts[2]?.trim() || '';
      const autoMakerName = parts[3]?.trim() || '';
      const yearStr = parts[4]?.trim() || '';
      const photoUrl = parts[5]?.trim() || '';
      const photoFile = parts[6]?.trim() || '';

      if (!name) continue;

      // Extract release year
      const yearMatch = yearStr.match(/\b(19\d\d|20\d\d)\b/);
      const releaseYear = yearMatch ? parseInt(yearMatch[1]!, 10) : undefined;

      // Resolve or create casting
      const castingName = name.split('-')[0]?.trim() || name;
      const normalizedCasting = castingName.toLowerCase();

      let [castingRow] = await db
        .select()
        .from(casting)
        .where(eq(casting.normalizedName, normalizedCasting))
        .limit(1);

      if (!castingRow) {
        [castingRow] = await db
          .insert(casting)
          .values({
            miniatureBrandId: miniGtBrandId,
            name: castingName,
            normalizedName: normalizedCasting,
          })
          .returning();
      }

      if (!castingRow) continue;

      // Check if variation already exists
      let [existingVar] = await db
        .select()
        .from(variation)
        .where(eq(variation.name, name))
        .limit(1);

      if (!existingVar) {
        // Preferred local photo path if exists
        const localPhotoUrl = photoFile
          ? `/catalog-media/Fandom/${photoFile}`
          : photoUrl;

        [existingVar] = await db
          .insert(variation)
          .values({
            castingId: castingRow.id,
            scaleId: scale64?.id,
            name,
            releaseYear,
            color: lhdRhd ? `Volante: ${lhdRhd}` : undefined,
            photoUrl: localPhotoUrl,
          })
          .returning();

        // Product identifier
        if (code && miniGtIdType && existingVar) {
          await db.insert(productIdentifier).values({
            variationId: existingVar.id,
            identifierTypeId: miniGtIdType.id,
            code,
            normalizedCode: code.toLowerCase(),
            isPrimary: true,
          }).onConflictDoNothing();
        }

        importedCount++;
      }
    }
  }

  // Process Mini GT CSV
  if (fs.existsSync(minigtCsvPath)) {
    console.log('📦 Ingesting Mini GT catalog data...');
    const content = fs.readFileSync(minigtCsvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = line.split(';');
      if (parts.length < 3) continue;

      const brandCol = parts[0]?.trim() || '';
      const name = parts[1]?.replace(/^"|"$/g, '').trim() || '';
      const code = parts[2]?.trim() || '';
      const photoUrl = parts[4]?.trim() || '';
      const photoFile = parts[5]?.trim() || '';

      if (!name || name.includes('Welcome to the new website')) continue;

      const castingName = name.split('“')[0]?.replace(/"/g, '').trim() || name;
      const normalizedCasting = castingName.toLowerCase();

      let [castingRow] = await db
        .select()
        .from(casting)
        .where(eq(casting.normalizedName, normalizedCasting))
        .limit(1);

      if (!castingRow) {
        [castingRow] = await db
          .insert(casting)
          .values({
            miniatureBrandId: miniGtBrandId,
            name: castingName,
            normalizedName: normalizedCasting,
          })
          .returning();
      }

      if (!castingRow) continue;

      let [existingVar] = await db
        .select()
        .from(variation)
        .where(eq(variation.name, name))
        .limit(1);

      if (!existingVar) {
        const localPhotoUrl = photoFile
          ? `/catalog-media/Minigt/${photoFile}`
          : photoUrl;

        [existingVar] = await db
          .insert(variation)
          .values({
            castingId: castingRow.id,
            scaleId: scale64?.id,
            name,
            edition: brandCol,
            photoUrl: localPhotoUrl,
          })
          .returning();

        if (code && miniGtIdType && existingVar) {
          await db.insert(productIdentifier).values({
            variationId: existingVar.id,
            identifierTypeId: miniGtIdType.id,
            code,
            normalizedCode: code.toLowerCase(),
            isPrimary: true,
          }).onConflictDoNothing();
        }

        importedCount++;
      }
    }
  }

  console.log(`✅ Ingested ${importedCount} miniatures into catalog!`);

  // Ingest Hot Wheels catalogs (2023-2026)
  await seedAllHotWheelsCatalogs([2023, 2024, 2025, 2026]);

  // Ingest MINI GT BRASIL catalog (1.066 miniatures + photos)
  await seedMiniGtBrasilCatalog();

  // 8. Demo Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // Demo collector
  const collectorEmail = 'colecionador@minihubcar.com.br';
  let [collector] = await db.select().from(appUser).where(eq(appUser.normalizedEmail, collectorEmail)).limit(1);
  if (!collector) {
    [collector] = await db
      .insert(appUser)
      .values({
        name: 'Carlos Colecionador',
        email: collectorEmail,
        normalizedEmail: collectorEmail,
        passwordHash,
      })
      .returning();

    const [cRole] = await db.select().from(role).where(eq(role.code, 'COLLECTOR')).limit(1);
    if (collector && cRole) {
      await db.insert(userRole).values({ userId: collector.id, roleId: cRole.id });
    }
  }

  // Demo admin
  const adminEmail = 'admin@minihubcar.com.br';
  let [admin] = await db.select().from(appUser).where(eq(appUser.normalizedEmail, adminEmail)).limit(1);
  if (!admin) {
    [admin] = await db
      .insert(appUser)
      .values({
        name: 'Administrador MiniHub',
        email: adminEmail,
        normalizedEmail: adminEmail,
        passwordHash,
      })
      .returning();

    const adminRoles = await db.select().from(role);
    if (admin) {
      for (const ar of adminRoles) {
        await db.insert(userRole).values({ userId: admin.id, roleId: ar.id });
      }
    }
  }
  console.log('✅ Demo users seeded:');
  console.log('   - Colecionador: colecionador@minihubcar.com.br / Password123!');
  console.log('   - Admin: admin@minihubcar.com.br / Password123!');

  console.log('🎉 Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await sqlClient.end();
  });
