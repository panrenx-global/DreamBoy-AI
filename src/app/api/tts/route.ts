import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { assertThreadOwnership, mapChatMessageRow, updateMessageAudio } from '@/lib/chat-store';

export const runtime = 'nodejs';
export const maxDuration = 15;

type VolcengineTtsResponse = {
  code?: number;
  message?: string;
  data?: string | null;
};

function resolveSpeaker(requestSpeaker: unknown) {
  const defaultSpeaker =
    process.env.VOLCENGINE_TTS_DEFAULT_SPEAKER || 'zh_male_beijingxiaoye_emo_v2_mars_bigtts';

  if (typeof requestSpeaker !== 'string') {
    return defaultSpeaker;
  }

  const normalizedSpeaker = requestSpeaker.trim();
  if (!normalizedSpeaker || normalizedSpeaker.includes('uranus_bigtts')) {
    return defaultSpeaker;
  }

  return normalizedSpeaker;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, speaker, uid, messageId, threadId } = await request.json();

    if (!text || !speaker || !uid || typeof messageId !== 'number' || typeof threadId !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ownsThread = await assertThreadOwnership(threadId, user.id);
    if (!ownsThread) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const truncatedText = text.length > 500 ? text.slice(0, 500) : text;
    const endpoint =
      process.env.VOLCENGINE_TTS_ENDPOINT || 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
    const apiKey = process.env.VOLCENGINE_TTS_API_KEY || '';
    const resourceId = process.env.VOLCENGINE_TTS_RESOURCE_ID || '';
    const audioFormat = process.env.VOLCENGINE_TTS_AUDIO_FORMAT || 'mp3';
    const sampleRate = Number(process.env.VOLCENGINE_TTS_SAMPLE_RATE || '24000');
    const resolvedSpeaker = resolveSpeaker(speaker);

    if (!apiKey || !resourceId) {
      return NextResponse.json({ error: 'Missing VOLCENGINE TTS configuration' }, { status: 500 });
    }

    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Api-Resource-Id': resourceId,
      },
      body: JSON.stringify({
        user: { uid },
        req_params: {
          text: truncatedText,
          speaker: resolvedSpeaker,
          audio_params: {
            format: audioFormat,
            sample_rate: sampleRate,
          },
        },
      }),
    });

    const responseText = await upstreamResponse.text();
    const responseChunks = responseText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as VolcengineTtsResponse);
    const errorChunk = responseChunks.find((chunk) => (chunk.code ?? 0) !== 0 && chunk.code !== 20000000);
    const audioBase64 = responseChunks
      .map((chunk) => chunk.data || '')
      .filter(Boolean)
      .join('');

    if (!upstreamResponse.ok) {
      const errorMessage = errorChunk?.message || responseChunks.at(-1)?.message || responseText || 'TTS upstream failed';
      console.error('TTS upstream HTTP error:', upstreamResponse.status, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    if (errorChunk || !audioBase64) {
      const errorMessage = errorChunk?.message || responseChunks.at(-1)?.message || 'TTS audio is empty';
      console.error('TTS upstream response error:', responseText);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const audioUri = `data:audio/${audioFormat};base64,${audioBase64}`;
    const audioSize = Buffer.byteLength(audioBase64, 'base64');

    if (!audioUri) {
      console.error('TTS response missing audioUri:', responseText);
      return NextResponse.json({ error: 'TTS audio is empty' }, { status: 502 });
    }

    const updatedMessage = await updateMessageAudio(messageId, audioUri);

    return NextResponse.json({
      audioUri,
      audioSize,
      message: updatedMessage ? mapChatMessageRow(updatedMessage) : undefined,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS API error:', errorMessage);
    return NextResponse.json({ error: errorMessage || 'TTS failed' }, { status: 502 });
  }
}
