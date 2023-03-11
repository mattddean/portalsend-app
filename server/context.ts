/* eslint-disable @typescript-eslint/no-unused-vars */
import * as trpc from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import { getUser, User } from "~/server-rsc/getUser";
import { authConfig } from "../next-auth/options";
import { getSession } from "../next-auth/server";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CreateContextOptions {
  user: User | null;
  rsc: boolean;
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export async function createContextInner(opts: CreateContextOptions) {
  return {
    user: opts.user,
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext(
  opts: // HACKs because we can't import `next/cookies` in `/api`-routes
  | {
        type: "rsc";
        getUser: typeof getUser;
      }
    | (Omit<FetchCreateContextFnOptions, "req"> & { type: "api"; req: NextRequest }),
) {
  // for API-response caching see https://trpc.io/docs/caching

  if (opts.type === "rsc") {
    // RSC
    return {
      type: opts.type,
      user: await opts.getUser(),
    };
  }

  // not RSC
  const session = await getSession(opts.req, authConfig);
  return {
    type: opts.type,
    user: session?.user,
  };
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>;
