import { Config, LLMClient } from 'coze-coding-dev-sdk';
import { Resend } from 'resend';
import { DailyLoveLetterEmail } from '@/emails/daily-love-letter';
import { WelcomeEmail } from '@/emails/welcome';
import { query } from '@/lib/db';
import { ensureDatabaseInitialized } from '@/lib/db-init';

const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFromAddress = '纸片人男友 <onboarding@resend.dev>';

type ArkChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getMailFromAddress() {
  return process.env.RESEND_FROM_EMAIL || defaultFromAddress;
}

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  );
}

async function generateLoveLetter(userName: string) {
  const prompt = [
    '你是“纸片人男友”项目里的虚拟男友。',
    `请给用户 ${userName} 写一段今天早上的情话短信。`,
    '要求：',
    '1. 使用简体中文。',
    '2. 语气温柔、真诚、自然，不要油腻。',
    '3. 控制在 80-140 字。',
    '4. 适合早安场景，可以带一点陪伴感和鼓励。',
    '5. 不要使用 Markdown，不要加标题，不要署名，不要引号。',
  ].join('\n');

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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ARK love letter request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as ArkChatResponse;
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  const llmClient = new LLMClient(
    new Config({
      apiKey: process.env.COZE_TOKEN || '',
      baseUrl: process.env.COZE_BASE_URL || 'https://api.coze.cn',
    }),
  );

  const response = await llmClient.invoke([{ role: 'user', content: prompt }], {
    model,
    temperature: 0.9,
  });

  return response.content?.trim() || '';
}

export async function sendWelcomeEmail(userEmail: string, userName: string) {
  await resend.emails.send({
    from: getMailFromAddress(),
    to: userEmail,
    subject: '你好呀，我是你的专属男友 💌',
    react: WelcomeEmail({
      userName,
      appUrl: getAppBaseUrl(),
    }),
  });
}

export async function sendDailyLoveLetter(userEmail: string, userName: string) {
  let loveLetter = '';

  try {
    loveLetter = await generateLoveLetter(userName);
  } catch (error) {
    console.error('每日情话生成失败：', error);
  }

  const safeLoveLetter =
    loveLetter || `早安，${userName}。新的一天已经开始了，愿你今天也被温柔对待。忙完了就回来找我，我一直都在想你。`;

  await resend.emails.send({
    from: getMailFromAddress(),
    to: userEmail,
    subject: `早安 ${userName}，今天也想你了`,
    react: DailyLoveLetterEmail({
      userName,
      loveLetter: safeLoveLetter,
      appUrl: getAppBaseUrl(),
    }),
  });
}

type DailyLoveLetterUserRow = {
  email: string | null;
  username: string;
  nickname: string | null;
};

export async function sendDailyLoveLetterToAll() {
  await ensureDatabaseInitialized();

  const result = await query<DailyLoveLetterUserRow>(
    `
      select email, username, nickname
      from users
      where status = 'active'
    `,
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of result.rows) {
    const userEmail = user.email?.trim();
    const userName = user.nickname?.trim() || user.username;

    if (!userEmail) {
      skipped += 1;
      continue;
    }

    try {
      await sendDailyLoveLetter(userEmail, userName);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`给 ${userEmail} 发情话失败：`, error);
    }
  }

  return {
    total: result.rows.length,
    sent,
    failed,
    skipped,
  };
}
