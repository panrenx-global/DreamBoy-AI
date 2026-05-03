import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

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
  const emailId = process.argv[2];

  if (!emailId) {
    throw new Error('Usage: pnpm email-status <email-id>');
  }

  const apiKey = process.env.RESEND_API_KEY || '';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.get(emailId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log(JSON.stringify(result.data, null, 2));
}

main().catch((error) => {
  console.error('Failed to fetch email status:', error);
  process.exit(1);
});
