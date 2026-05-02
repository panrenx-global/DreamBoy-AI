import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookie,
  createSession,
  createUser,
  findUserByUsername,
  sanitizeUser,
} from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import {
  isTurnstileConfigured,
  isTurnstileEnabled,
  verifyTurnstileToken,
} from '@/lib/turnstile';

export const runtime = 'nodejs';

function getRequestIp(request: NextRequest) {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const { username, password, confirmPassword, turnstileToken } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';
    const normalizedConfirmPassword = typeof confirmPassword === 'string' ? confirmPassword : '';
    const normalizedTurnstileToken = typeof turnstileToken === 'string' ? turnstileToken.trim() : '';

    if (!normalizedUsername) {
      return NextResponse.json({ error: '请输入用户名' }, { status: 400 });
    }

    if (normalizedUsername.length > 50) {
      return NextResponse.json({ error: '用户名不能超过 50 个字符' }, { status: 400 });
    }

    if (normalizedPassword.length < 6) {
      return NextResponse.json({ error: '密码不能低于 6 位' }, { status: 400 });
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
    }

    const existedUser = await findUserByUsername(normalizedUsername);

    if (existedUser) {
      return NextResponse.json({ error: '用户名已存在，请直接登录' }, { status: 409 });
    }

    if (isTurnstileEnabled()) {
      if (!isTurnstileConfigured()) {
        return NextResponse.json({ error: '人机验证配置不完整，请稍后再试' }, { status: 500 });
      }

      if (!normalizedTurnstileToken) {
        return NextResponse.json({ error: '请先完成人机验证' }, { status: 400 });
      }

      const verificationResult = await verifyTurnstileToken(
        normalizedTurnstileToken,
        getRequestIp(request),
      );

      if (!verificationResult.success) {
        return NextResponse.json({ error: '人机验证失败，请重试' }, { status: 400 });
      }
    }

    const user = await createUser(normalizedUsername, normalizedPassword);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });

    applySessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    console.error('Register API error:', error);

    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: '用户名已存在，请直接登录' }, { status: 409 });
    }

    return NextResponse.json({ error: '注册失败，请稍后再试' }, { status: 500 });
  }
}
