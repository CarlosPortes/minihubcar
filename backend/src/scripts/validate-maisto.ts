import { sqlClient } from '../database/client.js';

async function validateMaisto() {
  console.log('\n🔍 ========================================================');
  console.log('   VALIDAÇÃO DO CATÁLOGO MAISTO NO BANCO LOCAL');
  console.log('========================================================\n');

  // 1. Marca Maisto
  const brand = await sqlClient`
    SELECT id, name, normalized_name, status, description
    FROM miniature_brand
    WHERE normalized_name = 'maisto'
  `;

  if (brand.length === 0) {
    console.log('❌ Marca Maisto NÃO encontrada no banco!');
    await sqlClient.end();
    return;
  }

  const b = brand[0]!;
  console.log(`✅ Marca: ${b.name} (Status: ${b.status}, ID: ${b.id})`);
  console.log(`   Descrição: ${b.description}`);

  // 2. Totais de Castings e Variações
  const [castingCount] = await sqlClient`
    SELECT count(*)::int as total
    FROM casting
    WHERE miniature_brand_id = ${b.id}
  `;

  const [variationCount] = await sqlClient`
    SELECT count(*)::int as total
    FROM variation v
    JOIN casting c ON v.casting_id = c.id
    WHERE c.miniature_brand_id = ${b.id}
  `;

  const [withPhotoCount] = await sqlClient`
    SELECT count(*)::int as total
    FROM variation v
    JOIN casting c ON v.casting_id = c.id
    WHERE c.miniature_brand_id = ${b.id}
      AND v.photo_url IS NOT NULL
      AND v.photo_url != ''
  `;

  const totalCastings = Number(castingCount?.total ?? 0);
  const totalVariations = Number(variationCount?.total ?? 0);
  const totalWithPhoto = Number(withPhotoCount?.total ?? 0);
  const photoPct = totalVariations > 0 ? Math.round((totalWithPhoto / totalVariations) * 100) : 0;

  console.log(`\n📊 Estatísticas Gerais:`);
  console.log(`   - Total de Castings (Modelos Base): ${totalCastings}`);
  console.log(`   - Total de Variações Cadastradas:   ${totalVariations}`);
  console.log(`   - Variações com Foto CDN:          ${totalWithPhoto} (${photoPct}%)`);

  // 3. Top Montadoras
  const automakers = await sqlClient`
    SELECT coalesce(a.name, 'Maisto Original / Outro') as automaker_name, count(v.id)::int as total_variacoes
    FROM variation v
    JOIN casting c ON v.casting_id = c.id
    LEFT JOIN automaker a ON c.automaker_id = a.id
    WHERE c.miniature_brand_id = ${b.id}
    GROUP BY coalesce(a.name, 'Maisto Original / Outro')
    ORDER BY total_variacoes DESC
    LIMIT 10
  `;

  console.log(`\n🏎️ Top 10 Montadoras no Catálogo Maisto:`);
  console.table(automakers);

  // 4. Modelos das fotos do usuário
  console.log('\n📸 Verificando os Modelos das Fotos Enviadas:');

  // Modelo 1: 1982 Pontiac Firebird
  const firebirds = await sqlClient`
    SELECT 
      v.name,
      coalesce(a.name, 'Pontiac') as automaker,
      v.release_year,
      v.color,
      v.description,
      v.photo_url
    FROM variation v
    JOIN casting c ON v.casting_id = c.id
    LEFT JOIN automaker a ON c.automaker_id = a.id
    WHERE c.miniature_brand_id = ${b.id}
      AND c.name ILIKE '%Firebird%'
    ORDER BY v.release_year NULLS LAST
    LIMIT 6
  `;

  console.log('\n--- 1. Pontiac Firebird Trans Am (Foto 1) ---');
  for (const f of firebirds) {
    console.log(`   * [${f.release_year || 'S/A'}] ${f.name} | Cor: ${f.color || 'Padrão'} | Foto: ${f.photo_url ? 'Sim (CDN)' : 'Não'}`);
    console.log(`     Desc: ${f.description}`);
  }

  // Modelo 2: Audi A8
  const audis = await sqlClient`
    SELECT 
      v.name,
      coalesce(a.name, 'Audi') as automaker,
      v.release_year,
      v.color,
      v.description,
      v.photo_url
    FROM variation v
    JOIN casting c ON v.casting_id = c.id
    LEFT JOIN automaker a ON c.automaker_id = a.id
    WHERE c.miniature_brand_id = ${b.id}
      AND (c.name ILIKE '%Audi A8%' OR v.name ILIKE '%Audi A8%')
    ORDER BY v.release_year NULLS LAST
  `;

  console.log('\n--- 2. Audi A8 (Foto 2) ---');
  for (const a of audis) {
    console.log(`   * [${a.release_year || 'S/A'}] ${a.name} | Cor: ${a.color} | Foto: ${a.photo_url ? 'Sim (CDN)' : 'Não'}`);
    console.log(`     Desc: ${a.description}`);
    console.log(`     URL Foto: ${a.photo_url}`);
  }

  console.log('\n🏁 ========================================================');
  console.log('   VALIDAÇÃO LOCAL CONCLUÍDA COM SUCESSO!');
  console.log('========================================================\n');

  await sqlClient.end();
}

validateMaisto().catch(async (e) => {
  console.error('Erro na validação:', e);
  await sqlClient.end();
});
