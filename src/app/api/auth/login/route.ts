import { NextRequest, NextResponse } from 'next/server';
import {
  applySessionCookie,
  createSession,
  findUserByUsername,
  sanitizeUser,
  verifyPassword,
} from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!normalizedUsername || !normalizedPassword) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    if (normalizedUsername.length > 50) {
      return NextResponse.json({ error: '用户名不能超过 50 个字符' }, { status: 400 });
    }

    const user = await findUserByUsername(normalizedUsername);

    if (!user || !(await verifyPassword(normalizedPassword, user.password_hash))) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user) });

    applySessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: '登录失败，请稍后再试' }, { status: 500 });
  }
}
