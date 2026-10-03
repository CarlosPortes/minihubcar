import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:cmbp034349@localhost:5432/minihub_car';
const sql = postgres(connectionString);

async function main() {
  try {
    const migrationFile = path.resolve(process.cwd(), 'drizzle/0012_add_seller_addresses_and_shipping.sql');
    console.log('Reading migration file:', migrationFile);
    const content = fs.readFileSync(migrationFile, 'utf8');
    await sql.unsafe(content);
    console.log('Migration 0012 executed successfully!');

    const tableCheck = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'seller_shipping_address'
    `;
    console.log('seller_shipping_address table:', tableCheck);

    const sellerCols = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'seller_profile' AND column_name IN ('postal_code', 'street', 'number', 'neighborhood', 'phone')
    `;
    console.log('seller_profile columns:', sellerCols.map((c: any) => c.column_name));

    const offerCols = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'offer' AND column_name IN ('package_weight_grams', 'shipping_address_id')
    `;
    console.log('offer columns:', offerCols.map((c: any) => c.column_name));
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
