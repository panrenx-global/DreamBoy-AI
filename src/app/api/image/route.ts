import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import { nanoid } from 'nanoid';
import { getSessionUserFromRequest } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db-init';
import { assertThreadOwnership, insertThreadMessage, mapChatMessageRow, updateThreadLastMessage } from '@/lib/chat-store';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getImageExtension(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
}

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

    // 提取 AI 返回的临时图片 URL
    const tempImageUrl = helper.imageUrls?.[0] || '';

    if (!tempImageUrl) {
      throw new Error('No image generated');
    }

    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    if (!imageBuffer.length) {
      throw new Error('Generated image is empty');
    }
    const fileName = `images/${nanoid()}.${getImageExtension(contentType)}`;
    const permanentUrl = await uploadToR2(imageBuffer, fileName, contentType);

    const imageMessage = await insertThreadMessage({
      threadId,
      role: 'character',
      content: '',
      msgType: 'image',
      imageUrl: permanentUrl,
    });

    await updateThreadLastMessage(threadId, '[图片]');

    return NextResponse.json({
      imageUri: permanentUrl,
      imageUrl: permanentUrl,
      message: mapChatMessageRow(imageMessage, typeof imagePrompt === 'string' ? imagePrompt : null),
    });
  } catch (error) {
    console.error('Image generation API error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 502 });
  }
}
