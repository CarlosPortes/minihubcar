import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './client';
import {
  appUser,
  role,
  userRole,
  conditionType,
  scale,
  identifierType,
} from './schema';

export async function seedProdInit() {
  console.log('🚀 Inicializando banco de dados para PRODUÇÃO MiniHub Car...');

  // 1. Roles do Sistema
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
  console.log('✅ Roles do sistema criadas.');

  // 2. Tipos de Condição das Miniaturas
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
  console.log('✅ Tipos de condição criados.');

  // 3. Escalas Padrão
  const scales = [
    { name: '1:64', numerator: 1, denominator: 64, normalizedValue: (1 / 64).toFixed(6) },
    { name: '1:43', numerator: 1, denominator: 43, normalizedValue: (1 / 43).toFixed(6) },
    { name: '1:32', numerator: 1, denominator: 32, normalizedValue: (1 / 32).toFixed(6) },
    { name: '1:24', numerator: 1, denominator: 24, normalizedValue: (1 / 24).toFixed(6) },
    { name: '1:18', numerator: 1, denominator: 18, normalizedValue: (1 / 18).toFixed(6) },
  ];

  for (const s of scales) {
    const existing = await db.select().from(scale).where(eq(scale.name, s.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(scale).values(s);
    }
  }
  console.log('✅ Escalas criadas.');

  // 4. Tipos de Identificador de Código
  const idTypes = [
    { code: 'SKU', name: 'Stock Keeping Unit (SKU)' },
    { code: 'UPC', name: 'Universal Product Code (UPC)' },
    { code: 'EAN', name: 'European Article Number (EAN)' },
  ];

  for (const it of idTypes) {
    const existing = await db.select().from(identifierType).where(eq(identifierType.code, it.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(identifierType).values(it);
    }
  }
  console.log('✅ Tipos de identificador criados.');

  // 5. Super Usuário (Admin com todas as permissões)
  const adminEmail = 'admin@minihubcar.com.br';
  const passwordHash = await bcrypt.hash('Password123!', 10);

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

    const allRoles = await db.select().from(role);
    if (admin) {
      for (const r of allRoles) {
        await db.insert(userRole).values({ userId: admin.id, roleId: r.id });
      }
    }
  } else {
    // Garante que o admin existente possua todas as roles
    const allRoles = await db.select().from(role);
    for (const r of allRoles) {
      const hasRole = await db
        .select()
        .from(userRole)
        .where(eq(userRole.userId, admin.id))
        .limit(1);
      if (hasRole.length === 0) {
        await db.insert(userRole).values({ userId: admin.id, roleId: r.id });
      }
    }
  }

  console.log('👑 Super Usuário pronto com todas as permissões de administração:');
  console.log(`   - E-mail: ${adminEmail}`);
  console.log(`   - Senha:  Password123!`);
  console.log('🎉 Banco de dados pronto para PRODUÇÃO sem cadastros fictícios!');
}

seedProdInit()
  .catch((e) => {
    console.error('❌ Erro na inicialização de produção:', e);
    process.exit(1);
  })
  .then(() => process.exit(0));
