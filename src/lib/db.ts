import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  var __dreamboyDbPool: Pool | undefined;
}

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    const hasLibpqCompat = url.searchParams.has('uselibpqcompat');

    if (
      !hasLibpqCompat &&
      (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca')
    ) {
      url.searchParams.set('uselibpqcompat', 'true');
      return url.toString();
    }
  } catch {
    // Fall back to the raw connection string if URL parsing fails.
  }

  return connectionString;
}

function createPool() {
  const rawConnectionString = process.env.DATABASE_URL;

  if (!rawConnectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const connectionString = normalizeConnectionString(rawConnectionString);

  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

export function getDb() {
  if (!globalThis.__dreamboyDbPool) {
    globalThis.__dreamboyDbPool = createPool();
  }

  return globalThis.__dreamboyDbPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return getDb().query<T>(text, params);
}

export async function withDbClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getDb().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}
