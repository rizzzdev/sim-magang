import 'dotenv/config';
import { createAuthExpress } from 'sentri/express';
import { PostgresDialect } from 'kysely';
import pg from 'pg';

const { Pool } = pg;

type Role = 'super_admin' | 'admin' | 'user' | 'student' | 'teacher' | 'industry_mentor';

export const sentriAuth = createAuthExpress<Role>({
  mode: 'server',

  // -- Roles ------------------------------------------------------------------
  validRoles: ['super_admin', 'admin', 'user', 'student', 'teacher', 'industry_mentor'],

  // -- Identifiers ------------------------------------------------------------
  validIdentifiers: ['email', 'username'],

  // -- Database ---------------------------------------------------------------
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL! })
  }),

  // -- Token ------------------------------------------------------------------
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // -- Security ---------------------------------------------------------------
  saltRounds: parseInt(process.env.SALT_ROUNDS ?? '12', 10),
  apiKey: process.env.SENTRI_API_KEY,

  // -- Rate Limiting (optional) -----------------------------------------------
  rateLimit: false,

  // -- Redis (optional) -------------------------------------------------------
  // redisUrl: process.env.REDIS_URL,

  // -- Cookie (optional) ------------------------------------------------------
  // cookie: { secure: true, sameSite: 'strict' },
  // accessCookie: { secure: true, sameSite: 'strict' },

  // -- Hooks (optional) -------------------------------------------------------
  // hooks: {
  //   onLogin: (user) => console.log(`login: ${user.identifier}`),
  //   onFailedLogin: (identifier) => console.warn(`failed login: ${identifier}`),
  //   onLogout: (userId) => console.log(`logout: ${userId}`),
  // },

  // -- Token revocation (optional) --------------------------------------------
  // isTokenRevoked: async (sessionId) => false,

  // -- Logger (optional) ------------------------------------------------------
  // logger: console,
  // loggerService: 'sentri',
});
