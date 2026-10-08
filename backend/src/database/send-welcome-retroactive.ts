import { CommunityService } from '../modules/community/community.service.js';
import { sqlClient } from './client.js';

async function main() {
  console.log('🚀 Iniciando envio retroativo de mensagens de boas-vindas...');
  try {
    const communityService = new CommunityService();
    const result = await communityService.sendRetroactiveWelcomeMessages();

    console.log('----------------------------------------------------');
    console.log(`✅ Concluído com sucesso!`);
    console.log(`👤 Remetente utilizado: ${result.sender.name} (${result.sender.id})`);
    console.log(`👥 Total de usuários ativos avaliados: ${result.totalUsers}`);
    console.log(`✉️  Mensagens de boas-vindas enviadas: ${result.sentCount}`);
    console.log(`⏩ Mensagens ignoradas (já possuíam conversa): ${result.skippedCount}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ Erro durante envio retroativo:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

main();
