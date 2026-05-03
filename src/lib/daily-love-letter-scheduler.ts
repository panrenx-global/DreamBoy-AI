import { sendDailyLoveLetterToAll } from '@/lib/email';

declare global {
  var __dreamboyDailyLoveLetterSchedulerStarted: boolean | undefined;
  var __dreamboyDailyLoveLetterLastSuccessDate: string | undefined;
  var __dreamboyDailyLoveLetterLastAttemptAt: number | undefined;
  var __dreamboyDailyLoveLetterSchedulerInFlight: boolean | undefined;
}

const DAILY_LOVE_LETTER_HOUR = 7;
const DEFAULT_CATCHUP_HOUR = 12;
const DEFAULT_RETRY_MINUTES = 15;
const CHECK_INTERVAL_MS = 60 * 1000;

function getTimeZone() {
  return process.env.DAILY_LOVE_LETTER_TIMEZONE || 'Asia/Shanghai';
}

function getCatchupHour() {
  const value = Number(process.env.DAILY_LOVE_LETTER_CATCHUP_HOUR || DEFAULT_CATCHUP_HOUR);
  return Number.isFinite(value) ? value : DEFAULT_CATCHUP_HOUR;
}

function getRetryMinutes() {
  const value = Number(process.env.DAILY_LOVE_LETTER_RETRY_MINUTES || DEFAULT_RETRY_MINUTES);
  return Number.isFinite(value) ? value : DEFAULT_RETRY_MINUTES;
}

function getNowParts(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  return {
    dateKey: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    hour: Number(getPart('hour')),
    minute: Number(getPart('minute')),
  };
}

function isDailyLoveLetterSchedulerEnabled() {
  return process.env.ENABLE_DAILY_LOVE_LETTER_CRON !== 'false';
}

async function runDailyLoveLetterTick(reason: 'startup' | 'interval') {
  if (globalThis.__dreamboyDailyLoveLetterSchedulerInFlight) {
    return;
  }

  const timeZone = getTimeZone();
  const { dateKey, hour, minute } = getNowParts(timeZone);
  const currentMinutes = hour * 60 + minute;
  const startMinutes = DAILY_LOVE_LETTER_HOUR * 60;
  const endMinutes = getCatchupHour() * 60;

  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return;
  }

  if (globalThis.__dreamboyDailyLoveLetterLastSuccessDate === dateKey) {
    return;
  }

  const retryMs = getRetryMinutes() * 60 * 1000;
  const lastAttemptAt = globalThis.__dreamboyDailyLoveLetterLastAttemptAt || 0;

  if (Date.now() - lastAttemptAt < retryMs) {
    return;
  }

  globalThis.__dreamboyDailyLoveLetterSchedulerInFlight = true;
  globalThis.__dreamboyDailyLoveLetterLastAttemptAt = Date.now();

  try {
    const summary = await sendDailyLoveLetterToAll({
      deliveryDate: dateKey,
      timeZone,
    });
    if (summary.failed === 0) {
      globalThis.__dreamboyDailyLoveLetterLastSuccessDate = dateKey;
    }
    console.log(
      `[daily-love-letter] ${reason} run finished for ${dateKey} (${timeZone}):`,
      summary,
    );
  } catch (error) {
    console.error(`[daily-love-letter] ${reason} run failed for ${dateKey}:`, error);
  } finally {
    globalThis.__dreamboyDailyLoveLetterSchedulerInFlight = false;
  }
}

export function startDailyLoveLetterScheduler() {
  if (!isDailyLoveLetterSchedulerEnabled()) {
    console.log('[daily-love-letter] scheduler disabled by ENABLE_DAILY_LOVE_LETTER_CRON=false');
    return;
  }

  if (globalThis.__dreamboyDailyLoveLetterSchedulerStarted) {
    return;
  }

  globalThis.__dreamboyDailyLoveLetterSchedulerStarted = true;
  console.log(
    `[daily-love-letter] scheduler started, target time ${DAILY_LOVE_LETTER_HOUR}:00 ${getTimeZone()}`,
  );

  void runDailyLoveLetterTick('startup');
  setInterval(() => {
    void runDailyLoveLetterTick('interval');
  }, CHECK_INTERVAL_MS);
}
