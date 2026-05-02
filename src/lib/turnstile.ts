const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
};

function getTurnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY || '';
}

export function isTurnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || getTurnstileSecretKey());
}

export function isTurnstileConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && getTurnstileSecretKey());
}

export async function verifyTurnstileToken(token: string, remoteip?: string) {
  const secret = getTurnstileSecretKey();

  if (!secret) {
    throw new Error('Turnstile secret key is not configured');
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip,
    }),
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`);
  }

  return (await response.json()) as TurnstileVerifyResponse;
}
