import { Auth, type AuthConfig } from "@auth/core";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import type { AuthAction, AuthOptions } from "next-auth";
import type { Cookie } from "next-auth/core/lib/cookie";
import type { NextRequest } from "next/server";
import { nextAuthOptions } from "~/next-auth/options";

export const runtime = "edge";

async function getBody(req: Request): Promise<Record<string, any> | undefined> {
  if (!("body" in req) || !req.body || req.method !== "POST") return;

  const contentType = req.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return await req.json();
  } else if (contentType?.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await req.text());
    return Object.fromEntries(params);
  }
}

function toResponse(res: Response): Response {
  const headers = new Headers(res.headers);

  // res.cookies?.getAll().forEach((cookie) => {
  //   const { name, value, options } = cookie;
  //   const cookieHeader = serialize(name, value, options);
  //   if (headers.has("Set-Cookie")) headers.append("Set-Cookie", cookieHeader);
  //   else headers.set("Set-Cookie", cookieHeader);
  //   // headers.set("Set-Cookie", cookieHeader) // TODO: Remove. Seems to be a bug with Headers in the runtime
  // });

  let body = res.body;

  if (headers.get("content-type") === "application/json") body = JSON.stringify(res.body);
  else if (headers.get("content-type") === "application/x-www-form-urlencoded")
    body = new URLSearchParams(res.body).toString();

  const status = res.redirect ? 302 : res.status ?? 200;
  const response = new Response(body, { headers, status });

  if (res.redirect) response.headers.set("Location", res.redirect);

  return response;
}

function setCookie(res: any, cookie: Cookie) {
  // Preserve any existing cookies that have already been set in the same session
  let setCookieHeader = res.getHeader("Set-Cookie") ?? [];
  // If not an array (i.e. a string with a single cookie) convert it into an array
  if (!Array.isArray(setCookieHeader)) {
    setCookieHeader = [setCookieHeader];
  }
  const { name, value, options } = cookie;
  const cookieHeader = serialize(name, value, options);
  setCookieHeader.push(cookieHeader);
  res.setHeader("Set-Cookie", setCookieHeader);
}

/** Extract the host from the environment */
function detectHost(forwardedHost: any) {
  // if `NEXTAUTH_URL_INTERNAL` is set, it means NextAuth.js is deployed
  // behind a proxy - we prioritize it over `forwardedHost`.
  if (process.env.NEXTAUTH_URL_INTERNAL) {
    return process.env.NEXTAUTH_URL_INTERNAL;
  }
  // If we detect a Vercel environment, we can trust the host
  if (process.env.VERCEL ?? process.env.AUTH_TRUST_HOST) return forwardedHost;
  // If `NEXTAUTH_URL` is `undefined` we fall back to "http://localhost:3000"
  return process.env.NEXTAUTH_URL;
}

// @see https://beta.nextjs.org/docs/routing/route-handlers
async function NextAuthRouteHandler(
  req: NextRequest,
  context: { params: { nextauth: string[] } },
  options: AuthConfig,
) {
  options.secret ??= process.env.NEXTAUTH_SECRET;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cookies } = require("next/headers");
  const nextauth = context.params?.nextauth;
  const query = Object.fromEntries(req.nextUrl.searchParams);
  console.debug("query", query);
  const body = await getBody(req);
  console.debug("body", body);
  const headersList = new Headers(req.headers);
  console.debug("host", headersList.get("x-forwarded-host"));
  const detectedHost = detectHost(headersList.get("x-forwarded-host"));
  console.debug("detectedHost", detectedHost);
  console.debug("url", `http://localhost:3000${req.nextUrl.pathname}`);
  const request = new Request({
    url: `http://${req.nextUrl.pathname}`,
    host: detectedHost,
    body,
    query,
    cookies: Object.fromEntries(
      cookies()
        .getAll()
        .map((c) => [c.name, c.value]),
    ),
    headers: headersList,
    method: req.method,
    action: nextauth?.[0] as AuthAction,
    providerId: nextauth?.[1],
    error: query.error ?? nextauth?.[1],
  });
  const internalResponse = await Auth(request, { ...options, trustHost: true });

  const response = toResponse(internalResponse);
  const redirect = response.headers.get("Location");
  if (body?.json === "true" && redirect) {
    response.headers.delete("Location");
    response.headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ url: redirect }), {
      headers: response.headers,
    });
  }

  return response;
}

/** The main entry point to next-auth */
function NextAuth(...args: [AuthOptions] | [NextApiRequest, NextApiResponse, AuthOptions]) {
  if (args.length === 1) {
    return async (req: NextAuthRequest | NextRequest, res: NextAuthResponse | { params: { nextauth: string[] } }) => {
      if ((res as any).params) {
        return await NextAuthRouteHandler(req as any, res as any, args[0]);
      }
      throw new Error("Did not expect to get here");

      // REVIEW: req instanceof Request should return true on Route Handlers
      // if (req instanceof Request) {
      //   return await NextAuthRouteHandler(
      //     req,
      //     res as { params: { nextauth: string[] } },
      //     args[0]
      //   )
      // }
      // return await NextAuthHandler(req, res as NextApiResponse, args[0])
    };
  }

  if ((args[1] as any).params) {
    return NextAuthRouteHandler(args[0] as any, args[1] as any, args[2]);
  }
  throw new Error("Did not expect to get here");
}

const handler = NextAuth(nextAuthOptions);

export { handler as GET, handler as POST };
