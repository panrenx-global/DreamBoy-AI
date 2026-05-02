import { withDbClient } from '@/lib/db';

type RateLimitOptions = {
  scope: string;
  actorKey: string;
  maxRequests: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function consumeRateLimit({
  scope,
  actorKey,
  maxRequests,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const safeMaxRequests = Math.max(1, Math.floor(maxRequests));
  const safeWindowSeconds = Math.max(1, Math.floor(windowSeconds));

  return withDbClient(async (client) => {
    await client.query('begin');

    try {
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [`${scope}:${actorKey}`]);

      await client.query(
        `
          delete from rate_limit_events
          where created_at < now() - interval '1 day'
        `,
      );

      const countResult = await client.query<{ count: string }>(
        `
          select count(*)::text as count
          from rate_limit_events
          where scope = $1
            and actor_key = $2
            and created_at >= now() - ($3 * interval '1 second')
        `,
        [scope, actorKey, safeWindowSeconds],
      );

      const currentCount = Number(countResult.rows[0]?.count || '0');

      if (currentCount >= safeMaxRequests) {
        await client.query('rollback');
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: safeWindowSeconds,
        };
      }

      await client.query(
        `
          insert into rate_limit_events (scope, actor_key)
          values ($1, $2)
        `,
        [scope, actorKey],
      );

      await client.query('commit');

      return {
        allowed: true,
        remaining: Math.max(0, safeMaxRequests - currentCount - 1),
        retryAfterSeconds: 0,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

export function getRequestIp(headers: Headers) {
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return 'unknown';
}
