import { sqlClient } from './client';
import { seedHotWheelsYear } from './seed-hw-catalogs';

export async function seedHotWheels2026() {
  return seedHotWheelsYear(2026);
}

// Run directly if called as a script
if (process.argv[1] && process.argv[1].endsWith('seed-hw-2026.ts')) {
  seedHotWheels2026()
    .then(async () => {
      console.log('✅ Seed HW 2026 completed successfully!');
      await sqlClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Error during HW 2026 seed:', err);
      await sqlClient.end();
      process.exit(1);
    });
}
