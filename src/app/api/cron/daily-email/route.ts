import { sendDailyLoveLetterToAll } from '@/lib/email';
import { after, NextRequest, NextResponse } from 'next/server';

declare global {
  var __dreamboyDailyEmailCronRun:
    | {
        runId: string;
        startedAt: string;
        force: boolean;
        targetEmail: string | null;
      }
    | undefined;
}

function isTruthyParam(value: string | null) {
  return value === 'true' || value === '1' || value === 'yes';
}

function startDailyEmailCronRun(options: { force: boolean; targetEmail?: string }) {
  const activeRun = globalThis.__dreamboyDailyEmailCronRun;

  if (activeRun) {
    return {
      started: false as const,
      activeRun: {
        startedAt: activeRun.startedAt,
        force: activeRun.force,
        targetEmail: activeRun.targetEmail,
      },
    };
  }

  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  globalThis.__dreamboyDailyEmailCronRun = {
    runId,
    startedAt,
    force: options.force,
    targetEmail: options.targetEmail?.trim().toLowerCase() || null,
  };

  return {
    started: true as const,
    startedAt,
    runId,
  };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const forceParam = request.nextUrl.searchParams.get('force');
  const force = isTruthyParam(forceParam);
  const wait = isTruthyParam(request.nextUrl.searchParams.get('wait'));
  const targetEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || undefined;

  if (!cronSecret) {
    console.error('[cron/daily-email] CRON_SECRET is not configured');
    return NextResponse.json({ error: '服务端未配置 CRON_SECRET' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const queryToken = request.nextUrl.searchParams.get('secret')?.trim() || null;
  const customHeaderToken = request.headers.get('x-cron-secret')?.trim() || null;
  const authSource = headerToken
    ? 'authorization-bearer'
    : customHeaderToken
      ? 'x-cron-secret'
      : queryToken
        ? 'query-secret'
        : 'missing';
  const providedToken = headerToken || customHeaderToken || queryToken;
  const diagnostics = {
    authSource,
    hasAuthorizationBearer: Boolean(headerToken),
    hasXCronSecret: Boolean(customHeaderToken),
    hasSecretQuery: Boolean(queryToken),
    userAgent: request.headers.get('user-agent') || 'unknown',
  };

  if (providedToken !== cronSecret) {
    console.warn('[cron/daily-email] Unauthorized cron request', diagnostics);
    return NextResponse.json(
      {
        error: '未授权访问',
        diagnostics,
      },
      { status: 401 },
    );
  }

  try {
    console.log('[cron/daily-email] request accepted', {
      authSource,
      force,
      wait,
      targetEmail: targetEmail || null,
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!wait) {
      const run = startDailyEmailCronRun({
        force,
        targetEmail,
      });

      if (!run.started) {
        return NextResponse.json({
          success: true,
          queued: false,
          message: '已有每日情话发送任务正在执行',
          authSource,
          time: new Date().toISOString(),
          activeRun: run.activeRun,
        });
      }

      after(async () => {
        try {
          const summary = await sendDailyLoveLetterToAll({
            force,
            targetEmail,
          });
          const logPayload = {
            trigger: 'api-background',
            ...summary,
          };

          if (summary.failed > 0) {
            console.error('[cron/daily-email] background run finished with failures', logPayload);
            return;
          }

          if (summary.sent === 0) {
            console.warn('[cron/daily-email] background run finished without sending any emails', logPayload);
            return;
          }

          console.log('[cron/daily-email] background run finished', logPayload);
        } catch (error) {
          console.error('[cron/daily-email] background run failed', error);
        } finally {
          if (globalThis.__dreamboyDailyEmailCronRun?.runId === run.runId) {
            globalThis.__dreamboyDailyEmailCronRun = undefined;
          }
        }
      });

      return NextResponse.json(
        {
          success: true,
          queued: true,
          message: '每日情话发送任务已启动，正在后台处理',
          authSource,
          time: new Date().toISOString(),
          startedAt: run.startedAt,
        },
        { status: 202 },
      );
    }

    const summary = await sendDailyLoveLetterToAll({
      force,
      targetEmail,
    });

    const logPayload = {
      authSource,
      ...summary,
    };

    if (summary.failed > 0) {
      console.error('[cron/daily-email] run finished with failures', logPayload);
      return NextResponse.json(
        {
          success: false,
          message: '每日情话发送存在失败记录',
          authSource,
          time: new Date().toISOString(),
          summary,
        },
        { status: 500 },
      );
    }

    if (summary.sent === 0) {
      console.warn('[cron/daily-email] run finished without sending any emails', logPayload);
    } else {
      console.log('[cron/daily-email] run finished', logPayload);
    }

    return NextResponse.json({
      success: true,
      message: '每日情话发送完成',
      authSource,
      time: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error('每日情话发送失败：', error);

    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
