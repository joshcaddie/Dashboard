import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed.js';

const prisma = new PrismaClient();

// Seed only when the database is empty, so redeploys never wipe live data.
async function main() {
  const count = await prisma.client.count();
  if (count > 0) {
    console.log(`Database already has ${count} clients — skipping seed.`);
    return;
  }
  console.log('Empty database — running initial seed.');
  await runSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
