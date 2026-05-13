import { sendInactiveUserRecallToAll } from '@/lib/email';
import { after, NextRequest, NextResponse } from 'next/server';

declare global {
  var __dreamboyInactiveRecallCronRun:
    | {
        runId: string;
        startedAt: string;
        force: boolean;
        targetEmail: string | null;
        inactiveDays: number;
      }
    | undefined;
}

function isTruthyParam(value: string | null) {
  return value === 'true' || value === '1' || value === 'yes';
}

function getInactiveDays(value: string | null) {
  const parsed = Number(value || process.env.RECALL_INACTIVE_DAYS || 3);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.max(1, Math.floor(parsed));
}

function startInactiveRecallCronRun(options: {
  force: boolean;
  targetEmail?: string;
  inactiveDays: number;
}) {
  const activeRun = globalThis.__dreamboyInactiveRecallCronRun;

  if (activeRun) {
    return {
      started: false as const,
      activeRun: {
        startedAt: activeRun.startedAt,
        force: activeRun.force,
        targetEmail: activeRun.targetEmail,
        inactiveDays: activeRun.inactiveDays,
      },
    };
  }

  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  globalThis.__dreamboyInactiveRecallCronRun = {
    runId,
    startedAt,
    force: options.force,
    targetEmail: options.targetEmail?.trim().toLowerCase() || null,
    inactiveDays: options.inactiveDays,
  };

  return {
    started: true as const,
    startedAt,
    runId,
  };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const force = isTruthyParam(request.nextUrl.searchParams.get('force'));
  const wait = isTruthyParam(request.nextUrl.searchParams.get('wait'));
  const targetEmail = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || undefined;
  const inactiveDays = getInactiveDays(request.nextUrl.searchParams.get('inactiveDays'));

  if (!cronSecret) {
    console.error('[cron/recall-inactive-users] CRON_SECRET is not configured');
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
    console.warn('[cron/recall-inactive-users] Unauthorized cron request', diagnostics);
    return NextResponse.json(
      {
        error: '未授权访问',
        diagnostics,
      },
      { status: 401 },
    );
  }

  try {
    console.log('[cron/recall-inactive-users] request accepted', {
      authSource,
      force,
      wait,
      targetEmail: targetEmail || null,
      inactiveDays,
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!wait) {
      const run = startInactiveRecallCronRun({
        force,
        targetEmail,
        inactiveDays,
      });

      if (!run.started) {
        return NextResponse.json({
          success: true,
          queued: false,
          message: '已有未登录用户召回任务正在执行',
          authSource,
          time: new Date().toISOString(),
          activeRun: run.activeRun,
        });
      }

      after(async () => {
        try {
          const summary = await sendInactiveUserRecallToAll({
            force,
            targetEmail,
            inactiveDays,
          });
          const logPayload = {
            trigger: 'api-background',
            ...summary,
          };

          if (summary.failed > 0) {
            console.error(
              '[cron/recall-inactive-users] background run finished with failures',
              logPayload,
            );
            return;
          }

          if (summary.sent === 0) {
            console.warn(
              '[cron/recall-inactive-users] background run finished without sending any emails',
              logPayload,
            );
            return;
          }

          console.log('[cron/recall-inactive-users] background run finished', logPayload);
        } catch (error) {
          console.error('[cron/recall-inactive-users] background run failed', error);
        } finally {
          if (globalThis.__dreamboyInactiveRecallCronRun?.runId === run.runId) {
            globalThis.__dreamboyInactiveRecallCronRun = undefined;
          }
        }
      });

      return NextResponse.json(
        {
          success: true,
          queued: true,
          message: '未登录用户召回任务已启动，正在后台处理',
          authSource,
          time: new Date().toISOString(),
          startedAt: run.startedAt,
        },
        { status: 202 },
      );
    }

    const summary = await sendInactiveUserRecallToAll({
      force,
      targetEmail,
      inactiveDays,
    });

    const logPayload = {
      authSource,
      ...summary,
    };

    if (summary.failed > 0) {
      console.error('[cron/recall-inactive-users] run finished with failures', logPayload);
      return NextResponse.json(
        {
          success: false,
          message: '未登录用户召回存在失败记录',
          authSource,
          time: new Date().toISOString(),
          summary,
        },
        { status: 500 },
      );
    }

    if (summary.sent === 0) {
      console.warn('[cron/recall-inactive-users] run finished without sending any emails', logPayload);
    } else {
      console.log('[cron/recall-inactive-users] run finished', logPayload);
    }

    return NextResponse.json({
      success: true,
      message: '未登录用户召回完成',
      authSource,
      time: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error('未登录用户召回失败：', error);

    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}
