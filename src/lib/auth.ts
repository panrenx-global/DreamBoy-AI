import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';
import type { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = 'dreamboy_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  email: string | null;
}

export interface SessionUser {
  id: number;
  username: string;
  email: string | null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(':');

  if (!salt || !originalHash) {
    return false;
  }

  const derivedHash = (await scrypt(password, salt, 64)) as Buffer;
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (derivedHash.length !== originalBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedHash, originalBuffer);
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeUsername(username: string) {
  return username.trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByUsername(username: string) {
  const result = await query<UserRow>(
    `
      select id, username, password_hash, email
      from users
      where username = $1 and status = 'active'
      limit 1
    `,
    [normalizeUsername(username)],
  );

  return result.rows[0] || null;
}

export async function findUserByEmail(email: string) {
  const result = await query<UserRow>(
    `
      select id, username, password_hash, email
      from users
      where lower(email) = $1 and status = 'active'
      limit 1
    `,
    [normalizeEmail(email)],
  );

  return result.rows[0] || null;
}

export async function createUser(username: string, password: string, email: string) {
  const passwordHash = await hashPassword(password);

  const result = await query<UserRow>(
    `
      insert into users (username, password_hash, email, nickname, status)
      values ($1, $2, $3, $1, 'active')
      returning id, username, password_hash, email
    `,
    [normalizeUsername(username), passwordHash, normalizeEmail(email)],
  );

  return result.rows[0];
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query(
    `
      insert into user_sessions (id, user_id, token_hash, expires_at)
      values ($1, $2, $3, $4)
    `,
    [randomUUID(), userId, tokenHash, expiresAt],
  );

  await query(
    `
      update users
      set last_login_at = now(), updated_at = now()
      where id = $1
    `,
    [userId],
  );

  return { token, expiresAt };
}

export function applySessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function deleteSessionByToken(token: string | undefined) {
  if (!token) {
    return;
  }

  await query('delete from user_sessions where token_hash = $1', [hashSessionToken(token)]);
}

export async function getSessionUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const result = await query<{
    id: number;
    username: string;
    email: string | null;
    expires_at: Date;
  }>(
    `
      select u.id, u.username, u.email, s.expires_at
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1 and u.status = 'active'
      limit 1
    `,
    [hashSessionToken(token)],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSessionByToken(token);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
  };
}

export function sanitizeUser(user: { id: number; username: string; email?: string | null }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? null,
  };
}
