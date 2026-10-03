import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { findOrCreateGoogleUser, findUserById } from '../modules/auth/auth.service.js';

let configured = false;

export function configurePassport() {
  if (configured) return passport;
  configured = true;

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    findUserById(Number(id)).then(
      (user) => done(null, user ?? false),
      (error) => done(error),
    );
  });

  if (env.GOOGLE_ENABLED) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
          state: true,
        },
        (accessToken, refreshToken, profile, done) => {
          findOrCreateGoogleUser(profile).then(
            (user) => done(null, user),
            (error) => done(error),
          );
        },
      ),
    );
  }

  return passport;
}
