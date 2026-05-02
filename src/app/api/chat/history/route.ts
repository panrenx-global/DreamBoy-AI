import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { getThreadForUser, listThreadMessages, mapChatMessageRow } from '@/lib/chat-store';
import type { ChatHistoryResponse } from '@/types/chat';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId')?.trim();

    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    const threadId = await getThreadForUser(user.id, characterId);

    if (!threadId) {
      const response: ChatHistoryResponse = { threadId: null, messages: [] };
      return NextResponse.json(response);
    }

    const messages = await listThreadMessages(threadId);
    const response: ChatHistoryResponse = {
      threadId,
      messages: messages.map((message) => mapChatMessageRow(message)),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 });
  }
}
