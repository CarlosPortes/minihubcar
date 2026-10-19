import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://minihub_admin:MiniHubCar_SuperSenhaPostgres_2026@127.0.0.1:5434/minihub_car';
console.log('Conectando ao banco de producao...');

// max: 1 é essencial para scripts SQL com BEGIN/COMMIT manuais
const sql = postgres(databaseUrl, { max: 1 });

async function run() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'deploy/update_catalog_complete_prod.sql'),
    path.resolve(process.cwd(), 'update_catalog_complete_prod.sql'),
    path.resolve(process.cwd(), '../deploy/update_catalog_complete_prod.sql'),
    path.resolve(process.cwd(), 'deploy/update_catalog_hw_prod.sql'),
    path.resolve(process.cwd(), 'update_catalog_hw_prod.sql'),
    '/app/deploy/update_catalog_complete_prod.sql',
    '/app/deploy/update_catalog_hw_prod.sql',
    '/var/www/minihubcar/deploy/update_catalog_complete_prod.sql',
  ];

  const sqlFile = possiblePaths.find(p => fs.existsSync(p));
  if (!sqlFile) {
    throw new Error('Arquivo SQL nao encontrado em nenhum dos caminhos esperados:\n' + possiblePaths.join('\n'));
  }

  console.log('Lendo script SQL:', sqlFile);
  const content = fs.readFileSync(sqlFile, 'utf-8');
  console.log('Executando atualizacoes no banco de producao (transacao segura)...');
  await sql.unsafe(content);
  console.log('✅ Catalogo completo e Miniaturas sincronizados com sucesso em producao!');
  await sql.end();
}

run().catch(err => {
  console.error('❌ Erro ao atualizar catalogo:', err);
  process.exit(1);
});
