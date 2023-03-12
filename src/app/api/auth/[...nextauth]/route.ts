import { NextRequest } from "next/server";
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

  // const theHeaders = [];
  // heads.forEach((value, key) => {
  //   theHeaders.push();
  // });
  // const newHeaders = new Headers(Object.fromEntries(request.headers.entries()));

  // Object.fromEntries(heads);

  // const updatedHeaders = new Headers();
  // headers().forEach((value, key) => {
  //   updatedHeaders.set(key, value);
  // });

  const req = new Request(request.url, {
    headers: request.headers,
    cache: request.cache,
    credentials: request.credentials,
    // destination: request.destination,
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
    // clone: request.clone,
    body: request.body,
    // bodyUsed: request.bodyUsed,
    // arrayBuffer: request.arrayBuffer,
    // blob: request.blob,
    // formData: request.formData,
    // json: request.json,
    // text: request.text,
  });
  // for some reason we can't set the header values as part of creating the request, so we do it like this
  // headers().forEach((value, key) => {
  //   req.headers.set(key, value);
  // });

  // console.debug("req.url", req.url);

  // const newReq = request.clone();

  console.debug("\nbreak here");
  // console.debug("request content type", request.headers.get("Content-Type"));
  // console.debug(" accept", request.headers.get("Accept"));

  // console.debug("req.headers content type", req.headers.get("Content-Type"));
  // console.debug("req.headers accept", req.headers.get("Accept"));

  // console.debug("updatedHeaders content type", updatedHeaders.get("Content-Type"));
  // console.debug("updatedHeaders accept", updatedHeaders.get("Accept"));

  // req.headers.forEach((value, key) => {
  //   console.debug("header", key, value);
  // });

  console.debug("request content-type", request.headers.get("content-type"));
  console.debug("req content-type", req.headers.get("content-type"));

  const response = await SolidAuthHandler(req, prefix, authOptions);
  return response;
}

export { handler as GET, handler as POST };
