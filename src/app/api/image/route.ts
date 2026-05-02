import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import { getSessionUserFromRequest } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { assertThreadOwnership, insertThreadMessage, mapChatMessageRow, updateThreadLastMessage } from '@/lib/chat-store';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, threadId, imagePrompt } = await request.json();

    if (!prompt || typeof threadId !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ownsThread = await assertThreadOwnership(threadId, user.id);
    if (!ownsThread) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const imageClient = new ImageGenerationClient(
      new Config({
        apiKey: process.env.COZE_WORKLOAD_IDENTITY_API_KEY || '',
        baseUrl: process.env.COZE_INTEGRATION_BASE_URL || 'https://integration.coze.cn',
      }),
    );

    const response = await imageClient.generate({
      prompt: prompt,
      size: '1:1',
    });

    const helper = imageClient.getResponseHelper(response);

    // 提取图片 URL
    const imageUri = helper.imageUrls?.[0] || '';

    if (!imageUri) {
      throw new Error('No image generated');
    }

    const imageMessage = await insertThreadMessage({
      threadId,
      role: 'character',
      content: '',
      msgType: 'image',
      imageUrl: imageUri,
    });

    await updateThreadLastMessage(threadId, '[图片]');

    return NextResponse.json({
      imageUri,
      message: mapChatMessageRow(imageMessage, typeof imagePrompt === 'string' ? imagePrompt : null),
    });
  } catch (error) {
    console.error('Image generation API error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 502 });
  }
}
