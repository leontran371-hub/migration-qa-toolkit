// Single test user, session held in an HMAC-SHA256 signed cookie (no express-session).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { env } from './env';

export const SESSION_COOKIE = 'session';

const cookieOptions: CookieOptions = { httpOnly: true, sameSite: 'lax', path: '/' };

function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
}

/** Constant-time string compare; hashing first gives equal-length buffers. */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function checkCredentials(username: string, password: string): boolean {
  const userOk = safeEqual(username, env.appUsername);
  const passOk = safeEqual(password, env.appPassword);
  return userOk && passOk;
}

/** Parse a Cookie header into name/value pairs. */
export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(raw));
    } catch {
      cookies.set(name, raw);
    }
  }
  return cookies;
}

function createToken(username: string): string {
  const payload = Buffer.from(username, 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Returns the username for a valid token, otherwise null. */
function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;
  if (!safeEqual(signature, sign(payload))) return null;
  const username = Buffer.from(payload, 'base64url').toString('utf8');
  return username === env.appUsername ? username : null;
}

export function sessionUser(req: Request): string | null {
  return verifyToken(parseCookies(req.headers.cookie).get(SESSION_COOKIE));
}

export function startSession(res: Response, username: string): void {
  res.cookie(SESSION_COOKIE, createToken(username), cookieOptions);
}

export function endSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** API requests get 401 JSON; page requests are redirected to /login. */
export function requireLogin(req: Request, res: Response, next: NextFunction): void {
  const username = sessionUser(req);
  if (username) {
    res.locals.currentUser = username;
    next();
    return;
  }
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.redirect('/login');
}
