import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One-time, idempotent rename of the two sensitive columns to obscured names,
// preserving their existing data. Runs BEFORE `prisma db push` so the push sees
// the schema already matching (no destructive drop/add). Safe to run every boot:
// the guards make it a no-op once renamed, or on a fresh/empty database.
async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'domainUser')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'in7777') THEN
        ALTER TABLE "Client" RENAME COLUMN "domainUser" TO "in7777";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'domainPassEnc')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'p777777') THEN
        ALTER TABLE "Client" RENAME COLUMN "domainPassEnc" TO "p777777";
      END IF;
    END $$;
  `);
  console.log('premigrate: sensitive columns reconciled.');
}

main()
  .catch((e) => { console.error('premigrate failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
