import { NextRequest } from "next/server";
import { authConfig } from "~/auth/options";
import { SolidAuthHandler } from "~/auth/server";
import { env } from "~/env.mjs";

export const runtime = "edge";

async function handler(request: NextRequest) {
  const { prefix = "/api/auth", ...authOptions } = authConfig;

  authOptions.secret ??= env.AUTH_SECRET;
  authOptions.trustHost ??= !!(env.AUTH_TRUST_HOST ?? env.VERCEL ?? env.NODE_ENV !== "production");

  // Create a new request so that we can ensure the next headers are accessed in this file.
  // If we pass the request we get from next to SolidAuthHandler, it will access the headers
  // in a way that next.js does not like and we'll end up with a requestAsyncStorage error
  // https://github.com/vercel/next.js/issues/46356
  const req = new Request(request.url, {
    headers: request.headers,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
    body: request.body,
  });

  const response = await SolidAuthHandler(req, prefix, authOptions);
  return response;
}

export { handler as GET, handler as POST };
