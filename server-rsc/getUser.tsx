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
  if (!sessionToken) return null;

  const session = await db
    .selectFrom("Session")
    .innerJoin("User", "User.id", "Session.userId")
    .select(["User.email as user_email", "User.name as user_name", "User.id as user_id"])
    .executeTakeFirst();
  if (!session) return null;

  return {
    id: session.user_id,
    name: session.user_name!,
    email: session.user_email!,
  };
}
