import { AsyncLocalStorage } from "async_hooks";
import { cookies } from "next/headers";
import { db } from "../prisma/kysely";

interface LocalStorageContext {
  // eslint-disable-next-line @typescript-eslint/ban-types
  trpc: {};
}
const asyncStorage: AsyncLocalStorage<LocalStorageContext> =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("next/dist/client/components/request-async-storage").requestAsyncStorage;

asyncStorage.getStore();
export interface User {
  id: string;
  email: string;
  name: string;
}
export async function getUser(): Promise<User | null> {
  const newCookies = cookies()
    .getAll()
    .reduce((cookiesObj, cookie) => {
      cookiesObj[cookie.name] = cookie.value;
      return cookiesObj;
    }, {} as Record<string, string>);

  const sessionToken = newCookies["next-auth.session-token"];
  if (!sessionToken) {
    console.debug("missing session token");
    return null;
  }

  const session = await db
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.userId")
    .select(["users.email as user_email", "users.name as user_name", "users.id as user_id"])
    .executeTakeFirst();

  if (!session) {
    console.debug("no active session");
    return null;
  }

  return {
    id: session.user_id,
    name: session.user_name!,
    email: session.user_email!,
  };
}
