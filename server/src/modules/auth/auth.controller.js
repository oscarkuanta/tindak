import passport from 'passport';
import { AUTH_PATHS, ERROR_CODES, GOOGLE_LOGIN_ERRORS } from '@tindak/shared';
import { env } from '../../config/env.js';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../../config/session.js';
import { AppError } from '../../utils/AppError.js';
import { sendData } from '../../utils/response.js';
import { safeRedirectPath } from '../../utils/safeRedirect.js';
import { authenticateUser, registerUser, toPublicUser } from './auth.service.js';

const GOOGLE_SCOPE = ['profile', 'email'];

function logIn(req, user) {
  return new Promise((resolve, reject) => {
    req.login(user, (error) => (error ? reject(error) : resolve()));
  });
}

function logOut(req) {
  return new Promise((resolve, reject) => {
    req.logout((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

function clientUrl(path) {
  return new URL(path, env.CLIENT_URL).toString();
}

function loginErrorUrl(code) {
  return clientUrl(`${AUTH_PATHS.LOGIN}?error=${code}`);
}

export async function register(req, res) {
  const user = await registerUser(req.body);
  await logIn(req, user);
  sendData(res, toPublicUser(user), { status: 201 });
}

export async function login(req, res) {
  const user = await authenticateUser(req.body);
  await logIn(req, user);
  sendData(res, toPublicUser(user));
}

export async function logout(req, res) {
  await logOut(req);
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
  res.status(204).end();
}

export function me(req, res) {
  if (!req.user) {
    throw new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Kamu belum masuk');
  }
  sendData(res, toPublicUser(req.user));
}

export function googleStart(req, res, next) {
  if (!env.GOOGLE_ENABLED) {
    return res.redirect(loginErrorUrl(GOOGLE_LOGIN_ERRORS.UNAVAILABLE));
  }
  req.session.returnTo = safeRedirectPath(req.query.returnTo);
  passport.authenticate('google', { scope: GOOGLE_SCOPE, prompt: 'select_account' })(
    req,
    res,
    next,
  );
}

export function googleCallback(req, res, next) {
  if (!env.GOOGLE_ENABLED) {
    return res.redirect(loginErrorUrl(GOOGLE_LOGIN_ERRORS.UNAVAILABLE));
  }

  const returnTo = safeRedirectPath(req.session?.returnTo);

  passport.authenticate('google', (error, user) => {
    if (error || !user) {
      if (error) req.log?.warn({ err: error }, 'Login Google gagal');
      return res.redirect(loginErrorUrl(GOOGLE_LOGIN_ERRORS.FAILED));
    }
    logIn(req, user).then(
      () => res.redirect(clientUrl(returnTo)),
      (loginError) => next(loginError),
    );
  })(req, res, next);
}
