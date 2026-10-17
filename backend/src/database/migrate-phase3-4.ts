import { sqlClient, db } from './client';
import { subscriptionPlan } from './schema/subscriptions';

async function migratePhase3And4() {
  console.log('🔄 Iniciando migração das tabelas das Etapas 3, 4 e Novas Melhorias...');

  // 1. Tabela custom_collectible
  await sqlClient`
    CREATE TABLE IF NOT EXISTS custom_collectible (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      manufacturer VARCHAR(150),
      franchise VARCHAR(150),
      character_or_subject VARCHAR(150),
      release_year INTEGER,
      edition VARCHAR(150),
      scale VARCHAR(50),
      condition_code VARCHAR(50) NOT NULL DEFAULT 'MINT',
      purchase_price NUMERIC(14, 2),
      purchase_location VARCHAR(255),
      acquisition_date DATE,
      location_id UUID REFERENCES location(id) ON DELETE SET NULL,
      grid_row INTEGER,
      grid_column INTEGER,
      photo_url VARCHAR(1000),
      notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_custom_collectible_user ON custom_collectible(user_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_custom_collectible_category ON custom_collectible(category);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_custom_collectible_location ON custom_collectible(location_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_custom_collectible_franchise ON custom_collectible(franchise);`;
  console.log('✅ Tabela custom_collectible verificada/criada.');

  // 2. Tabela subscription_plan
  await sqlClient`
    CREATE TABLE IF NOT EXISTS subscription_plan (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      yearly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      max_miniatures INTEGER NOT NULL,
      max_other_collectibles INTEGER NOT NULL,
      features JSONB NOT NULL DEFAULT '[]'::jsonb,
      badge VARCHAR(50) NOT NULL DEFAULT 'FREE',
      is_popular BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Tabela subscription_plan verificada/criada.');

  // 3. Tabela user_subscription
  await sqlClient`
    CREATE TABLE IF NOT EXISTS user_subscription (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES subscription_plan(id),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
      payment_method VARCHAR(50) DEFAULT 'FREE',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      auto_renew BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_subscription_plan ON user_subscription(plan_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_subscription_status ON user_subscription(status);`;
  console.log('✅ Tabela user_subscription verificada/criada.');

  // 4. Tabela feedback_suggestion
  await sqlClient`
    CREATE TABLE IF NOT EXISTS feedback_suggestion (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL DEFAULT 'FEATURE_REQUEST',
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      admin_response TEXT,
      responded_by UUID REFERENCES app_user(id),
      responded_at TIMESTAMPTZ,
      upvotes_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_feedback_suggestion_user ON feedback_suggestion(user_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_feedback_suggestion_status ON feedback_suggestion(status);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_feedback_suggestion_type ON feedback_suggestion(type);`;
  console.log('✅ Tabela feedback_suggestion verificada/criada.');

  // 4.1 Tabela user_collection_photo (Fotos da coleção física)
  await sqlClient`
    CREATE TABLE IF NOT EXISTS user_collection_photo (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      photo_url VARCHAR(1000) NOT NULL,
      caption VARCHAR(200),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      reviewed_by UUID REFERENCES app_user(id),
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT,
      sort_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_col_photo_user ON user_collection_photo(user_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_col_photo_status ON user_collection_photo(status);`;
  console.log('✅ Tabela user_collection_photo verificada/criada.');

  // 5. Tabelas direct_conversation e direct_message
  await sqlClient`
    CREATE TABLE IF NOT EXISTS direct_conversation (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      user2_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      last_message_text TEXT,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_conv_user1 ON direct_conversation(user1_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_conv_user2 ON direct_conversation(user2_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_conv_last_message ON direct_conversation(last_message_at);`;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS direct_message (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES direct_conversation(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_msg_conversation ON direct_message(conversation_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_msg_sender ON direct_message(sender_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_direct_msg_created_at ON direct_message(created_at);`;
  console.log('✅ Tabelas direct_conversation e direct_message verificadas/criadas.');

  // 6. Seed dos 4 Planos Oficiais de Assinatura (Modelo Anual Otimizado)
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
  }
  // 7. Tabelas collector_external_pre_order e external_pre_order_payment
  await sqlClient`
    CREATE TABLE IF NOT EXISTS collector_external_pre_order (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      variation_id UUID REFERENCES variation(id) ON DELETE SET NULL,
      custom_miniature_name VARCHAR(255),
      custom_brand VARCHAR(100),
      custom_scale VARCHAR(50) DEFAULT '1/64',
      custom_photo_url VARCHAR(1000),
      seller_name VARCHAR(200) NOT NULL,
      seller_contact VARCHAR(150),
      quantity INTEGER NOT NULL DEFAULT 1,
      total_amount NUMERIC(14, 2) NOT NULL,
      paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
      remaining_amount NUMERIC(14, 2) NOT NULL,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      estimated_arrival VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'RESERVED',
      tracking_code VARCHAR(100),
      tracking_carrier VARCHAR(50),
      converted_exemplar_id UUID REFERENCES collection_exemplar(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_ext_pre_order_user ON collector_external_pre_order(user_id);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_ext_pre_order_status ON collector_external_pre_order(status);`;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_ext_pre_order_variation ON collector_external_pre_order(variation_id);`;

  await sqlClient`
    CREATE TABLE IF NOT EXISTS external_pre_order_payment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pre_order_id UUID NOT NULL REFERENCES collector_external_pre_order(id) ON DELETE CASCADE,
      amount NUMERIC(14, 2) NOT NULL,
      paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
      description VARCHAR(150) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'PIX',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sqlClient`CREATE INDEX IF NOT EXISTS ix_ext_pre_order_payment_order ON external_pre_order_payment(pre_order_id);`;
  console.log('✅ Tabelas de Pré-Vendas Externas verificadas/criadas.');

  // 8. Schema evolution para Evolution API
  await sqlClient`CREATE SCHEMA IF NOT EXISTS evolution;`;
  console.log('✅ Schema evolution verificado/criado.');

  console.log('🎉 Migração concluída com 100% de sucesso!');
  process.exit(0);
}

migratePhase3And4().catch((err) => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
