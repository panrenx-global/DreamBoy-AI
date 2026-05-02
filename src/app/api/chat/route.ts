import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getSessionUserFromRequest } from '@/lib/auth';
import { mapCharacterRow } from '@/lib/characters';
import { query } from '@/lib/db';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import {
  getOrCreateThread,
  insertThreadMessage,
  listRecentTextMessages,
  mapChatMessageRow,
  updateThreadLastMessage,
} from '@/lib/chat-store';
import type { ChatResponse } from '@/types/chat';
import { parseReply } from '@/utils/parseReply';

export const runtime = 'nodejs';
export const maxDuration = 30;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ArkChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

async function invokeChatModel(messageList: ChatMessage[]) {
  const arkApiKey = process.env.ARK_API_KEY || '';
  const arkBaseUrl = process.env.ARK_BASE_URL || '';
  const model = process.env.ARK_CHAT_MODEL || process.env.CHAT_MODEL_ID || 'doubao-seed-1-6-251015';

  if (arkApiKey && arkBaseUrl) {
    const response = await fetch(`${arkBaseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arkApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messageList,
        temperature: 0.8,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ARK chat request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as ArkChatResponse;
    return data.choices?.[0]?.message?.content || '';
  }

  const llmClient = new LLMClient(
    new Config({
      apiKey: process.env.COZE_TOKEN || '',
      baseUrl: process.env.COZE_BASE_URL || 'https://api.coze.cn',
    }),
  );

  const response = await llmClient.invoke(messageList, {
    model,
    temperature: 0.8,
  });

  return response.content || '';
}

export async function POST(request: NextRequest) {
  let threadId: number | null = null;
  let userRow: Awaited<ReturnType<typeof insertThreadMessage>> | null = null;

  try {
    await ensureDatabaseInitialized();
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId, content } = await request.json();
    const normalizedCharacterId = typeof characterId === 'string' ? characterId.trim() : '';
    const normalizedContent = typeof content === 'string' ? content.trim() : '';

    if (!normalizedCharacterId || !normalizedContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const characterResult = await query<{
      id: string;
      name: string;
      tagline: string;
      tags: unknown;
      avatar_url: string;
      speaker: string;
      appearance: string;
      system_prompt: string;
    }>(
      `
        select id, name, tagline, tags, avatar_url, speaker, appearance, system_prompt
        from characters
        where id = $1 and status = 'active'
          and coalesce(system_prompt, '') <> ''
          and coalesce(avatar_url, '') <> ''
          and coalesce(speaker, '') <> ''
        limit 1
      `,
      [normalizedCharacterId],
    );

    const characterRow = characterResult.rows[0];

    if (!characterRow) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const character = mapCharacterRow(characterRow);
    threadId = await getOrCreateThread(user.id, character.id);
    userRow = await insertThreadMessage({
      threadId,
      role: 'user',
      content: normalizedContent,
      msgType: 'text',
    });

    const recentMessages = await listRecentTextMessages(threadId, 20);
    const messageList = [
      {
        role: 'system' as const,
        content: character.systemPrompt,
      },
      ...recentMessages.map((message) => ({
        role: message.sender_type === 'character' ? 'assistant' as const : 'user' as const,
        content: message.content,
      })),
    ];

    const replyContent = await withTimeout(
      invokeChatModel(messageList),
      20000,
      'Chat upstream timed out',
    );

    const parsedReply = parseReply(replyContent);
    const replyText = parsedReply.text;
    const assistantRow = await insertThreadMessage({
      threadId,
      role: 'character',
      content: replyText,
      msgType: 'text',
    });
    await updateThreadLastMessage(threadId, replyText || normalizedContent);

    const result: ChatResponse = {
      threadId,
      reply: replyText,
      userMessage: mapChatMessageRow(userRow),
      assistantMessage: mapChatMessageRow(assistantRow),
      imagePrompt: parsedReply.imagePrompt,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);

    if (threadId && userRow) {
      try {
        const fallbackText = '抱歉，我现在有点累，晚点再聊～';
        const fallbackRow = await insertThreadMessage({
          threadId,
          role: 'character',
          content: fallbackText,
          msgType: 'text',
        });
        await updateThreadLastMessage(threadId, fallbackText);

        return NextResponse.json(
          {
            error: 'Failed to generate response',
            threadId,
            reply: fallbackText,
            userMessage: mapChatMessageRow(userRow),
            assistantMessage: mapChatMessageRow(fallbackRow),
            isFallback: true,
          } satisfies ChatResponse,
        );
      } catch (fallbackError) {
        console.error('Chat fallback persistence error:', fallbackError);
      }
    }

    return NextResponse.json({ error: 'Failed to generate response' }, { status: 502 });
  }
}
