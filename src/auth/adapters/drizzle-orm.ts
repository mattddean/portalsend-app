import type { Adapter } from "@auth/core/adapters";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm/expressions";
import type { PlanetScaleDatabase } from "drizzle-orm/planetscale-serverless";
import { accounts, sessions, users, verificationTokens } from "../../db/schema";

export function createDrizzleAdapter(db: PlanetScaleDatabase): Adapter {
  return {
    async createUser(userData) {
      await db.insert(users).values({
        id: createId(),
        email: userData.email,
        email_verified: userData.emailVerified,
        name: userData.name,
        image: userData.image,
      });
      const rows = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      const row = rows[0];
      if (!row) throw new Error("User not found");
      return { email: row.email, emailVerified: row.email_verified, id: row.id, image: row.image, name: row.name };
    },
    async getUser(id) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const row = rows[0];
      if (!row) return null;
      return { email: row.email, emailVerified: row.email_verified, id: row.id, image: row.image, name: row.name };
    },
    async getUserByEmail(email) {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const row = rows[0];
      if (!row) return null;
      return { email: row.email, emailVerified: row.email_verified, id: row.id, image: row.image, name: row.name };
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const rows = await db
        .select()
        .from(users)
        .innerJoin(accounts, eq(users.id, accounts.user_id))
        .where(and(eq(accounts.provider_account_id, providerAccountId), eq(accounts.provider, provider)))
        .limit(1);
      const row = rows[0];
      if (!row?.users) return null;
      return {
        email: row.users.email,
        emailVerified: row.users.email_verified,
        id: row.users.id,
        image: row.users.image,
        name: row.users.name,
      };
    },
    async updateUser({ id, ...userData }) {
      if (!id) throw new Error("User not found");
      await db.update(users).set(userData).where(eq(users.id, id));
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const row = rows[0];
      if (!row) throw new Error("User not found");
      return { email: row.email, emailVerified: row.email_verified, id: row.id, image: row.image, name: row.name };
    },
    async deleteUser(userId) {
      await db.delete(users).where(eq(users.id, userId));
    },
    async linkAccount(account) {
      await db.insert(accounts).values({
        id: createId(),
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        type: account.type,
        user_id: account.userId,
        // OpenIDTokenEndpointResponse properties
        access_token: account.access_token,
        expires_in: account.expires_in,
        id_token: account.id_token,
        refresh_token: account.refresh_token,
        refresh_token_expires_in: account.refresh_token_expires_in as number, // TODO: why doesn't the account type have this property?
        scope: account.scope,
        token_type: account.token_type,
      });
    },
    async unlinkAccount({ providerAccountId, provider }) {
      await db
        .delete(accounts)
        .where(and(eq(accounts.provider_account_id, providerAccountId), eq(accounts.provider, provider)));
    },
    async createSession(data) {
      await db.insert(sessions).values({
        id: createId(),
        expires: data.expires,
        session_token: data.sessionToken,
        user_id: data.userId,
      });
      const rows = await db.select().from(sessions).where(eq(sessions.session_token, data.sessionToken)).limit(1);
      const row = rows[0];
      if (!row) throw new Error("User not found");
      return { userId: row.user_id, expires: row.expires, sessionToken: row.session_token };
    },
    async getSessionAndUser(sessionToken) {
      const rows = await db
        .select({
          user: users,
          session: {
            id: sessions.id,
            userId: sessions.user_id,
            sessionToken: sessions.session_token,
            expires: sessions.expires,
          },
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.user_id))
        .where(eq(sessions.session_token, sessionToken))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const { user, session } = row;
      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          image: user.image,
          name: user.name,
        },
        session: {
          id: session.id,
          userId: session.userId,
          sessionToken: session.sessionToken,
          expires: session.expires,
        },
      };
    },
    async updateSession(session) {
      await db.update(sessions).set(session).where(eq(sessions.session_token, session.sessionToken));
      const rows = await db.select().from(sessions).where(eq(sessions.session_token, session.sessionToken)).limit(1);
      const row = rows[0];
      if (!row) throw new Error("Coding bug: updated session not found");
      return { expires: row.expires, sessionToken: row.session_token, userId: row.user_id };
    },
    async deleteSession(sessionToken) {
      await db.delete(sessions).where(eq(sessions.session_token, sessionToken));
    },
    async createVerificationToken(verificationToken) {
      await db.insert(verificationTokens).values({
        expires: verificationToken.expires,
        identifier: verificationToken.identifier,
        token: verificationToken.token,
      });
      const rows = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, verificationToken.token))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error("Coding bug: inserted verification token not found");
      return { expires: row.expires, identifier: row.identifier, token: row.token };
    },
    async useVerificationToken({ identifier, token }) {
      // First get the token while it still exists. TODO: need to add identifier to where clause?
      const rows = await db.select().from(verificationTokens).where(eq(verificationTokens.token, token)).limit(1);
      const row = rows[0];
      if (!row) return null;
      // Then delete it.
      await db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.token, token), eq(verificationTokens.identifier, identifier)));
      // Then return it.
      return { expires: row.expires, identifier: row.identifier, token: row.token };
    },
  };
}
