import fs from 'fs';
import path from 'path';
import { ensureDatabaseInitialized } from '@/lib/db-init';

function loadLocalEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.resolve(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const databaseLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('DATABASE_URL='));

  if (databaseLine) {
    process.env.DATABASE_URL = databaseLine.slice('DATABASE_URL='.length);
  }
}

async function main() {
  loadLocalEnv();
  await ensureDatabaseInitialized();
  console.log('Database schema is ready.');
}

main().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
