import { sqlClient } from '../database/client.js';

export async function removeMaistoFromDb() {
  console.log('🧹 Limpando dados da Maisto do banco local...');

  const [brand] = await sqlClient`
    SELECT id FROM miniature_brand WHERE normalized_name = 'maisto'
  `;

  if (!brand) {
    console.log('ℹ️ Marca Maisto não encontrada no banco.');
    await sqlClient.end();
    return;
  }

  // 1. Remover product_identifier das variações de Maisto
  const deletedIdentifiers = await sqlClient`
    DELETE FROM product_identifier
    WHERE variation_id IN (
      SELECT v.id FROM variation v
      JOIN casting c ON v.casting_id = c.id
      WHERE c.miniature_brand_id = ${brand.id}
    )
  `;
  console.log(`- Identificadores removidos: ${deletedIdentifiers.count}`);

  // 2. Remover variações de Maisto
  const deletedVars = await sqlClient`
    DELETE FROM variation
    WHERE casting_id IN (
      SELECT id FROM casting WHERE miniature_brand_id = ${brand.id}
    )
  `;
  console.log(`- Variações removidas: ${deletedVars.count}`);

  // 3. Remover castings de Maisto
  const deletedCastings = await sqlClient`
    DELETE FROM casting
    WHERE miniature_brand_id = ${brand.id}
  `;
  console.log(`- Castings removidos: ${deletedCastings.count}`);

  // 4. Remover marca Maisto
  const deletedBrand = await sqlClient`
    DELETE FROM miniature_brand
    WHERE id = ${brand.id}
  `;
  console.log(`- Marca Maisto removida: ${deletedBrand.count}`);

  console.log('✅ Banco local limpo com sucesso!');
  await sqlClient.end();
}

if (process.argv[1] && process.argv[1].endsWith('clean-maisto-local.ts')) {
  removeMaistoFromDb().catch(async (e) => {
    console.error('Erro ao limpar Maisto:', e);
    await sqlClient.end();
  });
}
