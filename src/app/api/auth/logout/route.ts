import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, clearSessionCookie, deleteSessionByToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    await deleteSessionByToken(token);

    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    const response = NextResponse.json({ error: '退出登录失败' }, { status: 500 });
    clearSessionCookie(response);
    return response;
  }
}
