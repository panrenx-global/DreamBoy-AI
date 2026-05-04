import { Config, LLMClient } from 'coze-coding-dev-sdk';
import { Resend } from 'resend';
import { DailyLoveLetterEmail } from '@/emails/daily-love-letter';
import { WelcomeEmail } from '@/emails/welcome';
import { query } from '@/lib/db';
import { ensureDatabaseInitialized } from '@/lib/db-init';

const defaultFromAddress = '纸片人男友 <noreply@ai.prx2025.xyz>';
const defaultAppBaseUrl = 'https://ai.prx2025.xyz';
const defaultFromName = '纸片人男友';

declare global {
  var __dreamboyEmailTestRecipientWarned: boolean | undefined;
}

type ArkChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getMailFromAddress() {
  const rawFromAddress = process.env.RESEND_FROM_EMAIL || defaultFromAddress;
  const matchedName = rawFromAddress.match(/^\s*([^<]+?)\s*</);
  const matchedAddress = rawFromAddress.match(/<([^>]+)>/);
  const emailAddress = matchedAddress?.[1] || rawFromAddress.trim();
  const displayName = matchedName?.[1]?.trim() || defaultFromName;

  if (process.env.NODE_ENV === 'production' && emailAddress.endsWith('@resend.dev')) {
    throw new Error('RESEND_FROM_EMAIL must use a verified sender on ai.prx2025.xyz in production');
  }

  return `${displayName} <${emailAddress}>`;
}

function getEmailRecipient(userEmail: string) {
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim();

  if (!testRecipient) {
    return userEmail;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!globalThis.__dreamboyEmailTestRecipientWarned) {
      globalThis.__dreamboyEmailTestRecipientWarned = true;
      console.warn(
        '[email] EMAIL_TEST_RECIPIENT is configured but will be ignored in production so real users can receive emails',
      );
    }
    return userEmail;
  }

  return testRecipient;
}

function getRandomSubjectTag() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || '';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

async function sendEmailOrThrow(
  payload: Parameters<ReturnType<typeof getResendClient>['emails']['send']>[0],
) {
  const result = await getResendClient().emails.send(payload);

  if (result.error || !result.data?.id) {
    throw new Error(
      result.error?.message || 'Resend accepted no email id for this request',
    );
  }

  return result.data.id;
}

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || defaultAppBaseUrl).replace(
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
  const subjectTag = getRandomSubjectTag();
  const emailId = await sendEmailOrThrow({
    from: getMailFromAddress(),
    to: getEmailRecipient(userEmail),
    subject: `你好呀 [${subjectTag}]，我是你的专属男友 💌`,
    react: WelcomeEmail({
      userName,
      appUrl: getAppBaseUrl(),
    }),
  });
  console.log(`[email] welcome sent`, { userEmail, recipient: getEmailRecipient(userEmail), emailId });
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
  const subjectTag = getRandomSubjectTag();

  const emailId = await sendEmailOrThrow({
    from: getMailFromAddress(),
    to: getEmailRecipient(userEmail),
    subject: `早安 [${subjectTag}] ${userName}，今天也想你了`,
    react: DailyLoveLetterEmail({
      userName,
      loveLetter: safeLoveLetter,
      appUrl: getAppBaseUrl(),
    }),
  });
  console.log(`[email] daily_love_letter sent`, {
    userEmail,
    recipient: getEmailRecipient(userEmail),
    userName,
    emailId,
  });
}

type DailyLoveLetterUserRow = {
  id: number;
  email: string | null;
  username: string;
  nickname: string | null;
};

function getDateStringInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

async function claimScheduledEmailDelivery(userId: number, deliveryDate: string) {
  const result = await query<{ id: number }>(
    `
      insert into scheduled_email_deliveries (
        user_id,
        email_type,
        delivery_date,
        status,
        error_message,
        sent_at,
        updated_at
      )
      values ($1, 'daily_love_letter', $2::date, 'processing', null, null, now())
      on conflict (user_id, email_type, delivery_date)
      do update set
        status = 'processing',
        error_message = null,
        sent_at = null,
        updated_at = now()
      where scheduled_email_deliveries.status = 'failed'
        or (
          scheduled_email_deliveries.status = 'processing'
          and scheduled_email_deliveries.updated_at < now() - interval '30 minutes'
        )
      returning id
    `,
    [userId, deliveryDate],
  );

  return result.rows[0]?.id ?? null;
}

async function markScheduledEmailDeliverySent(deliveryId: number) {
  await query(
    `
      update scheduled_email_deliveries
      set status = 'sent', sent_at = now(), updated_at = now(), error_message = null
      where id = $1
    `,
    [deliveryId],
  );
}

async function markScheduledEmailDeliveryFailed(deliveryId: number, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  await query(
    `
      update scheduled_email_deliveries
      set status = 'failed', error_message = $2, updated_at = now()
      where id = $1
    `,
    [deliveryId, errorMessage.slice(0, 1000)],
  );
}

export async function sendDailyLoveLetterToAll(options?: {
  deliveryDate?: string;
  timeZone?: string;
  force?: boolean;
  targetEmail?: string;
}) {
  await ensureDatabaseInitialized();
  const timeZone = options?.timeZone || process.env.DAILY_LOVE_LETTER_TIMEZONE || 'Asia/Shanghai';
  const deliveryDate = options?.deliveryDate || getDateStringInTimeZone(new Date(), timeZone);
  const force = options?.force === true;
  const targetEmail = options?.targetEmail?.trim().toLowerCase() || null;

  const result = await query<DailyLoveLetterUserRow>(
    `
      select id, email, username, nickname
      from users
      where status = 'active'
        and ($1::text is null or lower(email) = $1)
    `,
    [targetEmail],
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const user of result.rows) {
    const userEmail = user.email?.trim();
    const userName = user.nickname?.trim() || user.username;

    if (!userEmail) {
      skipped += 1;
      continue;
    }

    const deliveryId = force ? null : await claimScheduledEmailDelivery(user.id, deliveryDate);

    if (!force && !deliveryId) {
      duplicates += 1;
      continue;
    }

    try {
      await sendDailyLoveLetter(userEmail, userName);
      if (deliveryId) {
        await markScheduledEmailDeliverySent(deliveryId);
      }
      sent += 1;
    } catch (error) {
      if (deliveryId) {
        await markScheduledEmailDeliveryFailed(deliveryId, error);
      }
      failed += 1;
      console.error(`给 ${userEmail} 发情话失败：`, error);
    }
  }

  return {
    deliveryDate,
    force,
    targetEmail,
    timeZone,
    total: result.rows.length,
    sent,
    failed,
    skipped,
    duplicates,
  };
}
