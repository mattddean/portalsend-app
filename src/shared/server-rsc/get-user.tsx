import { getToken } from "@auth/core/jwt";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export interface Filedrop {
  id: string;
  slug: string;
}

export type CreateGetFiledrop = () => Promise<Filedrop | null>;

export function createGetFiledrop(headers: Headers, cookies: ReadonlyRequestCookies): CreateGetFiledrop {
  return async () => {
    // getToken seems to only need the cookies from the request to work
    const request = { headers, cookies } as unknown as Request;
    const decryptedToken = await getToken({ req: request });

    if (!decryptedToken) {
      console.warn("no token for request");
      return null;
    }

    console.debug({ decryptedToken });

    return {
      id: decryptedToken.id as string,
      slug: decryptedToken.slug as string,
    };
  };
}
