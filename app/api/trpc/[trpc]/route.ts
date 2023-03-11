import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import { createContext } from "~/server/context";
import { appRouter } from "~/server/routers/_app";

const handler = (request: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext(opts) {
      return createContext({
        type: "api",
        ...opts,
        req: opts.req as NextRequest,
      });
    },
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("Caught TRPC error:", error);
      }
    },
  });
};

export const GET = handler;
export const POST = handler;

export const runtime = "edge";
