import { sqlClient } from '../database/client.js';

async function resetCommercial() {
  console.log('🧹 Limpando dados comerciais e ofertas antigas...');

  // 1. Limpar parcelas e pré-vendas
  await sqlClient`DELETE FROM pre_order_installment`;
  await sqlClient`DELETE FROM pre_order`;

  // 2. Limpar itens de pedidos e pedidos
  await sqlClient`DELETE FROM order_item`;
  await sqlClient`DELETE FROM "order"`;

  // 3. Limpar carrinho e itens do carrinho
  await sqlClient`DELETE FROM cart_item`;
  await sqlClient`DELETE FROM cart`;

  // 4. Limpar reservas e movimentações de estoque
  await sqlClient`DELETE FROM stock_reservation`;
  await sqlClient`DELETE FROM inventory_movement`;
  await sqlClient`DELETE FROM commercial_inventory`;

  // 5. Limpar histórico de preços e ofertas
  await sqlClient`DELETE FROM offer_price_history`;
  await sqlClient`DELETE FROM offer`;
  await sqlClient`DELETE FROM commercial_product`;

  console.log('✅ Todas as ofertas, pedidos e pré-vendas foram excluídos com sucesso!');

  // Contagens para verificação
  const [offers] = await sqlClient`SELECT count(*)::int as count FROM offer`;
  const [orders] = await sqlClient`SELECT count(*)::int as count FROM "order"`;
  const [preOrders] = await sqlClient`SELECT count(*)::int as count FROM pre_order`;

  console.log(`📊 Status Atual pós-limpeza:`);
  console.log(`- Ofertas: ${offers?.count ?? 0}`);
  console.log(`- Pedidos: ${orders?.count ?? 0}`);
  console.log(`- Pré-vendas: ${preOrders?.count ?? 0}`);

  process.exit(0);
}

resetCommercial().catch((err) => {
  console.error('❌ Erro durante a limpeza:', err);
  process.exit(1);
});
