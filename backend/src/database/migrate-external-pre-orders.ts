import { sqlClient } from './client.js';

async function migrateExternalPreOrders() {
  console.log('🔄 Criando tabelas para Pré-Vendas Externas do Colecionador...');

  try {
    // 1. Tabela collector_external_pre_order
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

    console.log('✅ Tabela collector_external_pre_order criada/verificada.');

    // 2. Tabela external_pre_order_payment
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

    console.log('✅ Tabela external_pre_order_payment criada/verificada.');
    console.log('🎉 Migração de pré-vendas externas concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração de pré-vendas externas:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

migrateExternalPreOrders();
