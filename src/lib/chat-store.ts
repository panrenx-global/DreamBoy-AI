import { query } from '@/lib/db';
import type { ChatMessagePayload, MessageType } from '@/types/chat';

interface ChatThreadRow {
  id: number;
}

interface ChatMessageRow {
  id: number;
  thread_id: number;
  sender_type: string;
  content: string;
  msg_type: string;
  audio_url: string | null;
  image_url: string | null;
  created_at: Date | string;
}

function normalizeSenderRole(senderType: string): 'user' | 'character' {
  return senderType === 'user' ? 'user' : 'character';
}

function normalizeMessageType(
  msgType: string,
  audioUrl: string | null,
  imageUrl: string | null,
): MessageType {
  if (imageUrl) {
    return 'image';
  }

  if (audioUrl) {
    return 'voice';
  }

  if (msgType === 'voice' || msgType === 'image' || msgType === 'mixed') {
    return msgType;
  }

  return 'text';
}

export function mapChatMessageRow(
  row: ChatMessageRow,
  imagePrompt?: string | null,
): ChatMessagePayload {
  return {
    id: String(row.id),
    dbId: row.id,
    role: normalizeSenderRole(row.sender_type),
    type: normalizeMessageType(row.msg_type, row.audio_url, row.image_url),
    content: row.content,
    audioUri: row.audio_url,
    imageUri: row.image_url,
    imagePrompt: imagePrompt || null,
    timestamp: new Date(row.created_at).getTime(),
  };
}

export async function getOrCreateThread(userId: number, characterId: string) {
  const created = await query<ChatThreadRow>(
    `
      insert into chat_threads (user_id, character_id, last_message)
      values ($1, $2, '')
      on conflict (user_id, character_id) do update
        set updated_at = now()
      returning id
    `,
    [userId, characterId],
  );

  return created.rows[0].id;
}

export async function getThreadForUser(userId: number, characterId: string) {
  const result = await query<ChatThreadRow>(
    `
      select id
      from chat_threads
      where user_id = $1 and character_id = $2
      order by updated_at desc, id desc
      limit 1
    `,
    [userId, characterId],
  );

  return result.rows[0]?.id ?? null;
}

export async function assertThreadOwnership(threadId: number, userId: number) {
  const result = await query<ChatThreadRow>(
    `
      select id
      from chat_threads
      where id = $1 and user_id = $2
      limit 1
    `,
    [threadId, userId],
  );

  return Boolean(result.rows[0]);
}

export async function insertThreadMessage(input: {
  threadId: number;
  role: 'user' | 'character';
  content: string;
  msgType?: MessageType;
  audioUrl?: string | null;
  imageUrl?: string | null;
}) {
  const result = await query<ChatMessageRow>(
    `
      insert into chat_messages (thread_id, sender_type, content, msg_type, audio_url, image_url)
      values ($1, $2, $3, $4, $5, $6)
      returning id, thread_id, sender_type, content, msg_type, audio_url, image_url, created_at
    `,
    [
      input.threadId,
      input.role,
      input.content,
      input.msgType || 'text',
      input.audioUrl || null,
      input.imageUrl || null,
    ],
  );

  return result.rows[0];
}

export async function updateThreadLastMessage(threadId: number, lastMessage: string) {
  await query(
    `
      update chat_threads
      set last_message = $2, updated_at = now()
      where id = $1
    `,
    [threadId, lastMessage],
  );
}

export async function listThreadMessages(threadId: number) {
  const result = await query<ChatMessageRow>(
    `
      select id, thread_id, sender_type, content, msg_type, audio_url, image_url, created_at
      from chat_messages
      where thread_id = $1
      order by created_at asc, id asc
    `,
    [threadId],
  );

  return result.rows;
}

export async function listRecentTextMessages(threadId: number, limit: number) {
  const result = await query<ChatMessageRow>(
    `
      select id, thread_id, sender_type, content, msg_type, audio_url, image_url, created_at
      from chat_messages
      where thread_id = $1
        and (content <> '' or msg_type in ('text', 'voice', 'mixed'))
      order by created_at desc, id desc
      limit $2
    `,
    [threadId, limit],
  );

  return result.rows.reverse();
}

export async function updateMessageAudio(messageId: number, audioUrl: string) {
  const result = await query<ChatMessageRow>(
    `
      update chat_messages
      set audio_url = $2,
          msg_type = case when msg_type = 'image' then 'mixed' else 'voice' end
      where id = $1
      returning id, thread_id, sender_type, content, msg_type, audio_url, image_url, created_at
    `,
    [messageId, audioUrl],
  );

  return result.rows[0] || null;
}
