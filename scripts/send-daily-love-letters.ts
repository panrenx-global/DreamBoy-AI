import fs from 'fs';
import path from 'path';
import { sendDailyLoveLetterToAll } from '@/lib/email';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
}

async function main() {
  loadLocalEnv();
  const force = process.argv.includes('--force');
  const summary = await sendDailyLoveLetterToAll({ force });
  console.log('Daily love letter summary:', summary);
}

main().catch((error) => {
  console.error('Failed to send daily love letters:', error);
  process.exit(1);
});
