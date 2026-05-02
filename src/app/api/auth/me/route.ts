import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getSessionUserFromRequest(request);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get current user API error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
