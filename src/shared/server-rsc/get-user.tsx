import { eq } from "drizzle-orm/expressions";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { db } from "~/db/drizzle-db";
import * as Schema from "../../db/schema";

export interface User {
  id: string;
  email: string;
  name: string | undefined;
}

export type GetUser = () => Promise<User | null>;

export function createGetUser(cookies: RequestCookies | ReadonlyRequestCookies) {
  return async () => {
    const newCookies = cookies.getAll().reduce((cookiesObj, cookie) => {
      cookiesObj[cookie.name] = cookie.value;
      return cookiesObj;
    }, {} as Record<string, string>);

    const sessionToken = newCookies["next-auth.session-token"] ?? newCookies["__Secure-next-auth.session-token"];
    if (!sessionToken) return null;

    const rows = await db
      .select({ user_id: Schema.users.id, user_name: Schema.users.name, user_email: Schema.users.email })
      .from(Schema.sessions)
      .innerJoin(Schema.users, eq(Schema.users.id, Schema.sessions.user_id))
      .where(eq(Schema.sessions.session_token, sessionToken))
      .limit(1);
    const session = rows[0];
    if (!session) return null;

    const user: User = {
      id: session.user_id,
      name: session.user_name ?? undefined,
      email: session.user_email,
    };
    return user;
  };
}
