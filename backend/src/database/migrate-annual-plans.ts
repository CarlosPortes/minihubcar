import { sqlClient } from './client';

async function migrateAnnualPlans() {
  console.log('🔄 Atualizando planos de assinatura para o modelo Anual...');

  const plans = [
    {
      code: 'FREE',
      name: 'Colecionador Starter',
      description: 'Ideal para iniciar a organização da sua coleção e catalogar suas primeiras estantes físicas e digitais.',
      monthlyPrice: '0.00',
      yearlyPrice: '0.00',
      maxMiniatures: 100,
      maxOtherCollectibles: 15,
      features: [
        'Até 100 miniaturas diecast 1:64',
        'Até 15 outros colecionáveis (Funkos/Resinas)',
        'Mapeamento físico de prateleiras e estantes',
        'Upload de fotos da coleção física',
        'Acesso à Vitrine da Comunidade e Marketplace',
      ],
      badge: 'STARTER',
      isPopular: false,
      sortOrder: 1,
    },
    {
      code: 'PRO',
      name: 'Garagem Pro',
      description: 'O plano favorito dos colecionadores ativos. Espaço ideal para múltiplas estantes e gestão patrimonial.',
      monthlyPrice: '5.90',
      yearlyPrice: '49.90',
      maxMiniatures: 600,
      maxOtherCollectibles: 50,
      features: [
        'Até 600 miniaturas diecast 1:64 (6x mais capacidade)',
        'Até 50 outros colecionáveis (Funkos/Resinas)',
        'Relatórios patrimoniais de compras, vendas e valorização',
        'Exportação ilimitada em Excel / CSV',
        'Selo Pro destacado no perfil e vitrine',
        'Carga e importação em lote via templates CSV',
      ],
      badge: 'PRO',
      isPopular: true,
      sortOrder: 2,
    },
    {
      code: 'MASTER',
      name: 'Curador Master',
      description: 'Capacidade expandida para curadores de grandes acervos temáticos, caixas fechadas e coleções completas.',
      monthlyPrice: '8.90',
      yearlyPrice: '79.90',
      maxMiniatures: 1500,
      maxOtherCollectibles: 100,
      features: [
        'Até 1.500 miniaturas diecast 1:64',
        'Até 100 outros colecionáveis',
        'Prioridade na fila de aprovação de fotos e novos castings',
        'Selo Master dourado no perfil',
        'Estatísticas avançadas de valorização do acervo',
        'Acesso antecipado a novos módulos e recursos',
      ],
      badge: 'MASTER',
      isPopular: false,
      sortOrder: 3,
    },
    {
      code: 'LEGEND',
      name: 'Legend VIP Ilimitado',
      description: 'Acesso definitivo sem limites de acervo, suporte VIP prioritário e destaque máximo no MiniHub Car.',
      monthlyPrice: '12.90',
      yearlyPrice: '119.90',
      maxMiniatures: -1, // Ilimitado
      maxOtherCollectibles: -1, // Ilimitado
      features: [
        'Miniaturas Diecast ILIMITADAS (sem teto de cadastro)',
        'Outros Colecionáveis ILIMITADOS',
        'Selo Legend VIP Dourado exclusivo',
        'Destaque no topo da Vitrine da Comunidade',
        'Canal direto com os desenvolvedores & feedback prioritário',
        'Acesso antecipado a recursos de IA e novidades',
      ],
      badge: 'VIP',
      isPopular: false,
      sortOrder: 4,
    },
  ];

  for (const p of plans) {
    await sqlClient`
      INSERT INTO subscription_plan (
        code, name, description, monthly_price, yearly_price, max_miniatures, max_other_collectibles, features, badge, is_popular, sort_order
      ) VALUES (
        ${p.code}, ${p.name}, ${p.description}, ${p.monthlyPrice}, ${p.yearlyPrice}, ${p.maxMiniatures}, ${p.maxOtherCollectibles}, ${JSON.stringify(p.features)}::jsonb, ${p.badge}, ${p.isPopular}, ${p.sortOrder}
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        monthly_price = EXCLUDED.monthly_price,
        yearly_price = EXCLUDED.yearly_price,
        max_miniatures = EXCLUDED.max_miniatures,
        max_other_collectibles = EXCLUDED.max_other_collectibles,
        features = EXCLUDED.features,
        badge = EXCLUDED.badge,
        is_popular = EXCLUDED.is_popular,
        sort_order = EXCLUDED.sort_order;
    `;
    console.log(`✅ Plano [${p.code}] atualizado: Anual R$ ${p.yearlyPrice} | Limite: ${p.maxMiniatures === -1 ? 'Ilimitado' : p.maxMiniatures} minis`);
  }

  console.log('🎉 Migração dos Planos Anuais concluída com sucesso!');
  process.exit(0);
}

migrateAnnualPlans().catch((err) => {
  console.error('❌ Erro na migração dos planos anuais:', err);
  process.exit(1);
});
