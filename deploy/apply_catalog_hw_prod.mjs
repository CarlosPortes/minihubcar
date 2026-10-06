import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://minihub_admin:MiniHubCar_SuperSenhaPostgres_2026@127.0.0.1:5434/minihub_car';
console.log('Conectando ao banco de dados...');
const sql = postgres(databaseUrl);

async function run() {
  const sqlFile = path.resolve(process.cwd(), 'deploy/update_catalog_hw_prod.sql');
  console.log('Lendo script SQL:', sqlFile);
  const content = fs.readFileSync(sqlFile, 'utf-8');
  console.log('Executando atualizacoes no banco de producao...');
  await sql.unsafe(content);
  console.log('✅ Catalogo atualizado com sucesso em producao!');
  await sql.end();
}

run().catch(err => {
  console.error('Erro ao atualizar catalogo:', err);
  process.exit(1);
});