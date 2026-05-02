import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  var __dreamboyDbPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

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
