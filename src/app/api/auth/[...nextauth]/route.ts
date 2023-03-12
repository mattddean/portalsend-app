import type { NextRequest } from "next/server";
import { authConfig } from "~/auth/options";
import { SolidAuthHandler } from "~/auth/server";

export const runtime = "edge";

async function handler(request: NextRequest) {
  const { prefix = "/api/auth", ...authOptions } = authConfig;

  authOptions.secret ??= process.env.AUTH_SECRET;
  authOptions.trustHost ??= !!(
    process.env.AUTH_TRUST_HOST ??
    process.env.VERCEL ??
    process.env.NODE_ENV !== "production"
  );

  // const heads = headers();

  // const theHeaders: Record<string, string> = {};
  // heads.forEach((value, key) => {
  //   theHeaders[key] = value;
  // });
  // const newHeaders = new Headers(request.headers);

  // const req = new Request({
  //   url: request.url,
  //   headers: newHeaders,
  //   cache: request.cache,
  //   credentials: request.credentials,
  //   destination: request.destination,
  //   integrity: request.integrity,
  //   keepalive: request.keepalive,
  //   method: request.method,
  //   mode: request.mode,
  //   redirect: request.redirect,
  //   referrer: request.referrer,
  //   referrerPolicy: request.referrerPolicy,
  //   signal: request.signal,
  //   clone: request.clone,
  //   body: request.body,
  //   bodyUsed: request.bodyUsed,
  //   arrayBuffer: request.arrayBuffer,
  //   blob: request.blob,
  //   formData: request.formData,
  //   json: request.json,
  //   text: request.text,
  // });

  const newReq = request.clone();

  // console.debug("heads", heads);
  // console.debug("req.headers", req.headers);

  // console.debug("\nbreak here");
  // console.debug("content type", heads.get("Content-Type"));
  // console.debug("accept", heads.get("Accept"));

  // console.debug("content type", req.headers.get("Content-Type"));
  // console.debug("accept", req.headers.get("Accept"));

  // console.debug("content type", newHeaders.get("Content-Type"));
  // console.debug("accept", newHeaders.get("Accept"));

  // console.debug("content type", newReq.headers.get("Content-Type"));
  // console.debug("accept", newReq.headers.get("Accept"));

  const response = await SolidAuthHandler(newReq, prefix, authOptions);
  return response;
}

export { handler as GET, handler as POST };
