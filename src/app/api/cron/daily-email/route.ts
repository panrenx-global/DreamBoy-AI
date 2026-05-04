import { sendDailyLoveLetterToAll } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const forceParam = request.nextUrl.searchParams.get('force');
  const force =
    forceParam === 'true' || forceParam === '1' || forceParam === 'yes';
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
      targetEmail: targetEmail || null,
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

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
